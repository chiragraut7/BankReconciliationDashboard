export type ReconciliationStatus = 
  | 'Saved' 
  | 'Locked' 
  | 'Open' 
  | 'Needs Review' 
  | 'Matched' 
  | 'Balanced' 
  | 'Reconciled';

export type MatchStatus = 
  | 'Exact Match' 
  | 'High Confidence' 
  | 'Suggested' 
  | 'Multi-Invoice' 
  | 'Manual Match' 
  | 'Unmatched' 
  | 'Exception';

export interface BankTransaction {
  id: string;
  bookingDate: string;
  valueDate: string;
  reference: string;
  description: string;
  amount: number; // positive = credit (inflow), negative = debit (outflow)
  type: 'credit' | 'debit';
  status: MatchStatus;
  matchConfidence: number; // 0 - 100
  matchedInvoiceIds: string[];
  matchReasons: string[];
  variance: number;
  currency?: string; // transaction currency e.g. 'USD'
  originalCurrency?: string; // if cross-currency foreign settlement
  foreignAmount?: number;
  exchangeRate?: number; // e.g. 1.2650 (GBP to USD) or 0.7905 (USD to GBP)
  fxGainLoss?: number; // Realized FX gain (+) or loss (-)
  bankFee?: number;
  notes?: string;
  category?: string;
  rawText?: string;
}

export interface MatchedInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  entityName: string; // Customer or Vendor
  type: 'AR' | 'AP';
  amount: number;
  currency: string; // Document currency e.g. 'GBP', 'EUR', 'USD'
  settlementCurrency?: string; // Bank account currency e.g. 'USD'
  exchangeRate?: number; // Applied FX conversion rate
  convertedAmount?: number; // Amount in settlement/bank currency
  fxGainLoss?: number; // Realized FX Gain/Loss difference
  bankFee?: number; // Bank processing charge deducted
  status: 'Exact Match' | 'High Confidence' | 'Multi-line' | 'Suggested' | 'Unmatched' | 'Manual Match';
  matchConfidence: number;
  matchedBankTxnId?: string;
  poNumber?: string;
  taxAmount?: number;
  paymentMethod?: string;
  description?: string;
  lineItems?: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

export interface ReconciliationRun {
  id: string;
  refNumber?: string;
  reconciliationDate?: string;
  submissionNumber?: number;
  invoicesTotalCount?: number;
  invoicesReconciledCount?: number;
  bankName: string;
  accountNumber: string;
  accountType?: string;
  currency: string;
  statementPeriod: {
    from: string;
    to: string;
  };
  statementFileName: string;
  statementFileSize: string;
  totalTransactions: number;
  matchedCount: number;
  suggestedCount: number;
  unmatchedCount: number;
  manualMatchedCount: number;
  totalAmount: number;
  variance: number;
  confidence: number;
  status: ReconciliationStatus;
  credits: number;
  debits: number;
  openingBalance: number;
  closingBalance: number;
  createdAt: string;
  updatedAt: string;
  reconciledBy?: string;
  transactions: BankTransaction[];
  invoices: MatchedInvoice[];
}

export interface BankAccountOption {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  currency: string;
  defaultOpeningBalance: number;
}

export type BatchStatus = 'Ready' | 'Exported' | 'Processing' | 'Draft' | 'Failed';

export type ETLFormat = 'CSV_ERP' | 'CSV_NETSUITE' | 'XML_CAMT054' | 'JSON_PAYMENTS' | 'QUICKBOOKS_IIF';

export interface ETLBatch {
  id: string;
  name: string;
  format: ETLFormat;
  status: BatchStatus;
  reconciliationIds: string[];
  reconciliationNames: string[];
  totalTransactionsCount: number;
  totalInvoicesCount: number;
  totalAmount: number;
  currency: string;
  createdBy: string;
  createdAt: string;
  lastModified: string;
  notes?: string;
  exportDestination?: string;
  fileSize?: string;
  postingDate?: string;
}

export type InvoiceBatchStatus = 'Ready' | 'Exported' | 'Processing' | 'Draft' | 'Failed';

export type InvoiceETLFormat = 
  | 'NETSUITE_INVOICE_SYNC' 
  | 'SAP_AR_AP_FEED' 
  | 'QUICKBOOKS_INVOICE_JOURNAL' 
  | 'CSV_INVOICE_RECON' 
  | 'JSON_INVOICE_STREAM' 
  | 'XML_PEPPOL_UBL';

export interface InvoiceBatchItem {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  entityName: string;
  type: 'AR' | 'AP';
  amount: number;
  currency: string;
  settlementCurrency?: string;
  exchangeRate?: number;
  convertedAmount?: number;
  fxGainLoss?: number;
  status: string;
  matchConfidence: number;
  matchedBankName: string;
  matchedBankTxnId?: string;
  matchedBankRef?: string;
  sourceRunId?: string;
  poNumber?: string;
  description?: string;
}

export interface InvoiceBatch {
  id: string;
  name: string;
  format: InvoiceETLFormat;
  status: InvoiceBatchStatus;
  invoiceIds: string[];
  invoices: InvoiceBatchItem[];
  totalInvoicesCount: number;
  totalAmount: number;
  arAmount: number;
  apAmount: number;
  currency: string;
  createdBy: string;
  createdAt: string;
  lastModified: string;
  notes?: string;
  exportDestination?: string;
  fileSize?: string;
  postingDate?: string;
}

