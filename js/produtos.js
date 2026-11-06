// js/produtos.js
import { PRODUTOS_INICIAIS } from './data/produtos.js';
import { formatarMoeda } from './utils.js';
import { CHAVES_STORAGE, lerDados, salvarDados } from './storage.js';

const ROTULOS_CATEGORIA = {
  'ficcao': 'Ficção Científica',
  'fantasia': 'Fantasia',
  'terror': 'Terror',
  'nao-ficcao': 'Não Ficção',
  'desenvolvimento': 'Desenvolvimento Pessoal'
};

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
  // 3. Categoria principal + Tags
  const ulTags = clone.querySelector('.tags-categoria');
  const nomeCategoria = ROTULOS_CATEGORIA[produto.categoria] || produto.categoria;
  if (nomeCategoria) {
    const liCategoria = document.createElement('li');
    liCategoria.className = 'tag tag-categoria';
    liCategoria.textContent = nomeCategoria;
    ulTags.appendChild(liCategoria);
  }
  produto.tags.forEach((textoTag) => {
    // Evita exibir tag duplicada se for igual ao nome da categoria
    if (textoTag.toLowerCase() === nomeCategoria?.toLowerCase()) return;
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
  const todosProdutos = obterProdutosComEstoque();
  const lista = apenasDestaques
    ? todosProdutos.filter((p) => p.destaque)
    : todosProdutos;
  renderizarGradeProdutos(lista, grade);
}

// Executa automaticamente ao carregar o módulo na página
const gradePagina = document.querySelector('.grade-produtos');
if (gradePagina) {
  const apenasDestaques = gradePagina.dataset.apenasDestaques === 'true';
  inicializarCatalogo({ apenasDestaques });
}

/**
 * Retorna a lista de produtos sincronizada com o estoque atual do localStorage.
 * Na primeira execução, inicializa a chave de estoque no localStorage.
 * @returns {Array<Object>}
 */
export function obterProdutosComEstoque() {
  let mapaEstoque = lerDados(CHAVES_STORAGE.ESTOQUE, null);
  // Se ainda não existe estoque salvo no navegador, cria a partir dos produtos iniciais
  if (mapaEstoque === null) {
    mapaEstoque = {};
    PRODUTOS_INICIAIS.forEach((produto) => {
      mapaEstoque[produto.id] = produto.estoque;
    });
    salvarDados(CHAVES_STORAGE.ESTOQUE, mapaEstoque);
  }
  // Retorna uma cópia dos produtos substituindo o estoque pelo valor salvo no localStorage
  return PRODUTOS_INICIAIS.map((produto) => ({
    ...produto,
    estoque: mapaEstoque[produto.id] ?? produto.estoque
  }));
}