import { aplicarMascaraCPF, validarCPF } from './utils.js';

const campoCpf = document.getElementById('cad-cpf');

campoCpf?.addEventListener('input', () => {
  // 1. Aplica a máscara 000.000.000-00
  campoCpf.value = aplicarMascaraCPF(campoCpf.value);

  // 2. Cria (ou busca) o parágrafo de erro logo abaixo do input
  let msgErro = campoCpf.parentElement.querySelector('.mensagem-erro-campo');
  if (!msgErro) {
    msgErro = document.createElement('p');
    msgErro.className = 'mensagem-erro-campo';
    msgErro.setAttribute('role', 'alert');
    campoCpf.parentElement.appendChild(msgErro);
  }

  // 3. Quando completar os 14 caracteres (000.000.000-00), valida os dígitos verificadores!
  if (campoCpf.value.length === 14 && !validarCPF(campoCpf.value)) {
    campoCpf.setCustomValidity('CPF inválido.');
    msgErro.textContent = 'CPF inválido. Verifique os dígitos informados.';
  } else {
    campoCpf.setCustomValidity('');
    msgErro.textContent = '';
  }
});