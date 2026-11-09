import { CHAVES_STORAGE, lerDados, salvarDados } from './storage.js';
import { obterProdutosComEstoque } from './produtos.js';

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