import { encerrarSessao, obterSessaoAtiva, verificarAcessoPagina } from './auth.js';
import { atualizarBadgeCarrinho } from './carrinho.js';

/**
 * Monta os itens do menu principal dinamicamente conforme o estado da sessão (Requisito 2.2d)
 */

export function renderizarMenuDinamico() {
    const ulMenu = document.querySelector('#menu-principal ul');

    if (!ulMenu) return;

    const sessao = obterSessaoAtiva();
    const paginaAtual = window.location.pathname.split('/').pop() || 'index.html';

    // Limpa itens fixos no HTML
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
    verificarAcessoPagina();
    renderizarMenuDinamico();
