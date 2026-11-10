import { aplicarMascaraCPF, avaliarForcaSenha, validarCPF, validarEmail, validarNomeCompleto, validarTelefone, limparNumeros } from './utils.js';
import { CHAVES_STORAGE, gerarProximoId, inicializarStorage, lerDados, salvarDados } from './storage.js';

/**
 * Exibe ou limpa a mensagem de erro logo abaixo de um campo de formulário.
 * @param {HTMLInputElement} campo - Elemento input do formulário.
 * @param {string} [mensagem=''] - Texto do erro (ou vazio '' para limpar o erro).
 */
export function definirErroCampo(campo, mensagem = '') {
  if (!campo) return;
  let msgErro = campo.parentElement.querySelector('.mensagem-erro-campo');
  if (!msgErro) {
    msgErro = document.createElement('p');
    msgErro.className = 'mensagem-erro-campo';
    msgErro.setAttribute('role', 'alert');
    campo.parentElement.appendChild(msgErro);
  }
  campo.setCustomValidity(mensagem);
  msgErro.textContent = mensagem;
}

/**
 * Gera um salt aleatório em hexadecimal (16 bytes) usando Web Crypto API.
 * @returns {string} Salt em formato hexadecimal.
 */
export function gerarSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Gera o hash SHA-256 de uma senha combinada com o salt usando SubtleCrypto.
 * @param {string} senha - Senha em texto puro.
 * @param {string} salt - Salt hexadecimal do cliente.
 * @returns {Promise<string>} Hash SHA-256 em hexadecimal.
 */
export async function gerarHashSenha(senha, salt) {
  const codificador = new TextEncoder();
  const dados = codificador.encode(`${salt}:${senha}`);
  const bufferHash = await crypto.subtle.digest('SHA-256', dados);
  const bytesHash = new Uint8Array(bufferHash);
  return Array.from(bytesHash, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Obtem os clientes cadastrados no localStorage.
 * @returns {Array<Object>}
 */
export function obterClientes() {
  const clientes = lerDados(CHAVES_STORAGE.CLIENTES, []);
  return Array.isArray(clientes) ? clientes : [];
}

/**
 * Cadastra um novo cliente após validar unicidade de e-mail e CPF.
 * @param {{nome: string, cpf: string, telefone: string, email: string, senha: string}} dados
 * @returns {Promise<{sucesso: boolean, erroCampo?: string, mensagem: string, cliente?: Object}>}
 */
export async function cadastrarCliente({ nome, cpf, telefone, email, senha }) {
  inicializarStorage();
  const clientes = obterClientes();
  const emailNormalizado = String(email).trim().toLowerCase();
  const cpfLimpo = limparNumeros(cpf);
  // Verifica se CPF existe
  if (clientes.some((c) => limparNumeros(c.cpf) === cpfLimpo)) {
    return { sucesso: false, erroCampo: 'cpf', mensagem: 'Este CPF já está cadastrado.' };
  }
  // Verifica se E-mail existe
  if (clientes.some((c) => c.email.toLowerCase() === emailNormalizado)) {
    return { sucesso: false, erroCampo: 'email', mensagem: 'Este e-mail já está cadastrado.' };
  }
  // Gera salt + hash SHA-256 da senha e ID sequencial (C001, C002...)
  const salt = gerarSalt();
  const senhaHash = await gerarHashSenha(senha, salt);
  const novoCliente = {
    id: gerarProximoId('cliente', 'C'),
    nome: String(nome).trim(),
    cpf: aplicarMascaraCPF(cpfLimpo),
    telefone: limparNumeros(telefone),
    email: emailNormalizado,
    salt,
    senhaHash,
    perfil: 'cliente',
    bloqueado: false,
    criadoEm: new Date().toISOString()
  };
  clientes.push(novoCliente);
  salvarDados(CHAVES_STORAGE.CLIENTES, clientes);
  return { sucesso: true, mensagem: 'Cadastro realizado com sucesso!', cliente: novoCliente };
}

/**
 * Inicializa as máscaras e validações do formulário de cadastro.
 */
export function inicializarCadastro() {
  const formCadastro = document.getElementById('form-cadastro');
  if (!formCadastro) return;

  // Cria o espaço reservado de erro em todos os campos ao abrir a página (evita "pulo" no layout)
  formCadastro.querySelectorAll('.campo-form input').forEach((input) => {
    definirErroCampo(input, '');
  });

  // Validação do Nome Completo (#cad-nome)
  const campoNome = document.getElementById('cad-nome');
  campoNome?.addEventListener('blur', () => {
    if (campoNome.value && !validarNomeCompleto(campoNome.value)) {
      definirErroCampo(campoNome, 'Informe seu nome e sobrenome (mínimo de 3 caracteres).');
    } else {
      definirErroCampo(campoNome, '');
    }
  });
  campoNome?.addEventListener('input', () => {
    if (validarNomeCompleto(campoNome.value)) {
      definirErroCampo(campoNome, '');
    }
  });
  // Máscara e Validação do CPF (#cad-cpf)
  const campoCpf = document.getElementById('cad-cpf');
  campoCpf?.addEventListener('input', () => {
    campoCpf.value = aplicarMascaraCPF(campoCpf.value);
    if (campoCpf.value.length === 14 && !validarCPF(campoCpf.value)) {
      definirErroCampo(campoCpf, 'CPF inválido. Verifique os dígitos informados.');
    } else {
      definirErroCampo(campoCpf, '');
    }
  });
  campoCpf?.addEventListener('blur', () => {
    if (campoCpf.value && !validarCPF(campoCpf.value)) {
      definirErroCampo(campoCpf, 'CPF inválido. Digite os 11 números corretamente.');
    }
  });

  // Validação do Telefone (#cad-telefone — somente números, 10 ou 11 dígitos)
  const campoTelefone = document.getElementById('cad-telefone');
  campoTelefone?.addEventListener('input', () => {
    campoTelefone.value = limparNumeros(campoTelefone.value).slice(0, 11);
    if (validarTelefone(campoTelefone.value)) {
      definirErroCampo(campoTelefone, '');
    }
  });
  campoTelefone?.addEventListener('blur', () => {
    if (campoTelefone.value && !validarTelefone(campoTelefone.value)) {
      definirErroCampo(campoTelefone, 'Informe um telefone válido com DDD (10 ou 11 números).');
    } else {
      definirErroCampo(campoTelefone, '');
    }
  });

  // Validação do E-mail (#cad-email)
  const campoEmail = document.getElementById('cad-email');
  campoEmail?.addEventListener('blur', () => {
    if (campoEmail.value && !validarEmail(campoEmail.value)) {
      definirErroCampo(campoEmail, 'Informe um endereço de e-mail válido (ex: nome@dominio.com).');
    } else {
      definirErroCampo(campoEmail, '');
    }
  });
  campoEmail?.addEventListener('input', () => {
    if (validarEmail(campoEmail.value)) {
      definirErroCampo(campoEmail, '');
    }
  });

  // Validação da senha
  const campoSenha = document.getElementById('cad-senha');
  const campoConfirmaSenha = document.getElementById('cad-confirma-senha');

  if (campoSenha) {

    const containerForca = document.createElement('div');
    containerForca.className = 'indicador-forca';
    const barraForca = document.createElement('div');
    barraForca.className = 'barra-forca-preenchimento';
    containerForca.appendChild(barraForca);
    campoSenha.insertAdjacentElement('afterend', containerForca);

   campoSenha.addEventListener('input', () => {
    const avaliacao = avaliarForcaSenha(campoSenha.value);
    barraForca.dataset.nivel = avaliacao.nivel;
    const msgErro = campoSenha.parentElement.querySelector('.mensagem-erro-campo');
    if (msgErro) {
      msgErro.textContent = avaliacao.texto;
      msgErro.dataset.nivel = avaliacao.nivel;
    }
    campoSenha.setCustomValidity(
      avaliacao.valida || !campoSenha.value ? '' : 'A senha deve ter no mínimo 8 caracteres, com letras e números.'
    );
    // Se o usuário já preencheu a confirmação, revalida se continuam iguais
    if (campoConfirmaSenha?.value) {
      validarConfirmacao();
    }
  });
  campoSenha.addEventListener('blur', () => {
      const avaliacao = avaliarForcaSenha(campoSenha.value);
      if (campoSenha.value && !avaliacao.valida) {
        definirErroCampo(campoSenha, 'A senha deve ter no mínimo 8 caracteres, com letras e números.');
      }
    });
  } // <-- Fecha o if (campoSenha)
  // 6. Validação da Confirmação de Senha (#cad-confirma-senha)
  function validarConfirmacao() {
    if (!campoConfirmaSenha || !campoSenha) return;
    if (campoConfirmaSenha.value && campoConfirmaSenha.value !== campoSenha.value) {
      definirErroCampo(campoConfirmaSenha, 'As senhas não coincidem.');
    } else {
      definirErroCampo(campoConfirmaSenha, '');
    }
  }
  campoConfirmaSenha?.addEventListener('input', validarConfirmacao);
  campoConfirmaSenha?.addEventListener('blur', validarConfirmacao);
} // <-- Fecha a função inicializarCadastro()
inicializarCadastro();