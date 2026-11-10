import { CHAVES_STORAGE, inicializarStorage, lerDados, removerDados, salvarDados } from './storage.js';
import { gerarHashSenha, gerarSalt, obterClientes } from './clientes.js';

const TEMPO_EXPIRACAO_MS = 30 * 60 * 1000; // 30 minutos em milissegundos
const TEMPO_BLOQUEIO_MS = 60 * 1000;       // 60 segundos de bloqueio após 3 erros
const MAX_TENTATIVAS = 3;

/**
 * Cria conta administradora (Requisito 2.2e).
 * Credenciais padrão: admin@livros.com / Admin1234
 */
export async function garantirContaAdmin() {
  inicializarStorage();
  const clientes = obterClientes();
  const jaTemAdmin = clientes.some((c) => c.perfil === 'administrador');
  if (jaTemAdmin) return;
  const salt = gerarSalt();
  const senhaHash = await gerarHashSenha('Admin1234', salt);
  const admin = {
    id: 'ADM01',
    nome: 'Administrador Loja',
    cpf: '000.000.000-00',
    telefone: '48999999999',
    email: 'admin@livros.com',
    salt,
    senhaHash,
    perfil: 'administrador',
    bloqueado: false,
    criadoEm: new Date().toISOString()
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
 * @returns {Object|null}
 */
export function obterSessaoAtiva() {
  const sessao = lerDados(CHAVES_STORAGE.SESSAO, null);
  if (!sessao) return null;
  if (Date.now() > sessao.expiraEm) {
    removerDados(CHAVES_STORAGE.SESSAO);
    return null;
  }
  return sessao;
}

/**
 * Retorna os segundos para terminar o bloqueio de login (ou 0 se não estiver bloqueado).
 * @returns {number} Segundos restantes de bloqueio.
 */
export function obterSegundosRestantesBloqueio() {
  const tentativas = lerDados(CHAVES_STORAGE.TENTATIVAS_LOGIN, { falhas: 0, bloqueadoAte: 0 });
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
    //** TODO */
    await garantirContaAdmin();

    // Verifica se está bloqueado temporariamente por excesso de tentativas
    const segundosBloqueio = obterSegundosRestantesBloqueio();
    if (segundosBloqueio > 0) {
        return {
        sucesso: false,
        bloqueadoSegundos: segundosBloqueio,
        mensagem: `Muitas tentativas falhas. Tente novamente em ${segundosBloqueio}s.`
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
       const tentativas = lerDados(CHAVES_STORAGE.TENTATIVAS_LOGIN, { falhas: 0, bloqueadoAte: 0 });
       const novasFalhas = (tentativas.falhas || 0) + 1;

    if (novasFalhas >= MAX_TENTATIVAS) {
        const bloqueadoAte = Date.now() + TEMPO_BLOQUEIO_MS;
        salvarDados(CHAVES_STORAGE.TENTATIVAS_LOGIN, { falhas: 0, bloqueadoAte });
        return {
            sucesso: false,
            bloqueadoSegundos: 60,
            mensagem: 'E-mail ou senha inválidos. Muitas tentativas: aguarde 60s.'
        };
    }

    salvarDados(CHAVES_STORAGE.TENTATIVAS_LOGIN, { falhas: novasFalhas, bloqueadoAte: 0 });
    return { sucesso: false, mensagem: 'E-mail ou senha inválidos.' };
    }
    // Requisito 2.2(f): verifica se o cliente foi bloqueado pelo administrador
    if (usuario.bloqueado) {
        return {
        sucesso: false,
        mensagem: 'Sua conta está bloqueada pelo administrador.'
        };
    }
    // Login com sucesso! Limpa tentativas e cria a sessão de 30 minutos
    removerDados(CHAVES_STORAGE.TENTATIVAS_LOGIN);
    const agora = Date.now();
    const sessao = {
        usuarioId: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil || 'cliente',
        inicioEm: agora,
        expiraEm: agora + TEMPO_EXPIRACAO_MS
    };
    salvarDados(CHAVES_STORAGE.SESSAO, sessao);
    return { sucesso: true, mensagem: `Bem-vindo(a), ${usuario.nome}!`, sessao };
}

/**
 * Inicializa o formulário de login (#form-login) e o cronômetro de bloqueio de 60s.
 */
export function inicializarLogin() {
    /** TODO */
}
