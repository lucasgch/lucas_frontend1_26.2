const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

/**
 * Formata um número em moeda brasileira (BRL) usando Intl.NumberFormat.
 * @param {number|string} valor - Valor numérico a formatar.
 * @returns {string} Valor formatado (ex: 'R$ 59,90').
 */
export function formatarMoeda(valor) {
  return formatadorMoeda.format(Number(valor) || 0);
}

/**
 * Normaliza um texto para comparação (minúsculas, sem espaços nas pontas e sem acentos).
 * @param {string} [texto=''] - Texto de entrada.
 * @returns {string} Texto normalizado.
 */
export function normalizarTexto(texto = ''){
  const textoNormalizado = texto.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return textoNormalizado;
}

const formatadorData = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

/**
 * Formata uma data ISO no padrão brasileiro (DD/MM/AAAA) usando Intl.DateTimeFormat.
 * @param {string} dataIso - Data em formato ISO.
 * @returns {string} Data formatada ou string vazia se inválida.
 */
export function formatarData(dataIso) {
  const data = new Date(dataIso);
  return Number.isNaN(data.getTime()) ? '' : formatadorData.format(data);
}

const formatadorDataHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

/**
 * Formata uma data ISO com horário no padrão brasileiro (DD/MM/AAAA, HH:MM).
 * @param {string} dataIso - Data e hora em formato ISO.
 * @returns {string} Data e hora formatadas ou string vazia se inválida.
 */
export function formatarDataHora(dataIso) {
  const data = new Date(dataIso);
  return Number.isNaN(data.getTime()) ? '' : formatadorDataHora.format(data);
}

const UFS_BRASIL = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]);
/**
 * Valida se a sigla informada corresponde a uma UF brasileira válida.
 * @param {string} [uf='']
 * @returns {boolean}
 */
export function validarUF(uf = '') {
  return UFS_BRASIL.has(String(uf ?? '').trim().toUpperCase());
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

/**
 * Aplica a máscara padrão de CPF (000.000.000-00) enquanto o usuário digita.
 * @param {string} valor - Texto digitado no campo de CPF.
 * @returns {string} CPF formatado.
 */
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
  // Recusa DDD com dígito 0 e valida 10 ou 11 dígitos numéricos
  if (!/^[1-9]{2}\d{8,9}$/.test(texto)) return false;
  // Rejeita dígitos repetidos (ex: 11111111111, 43999999999)
  if (/^(\d)\1+$/.test(texto) || /^(\d)\1{7}$/.test(texto.slice(-8))) {
    return false;
  }
  return true;
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

/**
 * Aplica a máscara de CEP (00000-000).
 * @param {string} [valor=''] - CEP digitado.
 * @returns {string} CEP formatado.
 */
export function aplicarMascaraCEP(valor = '') {
  const digitos = limparNumeros(valor).slice(0, 8);
  return digitos.replace(/^(\d{5})(\d)/, '$1-$2');
}

/**
 * Valida o número de um cartão de crédito (13 a 19 dígitos) usando o algoritmo de Luhn (Requisito 2.4b).
 * @param {string} [numero=''] - Número do cartão com ou sem espaços.
 * @returns {boolean} true se passar na verificação de Luhn.
 */
export function validarCartaoLuhn(numero = '') {
  const digitos = limparNumeros(numero);
  if (digitos.length < 13 || digitos.length > 19 || /^(\d)\1+$/.test(digitos)) {
    return false;
  }
  let soma = 0;
  let dobrar = false;
  // Percorre os dígitos da direita para a esquerda
  for (let i = digitos.length - 1; i >= 0; i--) {
    let n = Number(digitos[i]);
    if (dobrar) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    soma += n;
    dobrar = !dobrar;
  }
  return soma % 10 === 0;
}

/**
 * Cria um DocumentFragment com todas as ocorrências do termo destacadas em <mark>,
 * ignorando acentos/maiúsculas e aceitando CPF com ou sem máscara (Requisito 2.5b).
 * @param {string} textoOriginal - Texto exibido na célula.
 * @param {string} termo - Termo digitado na busca.
 * @param {boolean} [ehCpf=false] - Se true, permite destacar dígitos mesmo sem máscara.
 * @returns {DocumentFragment}
 */
export function criarConteudoDestacado(textoOriginal, termo, ehCpf = false) {
  const fragmento = document.createDocumentFragment();
  const texto = String(textoOriginal || '').normalize('NFC');
  const termoNorm = normalizarTexto(termo);
  if (!termoNorm) {
    fragmento.appendChild(document.createTextNode(texto));
    return fragmento;
  }
  // Caso especial de CPF sem máscara (ex.: digitou "123456" para "123.456.789-01")
  if (ehCpf && !texto.includes('•') && !texto.includes('*')) {
    const termoDigitos = /^[\d.\-\s]+$/.test(String(termo).trim()) ? limparNumeros(termo) : '';
    if (termoDigitos) {
      const posicoesDigitos = [];
      let apenasDigitos = '';
      for (let i = 0; i < texto.length; i++) {
        if (/\d/.test(texto[i])) {
          posicoesDigitos.push(i);
          apenasDigitos += texto[i];
        }
      }
      const idx = apenasDigitos.indexOf(termoDigitos);
      if (idx !== -1) {
        const inicio = posicoesDigitos[idx];
        const fim = posicoesDigitos[idx + termoDigitos.length - 1] + 1;
        if (inicio > 0) fragmento.appendChild(document.createTextNode(texto.slice(0, inicio)));
        const mark = document.createElement('mark');
        mark.textContent = texto.slice(inicio, fim);
        fragmento.appendChild(mark);
        if (fim < texto.length) fragmento.appendChild(document.createTextNode(texto.slice(fim)));
        return fragmento;
      }
    }
  }
  // Busca normalizada mantendo os índices do texto original (preserva acentos e maiúsculas)
  const chars = Array.from(texto);
  const textoNorm = chars
    .map((c) => c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())
    .join('');
  let posAtual = 0;
  let idxEncontrado = textoNorm.indexOf(termoNorm, posAtual);
  if (idxEncontrado === -1) {
    fragmento.appendChild(document.createTextNode(texto));
    return fragmento;
  }
  while (idxEncontrado !== -1) {
    if (idxEncontrado > posAtual) {
      fragmento.appendChild(document.createTextNode(chars.slice(posAtual, idxEncontrado).join('')));
    }
    const mark = document.createElement('mark');
    mark.textContent = chars.slice(idxEncontrado, idxEncontrado + termoNorm.length).join('');
    fragmento.appendChild(mark);
    posAtual = idxEncontrado + termoNorm.length;
    idxEncontrado = textoNorm.indexOf(termoNorm, posAtual);
  }
  if (posAtual < chars.length) {
    fragmento.appendChild(document.createTextNode(chars.slice(posAtual).join('')));
  }
  return fragmento;
}

/**
 * Ofusca os dígitos centrais do CPF para exibição no padrão LGPD (ex.: 123.•••.•••-01).
 * @param {string} [cpf=''] - CPF com ou sem máscara.
 * @returns {string}
 */
export function ofuscarCPF(cpf = '') {
  const digitos = limparNumeros(cpf);
  if (digitos.length !== 11) return aplicarMascaraCPF(cpf);
  return `${digitos.slice(0, 3)}.•••.•••-${digitos.slice(9, 11)}`;
}