import { aplicarMascaraCPF, avaliarForcaSenha, ofuscarCPF, validarCPF, validarEmail, validarNomeCompleto, validarTelefone, limparNumeros } from './utils.js';
import { alternarCarregamentoBotao, mostrarToast, renderizarMenuDinamico } from './ui.js';
import { CHAVES_STORAGE, gerarProximoId, inicializarStorage, lerDados, salvarDados, removerDados } from './storage.js';
import { encerrarSessao, obterSessaoAtiva } from './auth.js';

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
    msgErro.setAttribute('aria-live', 'polite');
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
 * Cadastra um novo cliente após validar todos os campos e a unicidade de e-mail e CPF.
 * @param {{nome: string, cpf: string, telefone: string, email: string, senha: string}} dados
 * @returns {Promise<{sucesso: boolean, erroCampo?: string, mensagem: string, cliente?: Object}>}
 */
export async function cadastrarCliente({ nome = '', cpf = '', telefone = '', email = '', senha = '' } = {}) {
  const nomeLimpo = String(nome ?? '').trim();
  const emailNormalizado = String(email ?? '').trim().toLowerCase();
  const telefoneLimpo = String(telefone ?? '').trim();
  const senhaTexto = String(senha ?? '');

  if (!validarNomeCompleto(nomeLimpo)) {
    return {
      sucesso: false,
      erroCampo: 'nome',
      mensagem: 'Informe seu nome e sobrenome (mínimo de 3 caracteres).'
    };
  }
  if (!validarCPF(cpf)) {
    return {
      sucesso: false,
      erroCampo: 'cpf',
      mensagem: 'CPF inválido. Digite os 11 números corretamente.'
    };
  }
  if (!validarTelefone(telefoneLimpo)) {
    return {
      sucesso: false,
      erroCampo: 'telefone',
      mensagem: 'Informe um telefone válido com DDD (10 ou 11 números).'
    };
  }
  if (!validarEmail(emailNormalizado)) {
    return {
      sucesso: false,
      erroCampo: 'email',
      mensagem: 'Informe um endereço de e-mail válido (ex: nome@dominio.com).'
    };
  }
  if (!avaliarForcaSenha(senhaTexto).valida) {
    return {
      sucesso: false,
      erroCampo: 'senha',
      mensagem: 'A senha deve ter no mínimo 8 caracteres, com letras e números.'
    };
  }

  inicializarStorage();
  const clientes = obterClientes();
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
  const senhaHash = await gerarHashSenha(senhaTexto, salt);
  const novoCliente = {
    id: gerarProximoId('cliente', 'C'),
    nome: nomeLimpo,
    cpf: aplicarMascaraCPF(cpfLimpo),
    telefone: limparNumeros(telefoneLimpo),
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
  formCadastro.noValidate = true;

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

   // Envia o formulário ao clicar em "Criar conta"
  formCadastro.addEventListener('submit', async (evento) => {
    // Impede a página de recarregar
    evento.preventDefault();
    let primeiroInvalido = null;
    const marcarInvalido = (campo, mensagem) => {
      definirErroCampo(campo, mensagem);
      if (!primeiroInvalido) primeiroInvalido = campo;
    };
    // Confere os 6 campos
    if (!validarNomeCompleto(campoNome?.value)) {
      marcarInvalido(campoNome, 'Informe seu nome e sobrenome (mínimo de 3 caracteres).');
    } else {
      definirErroCampo(campoNome, '');
    }
    if (!validarCPF(campoCpf?.value)) {
      marcarInvalido(campoCpf, 'CPF inválido. Digite os 11 números corretamente.');
    } else {
      definirErroCampo(campoCpf, '');
    }
    if (!validarTelefone(campoTelefone?.value)) {
      marcarInvalido(campoTelefone, 'Informe um telefone válido com DDD (10 ou 11 números).');
    } else {
      definirErroCampo(campoTelefone, '');
    }
    if (!validarEmail(campoEmail?.value)) {
      marcarInvalido(campoEmail, 'Informe um endereço de e-mail válido (ex: nome@dominio.com).');
    } else {
      definirErroCampo(campoEmail, '');
    }
    const avaliacaoSenha = avaliarForcaSenha(campoSenha?.value);
    if (!avaliacaoSenha.valida) {
      marcarInvalido(campoSenha, 'A senha deve ter no mínimo 8 caracteres, com letras e números.');
    }
    if (!campoConfirmaSenha?.value || campoConfirmaSenha.value !== campoSenha?.value) {
      marcarInvalido(campoConfirmaSenha, 'As senhas não coincidem.');
    } else {
      definirErroCampo(campoConfirmaSenha, '');
    }
    // Se algum campo estiver inválido, coloca o cursor no primeiro erro e para
    if (primeiroInvalido) {
      primeiroInvalido.focus();
      return;
    }
    // Salva o cliente no localStorage com senha protegida por SHA-256
    const btnSubmit = formCadastro.querySelector('button[type="submit"]');
    alternarCarregamentoBotao(btnSubmit, true, 'Criando conta...');
    let resultado;
    try {
      resultado = await cadastrarCliente({
        nome: campoNome.value,
        cpf: campoCpf.value,
        telefone: campoTelefone.value,
        email: campoEmail.value,
        senha: campoSenha.value
      });
    } finally {
      alternarCarregamentoBotao(btnSubmit, false);
    }
    // Se o CPF ou E-mail já existie, mostra o erro no campo correspondente
    if (!resultado.sucesso) {
      if (resultado.erroCampo === 'cpf') {
        definirErroCampo(campoCpf, resultado.mensagem);
        campoCpf.focus();
      } else if (resultado.erroCampo === 'email') {
        definirErroCampo(campoEmail, resultado.mensagem);
        campoEmail.focus();
      }
      return;
    }
    // Cadastro concluído! Leva o usuário para a tela de login
    window.location.href = 'login.html?cadastro=sucesso';
  });
  
} // <-- Fecha a função inicializarCadastro()
inicializarCadastro();

/**
 * Atualiza os dados cadastrais e/ou a senha de um cliente, validando unicidade de CPF/e-mail e senha atual (Requisito 2.1e).
 * @param {string} idCliente - ID do cliente logado.
 * @param {{nome: string, cpf: string, telefone: string, email: string, senhaAtual?: string, novaSenha?: string}} dados
 * @returns {Promise<{sucesso: boolean, erroCampo?: string, mensagem: string, cliente?: Object}>}
 */
export async function atualizarCliente(idCliente, { nome, cpf, telefone, email, senhaAtual, novaSenha }) {
  const clientes = obterClientes();
  const indice = clientes.findIndex((c) => c.id === idCliente);
  if (indice === -1) {
    return { sucesso: false, mensagem: 'Cliente não encontrado.' };
  }
  const clienteAtual = clientes[indice];
  // Padroniza campos recebidos (sempre com const!)
  const nomeLimpo = String(nome).trim();
  const cpfMascarado = aplicarMascaraCPF(cpf);
  const cpfNumeros = limparNumeros(cpf);
  const telefoneLimpo = limparNumeros(telefone);
  const emailNormalizado = String(email).trim().toLowerCase();
  
  // atualizar apenas se houver alteração
  if (
    nomeLimpo === clienteAtual.nome &&
    limparNumeros(clienteAtual.cpf) === cpfNumeros &&
    telefoneLimpo === clienteAtual.telefone &&
    emailNormalizado === clienteAtual.email.toLowerCase() &&
    !novaSenha
  ) {

    return { sucesso: false, erroCampo: 'nenhum', mensagem: 'Nenhuma alteração foi feita nos dados.' };
  
  }
  
  // Percorre a lista de clientes
  for (const c of clientes) {
  
    // Verifica cadastro com o mesmo CPF
    if (c.id !== idCliente && limparNumeros(c.cpf) === cpfNumeros){
      return { sucesso: false, erroCampo: 'cpf', mensagem: 'Este CPF já está cadastrado em outra conta.' };
    }

    // Verifica cadastro com o mesmo E-mail
    if (c.id !== idCliente && c.email.toLowerCase() === emailNormalizado){
      return { sucesso: false, erroCampo: 'email', mensagem: 'Este e-mail já está cadastrado em outra conta.' }
    }

  }
  
  // Se o usuário preencheu uma nova senha, exige e confere a senha atual
  if (novaSenha) {
    if (!senhaAtual) {
      return { sucesso: false, erroCampo: 'senhaAtual', mensagem: 'Informe sua senha atual para alterar a senha.' };
    }
    const hashDigitado = await gerarHashSenha(String(senhaAtual), clienteAtual.salt);
    if (hashDigitado !== clienteAtual.senhaHash) {
      return { sucesso: false, erroCampo: 'senhaAtual', mensagem: 'A senha atual está incorreta.' };
    }
    // Senha atual confere! Gera novo salt e novo hash para a nova senha
    const novoSalt = gerarSalt();
    clienteAtual.salt = novoSalt;
    clienteAtual.senhaHash = await gerarHashSenha(String(novaSenha), novoSalt);
  }

  // Atualiza os campos cadastrais no objeto do cliente
  clienteAtual.nome = nomeLimpo;
  clienteAtual.cpf = cpfMascarado;
  clienteAtual.telefone = telefoneLimpo;
  clienteAtual.email = emailNormalizado;
  salvarDados(CHAVES_STORAGE.CLIENTES, clientes);

  // Atualiza também o nome e e-mail na sessão ativa (para refletir no header "Olá, ...")
  const sessao = lerDados(CHAVES_STORAGE.SESSAO, null);
  if (sessao && sessao.usuarioId === idCliente) {
    sessao.nome = nomeLimpo;
    sessao.email = emailNormalizado;
    salvarDados(CHAVES_STORAGE.SESSAO, sessao);
  }

  return { sucesso: true, mensagem: 'Dados atualizados com sucesso!', cliente: clienteAtual };

}

/**
 * Exclui a conta e o carrinho do cliente mantendo o histórico de compras preservado (Requisito 2.1f).
 * @param {string} idCliente - ID do cliente a ser excluído.
 */
export function excluirContaCliente(idCliente){
  
  // Apaga o carrinho do cliente
  const carrinhos = lerDados(CHAVES_STORAGE.CARRINHO, {});
  delete carrinhos[idCliente];

  // Apaga o cliente
  const clientes = obterClientes();
  const clientesRestantes = clientes.filter((c) => c.id !== idCliente);
  
  // Salva as alterações
  salvarDados(CHAVES_STORAGE.CARRINHO, carrinhos);
  salvarDados(CHAVES_STORAGE.CLIENTES, clientesRestantes);
  
  // Remove a sessão
  removerDados(CHAVES_STORAGE.SESSAO);
}

/**
 * Inicializa o formulário de edição de perfil e o modal de exclusão de conta em perfil.html.
 */
export function inicializarPerfil(){

  const formPerfil = document.getElementById('form-perfil');
  
  if (!formPerfil) return;

  formPerfil.noValidate = true;

  const sessao = obterSessaoAtiva();

  if (!sessao) return;

  const campoId = document.getElementById('perfil-id');
  const campoNome = document.getElementById('perfil-nome');
  const campoCpf = document.getElementById('perfil-cpf');
  const campoTelefone = document.getElementById('perfil-telefone');
  const campoEmail = document.getElementById('perfil-email');
  const campoSenhaAtual = document.getElementById('perfil-senha-atual');
  const campoNovaSenha = document.getElementById('perfil-senha');
  const campoConfirmaSenha = document.getElementById('perfil-confirma-senha');

  const avisoPerfil = document.createElement('p');
  avisoPerfil.className = 'mensagem-erro-campo';
  avisoPerfil.setAttribute('role', 'alert');
  avisoPerfil.setAttribute('aria-live', 'polite');
  formPerfil.querySelector('.acoes-form')?.insertAdjacentElement('beforebegin', avisoPerfil);

  function carregarDadosNosCampos(){
    const cliente = obterClientes().find((c) => c.id === sessao.usuarioId);
    
    if (!cliente) return;

    campoId.value = cliente.id;
    campoNome.value = cliente.nome;
    campoCpf.value = ofuscarCPF(cliente.cpf);
    campoCpf.dataset.ofuscado = 'true';
    campoCpf.dataset.cpfReal = cliente.cpf;
    campoTelefone.value = cliente.telefone || '';
    campoEmail.value = cliente.email;
    campoSenhaAtual.value = '';
    campoNovaSenha.value = ''; 
    campoConfirmaSenha.value = '';


    // Atualiza a tabela de pedidos
    const captionPedidos = document.querySelector('#tabela-pedidos caption');
    if (captionPedidos) {
      captionPedidos.textContent = `Histórico de pedidos do cliente ${cliente.id}`;
    }
    
  }

  carregarDadosNosCampos();

  formPerfil.querySelectorAll('.campo-form input').forEach((input) => {
    definirErroCampo(input, '');
  });

  // Botão "Desfazer" (reset): restaura os dados reais do cliente logado
  formPerfil.addEventListener('reset', (evento) => {
    evento.preventDefault();
    carregarDadosNosCampos();
    avisoPerfil.textContent = '';
    formPerfil.querySelectorAll('.campo-form input').forEach((input) => {
      definirErroCampo(input, '');
    });
  });

  // CPF ofuscado (LGPD): limpa ao focar para edição e restaura se sair vazio
  campoCpf?.addEventListener('focus', () => {
    if (campoCpf.readOnly) return;
    if (campoCpf.dataset.ofuscado === 'true') {
      campoCpf.value = '';
      campoCpf.dataset.ofuscado = 'false';
      definirErroCampo(campoCpf, '');
    }
  });
  campoCpf?.addEventListener('blur', () => {
    if (campoCpf.readOnly) return;
    if (!campoCpf.value.trim() && campoCpf.dataset.cpfReal) {
      campoCpf.value = ofuscarCPF(campoCpf.dataset.cpfReal);
      campoCpf.dataset.ofuscado = 'true';
      definirErroCampo(campoCpf, '');
    }
  });
  // Máscara do CPF ao digitar
  campoCpf?.addEventListener('input', () => {
    campoCpf.dataset.ofuscado = 'false';
    campoCpf.value = aplicarMascaraCPF(campoCpf.value);
    definirErroCampo(campoCpf, '');
  });

  // Apenas números no Telefone ao digitar
  campoTelefone?.addEventListener('input', () => {
    campoTelefone.value = limparNumeros(campoTelefone.value).slice(0, 11);
    definirErroCampo(campoTelefone, '');
  });

  // Limpa erro dos demais campos quando o usuário começa a corrigir
  [campoNome, campoEmail, campoSenhaAtual, campoNovaSenha, campoConfirmaSenha].forEach((campo) => {
    campo?.addEventListener('input', () => definirErroCampo(campo, ''));
  });

    formPerfil.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    avisoPerfil.textContent = '';
    let primeiroInvalido = null;
    const marcarInvalido = (campo, mensagem) => {
      definirErroCampo(campo, mensagem);
      if (!primeiroInvalido) primeiroInvalido = campo;
    };
    // Se o CPF continuou ofuscado (não foi editado), usa o CPF real salvo
    const cpfInformado =
      campoCpf?.dataset.ofuscado === 'true' ? campoCpf.dataset.cpfReal : campoCpf?.value;

    // Valida dados pessoais obrigatórios
    if (!validarNomeCompleto(campoNome?.value)) {
      marcarInvalido(campoNome, 'Informe seu nome e sobrenome (mínimo de 3 caracteres).');
    }
    if (!validarCPF(cpfInformado)) {
      marcarInvalido(campoCpf, 'CPF inválido. Digite os 11 números corretamente.');
    }
    if (!validarTelefone(campoTelefone?.value)) {
      marcarInvalido(campoTelefone, 'Informe um telefone válido com DDD (10 ou 11 números).');
    }
    if (!validarEmail(campoEmail?.value)) {
      marcarInvalido(campoEmail, 'Informe um endereço de e-mail válido.');
    }
    // Valida campos de senha APENAS se o usuário tentou preencher nova senha
    if (campoNovaSenha?.value || campoConfirmaSenha?.value) {
      if (!campoSenhaAtual?.value) {
        marcarInvalido(campoSenhaAtual, 'Informe sua senha atual para alterar a senha.');
      }
      if (!avaliarForcaSenha(campoNovaSenha?.value).valida) {
        marcarInvalido(campoNovaSenha, 'A nova senha deve ter no mínimo 8 caracteres, com letras e números.');
      }
      if (campoConfirmaSenha?.value !== campoNovaSenha?.value) {
        marcarInvalido(campoConfirmaSenha, 'As senhas não coincidem.');
      }
    }
    if (primeiroInvalido) {
      primeiroInvalido.focus();
      return;
    }
    

    const btnSubmitPerfil = formPerfil.querySelector('button[type="submit"]');
    alternarCarregamentoBotao(btnSubmitPerfil, true, 'Salvando...');
    let resultado;
    try {
      resultado = await atualizarCliente(sessao.usuarioId, {
        nome: campoNome.value,
        cpf: cpfInformado,
        telefone: campoTelefone.value,
        email: campoEmail.value,
        senhaAtual: campoSenhaAtual.value,
        novaSenha: campoNovaSenha.value
      });
    } finally {
      alternarCarregamentoBotao(btnSubmitPerfil, false);
    }
    if (!resultado.sucesso) {
      if (resultado.erroCampo === 'cpf') {
        definirErroCampo(campoCpf, resultado.mensagem);
        campoCpf.focus();
      } else if (resultado.erroCampo === 'email') {
        definirErroCampo(campoEmail, resultado.mensagem);
        campoEmail.focus();
      } else if (resultado.erroCampo === 'senhaAtual') {
        definirErroCampo(campoSenhaAtual, resultado.mensagem);
        campoSenhaAtual.focus();
      } else {
        avisoPerfil.style.color = '#d97706';
        avisoPerfil.textContent = resultado.mensagem;
      }
      return;
    }
    
    // Sucesso!
    avisoPerfil.style.color = '#16a34a';
    avisoPerfil.textContent = resultado.mensagem;
    carregarDadosNosCampos();
    renderizarMenuDinamico();
    mostrarToast(resultado.mensagem, 'sucesso');
  });

  const modalExcluir = document.getElementById('modal-excluir-conta');
  const btnAbrirExcluir = document.getElementById('btn-abrir-excluir-conta');
  const btnCancelarExclusao = document.getElementById('btn-cancelar-exclusao');
  const btnConfirmarExclusao = document.getElementById('btn-confirmar-exclusao');
  btnAbrirExcluir?.addEventListener('click', () => modalExcluir?.showModal());
  btnCancelarExclusao?.addEventListener('click', () => modalExcluir?.close());
  btnConfirmarExclusao?.addEventListener('click', () => {
    excluirContaCliente(sessao.usuarioId);
    window.location.href = 'index.html';
  });
}

inicializarPerfil();