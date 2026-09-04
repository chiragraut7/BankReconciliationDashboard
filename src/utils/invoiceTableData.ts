import { MatchedInvoice, InvoiceBatchItem } from '../types/reconciliation';

export interface InvoiceTableDisplayData {
  invoiceNumber: string;
  invoiceIdDisplay?: string;
  clientReference: string;
  sourceEntityName: string;
  payingEntityName: string;
  payingBankName: string;
  amount: number;
  formattedAmount: string;
  allocation: string;
  allocationPercent: number;
  allocationSplitsCount: number;
  dueDate: string;
  currency: string;
  vendorName: string;
  beneficiaryName: string;
  beneficiaryBankBic: string;
  beneficiaryBankName: string;
  notes?: string;
  memo?: string;
}

// Map known vendors to realistic beneficiary banks & BIC codes
const KNOWN_BENEFICIARY_DATA: Record<string, { bic: string; bank: string }> = {
  'AlphaTech Solutions Pvt. Ltd.': { bic: 'BNPAFRPPXXX', bank: 'BNP Paribas London Branch' },
  'Acme Supplies': { bic: 'CHASUS33XXX', bank: 'JPMorgan Chase Bank, N.A.' },
  'ABC Services': { bic: 'CITIUS33XXX', bank: 'Citibank N.A. New York' },
  'Global Logistics': { bic: 'BARCGB22XXX', bank: 'Barclays Bank UK PLC' },
  'Stripe Merchant Settlement': { bic: 'WFBIUS6SXXX', bank: 'Wells Fargo Bank N.A.' },
  'Delta Consulting': { bic: 'DEUTDEFFXXX', bank: 'Deutsche Bank AG Frankfurt' },
  'Apex Hardware': { bic: 'BOFAUS3NXXX', bank: 'Bank of America, N.A.' },
  'Nexus Credit Partners': { bic: 'HSBCEU22XXX', bank: 'HSBC Continental Europe' },
  'Blackstone Property Management': { bic: 'BNPAFRPPXXX', bank: 'BNP Paribas Securities Services Lux' },
  'KKR Capital Solutions': { bic: 'CHASUS33XXX', bank: 'J.P. Morgan Europe SE' },
  'Apollo Global Management': { bic: 'CITIUS33XXX', bank: 'Citibank Europe PLC' },
  'QuadReal Property Services': { bic: 'ROYCCAT2XXX', bank: 'Royal Bank of Canada' }
};

/**
 * Resolves standard beneficiary bank and BIC code for an invoice based on vendor name and currency.
 */
export function getBeneficiaryBankInfo(vendorName: string, currency: string = 'USD'): { bic: string; bank: string } {
  // Check exact or partial match in known registry
  for (const [key, data] of Object.entries(KNOWN_BENEFICIARY_DATA)) {
    if (vendorName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(vendorName.toLowerCase())) {
      return data;
    }
  }

  // Currency-aware standard defaults
  const upperCur = currency.toUpperCase();
  if (upperCur === 'EUR') {
    return { bic: 'BNPAFRPPXXX', bank: 'BNP Paribas S.A. Paris' };
  } else if (upperCur === 'GBP') {
    return { bic: 'BARCGB22XXX', bank: 'Barclays Bank PLC London' };
  } else if (upperCur === 'CAD') {
    return { bic: 'ROYCCAT2XXX', bank: 'Royal Bank of Canada' };
  } else if (upperCur === 'AUD') {
    return { bic: 'ANZBAU3MXXX', bank: 'Australia and New Zealand Banking Group' };
  } else if (upperCur === 'CHF') {
    return { bic: 'UBSWCHZHXXX', bank: 'UBS Switzerland AG' };
  }

  return { bic: 'CHASUS33XXX', bank: 'JPMorgan Chase Bank, N.A.' };
}

/**
 * Normalizes and formats paying bank name for clean display.
 */
export function normalizeBankName(rawBank?: string, currency: string = 'USD'): string {
  if (!rawBank) {
    if (currency === 'GBP') return 'BNP Paribas London (GBP)';
    if (currency === 'EUR') return 'BNP Paribas Luxembourg (EUR)';
    return 'JPMorgan Chase Operating (USD)';
  }

  // Handle system codes like 'GL12_EUDL_COINVEST_BNP_GBP'
  if (rawBank.includes('BNP')) return rawBank.replace(/_/g, ' ');
  if (rawBank.includes('JPM') || rawBank.includes('CHASE')) return 'JPMorgan Chase Treas (USD)';
  if (rawBank.includes('HSBC')) return 'HSBC Global Liquidity (EUR)';
  if (rawBank.includes('BARCLAYS')) return 'Barclays Operational (GBP)';

  return rawBank.replace(/_/g, ' ');
}

/**
 * Extracts and synthesizes complete 13-column display data for any invoice.
 */
export function getInvoiceTableDetails(inv: MatchedInvoice | InvoiceBatchItem | any): InvoiceTableDisplayData {
  const invoiceNumber = inv.invoiceNumber || inv.id || 'INV-UNKNOWN';
  
  // Client Reference
  let clientReference = inv.clientReference || inv.jobNumber || inv.poNumber;
  if (!clientReference) {
    const cleanNum = invoiceNumber.replace(/[^a-zA-Z0-9]/g, '');
    clientReference = cleanNum ? `CR-${cleanNum}` : `CR-${inv.id}`;
  }

  // Source Entity Name
  const sourceEntityName = 
    inv.sourceEntityName || 
    inv.entity || 
    'Novus Lux Fairhaven Intermediate 06 SCSp';

  // Paying Entity Name
  const payingEntityName = 
    inv.payingEntity || 
    (inv.payingEntities && inv.payingEntities[0]?.entityName) || 
    inv.entity || 
    'Novus Lux Evermont 02 SCSp';

  // Paying Bank Name
  const rawBank = 
    inv.payingBankName || 
    inv.bankName || 
    (inv.payingEntities && inv.payingEntities[0]?.bankName);
  const payingBankName = normalizeBankName(rawBank, inv.currency);

  // Amount
  const amount = Number(inv.amount) || 0;
  const formattedAmount = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  // Allocation
  let allocation = '100.00%';
  let allocationPercent = 100;
  let allocationSplitsCount = 1;

  if (inv.allocation) {
    allocation = inv.allocation;
  } else if (inv.apportionment && inv.apportionment.length > 0) {
    allocationSplitsCount = inv.apportionment.length;
    if (inv.apportionment.length > 1) {
      allocation = inv.apportionment.map(a => `${a.percent.toFixed(1)}%`).join(' / ');
      allocationPercent = inv.apportionment[0].percent;
    } else {
      allocation = `${inv.apportionment[0].percent.toFixed(2)}%`;
      allocationPercent = inv.apportionment[0].percent;
    }
  } else if (inv.richLineItems && inv.richLineItems[0]?.splits && inv.richLineItems[0].splits.length > 0) {
    const splits = inv.richLineItems[0].splits;
    allocationSplitsCount = splits.length;
    if (splits.length > 1) {
      allocation = splits.map(s => `${s.percent.toFixed(1)}%`).join(' / ');
      allocationPercent = splits[0].percent;
    } else {
      allocation = `${splits[0].percent.toFixed(2)}%`;
      allocationPercent = splits[0].percent;
    }
  }

  // Due Date
  const dueDate = inv.dueDate || inv.date || '31/08/2026';

  // Currency
  const currency = inv.currency || 'USD';

  // Vendor Name
  const vendorName = inv.vendorName || inv.entityName || 'Vendor';

  // Beneficiary Name
  const beneficiaryName = inv.beneficiaryName || inv.vendorName || inv.entityName || 'Vendor Co.';

  // Beneficiary Bank & BIC
  const defaultBankInfo = getBeneficiaryBankInfo(vendorName, currency);
  const beneficiaryBankBic = inv.beneficiaryBankBic || defaultBankInfo.bic;
  const beneficiaryBankName = inv.beneficiaryBankName || defaultBankInfo.bank;

  // Notes / Memo
  const notes = inv.notes || inv.memo || (inv.description ? `Reconciled • ${inv.description}` : `Inv ${invoiceNumber} • OPEX`);
  const memo = inv.memo || inv.notes || '';

  return {
    invoiceNumber,
    invoiceIdDisplay: inv.invoiceIdDisplay,
    clientReference,
    sourceEntityName,
    payingEntityName,
    payingBankName,
    amount,
    formattedAmount,
    allocation,
    allocationPercent,
    allocationSplitsCount,
    dueDate,
    currency,
    vendorName,
    beneficiaryName,
    beneficiaryBankBic,
    beneficiaryBankName,
    notes,
    memo
  };
}
