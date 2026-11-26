import {
  CHAVES_STORAGE,
  inicializarStorage,
  lerDados,
  removerDados,
  salvarDados,
} from "./storage.js";
import { gerarHashSenha, gerarSalt, obterClientes } from "./clientes.js";
import { mesclarCarrinhoAoLogar } from "./carrinho.js";
import { alternarCarregamentoBotao, definirMensagemEstado } from "./ui.js";

const TEMPO_EXPIRACAO_MS = 30 * 60 * 1000; // 30 minutos em milissegundos
const TEMPO_BLOQUEIO_MS = 60 * 1000; // 60 segundos de bloqueio após 3 erros
const MAX_TENTATIVAS = 3;
const DESTINOS_REDIRECIONAMENTO_PERMITIDOS = Object.freeze([
  "index.html",
  "loja.html",
  "loja.html#carrinho",
  "perfil.html",
  "relatorios.html",
]);

/**
 * Valida o parâmetro redirect contra uma lista fechada de páginas internas permitidas,
 * prevenindo XSS (esquemas como javascript:) e Open Redirect após o login.
 * @param {string|null} redirectParam - Valor bruto recebido na query string.
 * @param {string} [perfil='cliente'] - Perfil do usuário autenticado.
 * @returns {string} Caminho interno seguro para redirecionamento.
 */
export function obterDestinoSeguro(redirectParam, perfil = "cliente") {
  const destinoSolicitado = String(redirectParam ?? "").trim();
  if (!DESTINOS_REDIRECIONAMENTO_PERMITIDOS.includes(destinoSolicitado)) {
    return "loja.html";
  }
  if (destinoSolicitado === "relatorios.html" && perfil !== "administrador") {
    return "loja.html";
  }
  return destinoSolicitado;
}

/**
 * Cria conta administradora (Requisito 2.2e).
 * Credenciais padrão: admin@livros.com / Admin1234
 */
export async function garantirContaAdmin() {
  inicializarStorage();
  const clientes = obterClientes();
  const jaTemAdmin = clientes.some((c) => c.perfil === "administrador");
  if (jaTemAdmin) return;
  const salt = gerarSalt();
  const senhaHash = await gerarHashSenha("Admin1234", salt);
  const admin = {
    id: "ADM01",
    nome: "Administrador Loja",
    cpf: "666.666.666-66",
    telefone: "48999999999",
    email: "admin@livros.com",
    salt,
    senhaHash,
    perfil: "administrador",
    bloqueado: false,
    criadoEm: new Date().toISOString(),
  };
  clientes.push(admin);
  salvarDados(CHAVES_STORAGE.CLIENTES, clientes);
}

/**
 * Renova o tempo de expiração da sessão por mais 30 minutos a cada interação.
 */
export function renovarSessao() {
  const sessao = obterSessaoAtiva();
  if (!sessao) return;
  sessao.expiraEm = Date.now() + TEMPO_EXPIRACAO_MS;
  salvarDados(CHAVES_STORAGE.SESSAO, sessao);
}

/**
 * Encerra a sessão do usuário (Logout), mantendo o carrinho salvo.
 */
export function encerrarSessao() {
  removerDados(CHAVES_STORAGE.SESSAO);
}

/**
 * Retorna a sessão ativa atual ou null se não houver sessão ou se tiver expirado (30 min).
 * @param {boolean} [removerSeExpirada=true] - Remove a sessão do localStorage caso esteja expirada.
 * @returns {Object|null}
 */
export function obterSessaoAtiva(removerSeExpirada = true) {
  const sessao = lerDados(CHAVES_STORAGE.SESSAO, null);
  if (!sessao) return null;
  if (Date.now() > sessao.expiraEm) {
    if (removerSeExpirada) {
      removerDados(CHAVES_STORAGE.SESSAO);
    }
    return null;
  }
  return sessao;
}

/**
 * Retorna os segundos para terminar o bloqueio de login (ou 0 se não estiver bloqueado).
 * @returns {number} Segundos restantes de bloqueio.
 */
export function obterSegundosRestantesBloqueio() {
  const tentativas = lerDados(CHAVES_STORAGE.TENTATIVAS_LOGIN, {
    falhas: 0,
    bloqueadoAte: 0,
  });
  if (!tentativas.bloqueadoAte) return 0;
  const restanteMs = tentativas.bloqueadoAte - Date.now();
  if (restanteMs <= 0) {
    removerDados(CHAVES_STORAGE.TENTATIVAS_LOGIN);
    return 0;
  }
  return Math.ceil(restanteMs / 1000);
}

/**
 * Valida e-mail e senha comparando o hash SHA-256 e controla o bloqueio após 3 falhas.
 * @param {string} email
 * @param {string} senha
 * @returns {Promise<{sucesso: boolean, mensagem: string, bloqueadoSegundos?: number, sessao?: Object}>}
 */
export async function autenticarUsuario(email, senha) {
  await garantirContaAdmin();

  // Verifica se está bloqueado temporariamente por excesso de tentativas
  const segundosBloqueio = obterSegundosRestantesBloqueio();
  if (segundosBloqueio > 0) {
    return {
      sucesso: false,
      bloqueadoSegundos: segundosBloqueio,
      mensagem: `Muitas tentativas falhas. Tente novamente em ${segundosBloqueio}s.`,
    };
  }

  const emailLimpo = String(email).trim().toLowerCase();
  const clientes = obterClientes();
  const usuario = clientes.find((c) => c.email.toLowerCase() === emailLimpo);

  // Se o usuário existir, calcula o hash da senha digitada usando o salt dele
  let senhaCorreta = false;
  if (usuario) {
    const hashDigitado = await gerarHashSenha(String(senha), usuario.salt);
    senhaCorreta = hashDigitado === usuario.senhaHash;
  }

  // Se e-mail não existe ou senha incorreta -> incrementa falhas e retorna mensagem genérica
  if (!usuario || !senhaCorreta) {
    const tentativas = lerDados(CHAVES_STORAGE.TENTATIVAS_LOGIN, {
      falhas: 0,
      bloqueadoAte: 0,
    });
    const novasFalhas = (tentativas.falhas || 0) + 1;

    if (novasFalhas >= MAX_TENTATIVAS) {
      const bloqueadoAte = Date.now() + TEMPO_BLOQUEIO_MS;
      salvarDados(CHAVES_STORAGE.TENTATIVAS_LOGIN, { falhas: 0, bloqueadoAte });
      return {
        sucesso: false,
        bloqueadoSegundos: 60,
        mensagem: "E-mail ou senha inválidos. Muitas tentativas: aguarde 60s.",
      };
    }

    salvarDados(CHAVES_STORAGE.TENTATIVAS_LOGIN, {
      falhas: novasFalhas,
      bloqueadoAte: 0,
    });
    return { sucesso: false, mensagem: "E-mail ou senha inválidos." };
  }
  // Requisito 2.2(f): verifica se o cliente foi bloqueado pelo administrador
  if (usuario.bloqueado) {
    return {
      sucesso: false,
      mensagem: "Sua conta está bloqueada pelo administrador.",
    };
  }
  // Login com sucesso! Limpa tentativas e cria a sessão de 30 minutos
  removerDados(CHAVES_STORAGE.TENTATIVAS_LOGIN);
  const agora = Date.now();
  const sessao = {
    usuarioId: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil || "cliente",
    inicioEm: agora,
    expiraEm: agora + TEMPO_EXPIRACAO_MS,
  };
  mesclarCarrinhoAoLogar(usuario.id);
  salvarDados(CHAVES_STORAGE.SESSAO, sessao);
  return { sucesso: true, mensagem: `Bem-vindo(a), ${usuario.nome}!`, sessao };
}

/**
 * Cria e insere o parágrafo de feedback acessível antes dos botões do formulário de login.
 * @param {HTMLFormElement} formLogin
 * @returns {HTMLParagraphElement}
 */
function criarAvisoFormularioLogin(formLogin) {
  const aviso = document.createElement("p");
  aviso.className = "mensagem-erro-campo";
  aviso.setAttribute("role", "alert");
  aviso.setAttribute("aria-live", "polite");
  formLogin
    .querySelector(".acoes-form")
    ?.insertAdjacentElement("beforebegin", aviso);
  return aviso;
}

/**
 * Exibe mensagens contextuais vindas por query string (pós-cadastro, página restrita ou sessão expirada).
 * @param {HTMLElement} avisoLogin
 * @param {URLSearchParams} params
 */
function exibirAvisoRedirecionamento(avisoLogin, params) {
  if (params.get("cadastro") === "sucesso") {
    definirMensagemEstado(
      avisoLogin,
      "Cadastro realizado com sucesso! Faça seu login abaixo.",
      "sucesso",
    );
    return;
  }

  const avisosPorMotivo = {
    login_necessario: "Faça login para acessar a página solicitada.",
    sessao_expirada:
      "Sua sessão expirou por inatividade. Faça login novamente.",
  };
  const mensagemMotivo = avisosPorMotivo[params.get("motivo")];
  if (mensagemMotivo) {
    definirMensagemEstado(avisoLogin, mensagemMotivo, "aviso");
  }
}

/**
 * Cria um controlador para o cronômetro regressivo de bloqueio temporário de login (60s).
 * @param {HTMLElement} avisoLogin
 * @param {HTMLButtonElement|null} btnSubmit
 * @returns {() => void} Função que inicia/atualiza a contagem regressiva.
 */
function criarMonitorBloqueioLogin(avisoLogin, btnSubmit) {
  let timerBloqueio = null;

  return function iniciarContagem() {
    clearInterval(timerBloqueio);
    const atualizar = () => {
      const seg = obterSegundosRestantesBloqueio();
      if (seg > 0) {
        if (btnSubmit) btnSubmit.disabled = true;
        definirMensagemEstado(
          avisoLogin,
          `Login bloqueado temporariamente. Tente novamente em ${seg}s.`,
          "erro",
        );
      } else {
        clearInterval(timerBloqueio);
        if (btnSubmit) btnSubmit.disabled = false;
        if (avisoLogin.textContent.startsWith("Login bloqueado")) {
          definirMensagemEstado(avisoLogin, "");
        }
      }
    };
    atualizar();
    if (obterSegundosRestantesBloqueio() > 0) {
      timerBloqueio = setInterval(atualizar, 1000);
    }
  };
}

/**
 * Processa o envio do formulário de login, validando entradas e redirecionando com segurança.
 * @param {SubmitEvent} evento
 * @param {Object} contexto
 */
async function processarSubmitLogin(
  evento,
  { campoEmail, campoSenha, btnSubmit, avisoLogin, params, iniciarContagem },
) {
  evento.preventDefault();
  definirMensagemEstado(avisoLogin, "", "erro");

  if (!campoEmail?.value.trim() || !campoSenha?.value) {
    definirMensagemEstado(
      avisoLogin,
      "Preencha seu e-mail e a sua senha.",
      "erro",
    );
    (!campoEmail?.value.trim() ? campoEmail : campoSenha)?.focus();
    return;
  }

  alternarCarregamentoBotao(btnSubmit, true, "Entrando...");
  let resultado;
  try {
    resultado = await autenticarUsuario(campoEmail.value, campoSenha.value);
  } finally {
    alternarCarregamentoBotao(btnSubmit, false);
  }

  if (!resultado.sucesso) {
    definirMensagemEstado(avisoLogin, resultado.mensagem, "erro");
    if (resultado.bloqueadoSegundos) iniciarContagem();
    return;
  }

  const destino = obterDestinoSeguro(
    params.get("redirect"),
    resultado.sessao?.perfil,
  );
  window.location.replace(destino);
}

/**
 * Inicializa o formulário de login (#form-login) e o cronômetro de bloqueio de 60s.
 */
export function inicializarLogin() {
  garantirContaAdmin().catch((erro) => {
    console.error("Erro ao inicializar conta administradora:", erro);
  });

  const formLogin = document.getElementById("form-login");
  if (!formLogin) return;
  formLogin.noValidate = true;

  const campoEmail = document.getElementById("login-email");
  const campoSenha = document.getElementById("login-password");
  const btnSubmit = formLogin.querySelector('button[type="submit"]');
  const params = new URLSearchParams(window.location.search);

  const avisoLogin = criarAvisoFormularioLogin(formLogin);
  exibirAvisoRedirecionamento(avisoLogin, params);

  const iniciarContagem = criarMonitorBloqueioLogin(avisoLogin, btnSubmit);
  iniciarContagem();

  formLogin.addEventListener("submit", (evento) =>
    processarSubmitLogin(evento, {
      campoEmail,
      campoSenha,
      btnSubmit,
      avisoLogin,
      params,
      iniciarContagem,
    }),
  );
}
inicializarLogin();

/**
 * Protege páginas restritas (perfil.html e relatorios.html) e renova a sessão ativa.
 */
export function verificarAcessoPagina() {
  const caminho = window.location.pathname;
  const paginaAtual = caminho.split("/").pop() || "index.html";
  // Verificar se havia uma sessão salva que acabou de expirar por inatividade (30 min)
  const sessaoBruta = lerDados(CHAVES_STORAGE.SESSAO, null);
  if (sessaoBruta && Date.now() > sessaoBruta.expiraEm) {
    removerDados(CHAVES_STORAGE.SESSAO);
    window.location.replace(
      `login.html?motivo=sessao_expirada&redirect=${encodeURIComponent(paginaAtual)}`,
    );
    return;
  }

  const sessao = obterSessaoAtiva();

  // Garantir que perfil seja exibida apenas para usuários logados
  if (paginaAtual === "perfil.html" && !sessao) {
    window.location.replace(
      "login.html?motivo=login_necessario&redirect=perfil.html",
    );
    return;
  }

  // Garantir que admin seja exibida apenas para administradores
  if (
    paginaAtual === "relatorios.html" &&
    (!sessao || sessao.perfil !== "administrador")
  ) {
    window.location.replace(
      "login.html?motivo=login_necessario&redirect=relatorios.html",
    );
    return;
  }

  // Garantir que login e cadastro não sejam exibidos para usuários já logados
  if (
    (paginaAtual === "cadastro.html" || paginaAtual === "login.html") &&
    sessao
  ) {
    window.location.replace("perfil.html");
    return;
  }

  // Se logado: renova os 30 min a cada clique ou tecla relevante
  if (sessao) {
    renovarSessao();
    document.addEventListener("click", renovarSessao);
    document.addEventListener("keydown", renovarSessao);
  }
  // Se passou pelas verificações de acesso, exibe a página
  document.body.hidden = false;
}

window.addEventListener("pageshow", (evento) => {
  if (evento.persisted) {
    document.body.hidden = true;
    verificarAcessoPagina();
  }
});

verificarAcessoPagina();
