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
