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

/**
 * Valida um CPF verificando formato, dígitos repetidos e os 2 dígitos verificadores.
 * @param {string} [cpf=''] - CPF com ou sem máscara.
 * @returns {boolean} true se o CPF for válido, false caso contrário.
 */
export function validarCPF(cpf = '') {
  const digitos = limparNumeros(cpf);
  // Deve ter 11 dígitos e não pode ter todos os números iguais
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) {
    return false;
  }

  // Cálculo do 1º dígito verificador (pesos de 10 até 2 sobre os 9 primeiros dígitos)
  let soma1 = 0;
  for (let i = 0; i < 9; i++) {
    soma1 += Number(digitos[i]) * (10 - i);
  }
  let resto1 = (soma1 * 10) % 11;
  if (resto1 === 10 || resto1 === 11) resto1 = 0;
  if (resto1 !== Number(digitos[9])) {
    return false;
  }
  
  // Cálculo do 2º dígito verificador (pesos de 11 até 2 sobre os 10 primeiros dígitos)
  let soma2 = 0;
  for (let i = 0; i < 10; i++) {
    soma2 += Number(digitos[i]) * (11 - i);
  }
  let resto2 = (soma2 * 10) % 11;
  if (resto2 === 10 || resto2 === 11) resto2 = 0;
  if (resto2 !== Number(digitos[10])) {
    return false;
  }
  return true;
}

/**
 * Valida se o nome possui no mínimo 3 caracteres e contém nome e sobrenome.
 * @param {string} [nome=''] - Nome completo informado.
 * @returns {boolean}
 */
export function validarNomeCompleto(nome = '') {
  const texto = String(nome).trim();
  if (texto.length < 3) return false;
  // Divide pelos espaços e verifica se há pelo menos 2 palavras (nome e sobrenome)
  const partes = texto.split(/\s+/).filter((parte) => parte.length >= 2);
  return partes.length >= 2;
}

/**
 * Valida se o telefone contém apenas números e possui 10 ou 11 dígitos (DDD + número).
 * @param {string} [telefone=''] - Telefone informado.
 * @returns {boolean}
 */
export function validarTelefone(telefone = '') {
  const texto = String(telefone).trim();
  // Deve conter apenas dígitos numéricos, entre 10 e 11 números
  return /^\d{10,11}$/.test(texto);
}

/**
 * Valida o formato de um endereço de e-mail.
 * @param {string} [email=''] - E-mail informado.
 * @returns {boolean}
 */
export function validarEmail(email = '') {
  const texto = String(email).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(texto);
}

/**
 * Avalia a senha segundo os requisitos (min. 8 caracteres, com letras e números)
 * e calcula o nível de força para o indicador em tempo real.
 * @param {string} [senha=''] - Senha digitada.
 * @returns {{valida: boolean, nivel: 'vazia'|'fraca'|'media'|'forte', texto: string}}
 */
export function avaliarForcaSenha(senha = '') {
    const texto = String(senha);
  if (!texto) {
    return { valida: false, nivel: 'vazia', texto: '' };
  }
  const temMinimo8 = texto.length >= 8;
  const temLetra = /[a-zA-ZÀ-ÿ]/.test(texto);
  const temNumero = /\d/.test(texto);
  const temMaiuscula = /[A-Z]/.test(texto);
  const temEspecial = /[^a-zA-Z0-9]/.test(texto);

  // Requisito obrigatório
  const atendeRequisito = temMinimo8 && temLetra && temNumero;
  
  if (!atendeRequisito) {
    return {
      valida: false,
      nivel: 'fraca',
      texto: 'Força: Fraca (mín. 8 caracteres, com letras e números)'
    };
  }
  if (texto.length >= 10 && (temMaiuscula || temEspecial)) {
    return { valida: true, nivel: 'forte', texto: 'Força: Forte' };
  }
  return { valida: true, nivel: 'media', texto: 'Força: Média' };
}