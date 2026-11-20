import { obterClientes } from './clientes.js';
import { aplicarMascaraCPF, criarConteudoDestacado, debounce, limparNumeros, normalizarTexto } from './utils.js';
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
        aplicarMascaraCPF(cliente.cpf),
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
}
inicializarRelatorios();

