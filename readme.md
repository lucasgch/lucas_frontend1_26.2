# Projeto 1  - Loja Virtual: Estrutura e Interface (HTML e CSS)

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

## Como visualizar a tela de confirmação de compra

1. Abra a página `loja.html` no navegador.
2. Abra o DevTools (F12 ou botão direito > Inspecionar).
3. Localize o elemento `<section id="confirmacao-compra" ... hidden>`.
4. Remova o atributo `hidden` e pressione tab para salvar a modificação de forma temporária. Deve ficar desta forma: `<section id="confirmacao-compra" class="mensagem-confirmacao" aria-labelledby="titulo-confirmacao">`
5. Ao navegar pela página novamente, a mensagem de confirmação de compra será exibida abaixo do carrinho de compra.
