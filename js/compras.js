import { CHAVES_STORAGE, gerarProximoId, inicializarStorage, lerDados, salvarDados } from './storage.js';
import { obterSessaoAtiva } from './auth.js';
import { obterProdutosComEstoque, inicializarCatalogo, inicializarFiltrosLoja } from './produtos.js';
import { obterCarrinho, obterResumoCarrinho, limparCarrinhoAtual } from './carrinho.js';
import { aplicarMascaraCEP, formatarMoeda, limparNumeros, validarCartaoLuhn } from './utils.js';

/**
 * Retorna a lista de todas as compras registradas no localStorage.
 * @returns {Array<Object>}
 */
export function obterCompras() {
  const compras = lerDados(CHAVES_STORAGE.COMPRAS, []);
  return Array.isArray(compras) ? compras : [];
}

/**
 * Valida se a data de validade do cartão (formato MM/AA) é válida e não está vencida.
 * @param {string} validade - Texto no formato MM/AA (ex: '08/28').
 * @returns {boolean}
 */
export function validarValidadeCartao(validade = '') {

    const match = String(validade).trim().match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
    if (!match) return false;
    
    const mes = Number(match[1]);
    const ano = 2000 + Number(match[2]);
    const agora = new Date();
    const anoAtual = agora.getFullYear();
    const mesAtual = agora.getMonth() + 1;

    // Cartão é válido até o último dia do mês informado
    if (ano < anoAtual) return false;
    
    if (ano === anoAtual && mes < mesAtual) return false;
    
    return true;
}

/**
 * Subtrai do estoque no localStorage as quantidades compradas (Requisito 2.4d).
 * @param {Array<{produtoId: string, quantidade: number}>} itensComprados
 */
export function baixarEstoqueItens(itensComprados) {
    
    const mapaEstoque = lerDados(CHAVES_STORAGE.ESTOQUE, {});
    const catalogoAtual = obterProdutosComEstoque();
    
    for (const item of itensComprados) {
        const produto = catalogoAtual.find((p) => p.id === item.produtoId);
        if (produto) {
        const novoEstoque = Math.max(0, produto.estoque - item.quantidade);
        mapaEstoque[item.produtoId] = novoEstoque;
        }
    }

    salvarDados(CHAVES_STORAGE.ESTOQUE, mapaEstoque);
}

/**
 * Registra uma nova compra, revalidando estoque, gerando ID sequencial (CP001...),
 * dando baixa no estoque e esvaziando o carrinho do cliente (Requisitos 2.4c, 2.4d, 2.4e).
 * @param {{enderecoEntrega: Object, pagamento: Object}} dadosCheckout
 * @returns {{sucesso: boolean, mensagem: string, pedido?: Object}}
 */
export function registrarCompra({ enderecoEntrega, pagamento }) {
    inicializarStorage();

    // Exige cliente logado (Requisito 2.4a)
    const sessao = obterSessaoAtiva();
    if (!sessao) {
        return { sucesso: false, mensagem: 'Sessão expirada. Faça login novamente.' };
    }

    // Verifica itens do carrinho e revalida estoque antes de concluir (Requisito 2.4d)
    const itensCarrinho = obterCarrinho(sessao.usuarioId);
    if (itensCarrinho.length === 0) {
        return { sucesso: false, mensagem: 'Seu carrinho está vazio.' };
    }
      
    const catalogo = obterProdutosComEstoque();
    const itensPedido = [];

    for (const item of itensCarrinho) {
    const produto = catalogo.find((p) => p.id === item.produtoId);
    if (!produto) {
      return { sucesso: false, mensagem: `Produto ${item.produtoId} não encontrado.` };
    }
    if (item.quantidade > produto.estoque) {
      return {
        sucesso: false,
        mensagem: `Estoque insuficiente para "${produto.nome}" (disponível: ${produto.estoque}).`
      };
    }
    // Registra valor unitário praticado no momento da compra (Requisito 2.4c)
    itensPedido.push({
      produtoId: produto.id,
      nome: produto.nome,
      precoUnitario: produto.preco,
      quantidade: item.quantidade,
      subtotal: produto.preco * item.quantidade
    });
  }

  // Obtém valores consolidados (subtotal, desconto, frete, total)
  const resumo = obterResumoCarrinho();
  const freteFinal = resumo.frete ?? 0;
  const totalFinal = Math.max(0, resumo.subtotal - resumo.desconto + freteFinal);

  // Registra pedido com ID sequencial
  const novoPedido = {
    id: gerarProximoId('compra', 'CP'),
    clienteId: sessao.usuarioId,
    clienteNome: sessao.nome,
    clienteEmail: sessao.email,
    data: new Date().toISOString(),
    itens: itensPedido,
    subtotal: resumo.subtotal,
    desconto: resumo.desconto,
    cupom: resumo.codigoCupom || null,
    frete: freteFinal,
    total: totalFinal,
    enderecoEntrega,
    pagamento,
    status: 'Pago'
  };

  //  Baixa no estoque
  baixarEstoqueItens(itensCarrinho);
  
  // Salva a compra
  const compras = obterCompras();
  compras.push(novoPedido);
  salvarDados(CHAVES_STORAGE.COMPRAS, compras);

  // Limpa o carrinho do cliente
  limparCarrinhoAtual();
  
  return {
    sucesso: true,
    mensagem: `Compra ${novoPedido.id} realizada com sucesso!`,
    pedido: novoPedido
  };
}