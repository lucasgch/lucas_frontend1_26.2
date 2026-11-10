import { aplicarMascaraCPF, avaliarForcaSenha, validarCPF, validarEmail, validarNomeCompleto, validarTelefone, limparNumeros } from './utils.js';

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