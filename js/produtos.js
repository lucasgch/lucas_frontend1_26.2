// js/produtos.js
import { PRODUTOS_INICIAIS } from './data/produtos.js';
import { formatarMoeda } from './utils.js';
/**
 * Cria o elemento <li> de um produto a partir do <template>
 * @param {Object} produto
 * @returns {HTMLLIElement}
 */
export function criarCardProduto(produto) {
  const template = document.getElementById('template-card-produto');
  const clone = template.content.cloneNode(true);
  const li = clone.querySelector('.item-produto');
  const card = clone.querySelector('.card-produto');
  card.dataset.produtoId = produto.id; // guarda o ID (ex: "P001") no elemento
  // 1. Imagem
  const img = clone.querySelector('img');
  img.src = produto.imagem;
  img.alt = produto.alt || `Livro ${produto.nome}`;
  // 2. Textos principais (usando textContent por segurança)
  clone.querySelector('.titulo-livro').textContent = produto.nome;
  clone.querySelector('.autor-livro').textContent = produto.autor;
  clone.querySelector('.descricao').textContent = produto.descricao;
  clone.querySelector('.preco').textContent = formatarMoeda(produto.preco);
  // 3. Tags de categoria
  const ulTags = clone.querySelector('.tags-categoria');
  produto.tags.forEach((textoTag) => {
    const liTag = document.createElement('li');
    liTag.className = 'tag';
    liTag.textContent = textoTag;
    ulTags.appendChild(liTag);
  });
  // 4. Botão de adicionar ao carrinho (desabilita se estoque for 0)
  const btnAdicionar = clone.querySelector('.botao-adicionar');
  btnAdicionar.dataset.id = produto.id;
  if (produto.estoque <= 0) {
    btnAdicionar.disabled = true;
    btnAdicionar.textContent = 'Esgotado';
  }
  return li;
}
/**
 * Renderiza uma lista de produtos dentro do container UL
 * @param {Array} produtos
 * @param {HTMLElement} container
 */
export function renderizarGradeProdutos(produtos, container) {
  if (!container) return;
  // Limpa o conteúdo atual da grade
  container.replaceChildren();
  // Requisito 2.3(b): mensagem quando nada for encontrado
  if (produtos.length === 0) {
    const aviso = document.createElement('li');
    aviso.className = 'mensagem-vazia';
    aviso.textContent = 'Nenhum livro encontrado para os filtros selecionados.';
    container.appendChild(aviso);
    return;
  }
  // Usa DocumentFragment para inserir todos os livros no DOM de uma só vez
  const fragmento = document.createDocumentFragment();
  produtos.forEach((produto) => {
    fragmento.appendChild(criarCardProduto(produto));
  });
  container.appendChild(fragmento);
}

/**
 * Inicializa a renderização do catálogo na página atual
 * @param {Object} [opcoes]
 * @param {boolean} [opcoes.apenasDestaques=false]
 */
export function inicializarCatalogo({ apenasDestaques = false } = {}) {
  const grade = document.querySelector('.grade-produtos');
  if (!grade) return;
  const lista = apenasDestaques
    ? PRODUTOS_INICIAIS.filter((p) => p.destaque)
    : PRODUTOS_INICIAIS;
  renderizarGradeProdutos(lista, grade);
}

// Executa automaticamente ao carregar o módulo na página
const gradePagina = document.querySelector('.grade-produtos');
if (gradePagina) {
  const apenasDestaques = gradePagina.dataset.apenasDestaques === 'true';
  inicializarCatalogo({ apenasDestaques });
}