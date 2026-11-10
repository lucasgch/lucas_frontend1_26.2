const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

export function formatarMoeda(valor) {
  return formatadorMoeda.format(Number(valor) || 0);
}

export function normalizarTexto(texto = ''){
  let textoNormalizado = texto.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return textoNormalizado;
}

/**
 * Atrasa a execução de uma função até que se passem 'atraso' ms sem novas chamadas.
 * @param {Function} funcao - Função que será executada após o tempo de espera.
 * @param {number} [atraso=300] - Tempo de espera em milissegundos.
 * @returns {Function} Nova função controlada pelo debounce.
 */
export function debounce(funcao, atraso = 300) {
  let timerId = null;
  return function (...argumentos) {
    // 1. Se já existia um cronômetro rodando, cancela ele
    clearTimeout(timerId);
    // 2. Agenda um novo cronômetro para executar a 'funcao' depois do 'atraso'
    timerId = setTimeout(() => {
      funcao(...argumentos);
    }, atraso);
  };
}

/**
 * Remove todos os caracteres que não sejam números (0-9).
 * @param {string} [valor=''] - Texto de entrada.
 * @returns {string} Apenas os dígitos numéricos.
 */
export function limparNumeros(valor = '') {
  return String(valor).replace(/\D/g, '');
}

export function aplicarMascaraCPF(valor){
  const apenasDigitos = limparNumeros(valor).slice(0, 11);
  return apenasDigitos.replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}