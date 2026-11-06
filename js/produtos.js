// js/produtos.js
import { PRODUTOS_INICIAIS } from './data/produtos.js';
import { formatarMoeda, normalizarTexto, debounce } from './utils.js';
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
  inicializarFiltrosLoja();
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

/**
 * Verifica se o preço de um produto está dentro da faixa selecionada.
 * @param {number} preco - Preço do produto.
 * @param {string} faixa - Faixa selecionada ('0-50', '50-100', '100-200', '200+' ou '').
 * @returns {boolean}
 */
function verificarFaixaPreco(preco, faixa) {
  if (!faixa) return true;
  if (faixa === '0-50') return preco <= 50;
  if (faixa === '50-100') return preco >= 50 && preco <= 100;
  if (faixa === '100-200') return preco >= 100 && preco <= 200;
  if (faixa === '200+') return preco >= 200;
  return true;
}

/**
 * Filtra e ordena uma lista de produtos com base nos critérios informados.
 * @param {Array<Object>} produtos - Lista completa de produtos.
 * @param {Object} filtros - Critérios de filtragem e ordenação.
 * @returns {Array<Object>} Lista filtrada e ordenada.
 */
export function filtrarEOrdenarProdutos(produtos, { termo = '', categoria = '', faixaPreco = '', ordem = 'destaque' } = {}) {
  const termoNormalizado = normalizarTexto(termo);
  // 1. Filtra os produtos que atendem a todos os critérios
  const filtrados = produtos.filter((produto) => {
    const bateTexto =
      !termoNormalizado ||
      normalizarTexto(produto.nome).includes(termoNormalizado) ||
      normalizarTexto(produto.autor).includes(termoNormalizado) ||
      normalizarTexto(produto.descricao).includes(termoNormalizado);
    const bateCategoria = !categoria || produto.categoria === categoria;
    const batePreco = verificarFaixaPreco(produto.preco, faixaPreco);
    return bateTexto && bateCategoria && batePreco;
  });
  // 2. Ordena a lista filtrada conforme a opção escolhida
  if (ordem === 'menor-preco') {
    filtrados.sort((a, b) => a.preco - b.preco);
  } else if (ordem === 'maior-preco') {
    filtrados.sort((a, b) => b.preco - a.preco);
  } else if (ordem === 'titulo-az') {
    filtrados.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
  return filtrados;
}

export function inicializarFiltrosLoja() {
  const formFiltros = document.getElementById('form-filtros');
  const grade = document.querySelector('.grade-produtos');
  if (!formFiltros || !grade) return;
  const campoBusca = document.getElementById('campo-busca-livros');
  const selectCategoria = document.getElementById('filtro-categoria');
  const selectPreco = document.getElementById('filtro-preco');
  const selectOrdem = document.getElementById('filtro-ordem');
  function aplicarFiltros() {
    const todosProdutos = obterProdutosComEstoque();
    const resultado = filtrarEOrdenarProdutos(todosProdutos, {
      termo: campoBusca.value,
      categoria: selectCategoria.value,
      faixaPreco: selectPreco.value,
      ordem: selectOrdem.value
    });
    renderizarGradeProdutos(resultado, grade);
  }
  // Impede o formulário de recarregar a página ao dar Enter ou clicar em Buscar
  formFiltros.addEventListener('submit', (evento) => {
    evento.preventDefault();
    aplicarFiltros();
  });
  // Busca em tempo real com debounce ao digitar
  campoBusca.addEventListener('input', debounce(aplicarFiltros, 300));
  // Atualiza imediatamente ao mudar qualquer select
  selectCategoria.addEventListener('change', aplicarFiltros);
  selectPreco.addEventListener('change', aplicarFiltros);
  selectOrdem.addEventListener('change', aplicarFiltros);
  // Restaura todos os livros ao clicar no botão "Limpar" (reset)
  formFiltros.addEventListener('reset', () => {
    setTimeout(aplicarFiltros, 0);
  });
}