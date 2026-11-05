const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});
export function formatarMoeda(valor) {
  return formatadorMoeda.format(Number(valor) || 0);
}