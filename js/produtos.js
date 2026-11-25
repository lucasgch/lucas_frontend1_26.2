// js/produtos.js
import { PRODUTOS_INICIAIS } from "./data/produtos.js";
import {
  formatarMoeda,
  normalizarTexto,
  debounce,
  limparNumeros,
} from "./utils.js";
import { CHAVES_STORAGE, lerDados, salvarDados } from "./storage.js";

const ROTULOS_CATEGORIA = {
  ficcao: "Ficção Científica",
  fantasia: "Fantasia",
  terror: "Terror",
  "nao-ficcao": "Não Ficção",
  desenvolvimento: "Desenvolvimento Pessoal",
};

/**
 * Cria o elemento <li> de um produto a partir do <template>
 * @param {Object} produto
 * @returns {HTMLLIElement|null}
 */
export function criarCardProduto(produto) {
  const template = document.getElementById("template-card-produto");
  if (!template) return null;
  const clone = template.content.cloneNode(true);
  const li = clone.querySelector(".item-produto");
  const card = clone.querySelector(".card-produto");
  card.dataset.produtoId = produto.id; // guarda o ID (ex: "P001") no elemento
  // 1. Imagem
  const img = clone.querySelector("img");
  img.src = produto.imagem;
  img.alt = produto.alt || `Livro ${produto.nome}`;
  // 2. Textos principais (usando textContent por segurança)
  clone.querySelector(".titulo-livro").textContent = produto.nome;
  clone.querySelector(".autor-livro").textContent = produto.autor;
  clone.querySelector(".descricao").textContent = produto.descricao;
  clone.querySelector(".preco").textContent = formatarMoeda(produto.preco);
  // 3. Categoria principal + Tags
  const ulTags = clone.querySelector(".tags-categoria");
  const nomeCategoria =
    ROTULOS_CATEGORIA[produto.categoria] || produto.categoria;
  if (nomeCategoria) {
    const liCategoria = document.createElement("li");
    liCategoria.className = "tag tag-categoria";
    liCategoria.textContent = nomeCategoria;
    ulTags.appendChild(liCategoria);
  }
  produto.tags.forEach((textoTag) => {
    // Evita exibir tag duplicada se for igual ao nome da categoria
    if (textoTag.toLowerCase() === nomeCategoria?.toLowerCase()) return;
    const liTag = document.createElement("li");
    liTag.className = "tag";
    liTag.textContent = textoTag;
    ulTags.appendChild(liTag);
  });

  // Botão de adicionar ao carrinho (desabilita se estoque for 0)
  const btnAdicionar = clone.querySelector(".botao-adicionar");

  // Botão de ver detalhes do produto
  const btnDetalhes = clone.querySelector(".botao-detalhes");

  btnDetalhes.dataset.id = produto.id;
  btnAdicionar.dataset.id = produto.id;
  if (produto.estoque <= 0) {
    btnAdicionar.disabled = true;
    btnAdicionar.textContent = "Esgotado";
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
    const aviso = document.createElement("li");
    aviso.className = "mensagem-vazia";
    aviso.textContent = "Nenhum livro encontrado para os filtros selecionados.";
    container.appendChild(aviso);
    return;
  }
  // Usa DocumentFragment para inserir todos os livros no DOM de uma só vez
  const fragmento = document.createDocumentFragment();
  produtos.forEach((produto) => {
    const card = criarCardProduto(produto);
    if (card) fragmento.appendChild(card); // Verifica se o elemento existe
  });
  container.appendChild(fragmento);
}

/**
 * Inicializa a renderização do catálogo na página atual
 * @param {Object} [opcoes]
 * @param {boolean} [opcoes.apenasDestaques=false]
 */
export function inicializarCatalogo({ apenasDestaques = false } = {}) {
  const grade = document.querySelector(".grade-produtos");
  if (!grade) return;
  const todosProdutos = obterProdutosComEstoque();
  const lista = apenasDestaques
    ? todosProdutos.filter((p) => p.destaque)
    : todosProdutos;
  renderizarGradeProdutos(lista, grade);
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
    estoque: mapaEstoque[produto.id] ?? produto.estoque,
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
  if (faixa === "0-50") return preco <= 50;
  if (faixa === "50-100") return preco >= 50 && preco <= 100;
  if (faixa === "100-200") return preco >= 100 && preco <= 200;
  if (faixa === "200+") return preco >= 200;
  return true;
}

/**
 * Filtra e ordena uma lista de produtos com base nos critérios informados.
 * @param {Array<Object>} produtos - Lista completa de produtos.
 * @param {Object} [filtros={}] - Critérios de filtragem e ordenação.
 * @param {string} [filtros.termo=''] - Termo de busca (nome, autor ou descrição).
 * @param {string} [filtros.categoria=''] - Categoria selecionada (ex: 'ficcao', 'fantasia', 'terror', 'nao-ficcao', 'desenvolvimento').
 * @param {string} [filtros.faixaPreco=''] - Faixa de preço ('', '0-50', '50-100', '100-200' ou '200+').
 * @param {string} [filtros.ordem='destaque'] - Ordenação ('destaque', 'menor-preco', 'maior-preco' ou 'titulo-az').
 * @returns {Array<Object>} Lista filtrada e ordenada.
 */
export function filtrarEOrdenarProdutos(
  produtos,
  { termo = "", categoria = "", faixaPreco = "", ordem = "destaque" } = {},
) {
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
  if (ordem === "menor-preco") {
    filtrados.sort((a, b) => a.preco - b.preco);
  } else if (ordem === "maior-preco") {
    filtrados.sort((a, b) => b.preco - a.preco);
  } else if (ordem === "titulo-az") {
    filtrados.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }
  return filtrados;
}

/**
 * Lê os filtros ativos da loja, consulta o estoque atualizado e re-renderiza a grade de produtos.
 */
export function aplicarFiltrosLoja() {
  const grade = document.querySelector(".grade-produtos");
  const campoBusca = document.getElementById("campo-busca-livros");
  const selectCategoria = document.getElementById("filtro-categoria");
  const selectPreco = document.getElementById("filtro-preco");
  const selectOrdem = document.getElementById("filtro-ordem");
  if (!grade || !campoBusca || !selectCategoria || !selectPreco || !selectOrdem)
    return;
  const todosProdutos = obterProdutosComEstoque();
  const resultado = filtrarEOrdenarProdutos(todosProdutos, {
    termo: campoBusca.value,
    categoria: selectCategoria.value,
    faixaPreco: selectPreco.value,
    ordem: selectOrdem.value,
  });
  renderizarGradeProdutos(resultado, grade);
}

/**
 * Registra os eventos do formulário de busca, filtros e ordenação da loja (executar uma única vez).
 */
export function inicializarFiltrosLoja() {
  const formFiltros = document.getElementById("form-filtros");
  const campoBusca = document.getElementById("campo-busca-livros");
  const selectCategoria = document.getElementById("filtro-categoria");
  const selectPreco = document.getElementById("filtro-preco");
  const selectOrdem = document.getElementById("filtro-ordem");
  if (!formFiltros) return;
  formFiltros.addEventListener("submit", (evento) => {
    evento.preventDefault();
    aplicarFiltrosLoja();
  });
  campoBusca?.addEventListener("input", debounce(aplicarFiltrosLoja, 300));
  selectCategoria?.addEventListener("change", aplicarFiltrosLoja);
  selectPreco?.addEventListener("change", aplicarFiltrosLoja);
  selectOrdem?.addEventListener("change", aplicarFiltrosLoja);
  formFiltros.addEventListener("reset", () => {
    setTimeout(aplicarFiltrosLoja, 0);
  });
}

/**
 * Preenche os dados de um produto no <dialog> e abre o modal.
 * @param {string} produtoId - ID do produto (ex: 'P001').
 */
export function abrirModalProduto(produtoId) {
  const modal = document.getElementById("modal-produto");
  if (!modal) return;

  // 1. Busca o produto pelo ID na lista atualizada com estoque
  const produto = obterProdutosComEstoque().find((p) => p.id === produtoId);
  if (!produto) return;

  // 2. Preenche imagem e textos no modal
  const img = document.getElementById("modal-img");
  img.src = produto.imagem;
  img.alt = produto.alt || `Livro ${produto.nome}`;

  document.getElementById("modal-titulo-livro").textContent = produto.nome;
  document.getElementById("modal-autor").textContent = produto.autor;
  document.getElementById("modal-descricao").textContent = produto.descricao;
  document.getElementById("modal-preco").textContent = formatarMoeda(
    produto.preco,
  );
  document.getElementById("modal-estoque").textContent =
    produto.estoque > 0
      ? `Estoque disponível: ${produto.estoque} un.`
      : "Produto esgotado";

  // 3. Configura o seletor de quantidade e o botão de adicionar
  const inputQtd = document.getElementById("modal-quantidade");
  const btnMenos = document.getElementById("modal-qtd-menos");
  const btnMais = document.getElementById("modal-qtd-mais");
  const btnAdicionar = document.getElementById("modal-btn-adicionar");
  const erroQtd = document.getElementById("modal-erro-qtd");
  if (!inputQtd || !btnAdicionar) return; // Verifica se os elementos existem
  if (erroQtd) {
    erroQtd.textContent = "";
  }
  btnAdicionar.dataset.id = produto.id;
  if (produto.estoque > 0) {
    inputQtd.value = 1;
    inputQtd.max = produto.estoque;
    inputQtd.disabled = false;
    if (btnMenos) btnMenos.disabled = true; // começa em 1, então '-' começa travado
    if (btnMais) btnMais.disabled = produto.estoque <= 1; // destrava o '+' se estoque for > 1!
    btnAdicionar.disabled = false;
    btnAdicionar.textContent = "Adicionar ao carrinho";
  } else {
    inputQtd.value = 0;
    inputQtd.disabled = true;
    if (btnMenos) btnMenos.disabled = true;
    if (btnMais) btnMais.disabled = true;
    btnAdicionar.disabled = true;
    btnAdicionar.textContent = "Esgotado";
  }

  // 4. Abre o <dialog> nativo na tela
  modal.showModal();
}

const TECLAS_BLOQUEADAS_QUANTIDADE = ["-", "+", "e", "E", ".", ","];

/**
 * Sanitiza o campo de quantidade do modal e atualiza o estado dos botões (-, + e Adicionar) e mensagem de erro.
 * @param {Object} elementos
 * @param {HTMLInputElement} elementos.inputQtd
 * @param {HTMLButtonElement|null} elementos.btnMenos
 * @param {HTMLButtonElement|null} elementos.btnMais
 * @param {HTMLButtonElement|null} elementos.btnAdicionar
 * @param {HTMLElement|null} elementos.erroQtd
 */
function atualizarEstadoQuantidadeModal({
  inputQtd,
  btnMenos,
  btnMais,
  btnAdicionar,
  erroQtd,
}) {
  inputQtd.value = limparNumeros(inputQtd.value);
  const qtd = Number(inputQtd.value);
  const maxEstoque = Number(inputQtd.max);

  const excedeuEstoque = qtd > maxEstoque;
  const quantidadeValida =
    Number.isInteger(qtd) && qtd > 0 && !excedeuEstoque;

  if (btnMenos) btnMenos.disabled = qtd <= 1;
  if (btnMais) btnMais.disabled = qtd >= maxEstoque;
  if (btnAdicionar) btnAdicionar.disabled = !quantidadeValida;

  if (erroQtd) {
    erroQtd.textContent = excedeuEstoque
      ? `Máximo disponível: ${maxEstoque} un.`
      : "";
    erroQtd.hidden = !excedeuEstoque;
  }
}

/**
 * Inicializa os eventos de digitação e botões (- e +) do seletor de quantidade do modal.
 */
function inicializarSeletorQuantidadeModal() {
  const inputQtd = document.getElementById("modal-quantidade");
  if (!inputQtd) return;

  const elementos = {
    inputQtd,
    btnMenos: document.getElementById("modal-qtd-menos"),
    btnMais: document.getElementById("modal-qtd-mais"),
    btnAdicionar: document.getElementById("modal-btn-adicionar"),
    erroQtd: document.getElementById("modal-erro-qtd"),
  };

  const validar = () => atualizarEstadoQuantidadeModal(elementos);

  const ajustarQuantidade = (delta) => {
    const maxEstoque = Number(inputQtd.max);
    if (maxEstoque < 1) return;
    const atual = Number(inputQtd.value) || 0;
    const novaQtd = Math.min(maxEstoque, Math.max(1, atual + delta));
    inputQtd.value = String(novaQtd);
    validar();
  };

  inputQtd.addEventListener("input", validar);
  inputQtd.addEventListener("keydown", (evento) => {
    if (TECLAS_BLOQUEADAS_QUANTIDADE.includes(evento.key)) {
      evento.preventDefault();
    }
  });
  elementos.btnMenos?.addEventListener("click", () => ajustarQuantidade(-1));
  elementos.btnMais?.addEventListener("click", () => ajustarQuantidade(1));
}

/**
 * Configura os cliques para abrir e fechar o modal de detalhes do produto e inicializa seu seletor de quantidade.
 */
export function inicializarModalProduto() {
  const modal = document.getElementById("modal-produto");
  const grade = document.querySelector(".grade-produtos");
  const btnFechar = document.getElementById("btn-fechar-modal");
  if (!modal || !grade) return;

  grade.addEventListener("click", (evento) => {
    const btnDetalhes = evento.target.closest(".botao-detalhes");
    if (btnDetalhes) {
      abrirModalProduto(btnDetalhes.dataset.id);
    }
  });

  btnFechar?.addEventListener("click", () => {
    modal.close();
  });

  inicializarSeletorQuantidadeModal();
}

// Executa automaticamente ao carregar o módulo na página
const gradePagina = document.querySelector(".grade-produtos");
if (gradePagina) {
  const apenasDestaques = gradePagina.dataset.apenasDestaques === "true";
  inicializarCatalogo({ apenasDestaques });
  inicializarFiltrosLoja();
  inicializarModalProduto();
}
