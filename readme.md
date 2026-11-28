# Projeto 2 - Loja Virtual: Gerenciamento de Clientes e Compras (HTML, CSS e JavaScript)

![GitHub License](https://img.shields.io/github/license/lucasgch/lucas_frontend1_26.2)
![GitHub repo size](https://img.shields.io/github/repo-size/lucasgch/lucas_frontend1_26.2)
![GitHub top language](https://img.shields.io/github/languages/top/lucasgch/lucas_frontend1_26.2)

> Disciplina: FEI786202 - PROGRAMAÇÃO FRONTEND I (2026.2 - T01)
> Curso: Análise e Desenvolvimento de Sistemas - IFSC - Campus São José
> Docentes responsáveis:
>
> - Profa. Ana Scharf - <ana.scharf@ifsc.edu.br>
> - Prof. Cleber Joerge Amaral
> - Prof. Pedro Camara - <pedro.camara@ifsc.edu.br>

Projeto de Loja Virtual desenvolvido por _Lucas de Godoy Chicarelli_ como parte da avaliação para a disciplina de **PROGRAMAÇÃO FRONTEND I** do Curso de **Análise e Desenvolvimento de Sistemas** - IFSC - Campus São José.

## Descrição

Aplicação front-end completa de uma livraria virtual construída apenas com HTML5 semântico, CSS3 e JavaScript puro (ES Modules), sem uso de bibliotecas ou frameworks externos e com persistência integral em `localStorage`.

Obs.: O projeto foi construído tendo como base o trabalho desenvolvido na primeira etapa. Nessa primeira etapa não foi possível usar Javascript, todas as telas foram construídas como uma interface completa e navegável com HTML e CSS apenas. Os botões e formulários principais foram criadas, as páginas foram estruturadas.

A partir disso, na segunda fase, o sistema passou a contemplar:

- Cadastro, edição de perfil, histórico de pedidos e exclusão de conta de clientes com validação em tempo real e proteção de dados (LGPD).
- Autenticação com controle de sessão, expiração por inatividade, bloqueio por tentativas falhas, proteção de páginas restritas e menu dinâmico por perfil.
- Catálogo interativo com busca em tempo real, filtros combináveis, ordenação, modal de detalhes e controle de estoque.
- Carrinho persistente com mesclagem entre visitante e cliente autenticado, aplicação de cupons de desconto e cálculo de frete por faixa de CEP.
- Fluxo de checkout em 3 etapas (resumo, endereço e pagamento simulado por Pix, Cartão de Crédito ou Boleto) com confirmação detalhada.
- Painel administrativo com indicadores de faturamento, gráfico em CSS puro, gestão de clientes e compras, filtros combináveis, exportação em CSV e impressão otimizada.
- Alternância entre tema claro e tema escuro, notificações não bloqueantes (_toasts_) e gerenciamento de foco acessível nos modais `<dialog>`.

## Documentação e Referências

- [Enunciado completo do projeto](./docs/enunciado.md)
- [Roteiro e evidências de testes manuais](./TESTES.md)

## Como executar o projeto

Por utilizar módulos ES nativos (`<script type="module">`) e a Web Crypto API (`crypto.subtle`) para geração de hash de senhas, o projeto **deve ser executado em um servidor HTTP local** (`localhost`), e não aberto diretamente pelo protocolo `file://`.

### 1. Clonar o repositório

```bash
git clone https://github.com/lucasgch/lucas_frontend1_26.2.git
cd lucas_frontend1_26.2
```

### 2. Iniciar um servidor HTTP local

Escolha uma das opções abaixo na raiz do projeto:

#### Opção A: VS Code com Live Server

1. Abra a pasta `lucas_frontend1_26.2` no Visual Studio Code.
2. Instale/ative a extensão **Live Server**.
3. Clique com o botão direito em `index.html` e selecione **Open with Live Server**.

#### Opção B: Python 3 (terminal)

```bash
python3 -m http.server 8000
```

Depois, acesse `http://localhost:8000` no navegador.

#### Opção C: Node.js (`npx serve`)

```bash
npx serve .
```

## Credenciais da Conta Administradora (Seed)

Na primeira execução do sistema, uma conta administradora é criada automaticamente no `localStorage` (`garantirContaAdmin()` em `js/auth.js`) com a senha protegida por hash SHA-256 + _salt_ aleatório. Utilize os dados abaixo em `login.html` para acessar a área administrativa (`relatorios.html`):

| Campo      | Valor                |
| :--------- | :------------------- |
| **ID**     | `ADM01`              |
| **Nome**   | `Administrador Loja` |
| **E-mail** | `admin@livros.com`   |
| **Senha**  | `Admin1234`          |
| **Perfil** | `administrador`      |

## Cupons e Faixas de CEP para Testes

### Cupons de Desconto

Os cupons configurados em `CUPONS_DISPONIVEIS` (`js/carrinho.js`) podem ser testados diretamente no carrinho em `loja.html`:

| Código        | Tipo       | Benefício             | Valor mínimo | Validade   | Uso nos testes                                          |
| :------------ | :--------- | :-------------------- | :----------- | :--------- | :------------------------------------------------------ |
| `LEITOR10`    | Percentual | 10% de desconto       | R$ 50,00     | 31/12/2027 | Testar desconto percentual e validação de valor mínimo. |
| `LIVRO25`     | Valor fixo | R$ 25,00 de desconto  | R$ 120,00    | 31/12/2027 | Testar desconto em valor fixo.                          |
| `FRETEGRATIS` | Frete      | Zera o valor do frete | R$ 80,00     | 31/12/2027 | Testar isenção de frete por cupom.                      |
| `EXPIRADO20`  | Percentual | 20% de desconto       | R$ 30,00     | 01/01/2025 | Testar rejeição de cupom vencido.                       |

### Faixas de CEP (Cálculo de Frete)

O cálculo simulado de frete (`calcularFretePorCep()` em `js/carrinho.js`) valida que o CEP possui 8 dígitos numéricos e define o valor a partir do primeiro dígito do CEP:

| Faixa de CEP              | Primeiro dígito | Região simulada | Valor do frete | Exemplo para teste |
| :------------------------ | :-------------- | :-------------- | :------------- | :----------------- |
| `80000-000` a `99999-999` | `8` ou `9`      | Região Sul      | R$ 15,00       | `88103-300`        |
| `00000-000` a `39999-999` | `0` a `3`       | Região Sudeste  | R$ 25,00       | `01310-100`        |
| `40000-000` a `79999-999` | `4` a `7`       | Demais Regiões  | R$ 35,00       | `40020-000`        |

**Regra de frete grátis:** independentemente da faixa de CEP, carrinhos com subtotal igual ou superior a **R$ 200,00** recebem frete grátis automaticamente.

## Mapa de Chaves do `localStorage`

Todos os dados da aplicação são persistidos em formato JSON no `localStorage` do navegador e centralizados no módulo `js/storage.js` (`CHAVES_STORAGE`):

| Constante (`CHAVES_STORAGE`) | Chave no `localStorage`      | Tipo / Formato   | Descrição                                                                                                                                                                                          |
| :--------------------------- | :--------------------------- | :--------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VERSAO`                     | `lojaLivros:versao`          | `string`         | Versão atual do esquema de dados (`"1.0"`).                                                                                                                                                        |
| `CONTADORES`                 | `lojaLivros:contadores`      | `Object`         | Contadores sequenciais persistentes (`{ cliente, compra, mensagem }`) para geração de IDs únicos (`C001`, `CP001`, `M001`).                                                                        |
| `ESTOQUE`                    | `lojaLivros:estoque`         | `Object`         | Mapa de saldo de estoque por ID do produto (`{ "P001": 1, "P002": 2, ... }`).                                                                                                                      |
| `CLIENTES`                   | `lojaLivros:cliente`         | `Array<Object>`  | Lista de clientes cadastrados e conta administradora (`id`, `nome`, `cpf`, `telefone`, `email`, `salt`, `senhaHash`, `perfil`, `bloqueado`, `criadoEm`).                                           |
| `CARRINHO`                   | `lojaLivros:carrinho`        | `Object`         | Dicionário de carrinhos indexado por `usuarioId` ou `"visitante"`, além de `:extras` (`codigoCupom` e `cep`).                                                                                      |
| `SESSAO`                     | `lojaLivros:sessao`          | `Object \| null` | Sessão ativa do usuário logado (`usuarioId`, `nome`, `email`, `perfil`, `inicioEm`, `expiraEm` com validade de 30 min).                                                                            |
| `TENTATIVAS_LOGIN`           | `lojaLivros:tentativasLogin` | `Object`         | Controle de tentativas falhas de login e timestamp de bloqueio temporário de 60s (`{ falhas, bloqueadoAte }`).                                                                                     |
| `COMPRAS`                    | `lojaLivros:compras`         | `Array<Object>`  | Histórico de pedidos finalizados (`id`, `clienteId`, `clienteNome`, `clienteEmail`, `data`, `itens`, `subtotal`, `desconto`, `cupom`, `frete`, `total`, `enderecoEntrega`, `pagamento`, `status`). |
| `MENSAGENS`                  | `lojaLivros:mensagens`       | `Array<Object>`  | Mensagens enviadas pelo formulário de contato da página inicial.                                                                                                                                   |
| `TEMA`                       | `lojaLivros:tema`            | `string`         | Preferência de tema visual do usuário (`"claro"` ou `"escuro"`).                                                                                                                                   |

## Decisões Técnicas e Funcionamento Interno

### Arquitetura modular e segurança na interface

O JavaScript foi organizado por responsabilidade em módulos ES nativos (`storage.js`, `utils.js`, `produtos.js`, `clientes.js`, `auth.js`, `carrinho.js`, `compras.js`, `relatorios.js` e `ui.js`). Toda renderização dinâmica no DOM utiliza `document.createElement`, `textContent` e `replaceChildren`, evitando `innerHTML` com dados fornecidos pelo usuário para prevenir injeção de código (XSS). Também não são utilizados `alert()`, `confirm()` ou `prompt()`: confirmações usam `<dialog>` nativo e feedbacks rápidos usam _toasts_.

### Proteção e armazenamento de senhas (cadastro e login)

A senha digitada pelo usuário nunca é salva em texto puro no `localStorage`. O processo funciona em duas etapas (`js/clientes.js` e `js/auth.js`):

1. **No cadastro (ou troca de senha):** o sistema gera um _salt_ aleatório de 16 bytes em hexadecimal usando `crypto.getRandomValues` (`gerarSalt()`). Em seguida, concatena `salt + senha` e calcula o resumo criptográfico SHA-256 com `crypto.subtle.digest("SHA-256", ...)` (`gerarHashSenha()`). Apenas o `salt` e o `senhaHash` resultantes são salvos no registro do cliente.
2. **No login:** quando o usuário informa e-mail e senha, `autenticarUsuario()` localiza o cadastro pelo e-mail, recupera o `salt` salvo daquele usuário, recalcula `gerarHashSenha(senhaDigitada, cliente.salt)` e compara o hash recém-calculado com o `senhaHash` armazenado. Se forem iguais, o login é liberado sem que a senha original precise ser recuperada ou descriptografada.

O uso de _salt_ único por usuário garante que dois clientes com a mesma senha tenham hashes completamente diferentes no `localStorage`.

### Preservação do histórico de compras ao excluir conta

Na tela de perfil (`perfil.html`), a exclusão de conta exige confirmação em um `<dialog>` nativo (`#modal-excluir-conta`). Ao confirmar, `excluirContaCliente()` (`js/clientes.js`) executa apenas três remoções:

1. Apaga o carrinho e os extras (cupom/CEP) daquele cliente em `lojaLivros:carrinho`.
2. Remove o cadastro do cliente da lista `lojaLivros:cliente`.
3. Encerra a sessão ativa (`lojaLivros:sessao`).

A chave `lojaLivros:compras` **não é alterada**. Além disso, no momento em que o pedido é criado em `registrarCompra()` (`js/compras.js`), o sistema grava um retrato (_snapshot_) contendo `clienteId`, `clienteNome` e `clienteEmail` diretamente dentro do objeto da compra. Assim, mesmo depois que o cliente deixa de existir em `lojaLivros:cliente`, o painel administrativo (`relatorios.js`), os indicadores de faturamento, os filtros e a exportação CSV continuam exibindo o histórico completo sem erros ou valores indefinidos.

### Controle de sessão e proteção de páginas

O controle de sessão é gerenciado em `js/auth.js`:

- **Validade e renovação automática:** ao autenticar, a sessão recebe `expiraEm = Date.now() + 30 minutos`. A cada interação do usuário (`click` ou `keydown`), `renovarSessao()` estende esse prazo por mais 30 minutos. Se o tempo expirar por inatividade, a sessão é removida e o usuário é redirecionado para `login.html?motivo=sessao_expirada`.
- **Bloqueio por tentativas falhas:** após 3 erros consecutivos de login, o sistema registra um bloqueio de 60 segundos em `lojaLivros:tentativasLogin`, desabilita o botão de envio e exibe uma contagem regressiva.
- **Proteção de rotas sem exibição prévia:** as páginas restritas (`perfil.html` e `relatorios.html`) iniciam com `<body hidden>` no HTML. `verificarAcessoPagina()` valida a sessão (e o perfil `administrador` no caso de `relatorios.html`) antes de definir `document.body.hidden = false`, além de revalidar no evento `pageshow` para evitar acesso pelo cache do botão Voltar do navegador.
- **Retorno seguro após login:** ao barrar um usuário ou exigir login no checkout, o destino original é enviado via query string (`?redirect=...`). Após autenticar, `obterDestinoSeguro()` valida o parâmetro contra uma lista fechada de páginas internas permitidas, evitando redirecionamentos maliciosos (_Open Redirect_) ou loops de permissão.

### Formatação de moeda e datas com a API `Intl`

Para manter consistência no padrão brasileiro sem formatação manual de strings, o módulo `js/utils.js` instancia formatadores nativos da API `Intl` reutilizados em toda a aplicação:

- **Moeda brasileira (`formatarMoeda`):** utiliza `new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`, convertendo valores numéricos para o formato `R$ 59,90`.
- **Datas e horários (`formatarData` e `formatarDataHora`):** utilizam `new Intl.DateTimeFormat("pt-BR", ...)` para converter datas ISO (`toISOString()`) em `DD/MM/AAAA` e `DD/MM/AAAA, HH:MM`, tratando entradas inválidas com retorno seguro.

### Validação de CPF (Módulo 11) e Cartão de Crédito (Algoritmo de Luhn)

O sistema aplica dois algoritmos matemáticos distintos de validação de dígitos verificadores em `js/utils.js`:

- **CPF (`validarCPF` - algoritmo de Módulo 11):** remove a máscara com `limparNumeros()`, verifica se há 11 dígitos e rejeita sequências com todos os números iguais (como `111.111.111-11`). Em seguida, a função auxiliar `calcularDigitoCPF(digitos, pesoInicial)` calcula os dois dígitos verificadores multiplicando os 9 primeiros dígitos por pesos decrescentes de 10 a 2 (1o dígito) e os 10 primeiros por pesos de 11 a 2 (2o dígito), aplicando `(soma * 10) % 11` (ajustando resultado 10 para 0) e comparando com os dígitos informados.
- **Cartão de Crédito (`validarCartaoLuhn` - Algoritmo de Luhn):** no checkout com cartão, remove caracteres não numéricos, exige entre 13 e 19 dígitos e percorre o número da direita para a esquerda dobrando cada segundo dígito (subtraindo 9 quando o dobro excede 9). O cartão só é aceito se a soma final for divisível por 10. Por segurança (LGPD/boas práticas), apenas os 4 últimos dígitos e o nome do titular são gravados no pedido.

### Controle de estoque

O catálogo inicial (`js/data/produtos.js`) define a quantidade de cada livro, e `inicializarStorage()` persiste o saldo vivo no dicionário `lojaLivros:estoque`. O controle atua em quatro momentos:

1. **No catálogo e no carrinho (`js/produtos.js` e `js/carrinho.js`):** produtos com saldo zero exibem indicação de indisponibilidade, e o sistema impede adicionar ou aumentar a quantidade acima do estoque disponível (inclusive na mesclagem do carrinho de visitante ao fazer login).
2. **Na finalização da compra (`js/compras.js`):** antes de registrar o pedido, `montarItensPedidoValidados()` revalida todas as quantidades contra o estoque atual.
3. **Na baixa de estoque:** após validar o pedido, `baixarEstoqueItens()` chama o helper interno `ajustarEstoqueItens(itens, -1)`, descontando cada item vendido e atualizando a vitrine imediatamente.
4. **No cancelamento de pedido:** quando o administrador altera o status de uma compra para `Cancelado` em `relatorios.html`, `atualizarStatusCompra()` aciona `devolverEstoqueItens()` (`ajustarEstoqueItens(itens, 1)`), devolvendo automaticamente as unidades ao estoque (bloqueando alterações posteriores para impedir devolução duplicada).

### Impressão de relatórios

A impressão do painel administrativo em `relatorios.html` combina JavaScript (`js/relatorios.js`) e regras CSS específicas de mídia (`css/admin.css`):

1. **Preparação dinâmica antes de imprimir:** o botão **Imprimir relatório** aciona `window.print()`, e o listener do evento `beforeprint` executa `atualizarMetadadosImpressao()`, preenchendo automaticamente a data/hora da emissão e o resumo dos filtros atualmente aplicados (busca, status, datas e faixa de valores).
2. **Estilização dedicada (`@media print`):** oculta elementos de navegação e interação (cabeçalho do site, rodapé, formulários de filtro, botões de ação, paginação e coluna de ações da tabela), exibe o cabeçalho e o rodapé próprios de impressão, força a paleta de tema claro para economia de tinta e legibilidade (mesmo se o usuário estiver no tema escuro) e aplica `print-color-adjust: exact` para preservar as cores das barras do gráfico de faturamento.
