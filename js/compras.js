import {
  CHAVES_STORAGE,
  gerarProximoId,
  inicializarStorage,
  lerDados,
  salvarDados,
} from "./storage.js";
import { obterSessaoAtiva } from "./auth.js";
import { obterProdutosComEstoque, aplicarFiltrosLoja } from "./produtos.js";
import {
  obterCarrinho,
  obterResumoCarrinho,
  limparCarrinhoAtual,
  salvarExtrasCarrinho,
  renderizarCarrinho,
} from "./carrinho.js";
import {
  aplicarMascaraCEP,
  formatarData,
  formatarFrete,
  formatarMoeda,
  limparNumeros,
  validarCartaoLuhn,
  validarUF,
} from "./utils.js";
import {
  adicionarLinhaResumo,
  mostrarToast,
  renderizarLinhaTabelaVazia,
} from "./ui.js";

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
export function validarValidadeCartao(validade = "") {
  const match = String(validade)
    .trim()
    .match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
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
 * Ajusta o saldo de estoque no localStorage somando (fator = 1) ou subtraindo (fator = -1) quantidades.
 * @param {Array<{produtoId: string, quantidade: number}>} itens
 * @param {1|-1} fator - Use -1 para baixa na compra e 1 para devolução no cancelamento.
 */
function ajustarEstoqueItens(itens, fator) {
  const mapaEstoque = lerDados(CHAVES_STORAGE.ESTOQUE, {});
  const catalogoAtual = obterProdutosComEstoque();

  for (const item of itens || []) {
    const produto = catalogoAtual.find((p) => p.id === item.produtoId);
    if (produto) {
      const estoqueAtual = mapaEstoque[item.produtoId] ?? produto.estoque;
      mapaEstoque[item.produtoId] = Math.max(
        0,
        estoqueAtual + item.quantidade * fator,
      );
    }
  }

  salvarDados(CHAVES_STORAGE.ESTOQUE, mapaEstoque);
}

/**
 * Subtrai do estoque no localStorage as quantidades compradas (Requisito 2.4e).
 * @param {Array<{produtoId: string, quantidade: number}>} itensComprados
 */
export function baixarEstoqueItens(itensComprados) {
  ajustarEstoqueItens(itensComprados, -1);
}

/**
 * Devolve ao estoque no localStorage as quantidades de uma compra cancelada (Requisito 2.5d).
 * @param {Array<{produtoId: string, quantidade: number}>} itensComprados
 */
export function devolverEstoqueItens(itensComprados) {
  ajustarEstoqueItens(itensComprados, 1);
}

const STATUS_COMPRA_VALIDOS = ["Pago", "Enviado", "Entregue", "Cancelado"];
const METODOS_PAGAMENTO_VALIDOS = ["pix", "cartao", "boleto"];

/**
 * Altera o status de uma compra e devolve os itens ao estoque quando cancelada (Requisito 2.5d).
 * Pedidos já cancelados são tratados como estado final para evitar devolução duplicada de estoque.
 * @param {string} idCompra - Código da compra (ex: 'CP001').
 * @param {string} novoStatus - 'Pago' | 'Enviado' | 'Entregue' | 'Cancelado'.
 * @returns {{sucesso: boolean, mensagem: string, compra?: Object}}
 */
export function atualizarStatusCompra(idCompra, novoStatus) {
  if (!STATUS_COMPRA_VALIDOS.includes(novoStatus)) {
    return { sucesso: false, mensagem: "Status inválido." };
  }
  const compras = obterCompras();
  const compra = compras.find((c) => c.id === idCompra);
  if (!compra) {
    return { sucesso: false, mensagem: "Compra não encontrada." };
  }
  const statusAtual = compra.status || "Pago";
  if (statusAtual === novoStatus) {
    return {
      sucesso: false,
      mensagem: `O pedido já está com o status "${statusAtual}".`,
    };
  }
  if (statusAtual === "Cancelado") {
    return {
      sucesso: false,
      mensagem: "Pedidos cancelados não podem ser reativados.",
    };
  }
  // Se o novo status for Cancelado, devolve os itens ao estoque
  if (novoStatus === "Cancelado") {
    devolverEstoqueItens(compra.itens);
  }
  compra.status = novoStatus;
  salvarDados(CHAVES_STORAGE.COMPRAS, compras);
  return {
    sucesso: true,
    mensagem:
      novoStatus === "Cancelado"
        ? `Pedido ${compra.id} cancelado e itens devolvidos ao estoque.`
        : `Status do pedido ${compra.id} alterado para "${novoStatus}".`,
    compra,
  };
}

/**
 * Sanitiza e valida os campos obrigatórios do endereço de entrega.
 * @param {Object|null} enderecoEntrega
 * @returns {{valido: boolean, mensagem?: string, endereco?: Object}}
 */
function validarEnderecoCheckout(enderecoEntrega) {
  const cepLimpo = limparNumeros(enderecoEntrega?.cep);
  const logradouro = String(enderecoEntrega?.logradouro ?? "").trim();
  const numero = String(enderecoEntrega?.numero ?? "").trim();
  const complemento = String(enderecoEntrega?.complemento ?? "").trim();
  const bairro = String(enderecoEntrega?.bairro ?? "").trim();
  const cidade = String(enderecoEntrega?.cidade ?? "").trim();
  const uf = String(enderecoEntrega?.uf ?? "")
    .trim()
    .toUpperCase();
  if (
    cepLimpo.length !== 8 ||
    !logradouro ||
    !numero ||
    !bairro ||
    !cidade ||
    !validarUF(uf)
  ) {
    return {
      valido: false,
      mensagem:
        "Endereço de entrega inválido. Verifique CEP, campos obrigatórios e UF.",
    };
  }
  return {
    valido: true,
    endereco: {
      cep: aplicarMascaraCEP(cepLimpo),
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
    },
  };
}

/**
 * Sanitiza e valida os dados da forma de pagamento escolhida (Pix, Cartão ou Boleto),
 * garantindo que apenas os 4 últimos dígitos do cartão sejam armazenados (Requisito 2.4c).
 * @param {Object|null} pagamento
 * @returns {{valido: boolean, mensagem?: string, pagamento?: Object}}
 */
function validarPagamentoCheckout(pagamento) {
  const metodo = String(pagamento?.metodo ?? "").trim();
  if (!METODOS_PAGAMENTO_VALIDOS.includes(metodo)) {
    return { valido: false, mensagem: "Forma de pagamento inválida." };
  }

  if (metodo === "cartao") {
    const ultimos4Digitos = String(pagamento?.ultimos4Digitos ?? "").trim();
    const titular = String(pagamento?.titular ?? "").trim();
    if (!/^\d{4}$/.test(ultimos4Digitos) || titular.length < 3) {
      return { valido: false, mensagem: "Dados do cartão inválidos." };
    }
    return {
      valido: true,
      pagamento: { metodo: "cartao", ultimos4Digitos, titular },
    };
  }

  if (metodo === "pix") {
    return {
      valido: true,
      pagamento: {
        metodo: "pix",
        codigo: String(pagamento?.codigo ?? "").trim(),
      },
    };
  }

  return {
    valido: true,
    pagamento: {
      metodo: "boleto",
      linhaDigitavel: String(pagamento?.linhaDigitavel ?? "").trim(),
    },
  };
}

/**
 * Revalida os itens do carrinho contra o catálogo e o estoque atual e monta o snapshot dos itens do pedido (Requisitos 2.4d e 2.4e).
 * @param {string} usuarioId - ID do cliente autenticado.
 * @returns {{valido: boolean, mensagem?: string, itens?: Array<Object>}}
 */
function montarItensPedidoValidados(usuarioId) {
  const itensCarrinho = obterCarrinho(usuarioId);
  if (itensCarrinho.length === 0) {
    return { valido: false, mensagem: "Seu carrinho está vazio." };
  }

  const catalogo = obterProdutosComEstoque();
  const itensPedido = [];

  for (const item of itensCarrinho) {
    const produto = catalogo.find((p) => p.id === item?.produtoId);
    if (!produto) {
      return {
        valido: false,
        mensagem: `Produto ${item?.produtoId} não encontrado.`,
      };
    }
    if (!Number.isInteger(item.quantidade) || item.quantidade <= 0) {
      return {
        valido: false,
        mensagem: `Quantidade inválida para "${produto.nome}".`,
      };
    }
    if (item.quantidade > produto.estoque) {
      return {
        valido: false,
        mensagem: `Estoque insuficiente para "${produto.nome}" (disponível: ${produto.estoque}).`,
      };
    }
    itensPedido.push({
      produtoId: produto.id,
      nome: produto.nome,
      precoUnitario: produto.preco,
      quantidade: item.quantidade,
      subtotal: produto.preco * item.quantidade,
    });
  }

  return { valido: true, itens: itensPedido };
}

/**
 * Registra uma nova compra, validando endereço, pagamento, quantidades e estoque,
 * gerando ID sequencial (CP001...), dando baixa no estoque e esvaziando o carrinho (Requisitos 2.4c, 2.4d, 2.4e, 2.4f).
 * @param {{enderecoEntrega: Object, pagamento: Object}} dadosCheckout
 * @returns {{sucesso: boolean, mensagem: string, pedido?: Object}}
 */
export function registrarCompra({
  enderecoEntrega = null,
  pagamento = null,
} = {}) {
  inicializarStorage();

  // Exige cliente logado (Requisito 2.4a)
  const sessao = obterSessaoAtiva();
  if (!sessao) {
    return {
      sucesso: false,
      mensagem: "Sessão expirada. Faça login novamente.",
    };
  }

  // Valida endereço de entrega antes de gravar
  const resEndereco = validarEnderecoCheckout(enderecoEntrega);
  if (!resEndereco.valido) {
    return { sucesso: false, mensagem: resEndereco.mensagem };
  }
  const enderecoValidado = resEndereco.endereco;

  // Valida dados de pagamento antes de gravar (garantindo que nunca salva número completo/CVV do cartão)
  const resPagamento = validarPagamentoCheckout(pagamento);
  if (!resPagamento.valido) {
    return { sucesso: false, mensagem: resPagamento.mensagem };
  }
  const pagamentoValidado = resPagamento.pagamento;

  // Verifica itens do carrinho e revalida quantidades e estoque antes de concluir (Requisito 2.4e)
  const resItens = montarItensPedidoValidados(sessao.usuarioId);
  if (!resItens.valido) {
    return { sucesso: false, mensagem: resItens.mensagem };
  }
  const itensPedido = resItens.itens;

  // Obtém valores consolidados (subtotal, desconto, frete, total)
  const resumo = obterResumoCarrinho(enderecoValidado.cep);
  const freteFinal = resumo.frete ?? 0;
  const totalFinal = resumo.total;

  // Registra pedido com ID sequencial
  const novoPedido = {
    id: gerarProximoId("compra", "CP"),
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
    status: "Pago",
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
    pedido: novoPedido,
  };
}

/**
 * Formata os dados de pagamento de uma compra para exibição amigável (Pix, Cartão ou Boleto).
 * @param {{metodo?: string, ultimos4Digitos?: string}|null} pagamento
 * @returns {string}
 */
export function formatarPagamento(pagamento) {
  if (pagamento?.metodo === "cartao") {
    return `Cartão de Crédito (final ${pagamento.ultimos4Digitos || "****"})`;
  }
  if (pagamento?.metodo === "boleto") {
    return "Boleto Bancário";
  }
  return "Pix";
}

/**
 * Exibe a seção de confirmação preenchida com o código e o resumo completo do pedido (Requisito 2.4f).
 * @param {Object} pedido - Pedido registrado por registrarCompra().
 */
function renderizarConfirmacaoCompra(pedido) {
  const secaoConfirmacao = document.getElementById("confirmacao-compra");
  if (!secaoConfirmacao) return;
  const strongCodigo = document.getElementById("codigo-pedido-confirmado");
  if (strongCodigo) strongCodigo.textContent = pedido.id;
  const divResumo = document.getElementById("resumo-confirmacao-pedido");
  if (divResumo) {
    divResumo.replaceChildren();
    // Itens comprados
    for (const item of pedido.itens) {
      adicionarLinhaResumo(
        divResumo,
        `${item.quantidade}x ${item.nome}`,
        formatarMoeda(item.subtotal),
      );
    }
    // Valores
    adicionarLinhaResumo(
      divResumo,
      "Subtotal:",
      formatarMoeda(pedido.subtotal),
    );
    if (pedido.desconto > 0) {
      const rotuloDesconto = pedido.cupom
        ? `Desconto (${pedido.cupom}):`
        : "Desconto:";
      adicionarLinhaResumo(
        divResumo,
        rotuloDesconto,
        `- ${formatarMoeda(pedido.desconto)}`,
      );
    }
    adicionarLinhaResumo(divResumo, "Frete:", formatarFrete(pedido.frete));
    // Forma de pagamento
    adicionarLinhaResumo(
      divResumo,
      "Pagamento:",
      formatarPagamento(pedido.pagamento),
    );
    // Total final
    adicionarLinhaResumo(divResumo, "Total pago:", formatarMoeda(pedido.total));
  }
  secaoConfirmacao.hidden = false;
  secaoConfirmacao.scrollIntoView({ behavior: "smooth" });
}

/**
 * Configura as máscaras de formatação nos campos de endereço e cartão do checkout.
 * @param {{cep?: HTMLInputElement, uf?: HTMLInputElement, cartaoNumero?: HTMLInputElement, cartaoValidade?: HTMLInputElement, cartaoCvv?: HTMLInputElement}} campos
 */
function configurarMascarasCheckout({
  cep,
  uf,
  cartaoNumero,
  cartaoValidade,
  cartaoCvv,
}) {
  cep?.addEventListener("input", () => {
    cep.value = aplicarMascaraCEP(cep.value);
  });
  uf?.addEventListener("input", () => {
    uf.value = uf.value
      .replace(/[^A-Za-z]/g, "")
      .toUpperCase()
      .slice(0, 2);
  });
  cartaoNumero?.addEventListener("input", () => {
    cartaoNumero.value = limparNumeros(cartaoNumero.value).slice(0, 19);
  });
  cartaoValidade?.addEventListener("input", () => {
    const d = limparNumeros(cartaoValidade.value).slice(0, 4);
    cartaoValidade.value = d.replace(/^(\d{2})(\d)/, "$1/$2");
  });
  cartaoCvv?.addEventListener("input", () => {
    cartaoCvv.value = limparNumeros(cartaoCvv.value).slice(0, 4);
  });
}

/**
 * Alterna a exibição dos painéis de pagamento (Pix, Cartão e Boleto) conforme o método escolhido.
 * @param {HTMLDialogElement} modalCheckout - Modal do checkout.
 * @param {HTMLElement|null} erroEtapa3 - Elemento de mensagem de erro da etapa 3.
 */
function configurarPaineisPagamento(modalCheckout, erroEtapa3) {
  const radiosPagamento = modalCheckout.querySelectorAll(
    'input[name="metodo_pagamento"]',
  );
  const painelPix = document.getElementById("painel-pagamento-pix");
  const painelCartao = document.getElementById("painel-pagamento-cartao");
  const painelBoleto = document.getElementById("painel-pagamento-boleto");

  radiosPagamento.forEach((radio) => {
    radio.addEventListener("change", () => {
      if (painelPix) painelPix.hidden = radio.value !== "pix";
      if (painelCartao) painelCartao.hidden = radio.value !== "cartao";
      if (painelBoleto) painelBoleto.hidden = radio.value !== "boleto";
      if (erroEtapa3) erroEtapa3.textContent = "";
    });
  });
}

const TITULOS_ETAPAS_CHECKOUT = Object.freeze({
  1: "Etapa 1 de 3: Resumo do Pedido",
  2: "Etapa 2 de 3: Endereço de Entrega",
  3: "Etapa 3 de 3: Pagamento",
});

/**
 * Alterna a visibilidade das 3 etapas do checkout e atualiza o indicador de progresso.
 * @param {number} numero - Número da etapa ativa (1, 2 ou 3).
 * @param {{etapa1: HTMLElement|null, etapa2: HTMLElement|null, etapa3: HTMLElement|null}} etapas
 * @param {HTMLElement|null} indicadorEtapa - Elemento que exibe o título da etapa atual.
 */
function exibirEtapaCheckout(
  numero,
  { etapa1, etapa2, etapa3 },
  indicadorEtapa,
) {
  if (etapa1) etapa1.hidden = numero !== 1;
  if (etapa2) etapa2.hidden = numero !== 2;
  if (etapa3) etapa3.hidden = numero !== 3;
  if (indicadorEtapa) {
    indicadorEtapa.textContent = TITULOS_ETAPAS_CHECKOUT[numero];
  }
}

/**
 * Renderiza o resumo de itens, subtotal, desconto, frete e total na Etapa 1 do checkout.
 * @param {HTMLElement|null} divResumo - Container do resumo de itens.
 * @param {HTMLInputElement|null} inputCep - Campo de CEP da Etapa 2 (pré-preenchido se vazio).
 */
function preencherResumoCheckout(divResumo, inputCep) {
  if (!divResumo) return;
  const itens = obterCarrinho();
  const catalogo = obterProdutosComEstoque();
  const resumo = obterResumoCarrinho();
  divResumo.replaceChildren();

  for (const item of itens) {
    const produto = catalogo.find((p) => p.id === item.produtoId);
    if (!produto) continue;
    adicionarLinhaResumo(
      divResumo,
      `${item.quantidade}x ${produto.nome}`,
      formatarMoeda(produto.preco * item.quantidade),
    );
  }
  adicionarLinhaResumo(divResumo, "Subtotal:", formatarMoeda(resumo.subtotal));
  adicionarLinhaResumo(
    divResumo,
    "Desconto:",
    `- ${formatarMoeda(resumo.desconto)}`,
  );
  adicionarLinhaResumo(divResumo, "Frete:", formatarFrete(resumo.frete));
  adicionarLinhaResumo(
    divResumo,
    "Total a pagar:",
    formatarMoeda(resumo.total),
  );
  if (resumo.cep && inputCep && !inputCep.value) {
    inputCep.value = aplicarMascaraCEP(resumo.cep);
  }
}

/**
 * Lê e normaliza os campos de endereço preenchidos na Etapa 2 do checkout.
 * @param {{cep?: HTMLInputElement, logradouro?: HTMLInputElement, numero?: HTMLInputElement, complemento?: HTMLInputElement, bairro?: HTMLInputElement, cidade?: HTMLInputElement, uf?: HTMLInputElement}} campos
 * @returns {Object} Objeto de endereço de entrega.
 */
function obterEnderecoCheckout({
  cep,
  logradouro,
  numero,
  complemento,
  bairro,
  cidade,
  uf,
}) {
  return {
    cep: aplicarMascaraCEP(cep?.value),
    logradouro: logradouro?.value.trim() || "",
    numero: numero?.value.trim() || "",
    complemento: complemento?.value.trim() || "",
    bairro: bairro?.value.trim() || "",
    cidade: cidade?.value.trim() || "",
    uf: uf?.value.trim().toUpperCase() || "",
  };
}

/**
 * Coleta e valida os dados da forma de pagamento selecionada na Etapa 3 (Pix, Cartão ou Boleto).
 * @param {HTMLDialogElement} modalCheckout - Modal do checkout.
 * @param {{numero?: HTMLInputElement, nome?: HTMLInputElement, validade?: HTMLInputElement, cvv?: HTMLInputElement}} camposCartao
 * @returns {{valido: boolean, dados?: Object, mensagem?: string}}
 */
function obterDadosPagamentoCheckout(modalCheckout, camposCartao) {
  const metodo =
    modalCheckout.querySelector('input[name="metodo_pagamento"]:checked')
      ?.value || "pix";

  if (metodo === "cartao") {
    const numCartao = limparNumeros(camposCartao.numero?.value);
    const nomeCartao = camposCartao.nome?.value.trim() || "";
    const validade = camposCartao.validade?.value.trim() || "";
    const cvv = limparNumeros(camposCartao.cvv?.value);

    if (!validarCartaoLuhn(numCartao)) {
      return {
        valido: false,
        mensagem: "Número de cartão inválido (falhou na verificação de Luhn).",
      };
    }
    if (nomeCartao.length < 3) {
      return { valido: false, mensagem: "Informe o nome impresso no cartão." };
    }
    if (!validarValidadeCartao(validade)) {
      return {
        valido: false,
        mensagem: "Validade inválida ou cartão vencido (use MM/AA).",
      };
    }
    if (cvv.length < 3 || cvv.length > 4) {
      return {
        valido: false,
        mensagem: "Informe um CVV válido de 3 ou 4 dígitos.",
      };
    }
    // Requisito 2.4c: armazena apenas os 4 últimos dígitos do cartão!
    return {
      valido: true,
      dados: {
        metodo: "cartao",
        ultimos4Digitos: numCartao.slice(-4),
        titular: nomeCartao,
      },
    };
  }

  if (metodo === "pix") {
    return {
      valido: true,
      dados: {
        metodo: "pix",
        codigo:
          document.getElementById("codigo-pix-simulado")?.textContent || "",
      },
    };
  }

  return {
    valido: true,
    dados: {
      metodo: "boleto",
      linhaDigitavel:
        document.getElementById("codigo-boleto-simulado")?.textContent || "",
    },
  };
}

/**
 * Inicializa o fluxo de checkout em 3 etapas na página da loja (Requisitos 2.4a, 2.4b, 2.4c, 2.4f).
 */
export function inicializarCheckout() {
  const btnFinalizar = document.getElementById("btn-finalizar-compra");
  const modalCheckout = document.getElementById("modal-checkout");
  if (!btnFinalizar || !modalCheckout) return;
  const indicadorEtapa = document.getElementById("indicador-etapa-checkout");
  const etapa1 = document.getElementById("checkout-etapa-1");
  const etapa2 = document.getElementById("checkout-etapa-2");
  const etapa3 = document.getElementById("checkout-etapa-3");
  const divResumo = document.getElementById("resumo-itens-checkout");
  const erroEtapa2 = document.getElementById("erro-etapa-2");
  const erroEtapa3 = document.getElementById("erro-etapa-3");
  // Campos de endereço
  const inputCep = document.getElementById("chk-cep");
  const inputLogradouro = document.getElementById("chk-logradouro");
  const inputNumero = document.getElementById("chk-numero");
  const inputComplemento = document.getElementById("chk-complemento");
  const inputBairro = document.getElementById("chk-bairro");
  const inputCidade = document.getElementById("chk-cidade");
  const inputUf = document.getElementById("chk-uf");
  // Campos de cartão
  const inputCartaoNumero = document.getElementById("chk-cartao-numero");
  const inputCartaoNome = document.getElementById("chk-cartao-nome");
  const inputCartaoValidade = document.getElementById("chk-cartao-validade");
  const inputCartaoCvv = document.getElementById("chk-cartao-cvv");
  const camposEndereco = {
    cep: inputCep,
    logradouro: inputLogradouro,
    numero: inputNumero,
    complemento: inputComplemento,
    bairro: inputBairro,
    cidade: inputCidade,
    uf: inputUf,
  };
  const camposCartao = {
    numero: inputCartaoNumero,
    nome: inputCartaoNome,
    validade: inputCartaoValidade,
    cvv: inputCartaoCvv,
  };
  const etapas = { etapa1, etapa2, etapa3 };
  const mostrarEtapa = (numero) =>
    exibirEtapaCheckout(numero, etapas, indicadorEtapa);
  // Ao clicar em "Finalizar compra"
  btnFinalizar.addEventListener("click", (evento) => {
    evento.preventDefault();
    const itens = obterCarrinho();
    if (itens.length === 0) return;
    // Requisito 2.4a: Exige cliente autenticado
    const sessao = obterSessaoAtiva();
    if (!sessao) {
      window.location.href =
        "login.html?motivo=login_necessario&redirect=loja.html%23carrinho";
      return;
    }
    preencherResumoCheckout(divResumo, inputCep);
    mostrarEtapa(1);
    modalCheckout.showModal();
  });
  // Máscaras rápidas na Etapa 2 e 3
  configurarMascarasCheckout({
    cep: inputCep,
    uf: inputUf,
    cartaoNumero: inputCartaoNumero,
    cartaoValidade: inputCartaoValidade,
    cartaoCvv: inputCartaoCvv,
  });
  // Navegação entre etapas
  document
    .getElementById("btn-fechar-checkout")
    ?.addEventListener("click", () => modalCheckout.close());
  document
    .getElementById("btn-ir-etapa-2")
    ?.addEventListener("click", () => mostrarEtapa(2));
  document
    .getElementById("btn-voltar-etapa-1")
    ?.addEventListener("click", () => {
      preencherResumoCheckout(divResumo, inputCep);
      mostrarEtapa(1);
    });
  document
    .getElementById("btn-voltar-etapa-2")
    ?.addEventListener("click", () => mostrarEtapa(2));
  document.getElementById("btn-ir-etapa-3")?.addEventListener("click", () => {
    if (erroEtapa2) erroEtapa2.textContent = "";
    const validacaoEndereco = validarEnderecoCheckout(
      obterEnderecoCheckout(camposEndereco),
    );
    if (!validacaoEndereco.valido) {
      if (erroEtapa2) erroEtapa2.textContent = validacaoEndereco.mensagem;
      return;
    }
    salvarExtrasCarrinho({ cep: validacaoEndereco.endereco.cep });
    renderizarCarrinho();
    mostrarEtapa(3);
  });
  // Alternar painéis Pix / Cartão / Boleto
  configurarPaineisPagamento(modalCheckout, erroEtapa3);
  const definirErroEtapa3 = (mensagem) => {
    if (erroEtapa3) erroEtapa3.textContent = mensagem;
  };
  // Confirmar Compra (Etapa 3)
  // Confirmar Compra (Etapa 3)
  document
    .getElementById("btn-confirmar-compra")
    ?.addEventListener("click", () => {
      definirErroEtapa3("");
      const pagamento = obterDadosPagamentoCheckout(
        modalCheckout,
        camposCartao,
      );
      if (!pagamento.valido) {
        definirErroEtapa3(pagamento.mensagem);
        return;
      }
      const resultado = registrarCompra({
        enderecoEntrega: obterEnderecoCheckout(camposEndereco),
        pagamento: pagamento.dados,
      });
      if (!resultado.sucesso) {
        definirErroEtapa3(resultado.mensagem);
        return;
      }
      modalCheckout.close();
      aplicarFiltrosLoja();
      renderizarConfirmacaoCompra(resultado.pedido);
      mostrarToast(resultado.mensagem, "sucesso");
    });
}
inicializarCheckout();

/**
 * Renderiza o histórico real de compras do cliente logado na tabela #tabela-pedidos em perfil.html,
 * permitindo expandir e visualizar os itens comprados em cada pedido (Requisito 2.4f).
 */
export function renderizarMeusPedidos() {
  const tabela = document.getElementById("tabela-pedidos");
  if (!tabela) return;
  const sessao = obterSessaoAtiva();
  if (!sessao) return;
  const tbody = tabela.querySelector("tbody");
  const tfootTd = tabela.querySelector("tfoot td");
  if (!tbody) return;
  const todasCompras = obterCompras();
  // Filtra apenas os pedidos do cliente logado (mais recentes primeiro)
  const meusPedidos = todasCompras
    .filter((c) => c.clienteId === sessao.usuarioId)
    .sort((a, b) => new Date(b.data) - new Date(a.data));
  tbody.replaceChildren();
  if (meusPedidos.length === 0) {
    renderizarLinhaTabelaVazia(
      tbody,
      5,
      "Você ainda não realizou nenhum pedido.",
    );
    if (tfootTd) tfootTd.textContent = formatarMoeda(0);
    return;
  }
  let somaTotal = 0;
  for (const pedido of meusPedidos) {
    if (pedido.status !== "Cancelado") {
      somaTotal += Number(pedido.total) || 0;
    }
    const tr = document.createElement("tr");
    // 1. Código do Pedido (ex: CP001)
    const thId = document.createElement("th");
    thId.scope = "row";
    thId.textContent = pedido.id;
    // 2. Data formatada em pt-BR dentro de <time>
    const tdData = document.createElement("td");
    const timeEl = document.createElement("time");
    timeEl.dateTime = pedido.data.slice(0, 10);
    timeEl.textContent = formatarData(pedido.data);
    tdData.appendChild(timeEl);
    // 3. Itens com <details> expansível para ver cada livro comprado
    const tdItens = document.createElement("td");
    const qtdTotalItens = (pedido.itens || []).reduce(
      (acc, i) => acc + i.quantidade,
      0,
    );
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = `${qtdTotalItens} ${qtdTotalItens === 1 ? "item" : "itens"} (ver detalhes)`;
    details.appendChild(summary);
    const ulItens = document.createElement("ul");
    for (const item of pedido.itens || []) {
      const li = document.createElement("li");
      li.textContent = `${item.quantidade}x ${item.nome} (${formatarMoeda(item.precoUnitario)} un.)`;
      ulItens.appendChild(li);
    }
    details.appendChild(ulItens);
    tdItens.appendChild(details);
    // 4. Status do Pedido
    const tdStatus = document.createElement("td");
    tdStatus.textContent = pedido.status || "Pago";
    // 5. Valor Total do Pedido
    const tdTotal = document.createElement("td");
    tdTotal.textContent = formatarMoeda(pedido.total);
    tr.append(thId, tdData, tdItens, tdStatus, tdTotal);
    tbody.appendChild(tr);
  }
  if (tfootTd) {
    tfootTd.textContent = formatarMoeda(somaTotal);
  }
}
renderizarMeusPedidos();
