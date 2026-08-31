import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Layers, 
  CheckSquare, 
  Square, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  Building2, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  FileText, 
  ArrowRight,
  ArrowLeft,
  Download,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Tag,
  ExternalLink,
  Receipt
} from 'lucide-react';
import { ReconciliationRun, ETLBatch, ETLFormat, BankTransaction, MatchedInvoice } from '../types/reconciliation';

interface CreateBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  reconciliationRuns: ReconciliationRun[];
  onCreateBatch: (batch: ETLBatch) => void;
}

interface FlattenedTransaction extends BankTransaction {
  sourceRunId: string;
  sourceBankName: string;
  sourceAccount: string;
  sourceStatementRef?: string;
  currency: string;
}

export const CreateBatchModal: React.FC<CreateBatchModalProps> = ({
  isOpen,
  onClose,
  reconciliationRuns,
  onCreateBatch
}) => {
  // Batch Form State
  const defaultBatchId = useMemo(() => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `BATCH-2026-${randomSuffix}`;
  }, []);

  const [batchId, setBatchId] = useState<string>(defaultBatchId);
  const [batchName, setBatchName] = useState<string>('ETL_Consolidated_Batch_' + new Date().toISOString().slice(0, 10));
  const [format] = useState<ETLFormat>('CSV_ERP');
  const [postingDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [exportDestination] = useState<string>('SAP General Ledger Feed');
  const [notes] = useState<string>('Consolidated batch generated from balanced reconciliation statements.');

  // Workspace Tabs
  const [activeTab, setActiveTab] = useState<'transactions' | 'preview'>('transactions');

  // Filters & Search
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Expanded row details map
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Copied reference indicator
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [isCopiedFile, setIsCopiedFile] = useState<boolean>(false);

  // Build map of all invoices across runs for rich contextual details
  const invoicesMap = useMemo(() => {
    const map = new Map<string, MatchedInvoice>();
    reconciliationRuns.forEach(run => {
      (run.invoices || []).forEach(inv => {
        map.set(inv.id, inv);
      });
    });
    return map;
  }, [reconciliationRuns]);

  // Flatten only matched transactions across runs
  const allTransactions: FlattenedTransaction[] = useMemo(() => {
    return reconciliationRuns.flatMap(run => {
      return (run.transactions || [])
        .filter(txn => (txn.matchedInvoiceIds && txn.matchedInvoiceIds.length > 0) || txn.status === 'Matched')
        .map(txn => ({
          ...txn,
          sourceRunId: run.id,
          sourceBankName: run.bankName,
          sourceAccount: run.accountNumber,
          sourceStatementRef: run.refNumber || run.id,
          currency: run.currency || 'USD'
        }));
    });
  }, [reconciliationRuns]);

  // Selected Transaction IDs for the batch (default to selecting all matched transactions)
  const [selectedTxnIds, setSelectedTxnIds] = useState<Set<string>>(() => {
    const initialMatched = allTransactions
      .map(t => `${t.sourceRunId}_${t.id}`);
    return new Set(initialMatched);
  });

  // Re-synchronize selection when modal opens or runs change
  useEffect(() => {
    if (isOpen) {
      const initialMatched = allTransactions
        .map(t => `${t.sourceRunId}_${t.id}`);
      setSelectedTxnIds(new Set(initialMatched));
    }
  }, [isOpen, allTransactions]);

  // Filtered transactions for the table
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(txn => {
      const matchesBank = selectedBankFilter === 'All' || txn.sourceBankName === selectedBankFilter;

      const matchesSearch =
        txn.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        txn.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        txn.bookingDate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        txn.amount.toString().includes(searchTerm) ||
        (txn.matchedInvoiceIds && txn.matchedInvoiceIds.some(inv => inv.toLowerCase().includes(searchTerm.toLowerCase())));

      return matchesBank && matchesSearch;
    });
  }, [allTransactions, selectedBankFilter, searchTerm]);

  // Selected Transaction items
  const selectedTransactions = useMemo(() => {
    return allTransactions.filter(t => selectedTxnIds.has(`${t.sourceRunId}_${t.id}`));
  }, [allTransactions, selectedTxnIds]);

  // Aggregated totals of selected transactions
  const batchTotals = useMemo(() => {
    const totalTransactions = selectedTransactions.length;
    const totalInvoices = selectedTransactions.reduce((acc, t) => acc + (t.matchedInvoiceIds?.length || 0), 0);
    const totalAmount = selectedTransactions.reduce((acc, t) => acc + Math.abs(t.amount), 0);
    
    // Unique source bank statements
    const uniqueStatementRuns = Array.from(new Set(selectedTransactions.map(t => t.sourceRunId)));
    const uniqueStatementNames = Array.from(new Set(selectedTransactions.map(t => `${t.sourceBankName} (${t.sourceStatementRef || t.sourceRunId})`)));

    return {
      totalTransactions,
      totalInvoices,
      totalAmount,
      uniqueStatementRuns,
      uniqueStatementNames
    };
  }, [selectedTransactions]);

  // Distinct banks for filter dropdown
  const uniqueBanks = useMemo(() => {
    return Array.from(new Set(reconciliationRuns.map(r => r.bankName)));
  }, [reconciliationRuns]);

  // Handle row expansion
  const toggleRowExpand = (key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Toggle single transaction selection
  const handleToggleTxn = (key: string) => {
    setSelectedTxnIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Toggle all filtered transactions
  const isAllSelected = filteredTransactions.length > 0 && filteredTransactions.every(t => selectedTxnIds.has(`${t.sourceRunId}_${t.id}`));
  const isSomeSelected = filteredTransactions.some(t => selectedTxnIds.has(`${t.sourceRunId}_${t.id}`)) && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTxnIds(prev => {
        const next = new Set(prev);
        filteredTransactions.forEach(t => next.delete(`${t.sourceRunId}_${t.id}`));
        return next;
      });
    } else {
      setSelectedTxnIds(prev => {
        const next = new Set(prev);
        filteredTransactions.forEach(t => next.add(`${t.sourceRunId}_${t.id}`));
        return next;
      });
    }
  };

  // Select all matched transactions quickly
  const handleSelectAllMatchedOnly = () => {
    setSelectedTxnIds(prev => {
      const next = new Set(prev);
      allTransactions.forEach(t => {
        const key = `${t.sourceRunId}_${t.id}`;
        if (t.matchedInvoiceIds && t.matchedInvoiceIds.length > 0) {
          next.add(key);
        } else {
          next.delete(key);
        }
      });
      return next;
    });
  };

  // Copy reference text helper
  const handleCopyRef = (ref: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 1500);
  };

  // Live generated ETL Content for Preview
  const generatedEtlContent = useMemo(() => {
    if (format === 'CSV_ERP') {
      const headers = ['BATCH_ID', 'STATEMENT_REF', 'BANK_ACCOUNT', 'BOOKING_DATE', 'TXN_REF', 'INVOICE_NUM', 'ENTITY_NAME', 'AMOUNT', 'CURRENCY', 'DR_CR', 'STATUS'];
      const rows = selectedTransactions.map(txn => {
        const invId = txn.matchedInvoiceIds?.[0] || 'UNALLOCATED';
        return [
          batchId,
          txn.sourceStatementRef || txn.sourceRunId,
          txn.sourceAccount,
          txn.bookingDate,
          txn.reference,
          invId,
          txn.description.replace(/,/g, ' '),
          Math.abs(txn.amount).toFixed(2),
          txn.currency,
          txn.amount >= 0 ? 'CR' : 'DR',
          txn.status
        ].join(',');
      });
      return [headers.join(','), ...rows].join('\n');
    } else if (format === 'CSV_NETSUITE') {
      const headers = ['ExternalID', 'TranDate', 'PostingPeriod', 'Account', 'Amount', 'Memo', 'Entity', 'ReconcileFlag'];
      const rows = selectedTransactions.map(txn => {
        return [
          `${batchId}_${txn.id}`,
          postingDate,
          'Aug 2026',
          txn.sourceAccount,
          txn.amount.toFixed(2),
          `"${txn.description}"`,
          txn.matchedInvoiceIds?.[0] || 'GL_SUSPENSE',
          'T'
        ].join(',');
      });
      return [headers.join(','), ...rows].join('\n');
    } else if (format === 'XML_CAMT054') {
      return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.054.001.08">
  <BkToCstmrDbtCdtNtfctn>
    <GrpHdr>
      <MsgId>${batchId}</MsgId>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
      <NbOfNtfcns>${batchTotals.uniqueStatementRuns.length}</NbOfNtfcns>
    </GrpHdr>
    ${batchTotals.uniqueStatementRuns.map(runId => {
      const runTxns = selectedTransactions.filter(t => t.sourceRunId === runId);
      const runAmt = runTxns.reduce((acc, t) => acc + Math.abs(t.amount), 0);
      return `
    <Ntfcn>
      <Id>${runId}</Id>
      <Acct>
        <Id><Othr><Id>${runTxns[0]?.sourceAccount || 'ACCT'}</Id></Othr></Id>
        <Ccy>${runTxns[0]?.currency || 'USD'}</Ccy>
      </Acct>
      <TtlAmt Ccy="${runTxns[0]?.currency || 'USD'}">${runAmt.toFixed(2)}</TtlAmt>
      <TxnsCount>${runTxns.length}</TxnsCount>
    </Ntfcn>`;
    }).join('')}
  </BkToCstmrDbtCdtNtfctn>
</Document>`;
    } else if (format === 'JSON_PAYMENTS') {
      return JSON.stringify({
        batchHeader: {
          batchId,
          batchName,
          format,
          postingDate,
          generatedAt: new Date().toISOString(),
          totalTransactions: batchTotals.totalTransactions,
          totalInvoices: batchTotals.totalInvoices,
          totalAmount: batchTotals.totalAmount,
          currency: 'USD'
        },
        transactions: selectedTransactions.map(t => ({
          txnId: t.id,
          reference: t.reference,
          bookingDate: t.bookingDate,
          description: t.description,
          amount: t.amount,
          status: t.status,
          matchedInvoices: t.matchedInvoiceIds,
          sourceStatement: t.sourceStatementRef,
          bankAccount: t.sourceAccount
        }))
      }, null, 2);
    } else {
      // QUICKBOOKS_IIF
      return `!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO
!SPL\tSPLID\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO
!ENDTRNS
${selectedTransactions.map(txn => 
  `TRNS\t${txn.id}\tCHECK\t${txn.bookingDate}\t${txn.sourceAccount}\t${txn.description}\t${txn.amount.toFixed(2)}\tBatch ${batchId}\nENDTRNS`
).join('\n')}`;
    }
  }, [format, batchId, batchName, postingDate, selectedTransactions, batchTotals]);

  // Copy ETL preview to clipboard
  const handleCopyPreview = () => {
    navigator.clipboard.writeText(generatedEtlContent);
    setIsCopiedFile(true);
    setTimeout(() => setIsCopiedFile(false), 2000);
  };

  // Submit and create batch
  const handleCreateSubmit = (statusToSave: 'Ready' | 'Draft') => {
    if (selectedTransactions.length === 0) {
      alert('Please select at least one transaction to create an ETL batch.');
      return;
    }

    const newBatch: ETLBatch = {
      id: batchId,
      name: batchName || `ETL_Batch_${batchId}`,
      format,
      status: statusToSave,
      reconciliationIds: batchTotals.uniqueStatementRuns,
      reconciliationNames: batchTotals.uniqueStatementNames,
      totalTransactionsCount: batchTotals.totalTransactions,
      totalInvoicesCount: batchTotals.totalInvoices,
      totalAmount: batchTotals.totalAmount,
      currency: selectedTransactions[0]?.currency || 'USD',
      createdBy: 'Dharmendra Joshi',
      createdAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      lastModified: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      notes,
      exportDestination,
      postingDate,
      fileSize: `${Math.max(12, Math.round(generatedEtlContent.length / 1024))} KB`
    };

    onCreateBatch(newBatch);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-xs flex items-center justify-center animate-in fade-in duration-150 font-sans">
      {/* 100% Full Screen Modal Container */}
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col w-full h-[96vh] max-w-[1720px] overflow-hidden">
        
        {/* TOP MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 text-[#EA580C] rounded-lg border border-orange-200 shadow-2xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-gray-900 tracking-tight uppercase font-['Open_Sans',sans-serif]">
                  CREATE NEW ETL BATCH
                </h2>
                <span className="bg-[#EA580C] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full font-mono shadow-2xs">
                  Reconciled Transactions Feed
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Select specific reconciled transactions and invoice line items to compile into ERP-ready posting batches.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 bg-white px-3.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-gray-900">{batchTotals.totalTransactions}</span> Txns Selected
              <span className="text-gray-300">|</span>
              <span className="font-semibold text-gray-600">{batchTotals.totalInvoices} Invoices</span>
              <span className="text-gray-300">|</span>
              <span className="font-mono font-black text-gray-900">${batchTotals.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TOP CONFIGURATION STRIP */}
        <div className="px-6 py-3.5 bg-white border-b border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
              Batch ID
            </label>
            <input
              type="text"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-gray-50 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#EA580C] focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
              Batch Name
            </label>
            <input
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="e.g. Consolidated_August_2026_ERP_Export"
              className="w-full px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-[#EA580C] focus:outline-hidden"
            />
          </div>
        </div>

        {/* MAIN BODY AREA */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F6F8FA]">
          {activeTab === 'transactions' ? (
            <div className="space-y-4">
              {/* FILTERS & SEARCH ROW */}
              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by Reference (TXN-...), Description, Amount, or Matched Invoice (INV-...)..."
                    className="w-full pl-8.5 pr-3 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#EA580C] focus:bg-white focus:outline-hidden"
                  />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Bank Filter */}
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    <select
                      value={selectedBankFilter}
                      onChange={(e) => setSelectedBankFilter(e.target.value)}
                      className="px-2 py-1 text-xs bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EA580C] focus:outline-hidden cursor-pointer"
                    >
                      <option value="All">All Bank Statements</option>
                      {uniqueBanks.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  {/* Match Status Badge */}
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Status: Matched ({allTransactions.length})</span>
                  </div>

                  {/* Quick Select / Deselect All */}
                  <div className="flex items-center gap-1.5 border-l border-gray-200 pl-2.5">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {isAllSelected ? <CheckSquare className="w-3.5 h-3.5 text-[#EA580C]" /> : <Square className="w-3.5 h-3.5 text-gray-400" />}
                      <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* TRANSACTIONS SELECTION TABLE (MATCHING RECONCILED MODAL COMPACT STYLING) */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-sans text-xs">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                        {/* Checkbox column */}
                        <th className="py-2 px-3 w-10 text-center">
                          <button
                            type="button"
                            onClick={handleToggleSelectAll}
                            className="text-gray-500 hover:text-[#EA580C] cursor-pointer inline-flex items-center justify-center"
                            title="Select / Deselect All Filtered"
                          >
                            {isAllSelected ? (
                              <CheckSquare className="w-3.5 h-3.5 text-[#EA580C]" />
                            ) : isSomeSelected ? (
                              <div className="w-3.5 h-3.5 bg-orange-100 border border-[#EA580C] rounded-xs flex items-center justify-center">
                                <div className="w-2 h-0.5 bg-[#EA580C]" />
                              </div>
                            ) : (
                              <Square className="w-3.5 h-3.5 text-gray-300" />
                            )}
                          </button>
                        </th>

                        {/* DATE */}
                        <th className="py-2 px-3 min-w-[100px]">Date</th>

                        {/* REFERENCE */}
                        <th className="py-2 px-3 min-w-[130px]">Reference</th>

                        {/* DESCRIPTION */}
                        <th className="py-2 px-3 min-w-[240px]">Description</th>

                        {/* AMOUNT */}
                        <th className="py-2 px-3 text-right min-w-[120px]">Amount</th>

                        {/* MATCHED INVOICES */}
                        <th className="py-2 px-3 min-w-[200px]">Matched Invoices</th>

                        {/* MATCH STATUS */}
                        <th className="py-2 px-3 text-center min-w-[130px]">Match Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-400">
                            <div className="max-w-sm mx-auto text-center space-y-1.5">
                              <AlertCircle className="w-5 h-5 text-gray-300 mx-auto" />
                              <p className="font-semibold text-gray-600 text-xs">No transactions found</p>
                              <p className="text-[11px] text-gray-400">Try adjusting your search query or status filter.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map((txn) => {
                          const key = `${txn.sourceRunId}_${txn.id}`;
                          const isSelected = selectedTxnIds.has(key);
                          const isExpanded = expandedRows.has(key);
                          const hasMatches = txn.matchedInvoiceIds && txn.matchedInvoiceIds.length > 0;

                          return (
                            <React.Fragment key={key}>
                              <tr
                                onClick={() => handleToggleTxn(key)}
                                className={`cursor-pointer transition-colors ${
                                  isExpanded
                                    ? 'bg-[#FFF8F3] border-l-4 border-l-[#EA580C]'
                                    : isSelected 
                                      ? 'bg-orange-50/70 hover:bg-orange-50/90' 
                                      : hasMatches
                                        ? 'bg-emerald-50/20 hover:bg-emerald-50/50'
                                        : 'hover:bg-gray-50'
                                }`}
                              >
                                {/* Checkbox */}
                                <td className="py-1.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleTxn(key)}
                                    className="cursor-pointer text-gray-400 hover:text-[#EA580C] transition-colors inline-flex items-center justify-center"
                                  >
                                    {isSelected ? (
                                      <CheckSquare className="w-3.5 h-3.5 text-[#EA580C]" />
                                    ) : (
                                      <Square className="w-3.5 h-3.5 text-gray-300" />
                                    )}
                                  </button>
                                </td>

                                {/* DATE */}
                                <td className="py-1.5 px-3 font-mono text-gray-700 whitespace-nowrap text-xs">
                                  {txn.bookingDate}
                                </td>

                                {/* REFERENCE */}
                                <td className="py-1.5 px-3 font-mono font-bold text-gray-900 whitespace-nowrap text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <span>{txn.reference}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopyRef(txn.reference, e)}
                                      className="text-gray-400 hover:text-gray-700 p-0.5 rounded cursor-pointer transition-colors"
                                      title={copiedRef === txn.reference ? 'Copied!' : 'Copy Reference'}
                                    >
                                      {copiedRef === txn.reference ? (
                                        <Check className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <FileText className="w-3 h-3 text-gray-400 hover:text-[#EA580C]" />
                                      )}
                                    </button>
                                  </div>
                                </td>

                                {/* DESCRIPTION */}
                                <td className="py-1.5 px-3 font-medium text-gray-800 text-xs">
                                  {txn.description}
                                </td>

                                {/* AMOUNT */}
                                <td className="py-1.5 px-3 text-right font-mono font-bold text-gray-900 whitespace-nowrap text-xs">
                                  ${Math.abs(txn.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>

                                {/* MATCHED INVOICES */}
                                <td className="py-1.5 px-3">
                                  {hasMatches ? (
                                    <div className="flex flex-wrap items-center gap-1 max-w-[240px]">
                                      {txn.matchedInvoiceIds.map((invId) => (
                                        <span
                                          key={invId}
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-900 border border-emerald-200 shrink-0"
                                        >
                                          <FileText className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                          <span>{invId}</span>
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-gray-400 italic font-normal">
                                      None
                                    </span>
                                  )}
                                </td>

                                {/* MATCH STATUS */}
                                <td className="py-1.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={(e) => toggleRowExpand(key, e)}
                                    className="inline-flex items-center justify-center gap-1.5 cursor-pointer py-0.5"
                                  >
                                    {hasMatches ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        <span>Matched</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                        Unmatched
                                      </span>
                                    )}
                                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180 text-orange-600' : ''}`} />
                                  </button>
                                </td>
                              </tr>

                              {/* EXPANDED ACCORDION ROW FOR DETAILS */}
                              {isExpanded && (
                                <tr className="bg-[#FFF8F3] border-b-2 border-orange-200/80">
                                  <td colSpan={7} className="p-3.5 pl-10">
                                    <div className="bg-white border border-orange-200/90 rounded-xl p-3.5 shadow-xs space-y-2.5 ring-1 ring-orange-100/80">
                                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 pb-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-gray-800">
                                            Transaction Details ({txn.reference})
                                          </span>
                                          <span className="text-[11px] text-gray-500 font-mono">
                                            Source: {txn.sourceBankName} ({txn.sourceAccount})
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs font-mono">
                                          <span className="text-gray-500 font-sans">Value Date: <strong className="text-gray-800">{txn.valueDate || txn.bookingDate}</strong></span>
                                          <span className="text-gray-500 font-sans">Category: <strong className="text-gray-800">{txn.category || 'General'}</strong></span>
                                        </div>
                                      </div>

                                      {/* Match Reasons & Invoices breakdown */}
                                      {hasMatches ? (
                                        <div className="space-y-2">
                                          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">
                                            Reconciled Invoices ({txn.matchedInvoiceIds.length})
                                          </span>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                            {txn.matchedInvoiceIds.map((invId) => {
                                              const invObj = invoicesMap.get(invId);
                                              return (
                                                <div key={invId} className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-2 flex items-center justify-between text-xs">
                                                  <div className="flex items-center gap-2">
                                                    <Receipt className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                    <div>
                                                      <div className="flex items-center gap-1">
                                                        <span className="font-bold text-gray-900 font-mono text-[11px]">{invId}</span>
                                                        {invObj?.type && (
                                                          <span className="text-[9px] font-bold px-1 py-0.2 bg-emerald-200 text-emerald-900 rounded">
                                                            {invObj.type}
                                                          </span>
                                                        )}
                                                      </div>
                                                      <span className="text-[11px] font-medium text-gray-700 block truncate max-w-[150px]">
                                                        {invObj?.entityName || 'Reconciled Entity'}
                                                      </span>
                                                      <span className="text-[10px] text-gray-500">
                                                        {invObj?.date ? `Dated: ${invObj.date}` : 'Reconciliation match confirmed'}
                                                      </span>
                                                    </div>
                                                  </div>
                                                  <div className="text-right">
                                                    {invObj?.amount !== undefined && (
                                                      <span className="font-mono font-bold text-gray-900 text-xs block">
                                                        ${invObj.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                      </span>
                                                    )}
                                                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                                      100% Match
                                                    </span>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                          {txn.matchReasons && txn.matchReasons.length > 0 && (
                                            <div className="text-[11px] text-gray-500 flex items-center gap-2 pt-0.5">
                                              <span className="font-semibold text-gray-700">Match Logic:</span>
                                              <span>{txn.matchReasons.join(' • ')}</span>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="p-2.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-xs flex items-center gap-2">
                                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                          <span className="text-[11px]">This transaction has not yet been matched to an invoice. You may still include it in the batch as unallocated GL suspense.</span>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* PREVIEW TAB */
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('transactions')}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 border border-gray-200 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                    title="Back to Selection"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Transactions</span>
                  </button>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 font-['Open_Sans',sans-serif]">
                      Generated ETL Output Stream ({format})
                    </h3>
                    <p className="text-xs text-gray-500">
                      Compiled directly from {batchTotals.totalTransactions} selected transactions and {batchTotals.totalInvoices} matched invoices.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyPreview}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isCopiedFile ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                    <span>{isCopiedFile ? 'Copied to Clipboard!' : 'Copy Data'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const ext = format === 'XML_CAMT054' ? 'xml' : format === 'JSON_PAYMENTS' ? 'json' : 'csv';
                      const blob = new Blob([generatedEtlContent], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${batchName}.${ext}`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-[#EA580C] border border-orange-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download {format}</span>
                  </button>
                </div>
              </div>

              {/* Code display box */}
              <div className="bg-[#1E293B] text-gray-100 p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-[500px] border border-gray-800 leading-relaxed shadow-inner">
                <pre>{generatedEtlContent}</pre>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM ACTION FOOTER */}
        <div className="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleCreateSubmit('Draft')}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Save as Draft
            </button>

            <button
              type="button"
              disabled={selectedTransactions.length === 0}
              onClick={() => handleCreateSubmit('Ready')}
              className={`px-5 py-2 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-xs transition-colors cursor-pointer ${
                selectedTransactions.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#EA580C] hover:bg-[#D94E07] active:bg-[#C2410C]'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate & Create Batch ({selectedTransactions.length} Transactions)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
