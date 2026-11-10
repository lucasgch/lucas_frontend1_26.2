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