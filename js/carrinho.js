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
    if(!Number.isInteger(qtdAdicionar || qtdAdicionar <=0 )){
        return { sucesso: false, mensagem: 'Quantidade inválida' };
    }

    // Busca os itens atuais do carrinho
    const itens = obterCarrinho();
    const itemExistente = itens.find((item) => item.produtoId === produtoId);
    const qtdAtualNoCarrinho = itemExistente ? itemExistente.quantidade : 0;
    const novaQuantidadeTotal = qtdAtualNoCarrinho + qtdAdicionar;    

    // Valida o estoque e não permite exceder o estoque disponível
    if (novaQuantidadeTotal > poduto.estoque) {
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

export function alterarQuantidadeCarrinho(produtoId, novaQuantidade){
    /** TODO */
}


export function removerDoCarrinho(produtoId){
    /** TODO */
}