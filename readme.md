# Projeto 1  - Loja Virtual: Estrutura e Interface (HTML e CSS) 

> Disciplina: FEI786202 - PROGRAMAÇÃO FRONTEND I (2026 .2 - T01)
> Curso: Análise e Desenvolvimento de Sistemas - IFSC - Campus São José
> Docentes responsáveis:
> - Profa. Ana Scharf – ana.scharf@ifsc.edu.br
> - Prof. Cleber Joerge Amaral 
> - Prof. Pedro Camara -  pedro.camara@ifsc.edu.br

Projeto de Loja Virtual desenvolvido por *Lucas de Godoy Chicarelli* como parte da avaliação para a disciplina de **PROGRAMAÇÃO FRONTEND I** do Curso de **Análise e Desenvolvimento de Sistemas** - IFSC - Campus São José.

## Descrição

O projeto consiste em construir o site de uma loja  virtual de uma empresa real ou fictícia, que futuramente permitirá gerenciar clientes e compras. A página deve apresentar nome, logo, descrição da loja e informações de contato.

Nesta primeira etapa não é permitido utilizar JavaScript. Todas as telas devem ser construídas como uma interface completa e navegável, com dados de exemplo escritos diretamente no HTML, simulando como o sistema ficará quando estiver funcionando. Botões e formulários não precisam executar ações nesta etapa, mas precisam existir, estar bem estruturados e estilizados.

## 2 Requisitos das páginas

Avaliação feita do ponto de vista do usuário, considerando interface, organização, coerência visual e qualidade do layout.

## 2.1 Página inicial e produtos

- (a) Produtos disponíveis: apresentar no mínimo 10 produtos diferentes. Cada produto deve conter nome, imagem, descrição e preço, além de um botão “Adicionar ao carrinho” (apenas visual nesta etapa).
- (b) Descrição da loja: apresentar a história/descrição da empresa e dos produtos comercializados, com pelo menos duas imagens fora da galeria de produtos. 
- (c) Destaque: incluir uma área de destaque (banner ou chamada principal) com nome e logo da loja.
- (d) Contato: exibir informações da empresa (endereço, telefone, e-mail, horário) e um formulário de contato com nome, e-mail e mensagem.

## 2.2 Cadastro, login e perfil do cliente

- (a) Cadastro (cadastro.html): formulário com nome, e-mail, senha e CPF (no mínimo quatro informações), mais confirmação de senha. Utilizar os recursos nativos do HTML: labels associados aos campos, tipos de input adequados, required, minlength, pattern (CPF), placeholder e autocomplete.
- (b) Login (login.html): formulário de autenticação com e-mail e senha, com link para a página de cadastro.
- (c) Perfil (perfil.html): formulário de edição dos dados do cliente com todos os campos do cadastro. O ID do cliente (ex.: C001) deve aparecer em um campo que não pode ser editado (readonly ou disabled). A página deve conter também uma tabela de exemplo “Meus pedidos”.
- (d) Consistência: as três telas devem seguir o mesmo padrão visual de formulário 
(espaçamentos, botões, estados de foco e de erro visual).

## 2.3 Loja e carrinho

- (a) Catálogo (loja.html): grade de produtos com filtros visuais (categoria, faixa de preço e ordenação) e campo de busca.
- (b) Carrinho: área de carrinho com pelo menos 3 itens de exemplo, mostrando produto,
quantidade, preço unitário, subtotal, botão de remover, total e botão “Finalizar compra”.
- (c) Confirmação: bloco de mensagem de compra finalizada (com número de pedido de exemplo, ex.: CP001) estilizado e ocultado com o atributo hidden. Documentar no README como visualizá-lo (removendo o atributo).

2.4 Página de relatórios do administrador

- (a) Relatório de clientes: tabela com ID, nome, e-mail e CPF, com pelo menos 5 clientes de exemplo.
- (b) Busca de clientes: formulário de busca por nome, ID, e-mail ou CPF (campo de texto + seletor do critério).
- (c) Relatório e busca de compras: tabela com ID da compra, cliente, produtos, quantidade, valor
total e data (mínimo 5 compras de exemplo) e formulário de busca por ID, cliente, data, valor ou produto.
- (d) Cabeçalho e rodapé personalizados: a página de relatórios deve ter cabeçalho e rodapé diferentes dos do restante do site (identificação de “Área administrativa”, data/hora de emissão como texto de exemplo, etc.) e uma folha de estilo própria para impressão (@media print).
- (e) Tabelas semânticas: usar caption, thead, tbody, tfoot (quando fizer sentido) e th com scope.

## 2.5 Interface e responsividade

- (a) Menu de navegação presente em todas as páginas, com destaque visual para a página atual (aria-current e CSS).
- (b) Rodapé presente em todas as páginas.
- (c) Idioma: todo o conteúdo em português (atributo lang='pt-BR' no html). 
- (d) Responsividade com media queries para:
    - desktop (> 1024px);
    - tablet (≥ 768px e ≤ 1024px);
    - smartphone (≤ 320px), sem rolagem horizontal e com menu adaptado (menu “hambúrguer” feito somente com CSS).
- (e) Identidade visual: paleta de cores e tipografia coerentes com a loja, uso de variáveis CSS  (custom properties), Flexbox e/ou Grid para o layout, estados :hover, :focus-visible e :active, e  pelo menos uma transição ou animação sutil.
- (f) Acessibilidade básica: texto alternativo em todas as imagens, contraste adequado, foco visível e hierarquia de títulos correta (h1 a h3).

## 3 Requisitos técnicos

- Usar somente HTML e CSS, sem JavaScript e sem bibliotecas ou frameworks (Bootstrap, Tailwind etc.).
- O sistema deve ter seis páginas HTML, com os nomes abaixo (os mesmos serão usados na Parte 2):

| Arquivo | Conteúdo Mínimo |
| :--- | :--- |
| `index.html` | Destaque, descrição da loja, galeria com 10+ produtos, contato. |
| `cadastro.html` | Formulário de cadastro de cliente. |
| `login.html` | Formulário de login. |
| `perfil.html` | Edição dos dados do cliente e tabela “Meus pedidos”. |
| `loja.html` | Catálogo com filtros e carrinho. |
| `relatorios.html` | Área administrativa: relatórios e buscas. |

- Semântica adequada: header, nav, main, section, article, aside, footer, figure/figcaption, form, fieldset/legend, table.
- CSS em arquivos separados, sem estilos inline nem tags style nas páginas. Sugestão: css/base.css (variáveis e reset), css/layout.css, css/componentes.css, css/responsivo.css e css/relatorios.css.
- Padronização de nomes: classes e ids em minúsculas, com hífen (ex.: cartao-produto, form-cadastro, tabela-clientes). Elementos que receberão comportamento na Parte 2
(formulários, botões, tabelas, carrinho) devem ter id próprio e claro.
- Imagens organizadas na pasta img/, com tamanhos otimizados e atributo alt.
- Código validado conforme os padrões W3C (HTML e CSS), sem erros. Incluir no repositório os prints das validações.
- Repositório Git com README.md contendo: descrição da loja, integrantes, estrutura de pastas e instruções para visualizar as telas ocultas.
- Commits frequentes e com mensagens claras, de ambos os integrantes. - Criar repositório com pedroacamara no github com o nome (nomedoaluno_disciplina_26.2)

## Plágio não é tolerado

O estudante deve ser o único responsável pela entrega. Não é permitido copiar código ou texto de colegas, repositórios ou ferramentas automáticas. Discussões são permitidas, mas não cópias.