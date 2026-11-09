import { CHAVES_STORAGE, lerDados, salvarDados } from './storage.js';

/**
 * Retorna a lista de itens do carrinho do usuário atual (ou 'visitante').
 * Cada item possui o formato: { produtoId: string, quantidade: number }.
 * @param {string} [donoId='visitante'] - ID do cliente logado ou 'visitante'.
 * @returns {Array<{produtoId: string, quantidade: number}>}
 */
export function obterCarrinho(donoId = 'visitante'){
  // 1. Lê o dicionário de carrinhos no localStorage (ou {} se vazio)
  const todosOsCarrinhos = lerDados(CHAVES_STORAGE.CARRINHO, {});
  
  // 2. Busca o array de itens do donoId ('visitante' por padrão)
  const itens = todosOsCarrinhos[donoId];
  
  // 3. Garante que sempre retorna um Array (mesmo se não existir ou estiver corrompido)
  return Array.isArray(itens) ? itens : [];
}

export function salvarCarrinho(itens){
    /** TODO */
}

export function alterarQuantidadeCarrinho(produtoId, novaQuantidade){
    /** TODO */
}


export function removerDoCarrinho(produtoId){
    /** TODO */
}