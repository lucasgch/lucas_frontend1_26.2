export const VERSAO_STORAGE = '1.0';
export const CHAVES_STORAGE = Object.freeze({
  VERSAO: 'lojaLivros:versao',
  CONTADORES: 'lojaLivros:contadores',
  ESTOQUE: 'lojaLivros:estoque'
  // TODO adicionar CLIENTES, SESSAO, TENTATIVAS_LOGIN, ESTOQUE, CARRINHO, COMPRAS, MENSAGENS, TEMA e etc...
});

/**
 * Lê um dado do localStorage e converte de JSON para o tipo original.
 * @param {string} chave - Nome da chave no localStorage.
 * @param {*} valorPadrao - Valor retornado caso a chave não exista ou esteja corrompida.
 * @returns {*} O dado convertido ou o valorPadrao.
 */
export function lerDados(chave, valorPadrao = null){
  try{
    // 1. Busca o texto bruto no localStorage usando a 'chave'
    const textoSalvo = localStorage.getItem(chave);
    // 2. Se não existir nada salvo (for estritamente igual a null), retorna o valorPadrao
    if (textoSalvo === null) {
      return valorPadrao;
    }
  } catch (erro) {
    // 4. Se o JSON estiver corrompido, avisa no console e retorna o valorPadrao sem quebrar o site
    console.error(`Erro ao ler a chave "${chave}" do localStorage:`, erro);
    return valorPadrao;
  }
}

/**
 * Converte um valor para JSON e salva no localStorage.
 * @param {string} chave - Nome da chave no localStorage.
 * @param {*} valor - Dado (objeto, array, etc.) a ser salvo.
 * @returns {boolean} Retorna true se salvou com sucesso, ou false em caso de erro.
 */
export function salvarDados(chave, valor) {
  try {
    // 1. Transforma o 'valor' recebido em texto JSON
    const textoJson = JSON.stringify(valor);
    // 2. Salva no localStorage passando primeiro a 'chave' e depois o 'textoJson'
    localStorage.setItem(chave, textoJson);
    return true;
  } catch (erro) {
    console.error(`Erro ao salvar na chave "${chave}" do localStorage:`, erro);
    return false;
  }
}