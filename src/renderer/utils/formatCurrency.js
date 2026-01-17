// formatCurrency 유틸리티 함수
export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '';
  const numValue = typeof amount === 'string' 
    ? parseInt(amount.replace(/,/g, '') || '0', 10)
    : parseInt(amount || 0, 10);
  return new Intl.NumberFormat("ko-KR").format(isNaN(numValue) ? 0 : numValue);
};
