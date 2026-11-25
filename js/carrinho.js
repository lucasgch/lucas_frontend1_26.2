import { CHAVES_STORAGE, lerDados, salvarDados } from "./storage.js";
import { obterSessaoAtiva } from "./auth.js";
import { obterProdutosComEstoque } from "./produtos.js";
import {
  aplicarMascaraCEP,
  formatarFrete,
  formatarMoeda,
  limparNumeros,
} from "./utils.js";
import {
  definirMensagemEstado,
  mostrarToast,
  renderizarLinhaTabelaVazia,
} from "./ui.js";

/**
 * Retorna o identificador do dono do carrinho atual (ID do cliente logado ou 'visitante').
 * @returns {string}
 */
export function obterDonoCarrinhoAtual() {
  const sessao = obterSessaoAtiva(false);
  return sessao ? sessao.usuarioId : "visitante";
}

/**
 * Retorna a lista de itens do carrinho do usuário atual (ou 'visitante').
 * Cada item possui o formato: { produtoId: string, quantidade: number }.
 * @param {string} [donoId=obterDonoCarrinhoAtual()] - ID dono do carrinho atual.
 * @returns {Array<{produtoId: string, quantidade: number}>}
 */
export function obterCarrinho(donoId = obterDonoCarrinhoAtual()) {
  // Lê o dicionário de carrinhos no localStorage (ou {} se vazio)
  const todosOsCarrinhos = lerDados(CHAVES_STORAGE.CARRINHO, {});

  // Busca o array de itens do donoId ('visitante' por padrão)
  const itens = todosOsCarrinhos[donoId];

  // Garante que sempre retorna um Array (mesmo se não existir ou estiver corrompido)
  return Array.isArray(itens) ? itens : [];
}

/**
 * Salva a lista de itens no carrinho do usuário atual (ou 'visitante').
 * @param {Array<{produtoId: string, quantidade: number}>} itens - Lista de itens do carrinho.
 * @param {string} [donoId=obterDonoCarrinhoAtual()] - ID dono do carrinho atual.
 * @returns {boolean}
 */
export function salvarCarrinho(itens, donoId = obterDonoCarrinhoAtual()) {
  // Lê o dicionário de carrinhos no localStorage (ou {} se vazio)
  const todosOsCarrinhos = lerDados(CHAVES_STORAGE.CARRINHO, {});
  // Atualiza a lista de itens do donoId ('visitante' por padrão)
  todosOsCarrinhos[donoId] = itens;

  // Persiste o dicionário atualizado e retorna true em caso de sucesso
  return salvarDados(CHAVES_STORAGE.CARRINHO, todosOsCarrinhos);
}

/**
 * Adiciona um produto ao carrinho respeitando o limite de estoque disponível.
 * @param {string} produtoId - ID do produto (ex: 'P001').
 * @param {number} [quantidade=1] - Quantidade a adicionar.
 * @returns {{sucesso: boolean, mensagem: string}}
 */
export function adicionarAoCarrinho(produtoId, quantidade = 1) {
  const qtdAdicionar = Number(quantidade);

  // Verifica se a quantidade é válida
  if (!Number.isInteger(qtdAdicionar) || qtdAdicionar <= 0) {
    return { sucesso: false, mensagem: "Quantidade inválida" };
  }

  const produto = obterProdutosComEstoque().find((p) => p.id === produtoId);
  if (!produto) {
    return { sucesso: false, mensagem: "Produto não encontrado." };
  }

  // Busca os itens atuais do carrinho
  const itens = obterCarrinho();
  const itemExistente = itens.find((item) => item.produtoId === produtoId);
  const qtdAtualNoCarrinho = itemExistente ? itemExistente.quantidade : 0;
  const novaQuantidadeTotal = qtdAtualNoCarrinho + qtdAdicionar;

  // Valida o estoque e não permite exceder o estoque disponível
  if (novaQuantidadeTotal > produto.estoque) {
    return {
      sucesso: false,
      mensagem: `Estoque insuficiente! Você já tem ${qtdAtualNoCarrinho} no carrinho (máx: ${produto.estoque}).`,
    };
  }

  // Atualiza item presente no carrinho ou adiciona novo caso não existir
  if (itemExistente) {
    itemExistente.quantidade = novaQuantidadeTotal;
  } else {
    itens.push({ produtoId, quantidade: qtdAdicionar });
  }

  salvarCarrinho(itens);
  return {
    sucesso: true,
    mensagem: `"${produto.nome}" adicionado ao carrinho!`,
  };
}

/**
 * Altera diretamente a quantidade de um item já presente no carrinho.
 * @param {string} produtoId - ID do produto.
 * @param {number} novaQuantidade - Nova quantidade desejada.
 * @returns {{sucesso: boolean, mensagem: string}}
 */
export function alterarQuantidadeCarrinho(produtoId, novaQuantidade) {
  const qtd = Number(novaQuantidade);

  // Verifica se a quantidade é válida
  if (!Number.isInteger(qtd) || qtd < 1) {
    return { sucesso: false, mensagem: "Quantidade mínima é 1" };
  }

  // Verifica se o produto está no carrinho
  const produto = obterProdutosComEstoque().find((p) => p.id === produtoId);
  if (!produto) {
    return { sucesso: false, mensagem: "Produto não encontrado." };
  }

  // Verifique se há quantidade suficiente em estoque
  if (qtd > produto.estoque) {
    return {
      sucesso: false,
      mensagem: `Apenas ${produto.estoque} unidade(s) disponível(is) em estoque.`,
    };
  }

  const itens = obterCarrinho();
  const item = itens.find((i) => i.produtoId === produtoId);
  if (!item) {
    return { sucesso: false, mensagem: "Item não está no carrinho." };
  }

  item.quantidade = qtd;
  salvarCarrinho(itens);
  return { sucesso: true, mensagem: "Quantidade atualizada." };
}

/**
 * Remove um produto do carrinho.
 * @param {string} produtoId - ID do produto a ser removido.
 */
export function removerDoCarrinho(produtoId) {
  const itensAtuais = obterCarrinho();
  const itensRestantes = itensAtuais.filter(
    (item) => item.produtoId !== produtoId,
  );
  salvarCarrinho(itensRestantes);
}

/**
 * Atualiza o botão de carrinho com ícone e contador (badge) no menu de navegação.
 */
export function atualizarBadgeCarrinho() {
  const itens = obterCarrinho();
  const totalUnidades = itens.reduce((soma, item) => soma + item.quantidade, 0);
  let badge = document.getElementById("badge-carrinho");
  if (!badge) {
    const listaMenu = document.querySelector("#menu-principal ul");
    if (!listaMenu) return;
    const liCarrinho = document.createElement("li");
    liCarrinho.className = "item-menu-carrinho";
    const linkCarrinho = document.createElement("a");
    linkCarrinho.href = "loja.html#carrinho";
    linkCarrinho.className = "link-icone-carrinho";
    linkCarrinho.setAttribute("aria-label", "Ver meu carrinho de compras");
    // Ícone SVG minimalista de sacola/carrinho
    linkCarrinho.innerHTML = `
      <svg class="icone-carrinho-svg" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
        <path d="M3 6h18"/>
        <path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>
    `;
    badge = document.createElement("span");
    badge.id = "badge-carrinho";
    badge.className = "badge-carrinho";
    linkCarrinho.appendChild(badge);
    liCarrinho.appendChild(linkCarrinho);
    listaMenu.appendChild(liCarrinho);
  }
  badge.textContent = totalUnidades > 99 ? "99+" : totalUnidades;
  badge.hidden = totalUnidades === 0;
}

/**
 * Renderiza os itens do carrinho na tabela #tabela-carrinho e atualiza o total geral.
 */
export function renderizarCarrinho() {
  atualizarBadgeCarrinho();

  const tabela = document.getElementById("tabela-carrinho");
  if (!tabela) return;

  const tbody = tabela.querySelector("tbody");
  if (!tbody) return;
  const celulaTotal = document.getElementById("valor-total-carrinho");
  const celulaSubtotal = document.getElementById("valor-subtotal-carrinho");
  const celulaDesconto = document.getElementById("valor-desconto-carrinho");
  const celulaFrete = document.getElementById("valor-frete-carrinho");
  const btnFinalizar = document.getElementById("btn-finalizar-compra");
  const itensCarrinho = obterCarrinho();
  const catalogo = obterProdutosComEstoque();

  tbody.replaceChildren();

  if (itensCarrinho.length === 0) {
    renderizarLinhaTabelaVazia(tbody, 5, "Seu carrinho está vazio.");
    if (celulaTotal) celulaTotal.textContent = formatarMoeda(0);
    if (btnFinalizar) btnFinalizar.setAttribute("aria-disabled", "true");
    if (celulaSubtotal) celulaSubtotal.textContent = formatarMoeda(0);
    if (celulaDesconto) celulaDesconto.textContent = `- ${formatarMoeda(0)}`;
    if (celulaFrete) celulaFrete.textContent = "A calcular";
    return;
  }

  if (btnFinalizar) btnFinalizar.removeAttribute("aria-disabled");

  const fragmento = document.createDocumentFragment();

  itensCarrinho.forEach((item) => {
    const produto = catalogo.find((p) => p.id === item.produtoId);
    if (!produto) return;

    const subtotal = produto.preco * item.quantidade;

    const tr = document.createElement("tr");
    tr.dataset.produtoId = produto.id;

    // Coluna produto com imagem e nome
    const thProduto = document.createElement("th");
    thProduto.scope = "row";
    thProduto.className = "coluna-produto";

    const img = document.createElement("img");
    img.src = produto.imagem;
    img.alt = produto.alt || `Capa do livro ${produto.nome}`;
    img.className = "miniatura-carrinho";

    const spanNome = document.createElement("span");
    spanNome.className = "nome-produto-carrinho";
    spanNome.textContent = produto.nome;

    thProduto.append(img, spanNome);

    // Coluna Preço Unitário
    const tdPreco = document.createElement("td");
    tdPreco.className = "preco-unitario";
    tdPreco.textContent = formatarMoeda(produto.preco);

    // Coluna Quantidade (botões - e + limitados ao estoque)
    const tdQtd = document.createElement("td");
    tdQtd.className = "coluna-quantidade";

    const divSeletor = document.createElement("div");
    divSeletor.className = "seletor-quantidade";

    const btnMenos = document.createElement("button");
    btnMenos.type = "button";
    btnMenos.className = "btn-qtd btn-carrinho-menos";
    btnMenos.dataset.id = produto.id;
    btnMenos.textContent = "−";
    btnMenos.disabled = item.quantidade <= 1;
    btnMenos.setAttribute(
      "aria-label",
      `Diminuir quantidade de ${produto.nome}`,
    );

    const spanQtd = document.createElement("span");
    spanQtd.className = "qtd-valor-carrinho";
    spanQtd.textContent = item.quantidade;

    const btnMais = document.createElement("button");
    btnMais.type = "button";
    btnMais.className = "btn-qtd btn-carrinho-mais";
    btnMais.dataset.id = produto.id;
    btnMais.textContent = "+";
    btnMais.disabled = item.quantidade >= produto.estoque;
    btnMais.setAttribute(
      "aria-label",
      `Aumentar quantidade de ${produto.nome}`,
    );
    divSeletor.append(btnMenos, spanQtd, btnMais);
    tdQtd.appendChild(divSeletor);

    // Coluna Subtotal
    const tdSubtotal = document.createElement("td");
    tdSubtotal.className = "subtotal-item";
    tdSubtotal.textContent = formatarMoeda(subtotal);

    // Coluna Remover
    const tdAcoes = document.createElement("td");
    const btnRemover = document.createElement("button");
    btnRemover.type = "button";
    btnRemover.className = "botao botao-remover";
    btnRemover.dataset.id = produto.id;
    btnRemover.textContent = "Remover";
    btnRemover.setAttribute(
      "aria-label",
      `Remover ${produto.nome} do carrinho`,
    );
    tdAcoes.appendChild(btnRemover);
    tr.append(thProduto, tdPreco, tdQtd, tdSubtotal, tdAcoes);
    fragmento.appendChild(tr);
  });

  tbody.appendChild(fragmento);

  const resumo = obterResumoCarrinho();
  if (celulaSubtotal)
    celulaSubtotal.textContent = formatarMoeda(resumo.subtotal);
  if (celulaDesconto)
    celulaDesconto.textContent = `- ${formatarMoeda(resumo.desconto)}`;
  if (celulaFrete) {
    celulaFrete.textContent = formatarFrete(resumo.frete);
  }
  if (celulaTotal) {
    const strongTotal = document.createElement("strong");
    strongTotal.textContent = formatarMoeda(resumo.total);
    celulaTotal.replaceChildren(strongTotal);
  }
}

/**
 * Conecta os botões "Adicionar ao carrinho" da grade de produtos e do modal de detalhes.
 */
function inicializarBotoesAdicionarCarrinho() {
  const grade = document.querySelector(".grade-produtos");
  grade?.addEventListener("click", (evento) => {
    const btnAdicionar = evento.target.closest(".botao-adicionar");
    if (!btnAdicionar) return;
    const resultado = adicionarAoCarrinho(btnAdicionar.dataset.id, 1);
    mostrarToast(resultado.mensagem, resultado.sucesso ? "sucesso" : "erro");
    if (resultado.sucesso) renderizarCarrinho();
  });

  const btnModalAdicionar = document.getElementById("modal-btn-adicionar");
  btnModalAdicionar?.addEventListener("click", () => {
    const inputQtd = document.getElementById("modal-quantidade");
    const modal = document.getElementById("modal-produto");
    const qtd = Number(inputQtd?.value) || 1;
    const resultado = adicionarAoCarrinho(btnModalAdicionar.dataset.id, qtd);
    if (resultado.sucesso) {
      renderizarCarrinho();
      mostrarToast(resultado.mensagem, "sucesso");
      modal?.close();
    } else {
      const erroQtd = document.getElementById("modal-erro-qtd");
      if (erroQtd) {
        erroQtd.textContent = resultado.mensagem;
        erroQtd.hidden = false;
      }
    }
  });
}

/**
 * Conecta os botões de diminuir (-), aumentar (+) e remover itens na tabela do carrinho.
 */
function inicializarTabelaCarrinho() {
  const tabela = document.getElementById("tabela-carrinho");
  if (!tabela) return;

  tabela.addEventListener("click", (evento) => {
    const btnMenos = evento.target.closest(".btn-carrinho-menos");
    const btnMais = evento.target.closest(".btn-carrinho-mais");
    const btnPasso = btnMenos || btnMais;

    if (btnPasso) {
      const id = btnPasso.dataset.id;
      const delta = btnMenos ? -1 : 1;
      const item = obterCarrinho().find((i) => i.produtoId === id);
      if (item && item.quantidade + delta >= 1) {
        alterarQuantidadeCarrinho(id, item.quantidade + delta);
        renderizarCarrinho();
      }
      return;
    }

    const btnRemover = evento.target.closest(".botao-remover");
    if (btnRemover) {
      removerDoCarrinho(btnRemover.dataset.id);
      renderizarCarrinho();
      mostrarToast("Item removido do carrinho.", "info");
    }
  });
}

/**
 * Inicializa o campo de cupom de desconto e restaura o cupom salvo na sessão atual.
 * @param {{codigoCupom: string, subtotal: number}} resumoInicial
 */
function inicializarCupomCarrinho(resumoInicial) {
  const inputCupom = document.getElementById("input-cupom");
  const btnAplicarCupom = document.getElementById("btn-aplicar-cupom");
  const msgCupom = document.getElementById("msg-cupom");
  if (!inputCupom || !btnAplicarCupom) return;

  btnAplicarCupom.addEventListener("click", () => {
    const { subtotal } = obterResumoCarrinho();
    const res = validarCupom(inputCupom.value, subtotal);
    salvarExtrasCarrinho({ codigoCupom: res.valido ? res.cupom.codigo : "" });
    definirMensagemEstado(msgCupom, res.mensagem, res.valido ? "sucesso" : "erro");
    renderizarCarrinho();
  });

  if (resumoInicial.codigoCupom) {
    inputCupom.value = resumoInicial.codigoCupom;
    const resCupom = validarCupom(
      resumoInicial.codigoCupom,
      resumoInicial.subtotal,
    );
    if (resCupom.valido) {
      definirMensagemEstado(msgCupom, resCupom.mensagem, "sucesso");
    }
  }
}

/**
 * Inicializa o simulador de frete por CEP e restaura o CEP salvo na sessão atual.
 * @param {{cep: string, subtotal: number}} resumoInicial
 */
function inicializarFreteCarrinho(resumoInicial) {
  const inputCep = document.getElementById("input-cep-carrinho");
  const btnCalcularFrete = document.getElementById("btn-calcular-frete");
  const msgFrete = document.getElementById("msg-frete");
  if (!inputCep || !btnCalcularFrete) return;

  const formatarMensagemFrete = (res) =>
    `${res.regiao}: ${formatarFrete(res.valor)}`;

  inputCep.addEventListener("input", () => {
    inputCep.value = aplicarMascaraCEP(inputCep.value);
  });

  btnCalcularFrete.addEventListener("click", () => {
    const { subtotal } = obterResumoCarrinho();
    const res = calcularFretePorCep(inputCep.value, subtotal);
    salvarExtrasCarrinho({ cep: res.valido ? aplicarMascaraCEP(inputCep.value) : "" });
    definirMensagemEstado(
      msgFrete,
      res.valido ? formatarMensagemFrete(res) : res.mensagem,
      res.valido ? "sucesso" : "erro",
    );
    renderizarCarrinho();
  });

  if (resumoInicial.cep) {
    inputCep.value = resumoInicial.cep;
    const resFrete = calcularFretePorCep(
      resumoInicial.cep,
      resumoInicial.subtotal,
    );
    if (resFrete.valido) {
      definirMensagemEstado(msgFrete, formatarMensagemFrete(resFrete), "sucesso");
    }
  }
}

/**
 * Inicializa a renderização e todos os eventos interativos do carrinho na página atual.
 */
export function inicializarCarrinho() {
  renderizarCarrinho();
  inicializarBotoesAdicionarCarrinho();
  inicializarTabelaCarrinho();

  const resumoInicial = obterResumoCarrinho();
  inicializarCupomCarrinho(resumoInicial);
  inicializarFreteCarrinho(resumoInicial);
}

/**
 * Mescla os itens, cupom e CEP do carrinho do visitante ao carrinho do cliente ao efetuar login (Requisito 2.3d).
 * @param {string} usuarioId - ID do cliente autenticado.
 */
export function mesclarCarrinhoAoLogar(usuarioId) {
  const itensVisitante = obterCarrinho("visitante");
  const extrasVisitante = obterExtrasCarrinho("visitante");

  // Mescla cupom e CEP do visitante (se o visitante tiver preenchido algum)
  if (extrasVisitante.codigoCupom || extrasVisitante.cep) {
    const extrasCliente = obterExtrasCarrinho(usuarioId);
    salvarExtrasCarrinho(
      {
        codigoCupom: extrasVisitante.codigoCupom || extrasCliente.codigoCupom,
        cep: extrasVisitante.cep || extrasCliente.cep,
      },
      usuarioId,
    );
    salvarExtrasCarrinho({ codigoCupom: "", cep: "" }, "visitante");
  }

  // Se carrinho de itens do visitante estiver vazio, encerra aqui
  if (itensVisitante.length === 0) {
    return;
  }

  const itensCliente = obterCarrinho(usuarioId);
  const catalogo = obterProdutosComEstoque();

  for (const itemVis of itensVisitante) {
    const produto = catalogo.find((p) => p.id === itemVis.produtoId);
    if (!produto || produto.estoque <= 0) {
      continue;
    }
    const itemExistente = itensCliente.find(
      (item) => item.produtoId === itemVis.produtoId,
    );
    if (itemExistente) {
      itemExistente.quantidade = Math.min(
        itemExistente.quantidade + itemVis.quantidade,
        produto.estoque,
      );
    } else {
      itensCliente.push({
        produtoId: itemVis.produtoId,
        quantidade: Math.min(itemVis.quantidade, produto.estoque),
      });
    }
  }
  salvarCarrinho(itensCliente, usuarioId);
  salvarCarrinho([], "visitante");
}

// Constante de cupons
export const CUPONS_DISPONIVEIS = {
  LEITOR10: {
    codigo: "LEITOR10",
    tipo: "percentual",
    valor: 10,
    minimo: 50,
    validade: "2027-12-31",
    descricao: "10% de desconto",
  },
  LIVRO25: {
    codigo: "LIVRO25",
    tipo: "fixo",
    valor: 25,
    minimo: 120,
    validade: "2027-12-31",
    descricao: "R$ 25,00 de desconto",
  },
  FRETEGRATIS: {
    codigo: "FRETEGRATIS",
    tipo: "frete",
    valor: 0,
    minimo: 80,
    validade: "2027-12-31",
    descricao: "Frete grátis",
  },
  EXPIRADO20: {
    codigo: "EXPIRADO20",
    tipo: "percentual",
    valor: 20,
    minimo: 30,
    validade: "2025-01-01",
    descricao: "Cupom vencido",
  },
};

/**
 * Simula o valor do frete com base na faixa de CEP e aplica frete grátis acima de R$ 200,00 (Requisito 2.3f).
 * @param {string} cep - CEP informado com ou sem máscara.
 * @param {number} subtotal - Subtotal atual do carrinho.
 * @returns {{valido: boolean, valor: number, regiao?: string, mensagem?: string}}
 */
export function calcularFretePorCep(cep, subtotal) {
  const cepLimpo = limparNumeros(cep);
  if (cepLimpo.length !== 8) {
    return {
      valido: false,
      valor: 0,
      mensagem: "Digite um CEP válido com 8 números.",
    };
  }
  if (subtotal >= 200) {
    return {
      valido: true,
      valor: 0,
      regiao: "Frete Grátis (acima de R$ 200,00)",
    };
  }
  const primeiroDigito = Number(cepLimpo[0]);

  if (primeiroDigito >= 8) {
    return { valido: true, valor: 15, regiao: "Região Sul" };
  } else if (primeiroDigito <= 3) {
    return { valido: true, valor: 25, regiao: "Região Sudeste" };
  } else {
    return { valido: true, valor: 35, regiao: "Demais Regiões" };
  }
}

/**
 * Valida um código de cupom verificando existência, data de validade e valor mínimo (Requisito 2.3e).
 * @param {string} codigo - Código do cupom digitado.
 * @param {number} subtotal - Subtotal atual do carrinho.
 * @returns {{valido: boolean, cupom?: Object, mensagem: string}}
 */
export function validarCupom(codigo, subtotal) {
  const chave = String(codigo).trim().toUpperCase();
  const cupom = CUPONS_DISPONIVEIS[chave];
  if (!cupom) {
    return { valido: false, mensagem: "Cupom inválido ou inexistente." };
  }
  const dataLimite = new Date(`${cupom.validade}T23:59:59`);
  if (Date.now() > dataLimite.getTime()) {
    return { valido: false, mensagem: "Este cupom está expirado." };
  }
  if (subtotal < cupom.minimo) {
    return {
      valido: false,
      mensagem: `Valor mínimo para este cupom é ${formatarMoeda(cupom.minimo)}.`,
    };
  }
  return {
    valido: true,
    cupom,
    mensagem: `Cupom ${cupom.codigo} aplicado (${cupom.descricao})!`,
  };
}

/**
 * Lê o cupom e o CEP salvos para o dono do carrinho atual (ou 'visitante').
 * @param {string} [donoId=obterDonoCarrinhoAtual()]
 * @returns {{codigoCupom: string, cep: string}}
 */
export function obterExtrasCarrinho(donoId = obterDonoCarrinhoAtual()) {
  const todosOsCarrinhos = lerDados(CHAVES_STORAGE.CARRINHO, {});
  const extras = todosOsCarrinhos[`${donoId}:extras`];
  return {
    codigoCupom: extras?.codigoCupom || "",
    cep: extras?.cep || "",
  };
}

/**
 * Salva o cupom e/ou CEP ativos para o dono do carrinho atual (ou 'visitante').
 * @param {{codigoCupom?: string, cep?: string}} novosExtras
 * @param {string} [donoId=obterDonoCarrinhoAtual()]
 */
export function salvarExtrasCarrinho(
  novosExtras,
  donoId = obterDonoCarrinhoAtual(),
) {
  const todosOsCarrinhos = lerDados(CHAVES_STORAGE.CARRINHO, {});
  const atuais = todosOsCarrinhos[`${donoId}:extras`] || {
    codigoCupom: "",
    cep: "",
  };
  todosOsCarrinhos[`${donoId}:extras`] = { ...atuais, ...novosExtras };
  salvarDados(CHAVES_STORAGE.CARRINHO, todosOsCarrinhos);
}

/**
 * Consolida subtotal, desconto do cupom ativo, frete calculado e total final do carrinho.
 * @param {string} [cepAlternativo=''] - CEP opcional (ex: endereço do checkout) para cálculo do frete.
 * @returns {{subtotal: number, desconto: number, frete: number|null, total: number, codigoCupom: string, cep: string}}
 */
export function obterResumoCarrinho(cepAlternativo = "") {
  const itens = obterCarrinho();
  const catalogo = obterProdutosComEstoque();
  const extras = obterExtrasCarrinho();
  let codigoCupomAtivo = extras.codigoCupom;
  const cepAtivo = cepAlternativo || extras.cep;
  // Soma o subtotal de todos os itens do carrinho
  let subtotal = 0;
  for (const item of itens) {
    const produto = catalogo.find((p) => p.id === item.produtoId);
    if (produto) {
      subtotal += produto.preco * item.quantidade;
    }
  }
  // Calcula o desconto do cupom (se houver cupom ativo)
  let desconto = 0;
  let cupomFreteGratis = false;
  if (codigoCupomAtivo && subtotal > 0) {
    const resCupom = validarCupom(codigoCupomAtivo, subtotal);
    if (resCupom.valido) {
      if (resCupom.cupom.tipo === "percentual") {
        desconto = subtotal * (resCupom.cupom.valor / 100);
      } else if (resCupom.cupom.tipo === "fixo") {
        desconto = Math.min(resCupom.cupom.valor, subtotal);
      } else if (resCupom.cupom.tipo === "frete") {
        cupomFreteGratis = true;
      }
    } else {
      // Se o subtotal caiu abaixo do mínimo do cupom, desativa o cupom salvo
      codigoCupomAtivo = "";
      salvarExtrasCarrinho({ codigoCupom: "" });
    }
  }
  // Calcula frete (se o usuário informou um CEP)
  let frete = null;
  if (cepAtivo && subtotal > 0) {
    const resFrete = calcularFretePorCep(cepAtivo, subtotal);
    if (resFrete.valido) {
      frete = cupomFreteGratis ? 0 : resFrete.valor;
    }
  } else if (cupomFreteGratis && subtotal > 0) {
    frete = 0;
  }
  // Calcula o total
  const total = Math.max(0, subtotal - desconto + (frete || 0));
  return {
    subtotal,
    desconto,
    frete,
    total,
    codigoCupom: codigoCupomAtivo,
    cep: cepAtivo,
  };
}

/**
 * Esvazia o carrinho do usuário atual e limpa o cupom/CEP ativos após finalizar uma compra.
 */
export function limparCarrinhoAtual() {
  salvarExtrasCarrinho({ codigoCupom: "", cep: "" });
  salvarCarrinho([]);
  renderizarCarrinho();
}

// Executa ao carregar a página
inicializarCarrinho();
