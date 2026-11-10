import { aplicarMascaraCPF, validarCPF, validarNomeCompleto } from './utils.js';

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
 * Inicializa as máscaras e validações do formulário de cadastro.
 */
export function inicializarCadastro() {
  const formCadastro = document.getElementById('form-cadastro');
  if (!formCadastro) return;
  // 1. Validação do Nome Completo (#cad-nome)
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
  // 2. Máscara e Validação do CPF (#cad-cpf)
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
}
inicializarCadastro();