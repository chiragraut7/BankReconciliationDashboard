import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Filter, 
  Sparkles, 
  SlidersHorizontal, 
  Layers, 
  FileText, 
  ArrowRight, 
  AlertTriangle, 
  AlertCircle, 
  X, 
  Check, 
  Info,
  ExternalLink,
  Split,
  Maximize2,
  Minimize2,
  RefreshCw
} from 'lucide-react';
import { BankTransaction, MatchedInvoice } from '../types/reconciliation';
import { formatCurrency, formatPercent, getMatchStatusClass } from '../utils/formatters';

interface Step2MatchWorkspaceProps {
  bankName: string;
  accountNumber: string;
  fileName: string;
  periodFrom: string;
  periodTo: string;
  transactions: BankTransaction[];
  invoices: MatchedInvoice[];
  onUpdateTransactions: (txns: BankTransaction[]) => void;
  onUpdateInvoices: (invs: MatchedInvoice[]) => void;
  onViewInvoiceDetail: (invoice: MatchedInvoice) => void;
  onViewStatementDetail: () => void;
  onProceedToReview: () => void;
  onBackToStatement: () => void;
}

export const Step2MatchWorkspace: React.FC<Step2MatchWorkspaceProps> = ({
  bankName,
  accountNumber,
  fileName,
  periodFrom,
  periodTo,
  transactions,
  invoices,
  onUpdateTransactions,
  onUpdateInvoices,
  onViewInvoiceDetail,
  onViewStatementDetail,
  onProceedToReview,
  onBackToStatement,
}) => {
  // Expansion states
  const [expandedTxnIds, setExpandedTxnIds] = useState<Set<string>>(new Set(['TXN-782921']));
  const [isMatchedInvoicesOpen, setIsMatchedInvoicesOpen] = useState<boolean>(true);
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Set<string>>(new Set(['INV-10482']));

  // Multi-selection states for Manual Match
  const [selectedTxnIds, setSelectedTxnIds] = useState<Set<string>>(new Set());
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());

  // Search & Filter
  const [txnSearchQuery, setTxnSearchQuery] = useState('');
  const [invSearchQuery, setInvSearchQuery] = useState('');
  const [txnStatusFilter, setTxnStatusFilter] = useState<'ALL' | 'UNMATCHED' | 'SUGGESTED' | 'MATCHED'>('ALL');

  // Confirmation dialog state for manual match
  const [showConfirmMatchModal, setShowConfirmMatchModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Toggle Accordion Rows
  const toggleTxnExpand = (id: string) => {
    setExpandedTxnIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleInvoiceExpand = (id: string) => {
    setExpandedInvoiceIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAllInvoices = () => {
    setExpandedInvoiceIds(new Set(invoices.map(i => i.id)));
  };

  const collapseAllInvoices = () => {
    setExpandedInvoiceIds(new Set());
  };

  // Selection handlers
  const handleToggleTxnSelect = (id: string) => {
    setSelectedTxnIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleInvoiceSelect = (id: string) => {
    setSelectedInvoiceIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedTxnIds(new Set());
    setSelectedInvoiceIds(new Set());
  };

  // Live KPI Calculations
  const matchedCount = useMemo(() => {
    return transactions.filter(t => t.status === 'Exact Match' || t.status === 'High Confidence' || t.status === 'Multi-Invoice' || t.status === 'Manual Match').length;
  }, [transactions]);

  const suggestedCount = useMemo(() => {
    return transactions.filter(t => t.status === 'Suggested').length;
  }, [transactions]);

  const unmatchedCount = useMemo(() => {
    return transactions.filter(t => t.status === 'Unmatched' || t.status === 'Exception').length;
  }, [transactions]);

  const calculatedVariance = useMemo(() => {
    return transactions.reduce((acc, t) => acc + (t.variance || 0), 0);
  }, [transactions]);

  const overallConfidence = useMemo(() => {
    if (transactions.length === 0) return 100;
    const totalConf = transactions.reduce((acc, t) => acc + t.matchConfidence, 0);
    return Math.round(totalConf / transactions.length);
  }, [transactions]);

  // Selected totals for floating bar
  const selectedBankTotal = useMemo(() => {
    return Array.from(selectedTxnIds).reduce<number>((sum, id) => {
      const txn = transactions.find(t => t.id === id);
      return sum + (txn ? Math.abs(txn.amount) : 0);
    }, 0);
  }, [selectedTxnIds, transactions]);

  const selectedInvoiceTotal = useMemo(() => {
    return Array.from(selectedInvoiceIds).reduce<number>((sum, id) => {
      const inv = invoices.find(i => i.id === id);
      return sum + (inv ? inv.amount : 0);
    }, 0);
  }, [selectedInvoiceIds, invoices]);

  const selectedVariance = useMemo(() => {
    return selectedBankTotal - selectedInvoiceTotal;
  }, [selectedBankTotal, selectedInvoiceTotal]);

  const hasSelection = selectedTxnIds.size > 0 || selectedInvoiceIds.size > 0;

  // Bulk Approve Suggested
  const handleApproveAllSuggested = () => {
    const updatedTxns = transactions.map(t => {
      if (t.status === 'Suggested') {
        return {
          ...t,
          status: 'Exact Match' as const,
          matchConfidence: 100,
          variance: 0.00,
          matchReasons: [...t.matchReasons, 'Bulk Approved by Controller'],
        };
      }
      return t;
    });

    const updatedInvs = invoices.map(i => {
      if (i.status === 'Suggested') {
        return {
          ...i,
          status: 'Exact Match' as const,
          matchConfidence: 100,
        };
      }
      return i;
    });

    onUpdateTransactions(updatedTxns);
    onUpdateInvoices(updatedInvs);
    showToast(`Successfully approved ${suggestedCount} suggested matches.`);
  };

  // Single Unmatch Action
  const handleUnmatchTxn = (txnId: string) => {
    const txn = transactions.find(t => t.id === txnId);
    if (!txn) return;

    const matchedInvIds = txn.matchedInvoiceIds;

    const updatedTxns = transactions.map(t => {
      if (t.id === txnId) {
        return {
          ...t,
          status: 'Unmatched' as const,
          matchConfidence: 0,
          matchedInvoiceIds: [],
          matchReasons: ['Manually unmatched by operator'],
          variance: t.amount,
        };
      }
      return t;
    });

    const updatedInvs = invoices.map(inv => {
      if (matchedInvIds.includes(inv.id)) {
        return {
          ...inv,
          status: 'Unmatched' as const,
          matchConfidence: 0,
          matchedBankTxnId: undefined,
        };
      }
      return inv;
    });

    onUpdateTransactions(updatedTxns);
    onUpdateInvoices(updatedInvs);
    showToast(`Unmatched Transaction ${txnId}`);
  };

  // Confirm Manual Match Action
  const handleExecuteManualMatch = () => {
    const txnIds = Array.from(selectedTxnIds);
    const invIds = Array.from(selectedInvoiceIds);

    const isMultiInvoice = invIds.length > 1;
    const isMultiBank = txnIds.length > 1;

    let matchTypeLabel: any = 'Manual Match';
    if (isMultiInvoice) matchTypeLabel = 'Multi-Invoice';

    const updatedTxns = transactions.map(t => {
      if (selectedTxnIds.has(t.id)) {
        return {
          ...t,
          status: matchTypeLabel,
          matchConfidence: selectedVariance === 0 ? 100 : 95,
          matchedInvoiceIds: invIds,
          matchReasons: [
            'Manual Reconciliation Override Confirmed',
            `Linked to Invoices: ${invIds.join(', ')}`,
            `Variance: ${formatCurrency(selectedVariance)}`
          ],
          variance: selectedVariance,
        };
      }
      return t;
    });

    const updatedInvs = invoices.map(i => {
      if (selectedInvoiceIds.has(i.id)) {
        return {
          ...i,
          status: isMultiInvoice ? ('Multi-line' as const) : ('Manual Match' as const),
          matchConfidence: selectedVariance === 0 ? 100 : 95,
          matchedBankTxnId: txnIds[0] || 'MANUAL-BATCH',
        };
      }
      return i;
    });

    onUpdateTransactions(updatedTxns);
    onUpdateInvoices(updatedInvs);
    setShowConfirmMatchModal(false);
    handleClearSelection();
    showToast('Match Confirmed successfully.');
  };

  // Filtered lists
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = 
        t.description.toLowerCase().includes(txnSearchQuery.toLowerCase()) ||
        t.reference.toLowerCase().includes(txnSearchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(txnSearchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      if (txnStatusFilter === 'UNMATCHED') return t.status === 'Unmatched' || t.status === 'Exception';
      if (txnStatusFilter === 'SUGGESTED') return t.status === 'Suggested';
      if (txnStatusFilter === 'MATCHED') return t.status === 'Exact Match' || t.status === 'High Confidence' || t.status === 'Multi-Invoice' || t.status === 'Manual Match';
      return true;
    });
  }, [transactions, txnSearchQuery, txnStatusFilter]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(i => {
      return (
        i.invoiceNumber.toLowerCase().includes(invSearchQuery.toLowerCase()) ||
        i.entityName.toLowerCase().includes(invSearchQuery.toLowerCase()) ||
        (i.poNumber && i.poNumber.toLowerCase().includes(invSearchQuery.toLowerCase()))
      );
    });
  }, [invoices, invSearchQuery]);

  return (
    <div className="flex flex-col space-y-5 relative pb-20">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-900 border border-emerald-500 text-emerald-100 px-4 py-2.5 rounded shadow-2xl text-xs font-medium flex items-center gap-2 animate-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER STRIP */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 border border-[#141414] shadow-xs">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-[10px] text-gray-500 uppercase font-bold">Bank & Account</div>
            <div className="text-xs font-bold text-[#141414] flex items-center gap-2">
              <span>{bankName}</span>
              <span className="font-mono text-gray-600 font-normal">{accountNumber}</span>
            </div>
          </div>
          <div className="h-6 w-[1px] bg-gray-300 hidden sm:block" />
          <div>
            <div className="text-[10px] text-gray-500 uppercase font-bold">Statement File</div>
            <div className="text-xs font-mono text-[#141414] truncate max-w-[200px]" title={fileName}>
              {fileName}
            </div>
          </div>
          <div className="h-6 w-[1px] bg-gray-300 hidden md:block" />
          <div className="hidden md:block">
            <div className="text-[10px] text-gray-500 uppercase font-bold">Statement Period</div>
            <div className="text-xs font-mono text-[#141414]">
              {periodFrom} → {periodTo}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onViewStatementDetail}
          className="inline-flex items-center gap-1 text-xs text-[#141414] hover:bg-gray-100 px-2.5 py-1 bg-white border border-[#141414] transition-colors cursor-pointer font-bold"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>View Source Statement</span>
        </button>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-white p-3 border border-[#141414] shadow-xs">
          <div className="text-[10px] uppercase font-bold text-gray-500">Transactions</div>
          <div className="text-lg font-mono font-bold text-[#141414] mt-0.5">248</div>
          <div className="text-[10px] text-gray-500">100% Extracted</div>
        </div>

        <div className="bg-white p-3 border border-[#141414] shadow-xs">
          <div className="text-[10px] uppercase font-bold text-green-700">Matched</div>
          <div className="text-lg font-mono font-bold text-green-700 mt-0.5">{matchedCount}</div>
          <div className="text-[10px] text-gray-500">Auto & manual confirmed</div>
        </div>

        <div className="bg-white p-3 border border-[#141414] shadow-xs">
          <div className="text-[10px] uppercase font-bold text-amber-700">Suggested</div>
          <div className="text-lg font-mono font-bold text-amber-700 mt-0.5">{suggestedCount}</div>
          <div className="text-[10px] text-gray-500">Awaiting controller review</div>
        </div>

        <div className="bg-white p-3 border border-[#141414] shadow-xs">
          <div className="text-[10px] uppercase font-bold text-red-600">Unmatched</div>
          <div className="text-lg font-mono font-bold text-red-600 mt-0.5">{unmatchedCount}</div>
          <div className="text-[10px] text-gray-500">Exceptions or fees</div>
        </div>

        <div className="bg-white p-3 border border-[#141414] shadow-xs">
          <div className="text-[10px] uppercase font-bold text-gray-500">Variance</div>
          <div className={`text-lg font-mono font-bold mt-0.5 ${calculatedVariance === 0 ? 'text-green-700' : 'text-red-600'}`}>
            {formatCurrency(calculatedVariance)}
          </div>
          <div className="text-[10px] text-gray-500">
            {calculatedVariance === 0 ? 'Fully Balanced' : 'Unreconciled delta'}
          </div>
        </div>

        <div className="bg-white p-3 border border-[#141414] shadow-xs">
          <div className="text-[10px] uppercase font-bold text-blue-700">Confidence</div>
          <div className="text-lg font-mono font-bold text-blue-700 mt-0.5">
            {overallConfidence}%
          </div>
          <div className="text-[10px] text-gray-500">Weighted engine score</div>
        </div>
      </div>

      {/* AUTO MATCH RULE BAR */}
      <div className="bg-blue-50 border border-blue-200 p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-100 border border-blue-300 text-blue-800 text-[11px] font-bold font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AUTO-MATCH ENGINE ACTIVE</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-gray-700">
            <span className="bg-white px-2 py-0.5 border border-gray-300 text-green-700 flex items-center gap-1 font-bold">
              <Check className="w-3 h-3" /> Exact Invoice Number
            </span>
            <span className="bg-white px-2 py-0.5 border border-gray-300 text-green-700 flex items-center gap-1 font-bold">
              <Check className="w-3 h-3" /> Exact Amount
            </span>
            <span className="bg-white px-2 py-0.5 border border-gray-300 text-green-700 flex items-center gap-1 font-bold">
              <Check className="w-3 h-3" /> Date tolerance ±5 days
            </span>
            <span className="bg-white px-2 py-0.5 border border-gray-300 text-green-700 flex items-center gap-1 font-bold">
              <Check className="w-3 h-3" /> Reference Matching
            </span>
            <span className="bg-white px-2 py-0.5 border border-gray-300 text-green-700 flex items-center gap-1 font-bold">
              <Check className="w-3 h-3" /> Customer/Vendor Matching
            </span>
            <span className="bg-white px-2 py-0.5 border border-gray-300 text-green-700 flex items-center gap-1 font-bold">
              <Check className="w-3 h-3" /> Multi-Invoice Matching
            </span>
          </div>
        </div>

        {suggestedCount > 0 && (
          <button
            type="button"
            onClick={handleApproveAllSuggested}
            className="px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approve All Suggested ({suggestedCount})</span>
          </button>
        )}
      </div>

      {/* TWO-COLUMN MATCHING AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: Bank Statement Transactions */}
        <div className="lg:col-span-6 flex flex-col bg-white border border-[#141414] shadow-xs overflow-hidden">
          {/* Section Header & Filters */}
          <div className="p-3 bg-gray-50 border-b border-[#141414] flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-[#141414] uppercase tracking-wide flex items-center gap-1.5">
                <span>Bank Statement Transactions</span>
                <span className="bg-gray-200 text-gray-700 font-mono text-[10px] px-1.5 py-0.2">
                  {filteredTransactions.length}
                </span>
              </h4>
            </div>

            {/* Sub-filters */}
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <input
                  type="text"
                  value={txnSearchQuery}
                  onChange={(e) => setTxnSearchQuery(e.target.value)}
                  placeholder="Filter bank items..."
                  aria-label="Filter bank transactions"
                  className="bg-white border border-gray-300 px-2.5 py-1 text-[11px] text-[#141414] placeholder-gray-400 focus:outline-none focus:border-blue-600 w-36 font-mono"
                />
                <Search className="w-3 h-3 absolute right-2 top-2 text-gray-400 pointer-events-none" />
              </div>

              <select
                value={txnStatusFilter}
                onChange={(e: any) => setTxnStatusFilter(e.target.value)}
                aria-label="Filter by transaction status"
                className="bg-white border border-gray-300 px-2 py-1 text-[11px] text-[#141414] focus:outline-none focus:border-blue-600 font-mono cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="UNMATCHED">Unmatched ({unmatchedCount})</option>
                <option value="SUGGESTED">Suggested ({suggestedCount})</option>
                <option value="MATCHED">Matched ({matchedCount})</option>
              </select>
            </div>
          </div>

          {/* Bank Transactions Table */}
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-[11px] border-collapse font-sans">
              <thead className="bg-gray-100 text-gray-700 border-b border-[#141414] text-[10px] uppercase font-bold sticky top-0 z-10">
                <tr>
                  <th className="py-2 px-2.5 text-center w-8">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="py-2 px-2 text-left font-mono">Date</th>
                  <th className="py-2 px-2 text-left font-mono">Reference</th>
                  <th className="py-2 px-2 text-left">Description</th>
                  <th className="py-2 px-2 text-right font-mono">Amount</th>
                  <th className="py-2 px-2.5 text-center font-mono">Status</th>
                  <th className="py-2 px-1 text-center w-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-[#141414]">
                {filteredTransactions.map((txn) => {
                  const isExpanded = expandedTxnIds.has(txn.id);
                  const isSelected = selectedTxnIds.has(txn.id);
                  const matchedInvs = invoices.filter(inv => txn.matchedInvoiceIds.includes(inv.id));
                  const isMulti = txn.status === 'Multi-Invoice' || matchedInvs.length > 1;

                  return (
                    <React.Fragment key={txn.id}>
                      <tr 
                        className={`transition-colors cursor-pointer group ${
                          isSelected 
                            ? 'bg-blue-50 border-l-2 border-blue-600' 
                            : isExpanded 
                            ? 'bg-gray-50' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => toggleTxnExpand(txn.id)}
                      >
                        {/* Checkbox */}
                        <td 
                          className="py-2 px-2.5 text-center" 
                          onClick={(e) => { e.stopPropagation(); handleToggleTxnSelect(txn.id); }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            aria-label={`Select transaction ${txn.id}`}
                            className="bg-white border-gray-400 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer h-3.5 w-3.5"
                          />
                        </td>

                        {/* Booking Date */}
                        <td className="py-2 px-2 font-mono whitespace-nowrap text-gray-600 text-[10px]">
                          {txn.bookingDate}
                        </td>

                        {/* Reference */}
                        <td className="py-2 px-2 font-mono font-bold text-[#141414] text-[11px] whitespace-nowrap">
                          {txn.reference}
                        </td>

                        {/* Description */}
                        <td className="py-2 px-2 text-gray-800 max-w-[160px] truncate" title={txn.description}>
                          {txn.description}
                        </td>

                        {/* Amount */}
                        <td className={`py-2 px-2 font-mono font-bold text-right whitespace-nowrap ${txn.amount >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {formatCurrency(txn.amount)}
                        </td>

                        {/* Status badge */}
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 uppercase font-bold border ${getMatchStatusClass(txn.status)}`}>
                            {txn.status}
                          </span>
                        </td>

                        {/* Expand Chevron */}
                        <td className="py-2 px-1 text-center text-gray-400 group-hover:text-gray-700">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </td>
                      </tr>

                      {/* EXPANDABLE MATCH DETAILS ACCORDION ROW */}
                      {isExpanded && (
                        <tr className="bg-gray-50 border-y border-[#141414]">
                          <td colSpan={7} className="p-3.5">
                            <div className="bg-white border border-[#141414] p-3 space-y-3 shadow-xs">
                              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                                    MATCH DETAILS
                                  </span>
                                  <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 text-gray-700 border border-gray-300 font-bold">
                                    Conf: {txn.matchConfidence}%
                                  </span>
                                </div>
                                <div className="text-[11px] font-mono text-gray-600">
                                  Variance: <strong className={txn.variance === 0 ? 'text-green-700' : 'text-red-600'}>{formatCurrency(txn.variance)}</strong>
                                </div>
                              </div>

                              {/* Bank Transaction Spec */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-gray-50 p-2 border border-gray-200">
                                <div>
                                  <span className="text-[10px] text-gray-500 uppercase font-bold">Transaction ID</span>
                                  <div className="font-mono font-bold text-[#141414]">{txn.id}</div>
                                </div>
                                <div>
                                  <span className="text-[10px] text-gray-500 uppercase font-bold">Date</span>
                                  <div className="font-mono text-gray-700">{txn.bookingDate}</div>
                                </div>
                                <div>
                                  <span className="text-[10px] text-gray-500 uppercase font-bold">Reference</span>
                                  <div className="font-mono font-bold text-[#141414]">{txn.reference}</div>
                                </div>
                                <div>
                                  <span className="text-[10px] text-gray-500 uppercase font-bold">Amount</span>
                                  <div className="font-mono font-bold text-green-700">{formatCurrency(txn.amount)}</div>
                                </div>
                              </div>

                              {/* Matched Invoice(s) breakdown */}
                              <div>
                                <div className="text-[10px] font-bold uppercase text-gray-600 mb-1 flex items-center justify-between">
                                  <span>Matched Invoice(s) {matchedInvs.length > 0 ? `(${matchedInvs.length})` : ''}</span>
                                  {isMulti && (
                                    <span className="text-[9px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.2 border border-blue-200 font-bold">
                                      ✓ Multi-Invoice Match
                                    </span>
                                  )}
                                </div>

                                {matchedInvs.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {matchedInvs.map((inv) => (
                                      <div key={inv.id} className="flex items-center justify-between bg-gray-50 p-2 border border-gray-200 text-xs">
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono font-bold text-[#141414]">{inv.invoiceNumber}</span>
                                          <span className="text-gray-600 font-sans text-[11px]">— {inv.entityName}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="font-mono font-bold text-[#141414]">{formatCurrency(inv.amount)}</span>
                                          <button
                                            type="button"
                                            onClick={() => onViewInvoiceDetail(inv)}
                                            className="px-2 py-0.5 bg-white hover:bg-gray-100 text-[#141414] text-[10px] font-bold border border-gray-300 transition-colors"
                                          >
                                            View Invoice
                                          </button>
                                        </div>
                                      </div>
                                    ))}

                                    {/* Multi-Invoice Aggregate Sum Row */}
                                    {isMulti && (
                                      <div className="flex justify-between items-center bg-blue-50 px-2.5 py-1.5 border border-blue-200 text-xs font-mono">
                                        <span className="text-gray-700 font-sans font-bold">Consolidated Matched Total:</span>
                                        <div className="flex items-center gap-3">
                                          <span className="font-bold text-blue-800">
                                            {formatCurrency(matchedInvs.reduce((s, i) => s + i.amount, 0))}
                                          </span>
                                          <span className="text-green-700 font-bold text-[11px]">
                                            Variance: $0.00
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="p-2 bg-gray-50 border border-gray-200 text-xs text-gray-500 italic">
                                    No invoices currently linked. Use manual match or create fee adjustment.
                                  </div>
                                )}
                              </div>

                              {/* Match Reason Checklist */}
                              {txn.matchReasons && txn.matchReasons.length > 0 && (
                                <div className="space-y-1">
                                  <div className="text-[10px] font-bold uppercase text-gray-500">Match Reason & Verification</div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px] font-mono text-gray-700">
                                    {txn.matchReasons.map((reason, rIdx) => (
                                      <div key={rIdx} className="flex items-center gap-1.5 bg-gray-50 p-1 border border-gray-200">
                                        <Check className="w-3 h-3 text-green-700 shrink-0" />
                                        <span className="truncate">{reason}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Action Row */}
                              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                <div className="flex items-center gap-2">
                                  {matchedInvs[0] && (
                                    <button
                                      type="button"
                                      onClick={() => onViewInvoiceDetail(matchedInvs[0])}
                                      className="px-2.5 py-1 bg-white hover:bg-gray-100 text-[#141414] text-[11px] font-bold border border-gray-300 transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      <FileText className="w-3 h-3" />
                                      <span>View Invoice</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={onViewStatementDetail}
                                    className="px-2.5 py-1 bg-white hover:bg-gray-100 text-[#141414] text-[11px] font-bold border border-gray-300 transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>View Statement</span>
                                  </button>
                                </div>

                                {txn.status !== 'Unmatched' && (
                                  <button
                                    type="button"
                                    onClick={() => handleUnmatchTxn(txn.id)}
                                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-bold border border-red-200 transition-colors cursor-pointer"
                                  >
                                    Unmatch
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: Matched / Candidate Invoices */}
        <div className="lg:col-span-6 flex flex-col bg-white border border-[#141414] shadow-xs overflow-hidden">
          {/* Section Header & Filters */}
          <div className="p-3 bg-gray-50 border-b border-[#141414] flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-[#141414] uppercase tracking-wide flex items-center gap-1.5">
                <span>Matched & Candidate Invoices</span>
                <span className="bg-gray-200 text-gray-700 font-mono text-[10px] px-1.5 py-0.2">
                  {filteredInvoices.length}
                </span>
              </h4>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative">
                <input
                  type="text"
                  value={invSearchQuery}
                  onChange={(e) => setInvSearchQuery(e.target.value)}
                  placeholder="Search invoice / vendor..."
                  aria-label="Search invoice or vendor"
                  className="bg-white border border-gray-300 px-2.5 py-1 text-[11px] text-[#141414] placeholder-gray-400 focus:outline-none focus:border-blue-600 w-44 font-mono"
                />
                <Search className="w-3 h-3 absolute right-2 top-2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-[11px] border-collapse font-sans">
              <thead className="bg-gray-100 text-gray-700 border-b border-[#141414] text-[10px] uppercase font-bold sticky top-0 z-10">
                <tr>
                  <th className="py-2 px-2.5 text-center w-8">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="py-2 px-2 text-left font-mono">Invoice #</th>
                  <th className="py-2 px-2 text-left font-mono">Date</th>
                  <th className="py-2 px-2 text-left">Customer / Vendor</th>
                  <th className="py-2 px-2 text-right font-mono">Amount</th>
                  <th className="py-2 px-2.5 text-center font-mono">Match Status</th>
                  <th className="py-2 px-2 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-[#141414]">
                {filteredInvoices.map((inv) => {
                  const isSelected = selectedInvoiceIds.has(inv.id);

                  return (
                    <tr 
                      key={inv.id} 
                      className={`transition-colors cursor-pointer group ${
                        isSelected 
                          ? 'bg-blue-50 border-l-2 border-blue-600' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleToggleInvoiceSelect(inv.id)}
                    >
                      {/* Checkbox */}
                      <td 
                        className="py-2 px-2.5 text-center" 
                        onClick={(e) => { e.stopPropagation(); handleToggleInvoiceSelect(inv.id); }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          aria-label={`Select invoice ${inv.invoiceNumber}`}
                          className="bg-white border-gray-400 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer h-3.5 w-3.5"
                        />
                      </td>

                      {/* Invoice # */}
                      <td className="py-2 px-2 font-mono font-bold text-[#141414] whitespace-nowrap">
                        {inv.invoiceNumber}
                      </td>

                      {/* Date */}
                      <td className="py-2 px-2 font-mono text-gray-600 text-[10px] whitespace-nowrap">
                        {inv.date}
                      </td>

                      {/* Customer / Vendor */}
                      <td className="py-2 px-2 text-gray-800 max-w-[150px] truncate" title={inv.entityName}>
                        {inv.entityName}
                      </td>

                      {/* Amount */}
                      <td className="py-2 px-2 font-mono font-bold text-right text-[#141414] whitespace-nowrap">
                        {formatCurrency(inv.amount)}
                      </td>

                      {/* Status */}
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 uppercase font-bold border ${getMatchStatusClass(inv.status)}`}>
                          {inv.matchConfidence > 0 ? `${inv.matchConfidence}%` : 'Unmatched'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-2 px-2 text-right">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onViewInvoiceDetail(inv); }}
                          className="p-1 text-gray-500 hover:text-[#141414] hover:bg-gray-200"
                          title="View Invoice Details"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MATCHED INVOICES ACCORDION SECTION BELOW STATEMENT */}
      <div className="bg-white border border-[#141414] shadow-xs overflow-hidden">
        <div 
          className="p-3.5 bg-gray-50 border-b border-[#141414] flex items-center justify-between cursor-pointer hover:bg-gray-100"
          onClick={() => setIsMatchedInvoicesOpen(!isMatchedInvoicesOpen)}
        >
          <div className="flex items-center gap-2">
            {isMatchedInvoicesOpen ? (
              <ChevronDown className="w-4 h-4 text-[#141414]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#141414]" />
            )}
            <span className="text-xs font-bold text-[#141414] uppercase tracking-wider">
              Matched Invoices ({invoices.length})
            </span>
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={expandAllInvoices}
              className="text-[10px] font-mono px-2 py-1 bg-white hover:bg-gray-100 text-[#141414] border border-gray-300 font-bold transition-colors cursor-pointer"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={collapseAllInvoices}
              className="text-[10px] font-mono px-2 py-1 bg-white hover:bg-gray-100 text-[#141414] border border-gray-300 font-bold transition-colors cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>

        {isMatchedInvoicesOpen && (
          <div className="divide-y divide-gray-200 max-h-[360px] overflow-y-auto">
            {invoices.map((inv) => {
              const isExp = expandedInvoiceIds.has(inv.id);
              const linkedTxn = transactions.find(t => t.id === inv.matchedBankTxnId);

              return (
                <div key={inv.id} className="p-3 bg-white hover:bg-gray-50 transition-colors">
                  {/* Collapsed Header Line */}
                  <div 
                    className="flex flex-wrap items-center justify-between gap-2 cursor-pointer"
                    onClick={() => toggleInvoiceExpand(inv.id)}
                  >
                    <div className="flex items-center gap-3">
                      {isExp ? (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                      )}
                      <span className="font-mono font-bold text-[#141414] text-xs">{inv.invoiceNumber}</span>
                      <span className="text-gray-600 text-xs">— {inv.entityName}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-mono font-bold text-[#141414] text-xs">{formatCurrency(inv.amount)}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 uppercase font-bold border ${getMatchStatusClass(inv.status)}`}>
                        {inv.status}
                      </span>
                      {inv.matchConfidence >= 90 ? (
                        <CheckCircle2 className="w-4 h-4 text-green-700" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-700" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExp && (
                    <div className="mt-3 pt-3 border-t border-gray-200 pl-6 space-y-2.5 text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-gray-50 p-2.5 border border-gray-200">
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase font-bold">Matched Bank Txn</span>
                          <div className="font-mono font-bold text-blue-700 mt-0.5">
                            {inv.matchedBankTxnId || 'Unlinked'}
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase font-bold">Match Reason</span>
                          <div className="text-gray-700 mt-0.5">
                            {linkedTxn?.matchReasons?.[0] || 'Direct AR Ledger Synchronization'}
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase font-bold">Match Confidence</span>
                          <div className="font-mono font-bold text-green-700 mt-0.5">
                            {inv.matchConfidence}%
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase font-bold">Variance</span>
                          <div className="font-mono font-bold text-gray-800 mt-0.5">
                            $0.00
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <div className="flex items-center gap-4 text-gray-600 font-mono">
                          <span>Issue Date: <strong className="text-[#141414]">{inv.date}</strong></span>
                          <span>PO: <strong className="text-[#141414]">{inv.poNumber || 'N/A'}</strong></span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onViewInvoiceDetail(inv)}
                          className="px-2.5 py-1 bg-white hover:bg-gray-100 text-[#141414] font-bold text-[11px] transition-colors border border-gray-300"
                        >
                          View Full Invoice & Line Items
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FLOATING CONFIRM MATCH BAR (HIDDEN BY DEFAULT - ONLY VISIBLE WHEN USER SELECTS TRANSACTIONS/INVOICES) */}
      {hasSelection && (
        <div className="sticky bottom-0 z-40 bg-white border-2 border-[#141414] text-[#141414] p-4 shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Counts & Selection Badges */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="p-1 bg-[#141414] text-white font-bold px-2 text-xs">
                  {selectedTxnIds.size}
                </span>
                <span className="text-gray-800 font-bold font-sans">Bank Txns</span>
              </div>

              <span className="text-gray-400">|</span>

              <div className="flex items-center gap-2">
                <span className="p-1 bg-[#141414] text-white font-bold px-2 text-xs">
                  {selectedInvoiceIds.size}
                </span>
                <span className="text-gray-800 font-bold font-sans">Invoices</span>
              </div>

              <span className="text-gray-400">|</span>

              <div>
                <span className="text-gray-500 font-sans text-[11px]">Bank Total: </span>
                <span className="font-bold text-[#141414]">{formatCurrency(selectedBankTotal)}</span>
              </div>

              <span className="text-gray-400">|</span>

              <div>
                <span className="text-gray-500 font-sans text-[11px]">Invoice Total: </span>
                <span className="font-bold text-[#141414]">{formatCurrency(selectedInvoiceTotal)}</span>
              </div>

              <span className="text-gray-400">|</span>

              <div>
                <span className="text-gray-500 font-sans text-[11px]">Variance: </span>
                <span className={`font-bold ${selectedVariance === 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatCurrency(selectedVariance)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-3 py-1.5 bg-white hover:bg-gray-100 text-[#141414] text-xs font-bold transition-colors border border-[#141414] cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmMatchModal(true)}
                disabled={selectedTxnIds.size === 0 || selectedInvoiceIds.size === 0}
                className="px-4 py-1.5 bg-[#141414] hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-[#141414] text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm Match</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MATCH INTERMEDIATE MODAL / DIALOG */}
      {showConfirmMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-[#141414] max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#141414] pb-3">
              <h3 className="text-sm font-bold text-[#141414] uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Confirm Match</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowConfirmMatchModal(false)}
                className="text-gray-500 hover:text-[#141414]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-gray-50 p-4 border border-gray-200 space-y-2.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600 font-sans">Bank Transaction Total:</span>
                <span className="font-bold text-[#141414]">{formatCurrency(selectedBankTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-sans">Invoice Total:</span>
                <span className="font-bold text-[#141414]">{formatCurrency(selectedInvoiceTotal)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <span className="text-gray-600 font-sans font-semibold">Variance:</span>
                <span className={`font-bold ${selectedVariance === 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatCurrency(selectedVariance)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-sans">Match Type:</span>
                <span className="font-bold text-blue-700">
                  {selectedInvoiceIds.size > 1 ? 'Multi-Invoice' : selectedTxnIds.size > 1 ? 'Many-to-One' : '1:1 Direct'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-sans">Confidence:</span>
                <span className="font-bold text-green-700">{selectedVariance === 0 ? '98%' : '88%'}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowConfirmMatchModal(false)}
                className="px-3 py-1.5 bg-white hover:bg-gray-100 text-[#141414] text-xs font-bold border border-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteManualMatch}
                className="px-4 py-1.5 bg-[#141414] hover:bg-gray-800 text-white text-xs font-bold shadow-xs transition-colors"
              >
                Confirm Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Modal Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-[#141414]">
        <button
          type="button"
          onClick={onBackToStatement}
          className="px-4 py-2 bg-white hover:bg-gray-100 text-[#141414] text-xs font-bold transition-colors border border-[#141414] cursor-pointer"
        >
          Back to Statement
        </button>

        <button
          type="button"
          onClick={onProceedToReview}
          className="px-5 py-2 bg-[#141414] hover:bg-gray-800 text-white text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <span>Continue to Review</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
