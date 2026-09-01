export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount);

  return isNegative ? `-${formatted}` : formatted;
};

export const formatPercent = (val: number): string => {
  return `${Math.round(val)}%`;
};

export const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'Reconciled':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'Balanced':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'Matched':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'Needs Review':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'Processing':
      return 'bg-purple-100 text-purple-800 border-purple-300 animate-pulse';
    case 'Open':
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export const getMatchStatusClass = (status: string) => {
  switch (status) {
    case 'Exact Match':
      return 'bg-green-100 text-green-700 border border-green-300';
    case 'High Confidence':
      return 'bg-blue-100 text-blue-700 border border-blue-300';
    case 'Multi-Invoice':
    case 'Multi-line':
      return 'bg-indigo-100 text-indigo-700 border border-indigo-300';
    case 'Manual Match':
      return 'bg-cyan-100 text-cyan-700 border border-cyan-300';
    case 'Suggested':
      return 'bg-amber-100 text-amber-700 border border-amber-300';
    case 'Unmatched':
    case 'Exception':
      return 'bg-red-100 text-red-700 border border-red-300';
    default:
      return 'bg-gray-100 text-gray-600 border border-gray-300';
  }
};

export const DEFAULT_USD_RATES: Record<string, number> = {
  USD: 1.0,
  GBP: 1.2650, // 1 GBP = 1.2650 USD (or 1 USD = 0.7905 GBP)
  EUR: 1.0800, // 1 EUR = 1.0800 USD (or 1 USD = 0.9259 EUR)
  CAD: 0.7400, // 1 CAD = 0.7400 USD
  AUD: 0.6550, // 1 AUD = 0.6550 USD
  JPY: 0.0067, // 1 JPY = 0.0067 USD
  CHF: 1.1300, // 1 CHF = 1.1300 USD
  SGD: 0.7450, // 1 SGD = 0.7450 USD
};

export const getExchangeRate = (fromCurrency: string, toCurrency: string): number => {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  if (from === to) return 1.0;
  
  const fromToUsd = DEFAULT_USD_RATES[from] || 1.0;
  const toToUsd = DEFAULT_USD_RATES[to] || 1.0;
  
  return Number((fromToUsd / toToUsd).toFixed(4));
};

export const convertCurrencyAmount = (
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  customRate?: number
): number => {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) return amount;
  const rate = customRate !== undefined && customRate > 0 ? customRate : getExchangeRate(fromCurrency, toCurrency);
  return Number((amount * rate).toFixed(2));
};

export const getCurrencySymbol = (currency: string = 'USD'): string => {
  switch (currency.toUpperCase()) {
    case 'GBP': return '£';
    case 'EUR': return '€';
    case 'JPY': return '¥';
    case 'CAD': return 'C$';
    case 'AUD': return 'A$';
    case 'CHF': return 'CHF ';
    case 'SGD': return 'S$';
    case 'USD':
    default: return '$';
  }
};

