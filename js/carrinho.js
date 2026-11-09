import { CHAVES_STORAGE, lerDados, salvarDados } from './storage.js';
import { obterProdutosComEstoque } from './produtos.js';
import { formatarMoeda } from './utils.js';

/**
 * Retorna a lista de itens do carrinho do usuário atual (ou 'visitante').
 * Cada item possui o formato: { produtoId: string, quantidade: number }.
 * @param {string} [donoId='visitante'] - ID do cliente logado ou 'visitante'.
 * @returns {Array<{produtoId: string, quantidade: number}>}
 */
export function obterCarrinho(donoId = 'visitante'){

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
 * @param {string} [donoId='visitante'] - ID do cliente logado ou 'visitante'.
 * @returns {boolean}
 */
export function salvarCarrinho(itens, donoId = 'visitante') {

    // Lê o dicionário de carrinhos no localStorage (ou {} se vazio)
    const todosOsCarrinhos = lerDados(CHAVES_STORAGE.CARRINHO, {});
    // Busca o array de itens do donoId ('visitante' por padrão)
    todosOsCarrinhos[donoId] = itens;
  
    // Garante que sempre retorna um Array (mesmo se não existir ou estiver corrompido)
    return salvarDados(CHAVES_STORAGE.CARRINHO, todosOsCarrinhos);
}

/**
 * Adiciona um produto ao carrinho respeitando o limite de estoque disponível.
 * @param {string} produtoId - ID do produto (ex: 'P001').
 * @param {number} [quantidade=1] - Quantidade a adicionar.
 * @returns {{sucesso: boolean, mensagem: string}}
 */
export function adicionarAoCarrinho(produtoId, quantidade = 1){
    const qtdAdicionar = Number(quantidade);
    
    // Verifica se a quantidade é válida
    if (!Number.isInteger(qtdAdicionar) || qtdAdicionar <= 0){
        return { sucesso: false, mensagem: 'Quantidade inválida' };
    }
    
    const produto = obterProdutosComEstoque().find((p) => p.id === produtoId);

    // Busca os itens atuais do carrinho
    const itens = obterCarrinho();
    const itemExistente = itens.find((item) => item.produtoId === produtoId);
    const qtdAtualNoCarrinho = itemExistente ? itemExistente.quantidade : 0;
    const novaQuantidadeTotal = qtdAtualNoCarrinho + qtdAdicionar;    

    // Valida o estoque e não permite exceder o estoque disponível
    if (novaQuantidadeTotal > produto.estoque) {
        return {
            sucesso: false, mensagem: `Estoque insuficiente! Você já tem ${qtdAtualNoCarrinho} no carrinho (máx: ${produto.estoque}).`
        };
    }

    // Atualiza intem presente no carrinho ou adiciona novo caso não existir
    if (itemExistente) {
        itemExistente.quantidade = novaQuantidadeTotal;
    } else {
        itens.push({ produtoId, quantidade: qtdAdicionar});
    }

    salvarCarrinho(itens);
    return { sucesso: true, mensagem: `"${produto.nome}" adicionado ao carrinho!` };
}

/**
 * Altera diretamente a quantidade de um item já presente no carrinho.
 * @param {string} produtoId - ID do produto.
 * @param {number} novaQuantidade - Nova quantidade desejada.
 * @returns {{sucesso: boolean, mensagem: string}}
 */
export function alterarQuantidadeCarrinho(produtoId, novaQuantidade){
    const qtd = Number(novaQuantidade);
    
    // Verifica se a quantidade é válida
    if(!Number.isInteger(qtd) || qtd <1 ){
        return { sucesso: false, mensagem: 'Quantidade mínima é 1' };
    }

    // Verifica se o produto está no carrinho
    const produto = obterProdutosComEstoque().find((p) => p.id === produtoId);
    if (!produto) {
        return { sucesso: false, mensagem: 'Produto não encontrado.' };
    }

    // Verifique se há quantidade suficiente em estoque
    if (qtd > produto.estoque) {
        return { sucesso: false, mensagem: `Apenas ${produto.estoque} unidade(s) disponível(is) em estoque.` };
    }

    const itens = obterCarrinho();
    const item = itens.find((i) => i.produtoId === produtoId);
    if (!item) {
        return { sucesso: false, mensagem: 'Item não está no carrinho.' }
    }

    item.quantidade = qtd;
    salvarCarrinho(itens);
    return { sucesso: true, mensagem: 'Quantidade atualizada.'}
    
}

/**
 * Remove um produto do carrinho.
 * @param {string} produtoId - ID do produto a ser removido.
 */
export function removerDoCarrinho(produtoId){
    const itensAtuais = obterCarrinho();
    const itensRestantes = itensAtuais.filter((item) => item.produtoId !== produtoId);
    salvarCarrinho(itensRestantes);
}

/**
 * Atualiza o contador (badge) de itens do carrinho no menu de navegação.
 */
export function atualizarBadgeCarrinho() {
  const itens = obterCarrinho();
  const totalUnidades = itens.reduce((soma, item) => soma + item.quantidade, 0);
  let badge = document.getElementById('badge-carrinho');
  // Se o badge ainda não existe no menu, cria dentro do link "Loja"
  if (!badge) {
    const linkLoja = document.querySelector('#menu-principal a[href="loja.html"]');
    if (!linkLoja) return;
    badge = document.createElement('span');
    badge.id = 'badge-carrinho';
    badge.className = 'badge-carrinho';
    linkLoja.appendChild(badge);
  }
  badge.textContent = totalUnidades;
  badge.hidden = totalUnidades === 0;
}

/**
 * Renderiza os itens do carrinho na tabela #tabela-carrinho e atualiza o total geral.
 */
export function renderizarCarrinho() {
    atualizarBadgeCarrinho();

     const tabela = document.getElementById('tabela-carrinho');
     if (!tabela) return;

     const tbody = tabela.querySelector('tbody');
     const celulaTotal = document.getElementById('valor-total-carrinho');
     const btnFinalizar = document.getElementById('btn-finalizar-compra');
     const itensCarrinho = obterCarrinho();
     const catalogo = obterProdutosComEstoque();

     tbody.replaceChildren();

     if (itensCarrinho = length === 0) {
        const trVazia = document.createElement('tr');
        const tdVazia = document.createElement('td');
        tdVazia.colSpan = 5;
        tdVazia.textContent = 'Seu carrinho está vazio.';
        trVazia.appendChild(tdVazia);
        tbody.appendChild(trVazia);
        return;
     }

     if (btnFinalizar) btnFinalizar.removeAttribute('aria-disabled');
     
     let totalGeral = 0;
     const fragmento = document.createDocumentFragment();

     itensCarrinho.forEach((item) => {
        const produto = catalogo.find((p) => p.id === item.produtoId);
        if (!produto) return;

        const subtotal = produto.preco * item.quantidade;
        totalGeral += subtotal;

        const tr = document.createElement('tr');
        tr.dataset.produtoId = produto.id;

        // Coluna produto com imagem e nome
        const thProduto = document.createElement('th');
        thProduto.scope = 'row';
        thProduto.className = 'coluna-produto';

        const img = document.createElement('th');
        img.src = produto.imagem;
        img.alt = produto.alt || 'Capa do livro $(produto.nome)';
        img.className = 'miniatura-carrinho';

        const spanNome = document.createElement('span');
        spanNome.className = 'nome-produto-carrinho';
        spanNome.textContent = produto.nome;

        thProduto.append(img, spanNome);

        // 2. Coluna Preço Unitário
        const tdPreco = document.createElement('td');
        tdPreco.className = 'preco-unitario';
        tdPreco.textContent = formatarMoeda(produto.preco);

        // 3. Coluna Quantidade (botões - e + limitados ao estoque)
        const tdQtd = document.createElement('td');
        tdQtd.className = 'coluna-quantidade';

        const divSeletor = document.createElement('div');
        divSeletor.className = 'seletor-quantidade';

        const btnMenos = document.createElement('button');
        btnMenos.type = 'button';
        btnMenos.className = 'btn-qtd btn-carrinho-menos';
        btnMenos.dataset.id = produto.id;
        btnMenos.textContent = '−';
        btnMenos.disabled = item.quantidade <= 1;
        btnMenos.setAttribute('aria-label', `Diminuir quantidade de ${produto.nome}`);

        const spanQtd = document.createElement('span');
        spanQtd.className = 'qtd-valor-carrinho';
        spanQtd.textContent = item.quantidade;

        const btnMais = document.createElement('button');
        btnMais.type = 'button';
        btnMais.className = 'btn-qtd btn-carrinho-mais';
        btnMais.dataset.id = produto.id;
        btnMais.textContent = '+';
        btnMais.disabled = item.quantidade >= produto.estoque;
        btnMais.setAttribute('aria-label', `Aumentar quantidade de ${produto.nome}`);
        divSeletor.append(btnMenos, spanQtd, btnMais);
        tdQtd.appendChild(divSeletor);

        // 4. Coluna Subtotal
        const tdSubtotal = document.createElement('td');
        tdSubtotal.className = 'subtotal-item';
        tdSubtotal.textContent = formatarMoeda(subtotal);
        
        // 5. Coluna Remover
        const tdAcoes = document.createElement('td');
        const btnRemover = document.createElement('button');
                btnRemover.type = 'button';
        btnRemover.className = 'botao botao-remover';
        btnRemover.dataset.id = produto.id;
        btnRemover.textContent = 'Remover';
        btnRemover.setAttribute('aria-label', `Remover ${produto.nome} do carrinho`);
        tdAcoes.appendChild(btnRemover);
        tr.append(thProduto, tdPreco, tdQtd, tdSubtotal, tdAcoes);
        fragmento.appendChild(tr);
     });

     tbody.appendChild(framento);

     if (celulaTotal) {
        const strongTotal = document.createElement('strong');
        strongTotal.textContent = formatarMoeda(totalGeral);
        celulaTotal.replaceChildren(strongTotal);
    }
}