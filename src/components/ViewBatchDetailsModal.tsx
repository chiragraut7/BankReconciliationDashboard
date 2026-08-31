import React, { useState, useMemo } from 'react';
import { 
  X, 
  Layers, 
  Download, 
  Check, 
  Calendar, 
  Building2, 
  Share2, 
  CheckCircle2, 
  Clock, 
  Search,
  FileText,
  ChevronDown,
  Receipt,
  AlertCircle
} from 'lucide-react';
import { ETLBatch, ReconciliationRun, MatchedInvoice } from '../types/reconciliation';

interface ViewBatchDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: ETLBatch | null;
  reconciliationRuns: ReconciliationRun[];
  onExportToErp: (batch: ETLBatch) => void;
}

export const ViewBatchDetailsModal: React.FC<ViewBatchDetailsModalProps> = ({
  isOpen,
  onClose,
  batch,
  reconciliationRuns,
  onExportToErp
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Retrieve linked reconciliation runs
  const linkedRuns = useMemo(() => {
    if (!batch) return [];
    return reconciliationRuns.filter(r => batch.reconciliationIds.includes(r.id));
  }, [batch, reconciliationRuns]);

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

  // Flatten only matched transactions associated with this batch
  const batchTransactions = useMemo(() => {
    if (!batch) return [];
    return linkedRuns.flatMap(run => {
      return (run.transactions || [])
        .filter(txn => (txn.matchedInvoiceIds && txn.matchedInvoiceIds.length > 0) || txn.status === 'Matched')
        .map(txn => ({
          ...txn,
          sourceRunId: run.id,
          sourceBankName: run.bankName,
          sourceAccount: run.accountNumber
        }));
    });
  }, [linkedRuns, batch]);

  // Filtered transactions for the table
  const filteredTransactions = useMemo(() => {
    return batchTransactions.filter(txn => {
      const q = searchQuery.toLowerCase().trim();
      return !q || 
        txn.reference.toLowerCase().includes(q) ||
        txn.description.toLowerCase().includes(q) ||
        txn.bookingDate.toLowerCase().includes(q) ||
        txn.matchedInvoiceIds.some(id => id.toLowerCase().includes(q));
    });
  }, [batchTransactions, searchQuery]);

  if (!isOpen || !batch) return null;

  const handleCopyRef = (ref: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(batch, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${batch.id}_${batch.name.replace(/\s+/g, '_')}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleRowExpand = (txnId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedRowId(prev => (prev === txnId ? null : txnId));
  };

  return (
    <div className="fixed inset-0 z-50 p-3 sm:p-5 bg-black/65 backdrop-blur-xs flex items-center justify-center animate-in fade-in duration-150 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col w-full max-w-6xl max-h-[92vh] overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 text-[#EA580C] rounded-xl border border-orange-200 shadow-2xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-gray-900 font-mono tracking-tight">
                  {batch.id}
                </h3>
                <span className="text-xs text-gray-500 font-medium">•</span>
                <span className="text-sm font-semibold text-gray-800">{batch.name}</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                  batch.status === 'Ready' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : batch.status === 'Exported' 
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-gray-100 text-gray-700 border-gray-200'
                }`}>
                  {batch.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Created by <strong className="text-gray-700">{batch.createdBy}</strong> on {batch.createdAt} • Target: <span className="font-semibold text-gray-700">{batch.exportDestination || 'SAP General Ledger'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-gray-600" />
              <span>Download ({batch.format.split('_')[0]})</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TOP SUMMARY METRICS & AUDIT BAR */}
        <div className="px-6 py-3.5 bg-white border-b border-gray-200 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Total Value */}
            <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                Total Batch Value
              </span>
              <span className="text-lg font-black text-gray-900 font-mono mt-0.5 block">
                ${batch.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {batch.currency}
              </span>
            </div>

            {/* Compiled Records */}
            <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                Transactions / Invoices
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-lg font-black text-gray-900 font-mono">
                  {batch.totalTransactionsCount}
                </span>
                <span className="text-xs text-gray-400 font-medium">/</span>
                <span className="text-sm font-bold text-emerald-700 font-mono">
                  {batch.totalInvoicesCount} Invoices
                </span>
              </div>
            </div>

            {/* Posting Date & Sources */}
            <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                Posting Date
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs font-semibold text-gray-800 font-mono">
                  {batch.postingDate || '2026-08-31'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto p-5 bg-[#F6F8FA] space-y-3">
          {/* SEARCH & STATUS TOOLBAR */}
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Reference (TXN-...), Description, Amount, or Matched Invoice (INV-...)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#EA580C] focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Matched status indicator */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Status: Matched ({batchTransactions.length})</span>
              </div>
            </div>
          </div>

          {/* COMPILED TRANSACTIONS TABLE */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                    <th className="py-2 px-3 min-w-[100px]">Date</th>
                    <th className="py-2 px-3 min-w-[130px]">Reference</th>
                    <th className="py-2 px-3 min-w-[240px]">Description</th>
                    <th className="py-2 px-3 text-right min-w-[120px]">Amount</th>
                    <th className="py-2 px-3 min-w-[200px]">Matched Invoices</th>
                    <th className="py-2 px-3 text-center min-w-[130px]">Match Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        <div className="max-w-sm mx-auto text-center space-y-1.5">
                          <AlertCircle className="w-5 h-5 text-gray-300 mx-auto" />
                          <p className="font-semibold text-gray-600 text-xs">No transactions match your search</p>
                          <p className="text-[11px] text-gray-400">Try clearing the search query or changing filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((txn, index) => {
                      const rowKey = `${txn.sourceRunId || 'run'}_${txn.id}_${index}`;
                      const isExpanded = expandedRowId === rowKey;
                      const hasMatches = txn.matchedInvoiceIds && txn.matchedInvoiceIds.length > 0;

                      return (
                        <React.Fragment key={rowKey}>
                          <tr
                            onClick={(e) => toggleRowExpand(rowKey, e)}
                            className={`cursor-pointer transition-colors ${
                              isExpanded
                                ? 'bg-[#FFF8F3] border-l-4 border-l-[#EA580C]'
                                : hasMatches
                                  ? 'bg-emerald-50/20 hover:bg-emerald-50/50'
                                  : 'hover:bg-gray-50'
                            }`}
                          >
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
                                  className="text-gray-400 hover:text-gray-700 cursor-pointer p-0.5 rounded"
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
                                  {txn.matchedInvoiceIds.map((invId, iIndex) => (
                                    <span
                                      key={`${rowKey}_inv_${invId}_${iIndex}`}
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
                                onClick={(e) => toggleRowExpand(rowKey, e)}
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

                          {/* EXPANDED DETAILS */}
                          {isExpanded && (
                            <tr className="bg-[#FFF8F3] border-b-2 border-orange-200/80">
                              <td colSpan={6} className="p-3.5 pl-8">
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
                                      <span className="text-[11px]">This transaction was included in the batch without invoice matching (GL Suspense).</span>
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

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={() => {
              onExportToErp(batch);
              onClose();
            }}
            className="px-4 py-2 bg-[#EA580C] hover:bg-[#D94E07] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Post & Sync to ERP</span>
          </button>
        </div>
      </div>
    </div>
  );
};

