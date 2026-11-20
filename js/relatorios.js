import { obterClientes } from './clientes.js';
import { aplicarMascaraCPF, criarConteudoDestacado, debounce, limparNumeros, normalizarTexto } from './utils.js';

/**
 * Renderiza a lista de clientes na tabela #tabela-clientes (Requisito 2.5a e 2.5b).
 * @param {Array<Object>} listaClientes - Clientes a exibir na tabela.
 * @param {string} [termoBusca=''] - Termo pesquisado para destacar com <mark>.
 * @param {string} [campoBusca=''] - Campo selecionado no filtro ('', 'id', 'nome', 'email' ou 'cpf').
 */
export function renderizarTabelaClientes(listaClientes, termoBusca = '', campoBusca = '') {
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
    tdAcoes.textContent = cliente.perfil === 'administrador' ? 'Administrador' : '—';
    tr.append(thId, tdNome, tdEmail, tdCpf, tdStatus, tdAcoes);
    fragmento.appendChild(tr);
  }
  tbody.appendChild(fragmento);
  if (celulaTotal) {
    celulaTotal.textContent = `Total de clientes listados: ${listaClientes.length}`;
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
  const termoDigitos = limparNumeros(termo);
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
 * Inicializa os relatórios da área administrativa.
 */
export function inicializarRelatorios() {
  if (!document.getElementById('tabela-clientes')) return;
  renderizarTabelaClientes(obterClientes());
}
inicializarRelatorios();

