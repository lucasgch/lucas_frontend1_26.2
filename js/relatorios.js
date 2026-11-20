import { obterClientes } from './clientes.js';
import { aplicarMascaraCPF } from './utils.js';

/**
 * Renderiza a lista de clientes na tabela #tabela-clientes (Requisito 2.5a).
 * @param {Array<Object>} listaClientes - Clientes a exibir na tabela.
 */
export function renderizarTabelaClientes(listaClientes) {
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
    thId.textContent = cliente.id;
    const tdNome = document.createElement('td');
    tdNome.textContent = cliente.nome;
    const tdEmail = document.createElement('td');
    tdEmail.textContent = cliente.email;
    const tdCpf = document.createElement('td');
    tdCpf.textContent = aplicarMascaraCPF(cliente.cpf);
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
 * Inicializa os relatórios da área administrativa.
 */
export function inicializarRelatorios() {
  if (!document.getElementById('tabela-clientes')) return;
  renderizarTabelaClientes(obterClientes());
}
inicializarRelatorios();