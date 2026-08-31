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
  currency: string;
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
