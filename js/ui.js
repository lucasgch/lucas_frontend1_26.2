import { encerrarSessao, obterSessaoAtiva } from './auth.js';
import { atualizarBadgeCarrinho } from './carrinho.js';
import { CHAVES_STORAGE, gerarProximoId, inicializarStorage, lerDados, salvarDados } from './storage.js';
import { validarEmail } from './utils.js';

/**
 * Monta os itens do menu principal dinamicamente conforme o estado da sessão (Requisito 2.2d)
 */

export function renderizarMenuDinamico() {
    const ulMenu = document.querySelector('#menu-principal ul');

    if (!ulMenu) return;

    const sessao = obterSessaoAtiva();
    const paginaAtual = window.location.pathname.split('/').pop() || 'index.html';

    document.getElementById('saudacao-header')?.remove();
    // Se for visitante, o HTML já nasce com o menu de visitante pronto! Só garante o badge do carrinho:
    if (!sessao) {
        atualizarBadgeCarrinho();
        return;
    }
    // Se logado, substitui pelos links da conta logada:
    ulMenu.replaceChildren();

    // Cria cada item li
    function adicionarLink(href, texto){
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = href;
        a.textContent = texto;
        if (paginaAtual === href) {
            a.setAttribute('aria-current', 'page');
        }
        li.appendChild(a);
        ulMenu.appendChild(li);
    }

    // Links comuns
    adicionarLink('index.html', 'Início');
    adicionarLink('loja.html', 'Loja');

    document.getElementById('saudacao-header')?.remove();
    
    if (!sessao) {
        // Visitante vê "Entrar" e "Cadastrar"
        adicionarLink('login.html', 'Entrar');
        adicionarLink('cadastro.html', 'Cadastrar');
     } else {
        // Administrador vê também "Relatórios"
        if (sessao.perfil === 'administrador') {
            adicionarLink('relatorios.html', 'Relatórios');
        }
        // Saudação "Olá, [primeiro nome]" centralizada entre a logo e o menu
        const logo = document.querySelector('.site-header .site-logo');
        if (logo) {
            const primeiroNome = sessao.nome.split(' ')[0];
            const spanOla = document.createElement('span');
            spanOla.id = 'saudacao-header';
            spanOla.className = 'saudacao-usuario';
            spanOla.textContent = `Olá, ${primeiroNome}`;
            logo.insertAdjacentElement('afterend', spanOla);
        }

        // "Meu perfil"
        adicionarLink('perfil.html', 'Meu perfil');

        // Botão "Sair"
        const liSair = document.createElement('li');
        const linkSair = document.createElement('a');
        linkSair.href = '#sair';
        linkSair.id = 'link-sair-menu';
        linkSair.textContent = 'Sair';
        linkSair.addEventListener('click', (evento) => {
            evento.preventDefault();
            encerrarSessao();
            window.location.href = 'login.html';
            });
            liSair.appendChild(linkSair);
            ulMenu.appendChild(liSair);
        }

        // Ícone e contador do carrinho no final do menu
        atualizarBadgeCarrinho();

        // Conecta também o botão de logout do rodapé de relatorios.html
        const btnLogoutRodape = document.getElementById('btn-logout');
        btnLogoutRodape?.addEventListener('click', (evento) => {
            evento.preventDefault();
            encerrarSessao();
            window.location.href = 'login.html';
        });
    }
    
    // Protege a página e renderiza o menu ao carregar
    renderizarMenuDinamico();

    /**
 * Valida o formulário de contato do rodapé (#form-contato) e salva a mensagem no localStorage (Requisito 2.5g).
 */
export function inicializarFormularioContato() {
  const formContato = document.getElementById('form-contato');
  if (!formContato) return;
  formContato.noValidate = true;

  const campoNome = document.getElementById('campo-nome');
  const campoEmail = document.getElementById('campo-email');
  const campoMensagem = document.getElementById('campo-comentarios');

  const avisoContato = document.createElement('p');
  avisoContato.className = 'mensagem-erro-campo';
  avisoContato.setAttribute('role', 'status');
  avisoContato.setAttribute('aria-live', 'polite');
  formContato.querySelector('.acoes-form')?.insertAdjacentElement('beforebegin', avisoContato);

  [campoNome, campoEmail, campoMensagem].forEach((campo) => {
    campo?.addEventListener('input', () => {
      avisoContato.textContent = '';
    });
  });

  formContato.addEventListener('submit', (evento) => {
    evento.preventDefault();
    avisoContato.style.color = '#dc2626';

    const nome = campoNome?.value.trim() || '';
    const email = campoEmail?.value.trim() || '';
    const mensagem = campoMensagem?.value.trim() || '';

    if (nome.length < 3) {
      avisoContato.textContent = 'Informe seu nome (mínimo de 3 caracteres).';
      campoNome?.focus();
      return;
    }
    if (!validarEmail(email)) {
      avisoContato.textContent = 'Informe um endereço de e-mail válido.';
      campoEmail?.focus();
      return;
    }
    if (mensagem.length < 5) {
      avisoContato.textContent = 'Digite uma mensagem com pelo menos 5 caracteres.';
      campoMensagem?.focus();
      return;
    }

    inicializarStorage();
    const mensagens = lerDados(CHAVES_STORAGE.MENSAGENS, []);
    const lista = Array.isArray(mensagens) ? mensagens : [];

    lista.push({
      id: gerarProximoId('mensagem', 'M'),
      nome,
      email: email.toLowerCase(),
      mensagem,
      data: new Date().toISOString(),
      lida: false
    });

    salvarDados(CHAVES_STORAGE.MENSAGENS, lista);
    formContato.reset();
    avisoContato.style.color = '#16a34a';
    avisoContato.textContent = 'Mensagem enviada com sucesso! Obrigado pelo contato.';
  });
}

// Renderiza o menu e inicializa o formulário de contato ao carregar
renderizarMenuDinamico();
inicializarFormularioContato();