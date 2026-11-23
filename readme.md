# Projeto 1  - Loja Virtual: Estrutura e Interface (HTML e CSS)

![GitHub License](https://img.shields.io/github/license/lucasgch/lucas_frontend1_26.2)
![GitHub repo size](https://img.shields.io/github/repo-size/lucasgch/lucas_frontend1_26.2)
![GitHub top language](https://img.shields.io/github/languages/top/lucasgch/lucas_frontend1_26.2)

> Disciplina: FEI786202 - PROGRAMAÇÃO FRONTEND I (2026 .2 - T01)
> Curso: Análise e Desenvolvimento de Sistemas - IFSC - Campus São José
> Docentes responsáveis:
>
> - Profa. Ana Scharf – <ana.scharf@ifsc.edu.br>
> - Prof. Cleber Joerge Amaral
> - Prof. Pedro Camara -  <pedro.camara@ifsc.edu.br>

Projeto de Loja Virtual desenvolvido por *Lucas de Godoy Chicarelli* como parte da avaliação para a disciplina de **PROGRAMAÇÃO FRONTEND I** do Curso de **Análise e Desenvolvimento de Sistemas** - IFSC - Campus São José.

## Descrição

O projeto consiste em construir o site de uma loja  virtual de uma empresa real ou fictícia, que futuramente permitirá gerenciar clientes e compras. A página deve apresentar nome, logo, descrição da loja e informações de contato.

Nesta primeira etapa não é permitido utilizar JavaScript. Todas as telas devem ser construídas como uma interface completa e navegável, com dados de exemplo escritos diretamente no HTML, simulando como o sistema ficará quando estiver funcionando. Botões e formulários não precisam executar ações nesta etapa, mas precisam existir, estar bem estruturados e estilizados.

## Enunciado completo

O enunciado completo com todos os requisitos desse desafio pode ser encontrado neste link:

- [Enunciado completo do laboratório](./docs/enunciado.md)

## Credenciais da Conta Administradora (Seed)

Na primeira execução do sistema, uma conta administradora é criada automaticamente no `localStorage` (`garantirContaAdmin()` em `js/auth.js`) com a senha protegida por hash SHA-256 + *salt* aleatório. Utilize os dados abaixo em `login.html` para acessar a área administrativa (`relatorios.html`):

| Campo | Valor |
| :--- | :--- |
| **ID** | `ADM01` |
| **Nome** | `Administrador Loja` |
| **E-mail** | `admin@livros.com` |
| **Senha** | `Admin1234` |
| **Perfil** | `administrador` |

## Mapa de Chaves do `localStorage`

Todos os dados da aplicação são persistidos em formato JSON no `localStorage` do navegador e centralizados no módulo `js/storage.js` (`CHAVES_STORAGE`):

| Constante (`CHAVES_STORAGE`) | Chave no `localStorage` | Tipo / Formato | Descrição |
| :--- | :--- | :--- | :--- |
| `VERSAO` | `lojaLivros:versao` | `string` | Versão atual do esquema de dados (`"1.0"`). |
| `CONTADORES` | `lojaLivros:contadores` | `Object` | Contadores sequenciais persistentes (`{ cliente, compra, mensagem }`) para geração de IDs únicos (`C001`, `CP001`, `M001`). |
| `ESTOQUE` | `lojaLivros:estoque` | `Object` | Mapa de saldo de estoque por ID do produto (`{ "P001": 1, "P002": 2, ... }`). |
| `CLIENTES` | `lojaLivros:cliente` | `Array<Object>` | Lista de clientes cadastrados e conta administradora (`id`, `nome`, `cpf`, `telefone`, `email`, `salt`, `senhaHash`, `perfil`, `bloqueado`, `criadoEm`). |
| `CARRINHO` | `lojaLivros:carrinho` | `Object` | Dicionário de carrinhos indexado por `usuarioId` ou `"visitante"`, além de `:extras` (`codigoCupom` e `cep`). |
| `SESSAO` | `lojaLivros:sessao` | `Object \| null` | Sessão ativa do usuário logado (`usuarioId`, `nome`, `email`, `perfil`, `inicioEm`, `expiraEm` com validade de 30 min). |
| `TENTATIVAS_LOGIN` | `lojaLivros:tentativasLogin` | `Object` | Controle de tentativas falhas de login e timestamp de bloqueio temporário de 60s (`{ falhas, bloqueadoAte }`). |
| `COMPRAS` | `lojaLivros:compras` | `Array<Object>` | Histórico de pedidos finalizados (`id`, `clienteId`, `clienteNome`, `clienteEmail`, `data`, `itens`, `subtotal`, `desconto`, `cupom`, `frete`, `total`, `enderecoEntrega`, `pagamento`, `status`). |
| `MENSAGENS` | `lojaLivros:mensagens` | `Array<Object>` | Mensagens enviadas pelo formulário de contato da página inicial. |
| `TEMA` | `lojaLivros:tema` | `string` | Preferência de tema visual do usuário (`"claro"` ou `"escuro"`). |

## Como visualizar a tela de confirmação de compra

1. Abra a página `loja.html` no navegador.
2. Abra o DevTools (F12 ou botão direito > Inspecionar).
3. Localize o elemento `<section id="confirmacao-compra" ... hidden>`.
4. Remova o atributo `hidden` e pressione tab para salvar a modificação de forma temporária. Deve ficar desta forma: `<section id="confirmacao-compra" class="mensagem-confirmacao" aria-labelledby="titulo-confirmacao">`
5. Ao navegar pela página novamente, a mensagem de confirmação de compra será exibida abaixo do carrinho de compra.
