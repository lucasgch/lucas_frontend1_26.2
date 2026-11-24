import { CHAVES_STORAGE, gerarProximoId, inicializarStorage, lerDados, salvarDados } from './storage.js';
import { obterSessaoAtiva } from './auth.js';
import { obterProdutosComEstoque, aplicarFiltrosLoja } from './produtos.js';
import { obterCarrinho, obterResumoCarrinho, limparCarrinhoAtual, salvarExtrasCarrinho, renderizarCarrinho } from './carrinho.js';
import { aplicarMascaraCEP, formatarData, formatarMoeda, limparNumeros, validarCartaoLuhn, validarUF } from './utils.js';
import { mostrarToast } from './ui.js';

/**
 * Retorna a lista de todas as compras registradas no localStorage.
 * @returns {Array<Object>}
 */
export function obterCompras() {
  const compras = lerDados(CHAVES_STORAGE.COMPRAS, []);
  return Array.isArray(compras) ? compras : [];
}

/**
 * Valida se a data de validade do cartão (formato MM/AA) é válida e não está vencida.
 * @param {string} validade - Texto no formato MM/AA (ex: '08/28').
 * @returns {boolean}
 */
export function validarValidadeCartao(validade = '') {

    const match = String(validade).trim().match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
    if (!match) return false;
    
    const mes = Number(match[1]);
    const ano = 2000 + Number(match[2]);
    const agora = new Date();
    const anoAtual = agora.getFullYear();
    const mesAtual = agora.getMonth() + 1;

    // Cartão é válido até o último dia do mês informado
    if (ano < anoAtual) return false;
    
    if (ano === anoAtual && mes < mesAtual) return false;
    
    return true;
}

/**
 * Subtrai do estoque no localStorage as quantidades compradas (Requisito 2.4d).
 * @param {Array<{produtoId: string, quantidade: number}>} itensComprados
 */
export function baixarEstoqueItens(itensComprados) {
    
    const mapaEstoque = lerDados(CHAVES_STORAGE.ESTOQUE, {});
    const catalogoAtual = obterProdutosComEstoque();
    
    for (const item of itensComprados) {
        const produto = catalogoAtual.find((p) => p.id === item.produtoId);
        if (produto) {
        const novoEstoque = Math.max(0, produto.estoque - item.quantidade);
        mapaEstoque[item.produtoId] = novoEstoque;
        }
    }

    salvarDados(CHAVES_STORAGE.ESTOQUE, mapaEstoque);
}

/**
 * Devolve ao estoque no localStorage as quantidades de uma compra cancelada (Requisito 2.5d).
 * @param {Array<{produtoId: string, quantidade: number}>} itensComprados
 */
export function devolverEstoqueItens(itensComprados) {
  const mapaEstoque = lerDados(CHAVES_STORAGE.ESTOQUE, {});
  const catalogoAtual = obterProdutosComEstoque();
  for (const item of itensComprados || []) {
    const produto = catalogoAtual.find((p) => p.id === item.produtoId);
    if (produto) {
      mapaEstoque[item.produtoId] = produto.estoque + item.quantidade;
    }
  }
  salvarDados(CHAVES_STORAGE.ESTOQUE, mapaEstoque);
}

const STATUS_COMPRA_VALIDOS = ['Pago', 'Enviado', 'Entregue', 'Cancelado'];
const METODOS_PAGAMENTO_VALIDOS = ['pix', 'cartao', 'boleto'];
/**
 * Altera o status de uma compra e devolve os itens ao estoque quando cancelada (Requisito 2.5d).
 * Pedidos já cancelados são tratados como estado final para evitar devolução duplicada de estoque.
 * @param {string} idCompra - Código da compra (ex: 'CP001').
 * @param {string} novoStatus - 'Pago' | 'Enviado' | 'Entregue' | 'Cancelado'.
 * @returns {{sucesso: boolean, mensagem: string, compra?: Object}}
 */
export function atualizarStatusCompra(idCompra, novoStatus) {
  if (!STATUS_COMPRA_VALIDOS.includes(novoStatus)) {
    return { sucesso: false, mensagem: 'Status inválido.' };
  }
  const compras = obterCompras();
  const compra = compras.find((c) => c.id === idCompra);
  if (!compra) {
    return { sucesso: false, mensagem: 'Compra não encontrada.' };
  }
  const statusAtual = compra.status || 'Pago';
  if (statusAtual === novoStatus) {
    return { sucesso: false, mensagem: `O pedido já está com o status "${statusAtual}".` };
  }
  if (statusAtual === 'Cancelado') {
    return { sucesso: false, mensagem: 'Pedidos cancelados não podem ser reativados.' };
  }
  // Se o novo status for Cancelado, devolve os itens ao estoque
  if (novoStatus === 'Cancelado') {
    devolverEstoqueItens(compra.itens);
  }
  compra.status = novoStatus;
  salvarDados(CHAVES_STORAGE.COMPRAS, compras);
  return {
    sucesso: true,
    mensagem:
      novoStatus === 'Cancelado'
        ? `Pedido ${compra.id} cancelado e itens devolvidos ao estoque.`
        : `Status do pedido ${compra.id} alterado para "${novoStatus}".`,
    compra
  };
}

/**
 * Registra uma nova compra, validando endereço, pagamento, quantidades e estoque,
 * gerando ID sequencial (CP001...), dando baixa no estoque e esvaziando o carrinho (Requisitos 2.4c, 2.4d, 2.4e).
 * @param {{enderecoEntrega: Object, pagamento: Object}} dadosCheckout
 * @returns {{sucesso: boolean, mensagem: string, pedido?: Object}}
 */
export function registrarCompra({ enderecoEntrega = null, pagamento = null } = {}) {
  inicializarStorage();

  // Exige cliente logado (Requisito 2.4a)
  const sessao = obterSessaoAtiva();
  if (!sessao) {
    return { sucesso: false, mensagem: 'Sessão expirada. Faça login novamente.' };
  }

  // Valida endereço de entrega antes de gravar
  const cepLimpo = limparNumeros(enderecoEntrega?.cep);
  const logradouro = String(enderecoEntrega?.logradouro ?? '').trim();
  const numero = String(enderecoEntrega?.numero ?? '').trim();
  const complemento = String(enderecoEntrega?.complemento ?? '').trim();
  const bairro = String(enderecoEntrega?.bairro ?? '').trim();
  const cidade = String(enderecoEntrega?.cidade ?? '').trim();
  const uf = String(enderecoEntrega?.uf ?? '').trim().toUpperCase();

  if (
    cepLimpo.length !== 8 ||
    !logradouro ||
    !numero ||
    !bairro ||
    !cidade ||
    !validarUF(uf)
  ) {
    return {
      sucesso: false,
      mensagem: 'Endereço de entrega inválido. Verifique CEP, campos obrigatórios e UF.'
    };
  }

  const enderecoValidado = {
    cep: aplicarMascaraCEP(cepLimpo),
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    uf
  };

  // Valida dados de pagamento antes de gravar (garantindo que nunca salva número completo/CVV do cartão)
  const metodo = String(pagamento?.metodo ?? '').trim();
  if (!METODOS_PAGAMENTO_VALIDOS.includes(metodo)) {
    return { sucesso: false, mensagem: 'Forma de pagamento inválida.' };
  }

  let pagamentoValidado;
  if (metodo === 'cartao') {
    const ultimos4Digitos = String(pagamento?.ultimos4Digitos ?? '').trim();
    const titular = String(pagamento?.titular ?? '').trim();
    if (!/^\d{4}$/.test(ultimos4Digitos) || titular.length < 3) {
      return { sucesso: false, mensagem: 'Dados do cartão inválidos.' };
    }
    pagamentoValidado = { metodo: 'cartao', ultimos4Digitos, titular };
  } else if (metodo === 'pix') {
    pagamentoValidado = { metodo: 'pix', codigo: String(pagamento?.codigo ?? '').trim() };
  } else {
    pagamentoValidado = {
      metodo: 'boleto',
      linhaDigitavel: String(pagamento?.linhaDigitavel ?? '').trim()
    };
  }

  // Verifica itens do carrinho e revalida quantidades e estoque antes de concluir (Requisito 2.4e)
  const itensCarrinho = obterCarrinho(sessao.usuarioId);
  if (itensCarrinho.length === 0) {
    return { sucesso: false, mensagem: 'Seu carrinho está vazio.' };
  }

  const catalogo = obterProdutosComEstoque();
  const itensPedido = [];

  for (const item of itensCarrinho) {
    const produto = catalogo.find((p) => p.id === item?.produtoId);
    if (!produto) {
      return { sucesso: false, mensagem: `Produto ${item?.produtoId} não encontrado.` };
    }
    if (!Number.isInteger(item.quantidade) || item.quantidade <= 0) {
      return {
        sucesso: false,
        mensagem: `Quantidade inválida para "${produto.nome}".`
      };
    }
    if (item.quantidade > produto.estoque) {
      return {
        sucesso: false,
        mensagem: `Estoque insuficiente para "${produto.nome}" (disponível: ${produto.estoque}).`
      };
    }
    // Registra valor unitário praticado no momento da compra (Requisito 2.4d)
    itensPedido.push({
      produtoId: produto.id,
      nome: produto.nome,
      precoUnitario: produto.preco,
      quantidade: item.quantidade,
      subtotal: produto.preco * item.quantidade
    });
  }

  // Obtém valores consolidados (subtotal, desconto, frete, total)
  const resumo = obterResumoCarrinho(enderecoValidado.cep);
  const freteFinal = resumo.frete ?? 0;
  const totalFinal = resumo.total;

  // Registra pedido com ID sequencial
  const novoPedido = {
    id: gerarProximoId('compra', 'CP'),
    clienteId: sessao.usuarioId,
    clienteNome: sessao.nome,
    clienteEmail: sessao.email,
    data: new Date().toISOString(),
    itens: itensPedido,
    subtotal: resumo.subtotal,
    desconto: resumo.desconto,
    cupom: resumo.codigoCupom || null,
    frete: freteFinal,
    total: totalFinal,
    enderecoEntrega: enderecoValidado,
    pagamento: pagamentoValidado,
    status: 'Pago'
  };

  // Baixa no estoque usando apenas os itens já validados
  baixarEstoqueItens(itensPedido);

  // Salva a compra
  const compras = obterCompras();
  compras.push(novoPedido);
  salvarDados(CHAVES_STORAGE.COMPRAS, compras);

  // Limpa o carrinho do cliente
  limparCarrinhoAtual();

  return {
    sucesso: true,
    mensagem: `Compra ${novoPedido.id} realizada com sucesso!`,
    pedido: novoPedido
  };
}

/**
 * Exibe a seção de confirmação preenchida com o código e o resumo completo do pedido (Requisito 2.4f).
 * @param {Object} pedido - Pedido registrado por registrarCompra().
 */
function renderizarConfirmacaoCompra(pedido) {
  const secaoConfirmacao = document.getElementById('confirmacao-compra');
  if (!secaoConfirmacao) return;
  const strongCodigo = document.getElementById('codigo-pedido-confirmado');
  if (strongCodigo) strongCodigo.textContent = pedido.id;
  const divResumo = document.getElementById('resumo-confirmacao-pedido');
  if (divResumo) {
    divResumo.replaceChildren();
    const criarLinha = (rotulo, valor) => {
      const linha = document.createElement('div');
      linha.className = 'linha-resumo-checkout';
      const span = document.createElement('span');
      span.textContent = rotulo;
      const strong = document.createElement('strong');
      strong.textContent = valor;
      linha.append(span, strong);
      divResumo.appendChild(linha);
    };
    // Itens comprados
    for (const item of pedido.itens) {
      criarLinha(`${item.quantidade}x ${item.nome}`, formatarMoeda(item.subtotal));
    }
    // Valores
    criarLinha('Subtotal:', formatarMoeda(pedido.subtotal));
    if (pedido.desconto > 0) {
      const rotuloDesconto = pedido.cupom ? `Desconto (${pedido.cupom}):` : 'Desconto:';
      criarLinha(rotuloDesconto, `- ${formatarMoeda(pedido.desconto)}`);
    }
    criarLinha('Frete:', pedido.frete === 0 ? 'Grátis' : formatarMoeda(pedido.frete));
    // Forma de pagamento
    let textoPagamento = 'Pix';
    if (pedido.pagamento?.metodo === 'cartao') {
      textoPagamento = `Cartão de Crédito (final ${pedido.pagamento.ultimos4Digitos})`;
    } else if (pedido.pagamento?.metodo === 'boleto') {
      textoPagamento = 'Boleto Bancário';
    }
    criarLinha('Pagamento:', textoPagamento);
    // Total final
    criarLinha('Total pago:', formatarMoeda(pedido.total));
  }
  secaoConfirmacao.hidden = false;
  secaoConfirmacao.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Inicializa o fluxo de checkout em 3 etapas na página da loja (Requisito 2.4a, 2.4b, 2.4e).
 */
export function inicializarCheckout() {
  const btnFinalizar = document.getElementById('btn-finalizar-compra');
  const modalCheckout = document.getElementById('modal-checkout');
  if (!btnFinalizar || !modalCheckout) return;
  const indicadorEtapa = document.getElementById('indicador-etapa-checkout');
  const etapa1 = document.getElementById('checkout-etapa-1');
  const etapa2 = document.getElementById('checkout-etapa-2');
  const etapa3 = document.getElementById('checkout-etapa-3');
  const divResumo = document.getElementById('resumo-itens-checkout');
  const erroEtapa2 = document.getElementById('erro-etapa-2');
  const erroEtapa3 = document.getElementById('erro-etapa-3');
  // Campos de endereço
  const inputCep = document.getElementById('chk-cep');
  const inputLogradouro = document.getElementById('chk-logradouro');
  const inputNumero = document.getElementById('chk-numero');
  const inputComplemento = document.getElementById('chk-complemento');
  const inputBairro = document.getElementById('chk-bairro');
  const inputCidade = document.getElementById('chk-cidade');
  const inputUf = document.getElementById('chk-uf');
  // Campos de cartão
  const inputCartaoNumero = document.getElementById('chk-cartao-numero');
  const inputCartaoNome = document.getElementById('chk-cartao-nome');
  const inputCartaoValidade = document.getElementById('chk-cartao-validade');
  const inputCartaoCvv = document.getElementById('chk-cartao-cvv');
  function mostrarEtapa(numero) {
    etapa1.hidden = numero !== 1;
    etapa2.hidden = numero !== 2;
    etapa3.hidden = numero !== 3;
    const titulos = {
      1: 'Etapa 1 de 3: Resumo do Pedido',
      2: 'Etapa 2 de 3: Endereço de Entrega',
      3: 'Etapa 3 de 3: Pagamento'
    };
    if (indicadorEtapa) indicadorEtapa.textContent = titulos[numero];
  }
  function preencherResumoEtapa1() {
    const itens = obterCarrinho();
    const catalogo = obterProdutosComEstoque();
    const resumo = obterResumoCarrinho();
    divResumo.replaceChildren();
    for (const item of itens) {
      const produto = catalogo.find((p) => p.id === item.produtoId);
      if (!produto) continue;
      const linha = document.createElement('div');
      linha.className = 'linha-resumo-checkout';
      const spanNome = document.createElement('span');
      spanNome.textContent = `${item.quantidade}x ${produto.nome}`;
      const spanValor = document.createElement('strong');
      spanValor.textContent = formatarMoeda(produto.preco * item.quantidade);
      linha.append(spanNome, spanValor);
      divResumo.appendChild(linha);
    }
    const criarLinhaTotal = (rotulo, valorTexto) => {
      const linha = document.createElement('div');
      linha.className = 'linha-resumo-checkout';
      const spanRotulo = document.createElement('span');
      spanRotulo.textContent = rotulo;
      const spanValor = document.createElement('strong');
      spanValor.textContent = valorTexto;
      linha.append(spanRotulo, spanValor);
      divResumo.appendChild(linha);
    };
   criarLinhaTotal('Subtotal:', formatarMoeda(resumo.subtotal));
    criarLinhaTotal('Desconto:', `- ${formatarMoeda(resumo.desconto)}`);
    const textoFrete = resumo.frete === null ? 'A calcular' : resumo.frete === 0 ? 'Grátis' : formatarMoeda(resumo.frete);
    criarLinhaTotal('Frete:', textoFrete);
    criarLinhaTotal('Total a pagar:', formatarMoeda(resumo.total));
    if (resumo.cep && inputCep && !inputCep.value) {
      inputCep.value = aplicarMascaraCEP(resumo.cep);
    }
  }
  // Ao clicar em "Finalizar compra"
  btnFinalizar.addEventListener('click', (evento) => {
    evento.preventDefault();
    const itens = obterCarrinho();
    if (itens.length === 0) return;
    // Requisito 2.4a: Exige cliente autenticado
    const sessao = obterSessaoAtiva();
    if (!sessao) {
      window.location.href = 'login.html?motivo=login_necessario&redirect=loja.html%23carrinho';
      return;
    }
    preencherResumoEtapa1();
    mostrarEtapa(1);
    modalCheckout.showModal();
  });
  // Máscaras rápidas na Etapa 2 e 3
  inputCep?.addEventListener('input', () => {
    inputCep.value = aplicarMascaraCEP(inputCep.value);
  });
  inputUf?.addEventListener('input', () => {
    inputUf.value = inputUf.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2);
  });
  inputCartaoNumero?.addEventListener('input', () => {
    inputCartaoNumero.value = limparNumeros(inputCartaoNumero.value).slice(0, 19);
  });
  inputCartaoValidade?.addEventListener('input', () => {
    const d = limparNumeros(inputCartaoValidade.value).slice(0, 4);
    inputCartaoValidade.value = d.replace(/^(\d{2})(\d)/, '$1/$2');
  });
  inputCartaoCvv?.addEventListener('input', () => {
    inputCartaoCvv.value = limparNumeros(inputCartaoCvv.value).slice(0, 4);
  });
  // Navegação entre etapas
  document.getElementById('btn-fechar-checkout')?.addEventListener('click', () => modalCheckout.close());
  document.getElementById('btn-ir-etapa-2')?.addEventListener('click', () => mostrarEtapa(2));
  document.getElementById('btn-voltar-etapa-1')?.addEventListener('click', () => {
    preencherResumoEtapa1();
    mostrarEtapa(1);
  });
  document.getElementById('btn-voltar-etapa-2')?.addEventListener('click', () => mostrarEtapa(2));
  document.getElementById('btn-ir-etapa-3')?.addEventListener('click', () => {
    erroEtapa2.textContent = '';
    if (
      limparNumeros(inputCep?.value).length !== 8 ||
      !inputLogradouro?.value.trim() ||
      !inputNumero?.value.trim() ||
      !inputBairro?.value.trim() ||
      !inputCidade?.value.trim() ||
      !validarUF(inputUf?.value)
    ) {
      erroEtapa2.textContent = 'Preencha todos os campos obrigatórios do endereço (CEP com 8 dígitos e UF válida, ex: SC).';
      return;
    }
    salvarExtrasCarrinho({ cep: aplicarMascaraCEP(inputCep.value) });
    renderizarCarrinho();
    mostrarEtapa(3);
  });
  // Alternar painéis Pix / Cartão / Boleto
  const radiosPagamento = modalCheckout.querySelectorAll('input[name="metodo_pagamento"]');
  const painelPix = document.getElementById('painel-pagamento-pix');
  const painelCartao = document.getElementById('painel-pagamento-cartao');
  const painelBoleto = document.getElementById('painel-pagamento-boleto');
  radiosPagamento.forEach((radio) => {
    radio.addEventListener('change', () => {
      painelPix.hidden = radio.value !== 'pix';
      painelCartao.hidden = radio.value !== 'cartao';
      painelBoleto.hidden = radio.value !== 'boleto';
      erroEtapa3.textContent = '';
    });
  });
  // Confirmar Compra (Etapa 3)
  document.getElementById('btn-confirmar-compra')?.addEventListener('click', () => {
    erroEtapa3.textContent = '';
    const metodo = modalCheckout.querySelector('input[name="metodo_pagamento"]:checked')?.value || 'pix';
    let dadosPagamento = { metodo };
    if (metodo === 'cartao') {
      const numCartao = limparNumeros(inputCartaoNumero?.value);
      const nomeCartao = inputCartaoNome?.value.trim() || '';
      const validade = inputCartaoValidade?.value.trim() || '';
      const cvv = limparNumeros(inputCartaoCvv?.value);
      if (!validarCartaoLuhn(numCartao)) {
        erroEtapa3.textContent = 'Número de cartão inválido (falhou na verificação de Luhn).';
        return;
      }
      if (nomeCartao.length < 3) {
        erroEtapa3.textContent = 'Informe o nome impresso no cartão.';
        return;
      }
      if (!validarValidadeCartao(validade)) {
        erroEtapa3.textContent = 'Validade inválida ou cartão vencido (use MM/AA).';
        return;
      }
      if (cvv.length < 3 || cvv.length > 4) {
        erroEtapa3.textContent = 'Informe um CVV válido de 3 ou 4 dígitos.';
        return;
      }
      // Requisito 2.4b: armazena apenas os 4 últimos dígitos do cartão!
      dadosPagamento = {
        metodo: 'cartao',
        ultimos4Digitos: numCartao.slice(-4),
        titular: nomeCartao
      };
    } else if (metodo === 'pix') {
      dadosPagamento = {
        metodo: 'pix',
        codigo: document.getElementById('codigo-pix-simulado')?.textContent || ''
      };
    } else if (metodo === 'boleto') {
      dadosPagamento = {
        metodo: 'boleto',
        linhaDigitavel: document.getElementById('codigo-boleto-simulado')?.textContent || ''
      };
    }
    const enderecoEntrega = {
      cep: aplicarMascaraCEP(inputCep.value),
      logradouro: inputLogradouro.value.trim(),
      numero: inputNumero.value.trim(),
      complemento: inputComplemento?.value.trim() || '',
      bairro: inputBairro.value.trim(),
      cidade: inputCidade.value.trim(),
      uf: inputUf.value.trim().toUpperCase()
    };
    const resultado = registrarCompra({ enderecoEntrega, pagamento: dadosPagamento });
    if (!resultado.sucesso) {
      erroEtapa3.textContent = resultado.mensagem;
      return;
    }
    modalCheckout.close();
    // Atualiza o catálogo na tela para refletir o novo estoque imediatamente
    aplicarFiltrosLoja();
    // Exibe a confirmação com código e resumo completo do pedido (Requisito 2.4f)
    renderizarConfirmacaoCompra(resultado.pedido);
    mostrarToast(resultado.mensagem, 'sucesso');
  });
}
inicializarCheckout();

/**
 * Renderiza o histórico real de compras do cliente logado na tabela #tabela-pedidos em perfil.html,
 * permitindo expandir e visualizar os itens comprados em cada pedido (Requisito 2.4f).
 */
export function renderizarMeusPedidos() {
  const tabela = document.getElementById('tabela-pedidos');
  if (!tabela) return;
  const sessao = obterSessaoAtiva();
  if (!sessao) return;
  const tbody = tabela.querySelector('tbody');
  const tfootTd = tabela.querySelector('tfoot td');
  if (!tbody) return;
  const todasCompras = obterCompras();
  // Filtra apenas os pedidos do cliente logado (mais recentes primeiro)
  const meusPedidos = todasCompras
    .filter((c) => c.clienteId === sessao.usuarioId)
    .sort((a, b) => new Date(b.data) - new Date(a.data));
  tbody.replaceChildren();
  if (meusPedidos.length === 0) {
    const trVazia = document.createElement('tr');
    const tdVazia = document.createElement('td');
    tdVazia.colSpan = 5;
    tdVazia.textContent = 'Você ainda não realizou nenhum pedido.';
    trVazia.appendChild(tdVazia);
    tbody.appendChild(trVazia);
    if (tfootTd) tfootTd.textContent = formatarMoeda(0);
    return;
  }
  let somaTotal = 0;
  for (const pedido of meusPedidos) {
    if (pedido.status !== 'Cancelado') {
      somaTotal += Number(pedido.total) || 0;
    }
    const tr = document.createElement('tr');
    // 1. Código do Pedido (ex: CP001)
    const thId = document.createElement('th');
    thId.scope = 'row';
    thId.textContent = pedido.id;
    // 2. Data formatada em pt-BR dentro de <time>
    const tdData = document.createElement('td');
    const timeEl = document.createElement('time');
    timeEl.dateTime = pedido.data.slice(0, 10);
    timeEl.textContent = formatarData(pedido.data);
    tdData.appendChild(timeEl);
    // 3. Itens com <details> expansível para ver cada livro comprado
    const tdItens = document.createElement('td');
    const qtdTotalItens = (pedido.itens || []).reduce((acc, i) => acc + i.quantidade, 0);
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = `${qtdTotalItens} ${qtdTotalItens === 1 ? 'item' : 'itens'} (ver detalhes)`;
    details.appendChild(summary);
    const ulItens = document.createElement('ul');
    for (const item of pedido.itens || []) {
      const li = document.createElement('li');
      li.textContent = `${item.quantidade}x ${item.nome} (${formatarMoeda(item.precoUnitario)} un.)`;
      ulItens.appendChild(li);
    }
    details.appendChild(ulItens);
    tdItens.appendChild(details);
    // 4. Status do Pedido
    const tdStatus = document.createElement('td');
    tdStatus.textContent = pedido.status || 'Pago';
    // 5. Valor Total do Pedido
    const tdTotal = document.createElement('td');
    tdTotal.textContent = formatarMoeda(pedido.total);
    tr.append(thId, tdData, tdItens, tdStatus, tdTotal);
    tbody.appendChild(tr);
  }
  if (tfootTd) {
    tfootTd.textContent = formatarMoeda(somaTotal);
  }
}
renderizarMeusPedidos();