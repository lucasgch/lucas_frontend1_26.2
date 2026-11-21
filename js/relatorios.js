import { obterClientes } from './clientes.js';
import { atualizarStatusCompra, obterCompras } from './compras.js';
import {
  aplicarMascaraCPF,
  criarConteudoDestacado,
  debounce,
  formatarDataHora,
  formatarMoeda,
  limparNumeros,
  normalizarTexto,
  ofuscarCPF
} from './utils.js';
import { CHAVES_STORAGE, salvarDados } from './storage.js';

// Define a quantidade padrão de itens da paginação
const ITENS_POR_PAGINA = 10;

/**
 * Renderiza a lista de clientes na tabela #tabela-clientes (Requisito 2.5a e 2.5b).
 * @param {Array<Object>} listaClientes - Clientes a exibir na tabela.
 * @param {string} [termoBusca=''] - Termo pesquisado para destacar com <mark>.
 * @param {string} [campoBusca=''] - Campo selecionado no filtro ('', 'id', 'nome', 'email' ou 'cpf').
 */
export function renderizarTabelaClientes(listaClientes, termoBusca = '', campoBusca = '', totalRegistros = listaClientes.length ) {
  const tbody = document.getElementById('tbody-clientes');
  const celulaTotal = document.getElementById('total-clientes-listados');
  if (!tbody) return;
  tbody.replaceChildren();
  if (listaClientes.length === 0) {
    const trVazia = document.createElement('tr');
    const tdVazia = document.createElement('td');
    tdVazia.colSpan = 6;
    tdVazia.textContent = 'Nenhum cliente encontrado.';
    trVazia.appendChild(tdVazia);
    tbody.appendChild(trVazia);
    if (celulaTotal) celulaTotal.textContent = 'Total de clientes listados: 0';
    return;
  }
  const fragmento = document.createDocumentFragment();
  for (const cliente of listaClientes) {
    const tr = document.createElement('tr');
    const thId = document.createElement('th');
    thId.scope = 'row';
    thId.appendChild(
      criarConteudoDestacado(cliente.id, !campoBusca || campoBusca === 'id' ? termoBusca : '')
    );
    const tdNome = document.createElement('td');
    tdNome.appendChild(
      criarConteudoDestacado(cliente.nome, !campoBusca || campoBusca === 'nome' ? termoBusca : '')
    );
    const tdEmail = document.createElement('td');
    tdEmail.appendChild(
      criarConteudoDestacado(cliente.email, !campoBusca || campoBusca === 'email' ? termoBusca : '')
    );
    const tdCpf = document.createElement('td');
    tdCpf.appendChild(
      criarConteudoDestacado(
        ofuscarCPF(cliente.cpf),
        !campoBusca || campoBusca === 'cpf' ? termoBusca : '',
        true
      )
    );
    const tdStatus = document.createElement('td');
    tdStatus.textContent = cliente.bloqueado ? 'Bloqueado' : 'Ativo';
    const tdAcoes = document.createElement('td');
    if (cliente.perfil === 'administrador') {
      tdAcoes.textContent = 'Administrador';
    } else {
      const btnBloqueio = document.createElement('button');
      btnBloqueio.type = 'button';
      btnBloqueio.className = cliente.bloqueado
        ? 'botao botao-secundario btn-bloquear-cliente'
        : 'botao botao-perigo btn-bloquear-cliente';
      btnBloqueio.dataset.id = cliente.id;
      btnBloqueio.textContent = cliente.bloqueado ? 'Desbloquear' : 'Bloquear';
      btnBloqueio.setAttribute(
        'aria-label',
        `${cliente.bloqueado ? 'Desbloquear' : 'Bloquear'} cliente ${cliente.nome}`
      );
      tdAcoes.appendChild(btnBloqueio);
    }
    
    tr.append(thId, tdNome, tdEmail, tdCpf, tdStatus, tdAcoes);
    fragmento.appendChild(tr);
  }
  tbody.appendChild(fragmento);
  if (celulaTotal) {
    celulaTotal.textContent = `Total de clientes listados: ${totalRegistros}`;
  }
}

/**
 * Filtra clientes por ID, nome, e-mail ou CPF (parcial, sem acento/maiúsculas e CPF com ou sem máscara).
 * @param {Array<Object>} clientes - Lista completa de clientes.
 * @param {{termo?: string, campo?: string}} [opcoes]
 * @returns {Array<Object>}
 */
export function filtrarClientes(clientes, { termo = '', campo = '' } = {}) {
  const termoNorm = normalizarTexto(termo);
  if (!termoNorm) return clientes;
  const termoDigitos = /^[\d.\-\s]+$/.test(String(termo).trim()) ? limparNumeros(termo) : '';
  return clientes.filter((c) => {
    const bateId = normalizarTexto(c.id).includes(termoNorm);
    const bateNome = normalizarTexto(c.nome).includes(termoNorm);
    const bateEmail = normalizarTexto(c.email).includes(termoNorm);
    const cpfMascarado = aplicarMascaraCPF(c.cpf);
    const bateCpf =
      normalizarTexto(cpfMascarado).includes(termoNorm) ||
      (termoDigitos.length > 0 && limparNumeros(c.cpf).includes(termoDigitos));
    if (campo === 'id') return bateId;
    if (campo === 'nome') return bateNome;
    if (campo === 'email') return bateEmail;
    if (campo === 'cpf') return bateCpf;
    return bateId || bateNome || bateEmail || bateCpf;
  });
}

/**
 * Retorna uma cópia ordenada da lista de clientes segundo a coluna e direção escolhidas (Requisito 2.5a).
 * @param {Array<Object>} clientes - Lista de clientes.
 * @param {string} coluna - 'id', 'nome', 'email', 'cpf' ou 'status'.
 * @param {'asc'|'desc'} [direcao='asc'] - Direção da ordenação.
 * @returns {Array<Object>}
 */
export function ordenarClientes(clientes, coluna, direcao = 'asc') {
  const fator = direcao === 'desc' ? -1 : 1;
  const obterValor = (c) => {
    if (coluna === 'status') return c.bloqueado ? 'Bloqueado' : 'Ativo';
    if (coluna === 'cpf') return limparNumeros(c.cpf);
    return String(c[coluna] || '');
  };
  return [...clientes].sort((a, b) =>
    obterValor(a).localeCompare(obterValor(b), 'pt-BR', { numeric: true, sensitivity: 'base' }) * fator
  );
}

/**
 * Bloqueia ou desbloqueia um cliente comum no localStorage (Requisitos 2.2f e 2.5d).
 * @param {string} idCliente - ID do cliente (ex: 'C001').
 * @returns {{sucesso: boolean, bloqueado?: boolean, mensagem: string}}
 */
export function alternarBloqueioCliente(idCliente) {
  const clientes = obterClientes();
  const cliente = clientes.find((c) => c.id === idCliente);
  if (!cliente) {
    return { sucesso: false, mensagem: 'Cliente não encontrado.' };
  }
  if (cliente.perfil === 'administrador') {
    return { sucesso: false, mensagem: 'Não é permitido bloquear a conta administradora.' };
  }
  cliente.bloqueado = !cliente.bloqueado;
  salvarDados(CHAVES_STORAGE.CLIENTES, clientes);
  return {
    sucesso: true,
    bloqueado: cliente.bloqueado,
    mensagem: cliente.bloqueado
      ? `Cliente ${cliente.nome} bloqueado.`
      : `Cliente ${cliente.nome} desbloqueado.`
  };
}

/**
 * Renderiza a lista de compras na tabela #tabela-compras e atualiza o somatório no rodapé (Requisito 2.5c).
 * @param {Array<Object>} listaCompras - Compras a exibir na tabela.
 */
export function renderizarTabelaCompras(listaCompras) {
  const tbody = document.getElementById('tbody-compras');
  const celulaTotal = document.getElementById('total-compras-listadas');
  const celulaSoma = document.getElementById('soma-compras-listadas');
  if (!tbody) return;
  tbody.replaceChildren();
  if (listaCompras.length === 0) {
    const trVazia = document.createElement('tr');
    const tdVazia = document.createElement('td');
    tdVazia.colSpan = 7;
    tdVazia.textContent = 'Nenhuma compra encontrada.';
    trVazia.appendChild(tdVazia);
    tbody.appendChild(trVazia);
    if (celulaTotal) celulaTotal.textContent = 'Total de compras listadas: 0';
    if (celulaSoma) celulaSoma.textContent = `Total: ${formatarMoeda(0)}`;
    return;
  }
  // Mais recentes primeiro
  const ordenadas = [...listaCompras].sort((a, b) => new Date(b.data) - new Date(a.data));
  const fragmento = document.createDocumentFragment();
  let somaValores = 0;
  for (const compra of ordenadas) {
    if (compra.status !== 'Cancelado') {
      somaValores += Number(compra.total) || 0;
    }
    const tr = document.createElement('tr');
    // 1. ID da Compra
    const thId = document.createElement('th');
    thId.scope = 'row';
    thId.textContent = compra.id;
    // 2. Data e hora
    const tdData = document.createElement('td');
    const timeEl = document.createElement('time');
    timeEl.dateTime = String(compra.data || '').slice(0, 10);
    timeEl.textContent = formatarDataHora(compra.data);
    tdData.appendChild(timeEl);
    // 3. Cliente (nome + ID preservados na compra)
    const tdCliente = document.createElement('td');
    tdCliente.textContent = `${compra.clienteNome} (${compra.clienteId})`;
    // 4. Produtos resumidos
    const tdProdutos = document.createElement('td');
    const resumoProdutos = (compra.itens || [])
      .map((item) => `${item.quantidade}x ${item.nome}`)
      .join(', ');
    tdProdutos.textContent = resumoProdutos || '—';
    // 5. Status
    const tdStatus = document.createElement('td');
    tdStatus.textContent = compra.status || 'Pago';
    // 6. Valor Total
    const tdValor = document.createElement('td');
    tdValor.textContent = formatarMoeda(compra.total);
    // 7. Ações (no passo 5.2.3 entrará o botão "Ver detalhes" que abre o modal)
    const tdAcoes = document.createElement('td');
    const btnDetalhes = document.createElement('button');
    btnDetalhes.type = 'button';
    btnDetalhes.className = 'botao botao-secundario btn-detalhes-compra';
    btnDetalhes.dataset.id = compra.id;
    btnDetalhes.textContent = 'Ver detalhes';
    btnDetalhes.setAttribute('aria-label', `Ver detalhes da compra ${compra.id}`);
    tdAcoes.appendChild(btnDetalhes);
    tr.append(thId, tdData, tdCliente, tdProdutos, tdStatus, tdValor, tdAcoes);
    fragmento.appendChild(tr);
  }
  tbody.appendChild(fragmento);
  if (celulaTotal) {
    celulaTotal.textContent = `Total de compras listadas: ${ordenadas.length}`;
  }
  if (celulaSoma) {
    celulaSoma.textContent = `Total: ${formatarMoeda(somaValores)}`;
  }
}

/**
 * Preenche e abre o modal <dialog> com os detalhes completos de uma compra (Requisito 2.5d).
 * @param {string} idCompra - Código da compra (ex: 'CP001').
 */
function abrirModalDetalhesCompra(idCompra) {
  const modal = document.getElementById('modal-detalhes-compra');
  const conteudo = document.getElementById('conteudo-detalhes-compra');
  const titulo = document.getElementById('titulo-modal-compra');
  const subtitulo = document.getElementById('detalhe-compra-subtitulo');
  const selectStatus = document.getElementById('select-status-detalhe-compra');
  const btnSalvar = document.getElementById('btn-salvar-status-compra');
  const msgStatus = document.getElementById('msg-status-compra');
  if (!modal || !conteudo) return;
  const compra = obterCompras().find((c) => c.id === idCompra);
  if (!compra) return;
  modal.dataset.compraId = compra.id;
  if (titulo) titulo.textContent = `Pedido ${compra.id}`;
  if (subtitulo) subtitulo.textContent = `Realizado em ${formatarDataHora(compra.data)}`;
  if (msgStatus) msgStatus.textContent = '';
  conteudo.replaceChildren();
  const criarLinha = (rotulo, valor) => {
    const linha = document.createElement('div');
    linha.className = 'linha-resumo-checkout';
    const span = document.createElement('span');
    span.textContent = rotulo;
    const strong = document.createElement('strong');
    strong.textContent = valor;
    linha.append(span, strong);
    conteudo.appendChild(linha);
  };
  // Cliente
  criarLinha('Cliente:', `${compra.clienteNome} (${compra.clienteId})`);
  criarLinha('E-mail:', compra.clienteEmail || '—');
  // Endereço
  if (compra.enderecoEntrega) {
    const e = compra.enderecoEntrega;
    const comp = e.complemento ? `, ${e.complemento}` : '';
    criarLinha('Entrega:', `${e.logradouro}, ${e.numero}${comp} - ${e.bairro}, ${e.cidade}/${e.uf} (${e.cep})`);
  }
  // Pagamento
  let textoPag = 'Pix';
  if (compra.pagamento?.metodo === 'cartao') {
    textoPag = `Cartão de Crédito (final ${compra.pagamento.ultimos4Digitos})`;
  } else if (compra.pagamento?.metodo === 'boleto') {
    textoPag = 'Boleto Bancário';
  }
  criarLinha('Pagamento:', textoPag);
  // Itens
  for (const item of compra.itens || []) {
    criarLinha(
      `${item.quantidade}x ${item.nome} (${formatarMoeda(item.precoUnitario)} un.)`,
      formatarMoeda(item.subtotal)
    );
  }
  // Valores
  criarLinha('Subtotal:', formatarMoeda(compra.subtotal));
  if (compra.desconto > 0) {
    criarLinha(compra.cupom ? `Desconto (${compra.cupom}):` : 'Desconto:', `- ${formatarMoeda(compra.desconto)}`);
  }
  criarLinha('Frete:', compra.frete === 0 ? 'Grátis' : formatarMoeda(compra.frete));
  criarLinha('Total:', formatarMoeda(compra.total));
  // Status atual (desabilita edição se já estiver Cancelado)
  const statusAtual = compra.status || 'Pago';
  if (selectStatus) {
    selectStatus.value = statusAtual;
    selectStatus.disabled = statusAtual === 'Cancelado';
  }
  if (btnSalvar) btnSalvar.disabled = statusAtual === 'Cancelado';
  modal.showModal();
}

/**
 * Filtra compras combinando texto (ID, cliente ou produto), intervalo de datas,
 * intervalo de valores e status (Requisito 2.5c).
 * @param {Array<Object>} compras - Lista completa de compras.
 * @param {Object} [filtros]
 * @returns {Array<Object>}
 */
export function filtrarCompras(
  compras,
  { termo = '', campo = '', dataInicio = '', dataFim = '', valorMin = '', valorMax = '', status = '' } = {}
) {
  const termoNorm = normalizarTexto(termo);
  const inicioMs = dataInicio ? new Date(`${dataInicio}T00:00:00`).getTime() : null;
  const fimMs = dataFim ? new Date(`${dataFim}T23:59:59.999`).getTime() : null;
  const minVal = valorMin !== '' ? Number(valorMin) : null;
  const maxVal = valorMax !== '' ? Number(valorMax) : null;
  return compras.filter((compra) => {
    // 1. Texto (ID, cliente ou produto)
    if (termoNorm) {
      const bateId = normalizarTexto(compra.id).includes(termoNorm);
      const bateCliente =
        normalizarTexto(compra.clienteNome).includes(termoNorm) ||
        normalizarTexto(compra.clienteId).includes(termoNorm) ||
        normalizarTexto(compra.clienteEmail).includes(termoNorm);
      const bateProduto = (compra.itens || []).some(
        (item) =>
          normalizarTexto(item.nome).includes(termoNorm) ||
          normalizarTexto(item.produtoId).includes(termoNorm)
      );
      if (campo === 'id' && !bateId) return false;
      if (campo === 'cliente' && !bateCliente) return false;
      if (campo === 'produto' && !bateProduto) return false;
      if (!campo && !bateId && !bateCliente && !bateProduto) return false;
    }
    // 2. Intervalo de datas (usando horário local)
    const dataCompraMs = new Date(compra.data).getTime();
    if (inicioMs !== null && dataCompraMs < inicioMs) return false;
    if (fimMs !== null && dataCompraMs > fimMs) return false;
    // 3. Intervalo de valores
    const total = Number(compra.total) || 0;
    if (minVal !== null && !Number.isNaN(minVal) && total < minVal) return false;
    if (maxVal !== null && !Number.isNaN(maxVal) && total > maxVal) return false;
    // 4. Status
    if (status && (compra.status || 'Pago') !== status) return false;
    return true;
  });
}

/**
 * Calcula os indicadores gerenciais da loja a partir dos clientes e compras (Requisito 2.5e).
 * Compras canceladas são desconsideradas no faturamento, ticket médio e ranking de vendas.
 * @param {Array<Object>} clientes
 * @param {Array<Object>} compras
 * @returns {{totalClientes: number, totalCompras: number, faturamento: number, ticketMedio: number, topProdutos: Array}}
 */
export function calcularIndicadores(clientes, compras) {
  // Conta apenas clientes comuns (exclui conta administradora)
  const totalClientes = clientes.filter((c) => c.perfil !== 'administrador').length;
  const comprasAtivas = compras.filter((c) => c.status !== 'Cancelado');
  const totalCompras = comprasAtivas.length;
  const faturamento = comprasAtivas.reduce((soma, c) => soma + (Number(c.total) || 0), 0);
  const ticketMedio = totalCompras > 0 ? faturamento / totalCompras : 0;

  // Agrupa quantidades e receita por produto para montar o Top 5
  const mapaProdutos = new Map();
  for (const compra of comprasAtivas) {
    for (const item of compra.itens || []) {
      const atual = mapaProdutos.get(item.produtoId) || {
        produtoId: item.produtoId,
        nome: item.nome,
        quantidade: 0,
        receita: 0
      };
      atual.quantidade += Number(item.quantidade) || 0;
      atual.receita += Number(item.subtotal) || 0;
      mapaProdutos.set(item.produtoId, atual);
    }
  }

  const topProdutos = Array.from(mapaProdutos.values())
    .sort((a, b) => b.quantidade - a.quantidade || b.receita - a.receita)
    .slice(0, 5);

  return { totalClientes, totalCompras, faturamento, ticketMedio, topProdutos };
}

/**
 * Atualiza os cards de KPIs e o ranking Top 5 no DOM (Requisito 2.5e).
 */
export function renderizarIndicadores() {
  const elClientes = document.getElementById('kpi-total-clientes');
  const elCompras = document.getElementById('kpi-total-compras');
  const elFaturamento = document.getElementById('kpi-faturamento');
  const elTicket = document.getElementById('kpi-ticket-medio');
  const listaTop = document.getElementById('lista-top-produtos');
  if (!elClientes && !listaTop) return;

  const { totalClientes, totalCompras, faturamento, ticketMedio, topProdutos } =
    calcularIndicadores(obterClientes(), obterCompras());

  if (elClientes) elClientes.textContent = String(totalClientes);
  if (elCompras) elCompras.textContent = String(totalCompras);
  if (elFaturamento) elFaturamento.textContent = formatarMoeda(faturamento);
  if (elTicket) elTicket.textContent = formatarMoeda(ticketMedio);

  if (listaTop) {
    listaTop.replaceChildren();
    if (topProdutos.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'Nenhuma venda ativa registrada ainda.';
      listaTop.appendChild(li);
      return;
    }

    topProdutos.forEach((prod, indice) => {
      const li = document.createElement('li');
      const spanNome = document.createElement('span');
      spanNome.textContent = `${indice + 1}. ${prod.nome}`;
      const spanQtd = document.createElement('strong');
      spanQtd.className = 'top-produto-qtd';
      spanQtd.textContent = `${prod.quantidade} un. (${formatarMoeda(prod.receita)})`;
      li.append(spanNome, spanQtd);
      listaTop.appendChild(li);
    });
  }
}

/**
 * Inicializa os relatórios da área administrativa.
 */
export function inicializarRelatorios() {
  const tabelaClientes = document.getElementById('tabela-clientes');
  if (!tabelaClientes) return;
  const formClientes = document.getElementById('form-filtros-clientes');
  const inputBuscaClientes = document.getElementById('campo-busca-clientes');
  const selectCampoCliente = document.getElementById('filtro-campo-cliente');
  const btnPagAnterior = document.getElementById('btn-pag-clientes-anterior');
  const btnPagProxima = document.getElementById('btn-pag-clientes-proxima');
  const infoPag = document.getElementById('info-pag-clientes');
  const estadoClientes = {
    coluna: 'id',
    direcao: 'asc',
    paginaAtual: 1
  };
  function atualizarIndicadoresOrdenacao() {
    tabelaClientes.querySelectorAll('thead th[aria-sort]').forEach((th) => {
      const btn = th.querySelector('.btn-ordenar');
      const seta = th.querySelector('.seta-ordem');
      if (btn?.dataset.coluna === estadoClientes.coluna) {
        th.setAttribute('aria-sort', estadoClientes.direcao === 'asc' ? 'ascending' : 'descending');
        if (seta) seta.textContent = estadoClientes.direcao === 'asc' ? '▲' : '▼';
      } else {
        th.setAttribute('aria-sort', 'none');
        if (seta) seta.textContent = '';
      }
    });
  }
  function atualizarClientes() {
    const termo = inputBuscaClientes?.value || '';
    const campo = selectCampoCliente?.value || '';
    const filtrados = filtrarClientes(obterClientes(), { termo, campo });
    const ordenados = ordenarClientes(filtrados, estadoClientes.coluna, estadoClientes.direcao);
    const totalPaginas = Math.max(1, Math.ceil(ordenados.length / ITENS_POR_PAGINA));
    if (estadoClientes.paginaAtual > totalPaginas) {
      estadoClientes.paginaAtual = totalPaginas;
    }
    const inicio = (estadoClientes.paginaAtual - 1) * ITENS_POR_PAGINA;
    const pagina = ordenados.slice(inicio, inicio + ITENS_POR_PAGINA);
    renderizarTabelaClientes(pagina, termo, campo, ordenados.length);
    atualizarIndicadoresOrdenacao();
    if (infoPag) infoPag.textContent = `Página ${estadoClientes.paginaAtual} de ${totalPaginas}`;
    if (btnPagAnterior) btnPagAnterior.disabled = estadoClientes.paginaAtual <= 1;
    if (btnPagProxima) btnPagProxima.disabled = estadoClientes.paginaAtual >= totalPaginas;
  }
  // Busca e filtros (sempre voltam para a página 1)
  const filtrarDoInicio = () => {
    estadoClientes.paginaAtual = 1;
    atualizarClientes();
  };
  formClientes?.addEventListener('submit', (evento) => {
    evento.preventDefault();
    filtrarDoInicio();
  });
  inputBuscaClientes?.addEventListener('input', debounce(filtrarDoInicio, 250));
  selectCampoCliente?.addEventListener('change', filtrarDoInicio);
  formClientes?.addEventListener('reset', () => setTimeout(filtrarDoInicio, 0));
  // Clique nos cabeçalhos para ordenar
  tabelaClientes.querySelector('thead')?.addEventListener('click', (evento) => {
    const btn = evento.target.closest('.btn-ordenar');
    if (!btn) return;
    const coluna = btn.dataset.coluna;
    if (estadoClientes.coluna === coluna) {
      estadoClientes.direcao = estadoClientes.direcao === 'asc' ? 'desc' : 'asc';
    } else {
      estadoClientes.coluna = coluna;
      estadoClientes.direcao = 'asc';
    }
    estadoClientes.paginaAtual = 1;
    atualizarClientes();
  });
  // Botões de paginação
  btnPagAnterior?.addEventListener('click', () => {
    if (estadoClientes.paginaAtual > 1) {
      estadoClientes.paginaAtual--;
      atualizarClientes();
    }
  });
  btnPagProxima?.addEventListener('click', () => {
    estadoClientes.paginaAtual++;
    atualizarClientes();
  });
  // Clique no botão Bloquear / Desbloquear cliente
  tabelaClientes.querySelector('tbody')?.addEventListener('click', (evento) => {
    const btn = evento.target.closest('.btn-bloquear-cliente');
    if (!btn) return;
    const res = alternarBloqueioCliente(btn.dataset.id);
    if (res.sucesso) {
      atualizarClientes();
    }
  });
  atualizarClientes();
    // --- Filtros de Compras (Requisito 2.5c) ---
  const formCompras = document.getElementById('form-filtros-compras');
  const inputBuscaCompras = document.getElementById('campo-busca-compras');
  const selectCampoCompra = document.getElementById('filtro-campo-compra');
  const inputDataInicio = document.getElementById('filtro-data-inicio');
  const inputDataFim = document.getElementById('filtro-data-fim');
  const inputValorMin = document.getElementById('filtro-valor-min');
  const inputValorMax = document.getElementById('filtro-valor-max');
  const selectStatusCompra = document.getElementById('filtro-status-compra');

  function atualizarCompras() {
    const filtradas = filtrarCompras(obterCompras(), {
      termo: inputBuscaCompras?.value || '',
      campo: selectCampoCompra?.value || '',
      dataInicio: inputDataInicio?.value || '',
      dataFim: inputDataFim?.value || '',
      valorMin: inputValorMin?.value ?? '',
      valorMax: inputValorMax?.value ?? '',
      status: selectStatusCompra?.value || ''
    });
    renderizarTabelaCompras(filtradas);
  }

  formCompras?.addEventListener('submit', (evento) => {
    evento.preventDefault();
    atualizarCompras();
  });
  inputBuscaCompras?.addEventListener('input', debounce(atualizarCompras, 250));
  inputValorMin?.addEventListener('input', debounce(atualizarCompras, 250));
  inputValorMax?.addEventListener('input', debounce(atualizarCompras, 250));
  selectCampoCompra?.addEventListener('change', atualizarCompras);
  inputDataInicio?.addEventListener('change', atualizarCompras);
  inputDataFim?.addEventListener('change', atualizarCompras);
  selectStatusCompra?.addEventListener('change', atualizarCompras);
  formCompras?.addEventListener('reset', () => setTimeout(atualizarCompras, 0));

  const modalCompra = document.getElementById('modal-detalhes-compra');
const btnFecharModalCompra = document.getElementById('btn-fechar-modal-compra');
const btnSalvarStatus = document.getElementById('btn-salvar-status-compra');
const selectStatusDetalhe = document.getElementById('select-status-detalhe-compra');
const msgStatusCompra = document.getElementById('msg-status-compra');
document.getElementById('tbody-compras')?.addEventListener('click', (evento) => {
  const btn = evento.target.closest('.btn-detalhes-compra');
  if (btn) abrirModalDetalhesCompra(btn.dataset.id);
});
btnFecharModalCompra?.addEventListener('click', () => modalCompra?.close());
modalCompra?.addEventListener('click', (evento) => {
  if (evento.target === modalCompra) modalCompra.close();
});
btnSalvarStatus?.addEventListener('click', () => {
  const idCompra = modalCompra?.dataset.compraId;
  if (!idCompra || !selectStatusDetalhe) return;
  const res = atualizarStatusCompra(idCompra, selectStatusDetalhe.value);
  if (msgStatusCompra) {
    msgStatusCompra.style.color = res.sucesso ? '#16a34a' : '#dc2626';
    msgStatusCompra.textContent = res.mensagem;
  }
  if (res.sucesso) {
    if (selectStatusDetalhe.value === 'Cancelado') {
      selectStatusDetalhe.disabled = true;
      btnSalvarStatus.disabled = true;
    }
    atualizarCompras();
    renderizarIndicadores();
  }
});
  atualizarCompras();
  renderizarIndicadores();
}
inicializarRelatorios();

