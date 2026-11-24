# Projeto 2 – Parte 2 - Loja Virtual: Gerenciamento de Clientes e Compras (JavaScript)

> Disciplina: FEI786202 - PROGRAMAÇÃO FRONTEND I (2026 .2 - T01)
> Curso: CST em Análise e Desenvolvimento de Sistemas - IFSC - Campus São José
> Docentes responsáveis:
>
> - Profa. Ana Scharf – <ana.scharf@ifsc.edu.br>
> - Prof. Cleber Joerge Amaral
> - Prof. Pedro Camara - <pedro.camara@ifsc.edu.br>

Projeto de Loja Virtual desenvolvido por *Lucas de Godoy Chicarelli* como parte da avaliação para a disciplina de **PROGRAMAÇÃO FRONTEND I** do Curso de **Análise e Desenvolvimento de Sistemas** - IFSC - Campus São José.

> **Informações importantes — Pré-requisito:** este trabalho é a continuação da Parte 1 (HTML e CSS). O aluno deve partir do seu próprio site, sem refazê-lo do zero. Ajustes de HTML e CSS necessários para suportar os novos comportamentos (mensagens de erro, modais, estados) são permitidos e esperados, inserindo as colocações feitas nos atendimentos individuais, mas a identidade visual deve ser mantida. O trabalho deve ser realizado **INDIVIDUAL**.

## 1 Descrição geral

O objetivo é transformar o site estático da Parte 1 em uma aplicação web funcional de loja virtual, com cadastro e autenticação de clientes, catálogo dinâmico, carrinho de compras, finalização de pedidos e uma área administrativa com relatórios, buscas e painel de indicadores.

Não há servidor nem banco de dados: todos os dados ficam no `localStorage` do navegador. Por isso, a organização da camada de dados, o tratamento de erros e a validação das entradas são parte central da avaliação.

## 2 Requisitos funcionais

### 2.1 Clientes

- [ ] - (a) **Cadastro funcional:** validar no JavaScript antes de salvar:
  - [X] - nome (mínimo de 3 caracteres, com nome e sobrenome);
  - [X] - e-mail (formato válido e único no sistema);
  - [X] - Número de telefone (formato válido e somente com números);
  - [X] - senha (mínimo de 8 caracteres, com letras e números) com indicador de força atualizado em tempo real, e confirmação de senha;
  - [X] - CPF com máscara automática (`000.000.000-00`) durante a digitação, validação dos dígitos verificadores (não basta usar expressão regular) e unicidade.
- [X] - (b) **Mensagens de erro:** exibidas junto ao campo correspondente, sem uso de `alert()`, removidas ao corrigir; ao enviar com erros, o foco vai para o primeiro campo inválido.
- [X] - (c) **Identificador:** gerar automaticamente ID sequencial com prefixo comum (`C001`, `C002`...) a partir de um contador persistente, de modo que um ID nunca seja reutilizado, mesmo após exclusões.
- [x] - (d) **Senha protegida:** a senha nunca deve ser armazenada em texto puro. Gerar hash SHA-256 com a API nativa `SubtleCrypto` (`crypto.subtle`) combinado a um salt aleatório por cliente. *(Observação didática: em sistemas reais isso é feito no servidor.)*
- [X] - (e) **Edição:** em `perfil.html`, carregar os dados do cliente logado e permitir editar todos os campos, exceto o ID. Alterar a senha exige informar a senha atual. E-mail e CPF continuam únicos. Só salvar quando houver alteração e informar o resultado ao usuário.
- [ ] - (f) **Exclusão de conta:** com confirmação em caixa de diálogo (elemento `<dialog>`). O histórico de compras deve ser preservado (ver 2.4).

*Dúvida 1*: Após a parte 1, foi informado que o CPF não poderia ser alterado. O requisito exige que todos os campos sejam editáveis, exceto o ID.

*Dúvida 2*: Ao excluir conta o histórico é preservado no relatório, mas não estará mais vinculado ao novo perfil do usuário. É isso?

### 2.2 Autenticação e sessão

- [X] - (a) **Login:** validar e-mail e senha comparando o hash. A mensagem de erro deve ser genérica (“E-mail ou senha inválidos”). Após 3 tentativas falhas, bloquear novas tentativas por 60 segundos, exibindo contagem regressiva (o bloqueio deve sobreviver a recarregar a página).
- [X] - (b) **Sessão:** controle com `localStorage` guardando ID do usuário, perfil (cliente ou administrador), início e expiração por inatividade (30 minutos, renovada a cada interação relevante). Sessão expirada gera logout automático com aviso.
- [X] - (c) **Proteção de páginas:** `perfil.html` exige login; finalizar compra exige login; `relatorios.html` exige perfil de administrador. Ao ser barrado, o usuário é enviado para `login.html` com mensagem e, após entrar, retorna à página que tentava acessar (parâmetro na URL).
- [X] - (d) **Menu dinâmico:** visitante vê “Entrar” e “Cadastrar”; cliente logado vê “Olá, [nome]”, “Meu perfil” e “Sair”; administrador vê também “Relatórios”. Sair encerra a sessão, mas mantém o carrinho salvo.
- [X] - (e) **Conta administradora:** criada automaticamente na primeira execução (seed), com credenciais documentadas no `README`.
- [X] - (f) **Bloqueio de cliente:** clientes bloqueados pelo administrador não conseguem entrar (ver 2.5).

### 2.3 Catálogo e carrinho

- [X] - (a) **Catálogo dinâmico:** os produtos passam a ser definidos em um único arquivo JavaScript (`data/produtos.js`) com `id`, `nome`, `categoria`, `descrição`, `preço`, `imagem` e `estoque`, e renderizados dinamicamente em `index.html` e `loja.html` (usar o elemento `<template>` ou `createElement`). O HTML repetido da Parte 1 deve ser eliminado.
- [X] - (b) **Busca e filtros em `loja.html`:** busca por texto em tempo real (com *debounce*), filtro por categoria, filtro por faixa de preço, ordenação (menor preço, maior preço, nome) e mensagem quando nada for encontrado.
- [X] - (c) **Detalhes do produto:** abrir em uma janela modal (`<dialog>`) com imagem ampliada, descrição, estoque disponível e seletor de quantidade.
- [X] - (d) **Carrinho:** adicionar, remover e alterar quantidade (botões `+` e `−`, limitado ao estoque), com subtotal por item, total geral e contador no menu (*badge*). Persistido em `localStorage`, com um carrinho por cliente; o carrinho do visitante deve ser mesclado ao carrinho do cliente ao fazer login.
- [X] - (e) **Cupons:** pelo menos 3 cupons com regras diferentes (percentual, valor fixo e frete grátis), com valor mínimo de compra e data de validade, com mensagens claras de sucesso ou erro.
- [X] - (f) **Frete simulado:** calcular por faixa de CEP (mínimo de 3 faixas) com frete grátis acima de um valor definido.
- [X] - (g) **Formatação:** valores em moeda brasileira e datas em `pt-BR` usando a API `Intl` (`Intl.NumberFormat` e `Intl.DateTimeFormat`).

### 2.4 Compras e checkout

- [X] - (a) **Acesso:** finalizar compra apenas para clientes logados; visitantes são redirecionados ao login e retornam ao carrinho intacto.
- [X] - (b) **Etapas:** resumo do pedido → endereço/entrega → pagamento → confirmação, com validação em cada etapa e possibilidade de voltar.
- [X] - (c) **Pagamento simulado:** Pix, cartão e boleto. No cartão, validar número com o algoritmo de Luhn, validade e CVV. Armazenar apenas os 4 últimos dígitos.
- [X] - (d) **Registro da compra:** ID automático (`CP001`, `CP002`...), cliente (guardar cópia de ID, nome e e-mail no momento da compra), itens (ID, nome, preço unitário no momento da compra e quantidade), subtotal, desconto, frete, valor total, forma de pagamento, data e hora, e status.
- [X] - (e) **Estoque:** dar baixa automática após a compra e revalidar o estoque no momento da finalização, impedindo a venda de itens indisponíveis.
- [X] - (f) **Confirmação e histórico:** tela de confirmação com o resumo e o número do pedido, carrinho esvaziado e, em `perfil.html`, a lista real “Meus pedidos” com detalhes expansíveis (elemento `<details>`).

### 2.5 Área administrativa

- [X] - (a) **Relatório de clientes:** listar todos os clientes, com ordenação por coluna (clicando no cabeçalho) e paginação (10 registros por página), exibindo o total de registros.
- [X] - (b) **Busca de clientes:** por nome, ID, e-mail ou CPF, de forma parcial, sem diferenciar maiúsculas/minúsculas ou acentos, aceitando CPF com ou sem máscara. O resultado é atualizado sem recarregar a página e o termo encontrado é destacado (elemento `<mark>`).
- [X] - (c) **Busca de compras:** por ID, cliente, intervalo de datas, intervalo de valores ou produto, com combinação de filtros, botão “Limpar filtros” e somatório dos valores do resultado. Disponível somente na área administrativa.
- [X] - (d) **Gestão:** ver os detalhes de uma compra em modal e alterar seu status (Pago, Enviado, Entregue, Cancelado); bloquear e desbloquear clientes. O cancelamento de uma compra devolve os itens ao estoque.
- [X] - (e) **Painel de indicadores:** total de clientes, total de compras, faturamento, ticket médio, 5 produtos mais vendidos e gráfico de vendas por período, desenhado com `<canvas>`, `<svg>` ou CSS (sem bibliotecas de gráficos).
- [X] - (f) **Impressão e exportação:** relatórios apresentados em nova página/visão com cabeçalho e rodapé personalizados (data e hora de emissão e administrador responsável), botão “Imprimir / salvar em PDF” (`window.print` com CSS de impressão) e exportação CSV do resultado filtrado, gerada com `Blob`, com escape correto de campos e codificação UTF-8 com BOM.
- [X] - (g) **Mensagens de contato:** o formulário de contato da página inicial deve ser validado e salvo no `localStorage`; o administrador vê a lista de mensagens e pode marcá-las como lidas.

### 2.6 Experiência do usuário

- [X] - Feedback por notificações não bloqueantes (*toasts*) e estados de carregamento; nenhum uso de `alert()`, `confirm()` ou `prompt()`.
- [X] - **Acessibilidade:** mensagens dinâmicas com `aria-live`, foco gerenciado ao abrir e fechar modais e navegação completa pelo teclado.
- [X] - Tema claro/escuro com botão de alternância, persistido no `localStorage` e respeitando `prefers-color-scheme` na primeira visita.
- [X] - A responsividade da Parte 1 (desktop, tablet e smartphone) deve ser mantida em todas as novas telas e componentes.

## 3 Requisitos técnicos

- [X] - Usar somente HTML, CSS e JavaScript puros, sem nenhuma biblioteca externa (jQuery, Chart.js, Bootstrap etc.). APIs nativas do navegador (`SubtleCrypto`, `Intl`, `dialog`, `Blob`) são permitidas.
- [X] - Dados armazenados exclusivamente em `localStorage`, em formato JSON.
- [X] - Módulos ES (`<script type="module">`), com um arquivo principal por página e responsabilidades separadas, por exemplo:

| Arquivo | Responsabilidade |
| :--- | :--- |
| `js/storage.js` | Único ponto de acesso ao `localStorage`: leitura/escrita com `try/catch`, tratamento de dados ausentes ou corrompidos e versão do esquema. |
| `js/utils.js` | Validações (e-mail, CPF, Luhn), máscaras, formatação de moeda e data, normalização de texto e escape de HTML. |
| `js/clientes.js` e `js/auth.js` | Cadastro, edição, exclusão, hash de senha, login, sessão e proteção de páginas. |
| `js/produtos.js` e `data/produtos.js` | Catálogo, busca, filtros e estoque. |
| `js/carrinho.js` | Carrinho, cupons e frete. |
| `js/compras.js` | Checkout, registro de compras e status. |
| `js/relatorios.js` | Buscas, ordenação, paginação, indicadores e exportação. |
| `js/ui.js` | Toasts, modais, menu dinâmico e tema. |

- [X] - **Servidor local:** módulos ES não funcionam abrindo o arquivo diretamente (`file://`). Usar a extensão Live Server do VS Code ou o comando `python -m http.server` e documentar no `README`.
- [X] - Mapa de chaves do `localStorage` documentado no `README` (ex.: `loja:clientes`, `loja:compras`, `loja:sessao`, `loja:carrinho`, `loja:contadores`, `loja:mensagens`, `loja:tema`).
- [X] - **Segurança básica:** nunca inserir dados digitados pelo usuário com `innerHTML` sem escapar (usar `textContent` ou `createElement`), evitando XSS; validar todas as entradas antes de gravar.
- [ ] - **Qualidade do código:** sem variáveis globais soltas, uso de `const`/`let`, funções pequenas e com nomes claros, comentários JSDoc nas funções públicas, sem código duplicado e sem erros ou avisos no console.
- [ ] - HTML e CSS continuam válidos no W3C.
- [ ] - **Roteiro de testes** (arquivo `TESTES.md`) com no mínimo 15 casos de teste manuais (ação, resultado esperado e resultado obtido), cobrindo casos de erro (CPF inválido, e-mail repetido, estoque insuficiente, sessão expirada, acesso sem permissão etc.).
- [ ] - Repositório Git com `README.md` (como executar, credenciais do administrador, cupons e faixas de CEP, mapa do `localStorage`, decisões técnicas e divisão de tarefas) e commits frequentes e claros de ambos os integrantes. Uso de branches por funcionalidade é recomendado.

## 4 Apresentação

- Apresentação obrigatória, com ordem definida pela chamada e duração máxima de 10 minutos.
- Um aluno apresenta e responde perguntas. Ausência implica nota zero para o aluno ausente.
- Demonstrar o fluxo completo: cadastro → login → busca de produto → carrinho com cupom → checkout → “Meus pedidos” → logout → login como administrador → busca de compras → exportação/impressão do relatório.
- As perguntas serão baseadas em HTML, CSS e JavaScript (escopo, eventos, manipulação do DOM, JSON, `localStorage`, módulos, funções assíncronas) e poderão pedir a explicação de um trecho do código.

## 5 Plano de trabalho sugerido

| Etapa | Atividades |
| :--- | :--- |
| **Etapa 1** | Estrutura de módulos, camada de dados (`storage.js` e `utils.js`), catálogo dinâmico e carrinho visual. |
| **Etapa 2** | Cadastro com validações, hash de senha, login, sessão, proteção de páginas e menu dinâmico. |
| **Etapa 3** | Perfil (edição e exclusão), carrinho persistente e mesclado, cupons e frete. |
| **Etapa 4** | Checkout em etapas, registro de compras, estoque e “Meus pedidos”. |
| **Etapa 5** | Área administrativa: relatórios, buscas, gestão, painel de indicadores, impressão e CSV. |
| **Etapa 6** | Tema, acessibilidade, roteiro de testes, correções, `README`, validações e ensaio da apresentação. |

## Plágio não é tolerado

O estudante deve ser o único responsável pela entrega. Não é permitido copiar código ou texto de colegas, repositórios ou ferramentas automáticas. Discussões são permitidas, mas não cópias.
