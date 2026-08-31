import React, { useState, useMemo } from 'react';
import { 
  X, 
  Building2, 
  Calendar, 
  Lock, 
  CheckCircle2, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Printer, 
  Search,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  Split,
  Maximize2,
  Target
} from 'lucide-react';
import { ReconciliationRun, BankTransaction, MatchedInvoice } from '../types/reconciliation';
import { formatCurrency } from '../utils/formatters';
import { PdfStatementViewer, openStatementPdfInNewTab } from './PdfStatementViewer';

interface ViewReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  run: ReconciliationRun | null;
  onViewPdf: (run: ReconciliationRun) => void;
}

export const ViewReconciliationModal: React.FC<ViewReconciliationModalProps> = ({
  isOpen,
  onClose,
  run,
  onViewPdf
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTxnIds, setExpandedTxnIds] = useState<Set<string>>(
    new Set(['TXN-10021', 'TXN-10025'])
  );

  // PDF 2-Way View States: 'none' | 'split' (Option 1: Side-by-side with selected part sync) | 'modal' (Option 2: Full Document)
  const [pdfViewMode, setPdfViewMode] = useState<'none' | 'split' | 'modal'>('none');
  const [selectedPdfTxnRef, setSelectedPdfTxnRef] = useState<string | null>(null);
  const [isPdfDropdownOpen, setIsPdfDropdownOpen] = useState<boolean>(false);

  const filteredTransactions = useMemo(() => {
    if (!run || !run.transactions) return [];
    return [...run.transactions]
      .filter(txn => {
        const q = searchTerm.toLowerCase();
        return (
          txn.reference.toLowerCase().includes(q) ||
          txn.description.toLowerCase().includes(q) ||
          txn.bookingDate.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const aMatched = a.matchedInvoiceIds.length > 0 ? 1 : 0;
        const bMatched = b.matchedInvoiceIds.length > 0 ? 1 : 0;
        return bMatched - aMatched; // Reconciled on top
      });
  }, [run, searchTerm]);

  if (!isOpen || !run) return null;

  const toggleAccordion = (txnId: string) => {
    setExpandedTxnIds(prev => {
      const next = new Set(prev);
      if (next.has(txnId)) {
        next.delete(txnId);
      } else {
        next.add(txnId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedTxnIds(new Set(run.transactions.map(t => t.id)));
  };

  const collapseAll = () => {
    setExpandedTxnIds(new Set());
  };

  return (
    <div className="fixed inset-0 z-50 p-5 bg-black/60 backdrop-blur-xs flex items-center justify-center animate-in fade-in duration-150 font-sans">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col w-full h-full overflow-hidden">
        {/* 15. TOP BAR OF VIEW RECONCILIATION MODAL */}
        <div className="px-6 py-3.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-100 border border-orange-200 text-[#EA580C] flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 tracking-tight">
                  Reconciliation Details
                </h2>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  run.status === 'Locked'
                    ? 'bg-gray-100 text-gray-700 border-gray-300'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {run.status === 'Locked' ? <Lock className="w-2.5 h-2.5" /> : <CheckCircle2 className="w-2.5 h-2.5" />}
                  <span>{run.status || 'Saved'}</span>
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Read-only audit record and statement match breakdown
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* DIRECT VIEW BANK STATEMENT IN TARGET BLANK BUTTON */}
            <button
              type="button"
              onClick={() => {
                openStatementPdfInNewTab({
                  fileName: run.statementFileName,
                  bankName: run.bankName,
                  accountNumber: run.accountNumber,
                  periodFrom: run.statementPeriod.from,
                  periodTo: run.statementPeriod.to,
                  transactions: run.transactions,
                  highlightTxnRef: selectedPdfTxnRef
                });
              }}
              className="px-3 py-1.5 bg-white hover:bg-orange-50 text-[#EA580C] border border-orange-300 rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              title="View Bank Statement in new tab (target _blank)"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#EA580C]" />
              <span>View Bank Statement</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-md border border-gray-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs hidden sm:flex"
            >
              <Printer className="w-3.5 h-3.5 text-gray-500" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors cursor-pointer ml-2"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 16. SUMMARY INFORMATION CARDS & WORKSPACE */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#F6F8FA]">
          <div className="max-w-[1700px] mx-auto space-y-5">
            <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-xs shadow-2xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Reconciliation ID</span>
                <div className="font-mono font-bold text-gray-900 text-sm mt-0.5">{run.id}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Reconciliation Date</span>
                <div className="font-mono font-bold text-gray-900 text-sm mt-0.5">{run.reconciliationDate || run.createdAt}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Bank</span>
                <div className="font-bold text-gray-900 text-sm mt-0.5 truncate" title={run.bankName}>
                  {run.bankName}
                </div>
                <div className="text-[10px] font-mono text-gray-500">{run.accountNumber}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Statement Period</span>
                <div className="font-mono font-bold text-gray-900 text-xs mt-0.5">
                  {run.statementPeriod.from} → {run.statementPeriod.to}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Reconciliation Amount</span>
                <div className="font-mono font-bold text-gray-900 text-sm mt-0.5">
                  {formatCurrency(run.totalAmount, run.currency)}
                </div>
              </div>
            </div>

            {/* Quick Filter & Accordion Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative max-w-sm flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search statement reference or description..."
                  className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#EA580C] focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPdfViewMode(pdfViewMode === 'split' ? 'none' : 'split');
                    if (pdfViewMode !== 'split' && !selectedPdfTxnRef && run.transactions.length > 0) {
                      setSelectedPdfTxnRef(run.transactions[0].reference);
                    }
                  }}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs border ${
                    pdfViewMode === 'split'
                      ? 'bg-orange-50 text-[#EA580C] border-orange-300 hover:bg-orange-100'
                      : 'bg-white text-gray-700 hover:text-gray-900 border-gray-300 hover:bg-gray-50'
                  }`}
                  title={pdfViewMode === 'split' ? 'Hide Bank Statement' : 'Show Bank Statement'}
                >
                  {pdfViewMode === 'split' ? (
                    <EyeOff className="w-3.5 h-3.5 text-[#EA580C]" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-[#EA580C]" />
                  )}
                  <span>{pdfViewMode === 'split' ? 'Hide Bank Statement' : 'Show Bank Statement'}</span>
                </button>

                <button
                  type="button"
                  onClick={expandAll}
                  className="px-2.5 py-1 text-xs text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded font-medium cursor-pointer"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="px-2.5 py-1 text-xs text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded font-medium cursor-pointer"
                >
                  Collapse All
                </button>
              </div>
            </div>

            {/* 17. VIEW STATEMENT (Main Workspace with Optional Split Mode) */}
            <div className={`grid grid-cols-1 ${pdfViewMode === 'split' ? 'lg:grid-cols-12 gap-5' : ''} items-start`}>
              {/* Statement Table Column */}
              <div className={`${pdfViewMode === 'split' ? 'lg:col-span-7' : 'w-full'} bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs transition-all duration-200`}>
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#EA580C]" />
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                      Bank Statement
                    </h3>
                    <span className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-600 font-mono">
                      {run.transactions.length} line items
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 font-mono">
                    File: <strong className="text-gray-800">{run.statementFileName}</strong> ({run.statementFileSize})
                  </span>
                </div>

                {/* Statement Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4">Reference</th>
                        <th className="py-2.5 px-4">Description</th>
                        <th className="py-2.5 px-4 text-right">Amount</th>
                        <th className="py-2.5 px-4">Matched Invoices</th>
                        <th className="py-2.5 px-4 text-center">Match Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredTransactions.map((txn) => {
                        const isExpanded = expandedTxnIds.has(txn.id);
                        const isMatched = txn.matchedInvoiceIds.length > 0;
                        const isSelectedPdf = selectedPdfTxnRef === txn.reference;

                        // Match invoices lookup preserving matched order
                        const matchedInvoicesForTxn = txn.matchedInvoiceIds
                          .map(id => (run.invoices || []).find(inv => inv.id === id))
                          .filter((inv): inv is MatchedInvoice => !!inv);
                        const totalMatchedAmount = matchedInvoicesForTxn.reduce((sum, inv) => sum + inv.amount, 0);
                        const variance = Math.abs(txn.amount - totalMatchedAmount);

                        return (
                          <React.Fragment key={txn.id}>
                            {/* 18. STATEMENT ACCORDION ROW (Collapsed state) */}
                            <tr
                              onClick={() => {
                                toggleAccordion(txn.id);
                                setSelectedPdfTxnRef(txn.reference);
                              }}
                              className={`cursor-pointer transition-colors ${
                                isSelectedPdf && pdfViewMode === 'split'
                                  ? 'bg-orange-50/90 ring-1 ring-orange-300'
                                  : isExpanded
                                    ? 'bg-[#FFF8F3] border-l-4 border-l-[#EA580C]'
                                    : isMatched
                                      ? 'bg-emerald-50/20 hover:bg-emerald-50/50'
                                      : 'hover:bg-gray-50'
                              }`}
                            >
                              {/* Date */}
                              <td className="py-3 px-4 font-mono text-gray-700 whitespace-nowrap">
                                {txn.bookingDate}
                              </td>

                              {/* Reference */}
                              <td className="py-3 px-4 font-mono font-bold text-gray-900 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className={isSelectedPdf && pdfViewMode === 'split' ? 'text-[#EA580C]' : ''}>
                                    {txn.reference}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPdfTxnRef(txn.reference);
                                      setPdfViewMode('split');
                                    }}
                                    title="View this line in Statement PDF (Option 1)"
                                    className="p-0.5 hover:bg-orange-100 text-gray-400 hover:text-[#EA580C] rounded transition-colors"
                                  >
                                    <FileText className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>

                              {/* Description */}
                              <td className="py-3 px-4 font-medium text-gray-800">
                                {txn.description}
                              </td>

                              {/* Amount */}
                              <td className="py-3 px-4 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                                {formatCurrency(txn.amount)}
                              </td>

                              {/* Matched Invoices */}
                              <td className="py-3 px-4">
                                {isMatched ? (
                                  <div className="flex flex-wrap items-center gap-1 max-w-[220px]">
                                    {matchedInvoicesForTxn.map((inv) => (
                                      <span 
                                        key={inv.id}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-900 border border-emerald-200 shrink-0"
                                        title={`${inv.invoiceNumber} • ${inv.entityName} (${formatCurrency(inv.amount)})`}
                                      >
                                        <FileText className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                        <span>{inv.invoiceNumber}</span>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-gray-400 italic">None</span>
                                )}
                              </td>

                              {/* Match Status */}
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  {isMatched ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Matched</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                      Unmatched
                                    </span>
                                  )}
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* 19. STATEMENT ACCORDION DETAILS (Expanded state) */}
                            {isExpanded && (
                              <tr className="bg-[#FFF8F3] border-b-2 border-orange-200/80">
                                <td colSpan={6} className="p-4 pl-6">
                                  <div className="bg-white border border-orange-200/90 rounded-xl p-4 shadow-sm space-y-3 ring-1 ring-orange-100/80">
                                    <div className="flex items-center justify-between border-b border-orange-100 pb-2.5">
                                      <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-[#EA580C]" />
                                        <span className="text-xs font-bold text-gray-900">
                                          Matched Invoices Breakdown ({matchedInvoicesForTxn.length})
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3 text-xs font-mono">
                                        <div className="bg-orange-50/80 px-2 py-0.5 rounded border border-orange-200">
                                          <span className="text-gray-500 font-sans">Statement: </span>
                                          <strong className="text-gray-900">{formatCurrency(txn.amount)}</strong>
                                        </div>
                                        <div className="bg-emerald-50/80 px-2 py-0.5 rounded border border-emerald-200">
                                          <span className="text-gray-500 font-sans">Matched: </span>
                                          <strong className="text-emerald-700">{formatCurrency(totalMatchedAmount)}</strong>
                                        </div>
                                        {variance > 0 && (
                                          <div className="bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200">
                                            <span className="text-gray-500 font-sans">Variance: </span>
                                            <strong className="text-amber-700">{formatCurrency(variance)}</strong>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {matchedInvoicesForTxn.length === 0 ? (
                                      <div className="py-3 text-center text-xs text-gray-400">
                                        No invoices linked to this statement line.
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        {matchedInvoicesForTxn.map((inv) => (
                                          <div
                                            key={inv.id}
                                            className="flex items-center justify-between p-2.5 bg-gray-50/80 rounded border border-gray-200 text-xs"
                                          >
                                            <div className="flex items-center gap-3">
                                              <span className="font-mono font-bold text-gray-900">
                                                {inv.invoiceNumber}
                                              </span>
                                              <span className="text-gray-500 font-mono text-[11px]">
                                                {inv.date}
                                              </span>
                                              <span className="text-gray-700 font-medium">
                                                {inv.entityName}
                                              </span>
                                            </div>
                                            <div className="font-mono font-bold text-gray-900">
                                              {formatCurrency(inv.amount)}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
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

              {/* OPTION 1: INSTANT SPLIT PDF VIEW PANEL */}
              {pdfViewMode === 'split' && (
                <div className="lg:col-span-5 sticky top-16 z-10 self-start h-[650px] bg-white border border-gray-200 rounded-xl overflow-hidden shadow-md flex flex-col animate-in fade-in zoom-in-95 duration-150">
                  <PdfStatementViewer
                    fileName={run.statementFileName}
                    bankName={run.bankName}
                    accountNumber={run.accountNumber}
                    periodFrom={run.statementPeriod.from}
                    periodTo={run.statementPeriod.to}
                    transactions={run.transactions}
                    highlightTxnRef={selectedPdfTxnRef}
                    mode="split"
                    onClose={() => setPdfViewMode('none')}
                    onSwitchToModal={() => setPdfViewMode('modal')}
                    onSelectTxn={(ref) => setSelectedPdfTxnRef(ref)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
          <div className="text-gray-500">
            Reconciliation status: <strong className="text-gray-800">{run.status || 'Saved'}</strong> • Generated from <strong className="text-gray-800">{run.statementFileName}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-lg transition-colors cursor-pointer"
          >
            Close View
          </button>
        </div>

        {/* OPTION 2: FULL SCREEN PDF MODAL OVERLAY */}
        {pdfViewMode === 'modal' && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
            <div className="w-full max-w-5xl h-[92vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
              <PdfStatementViewer
                fileName={run.statementFileName}
                bankName={run.bankName}
                accountNumber={run.accountNumber}
                periodFrom={run.statementPeriod.from}
                periodTo={run.statementPeriod.to}
                transactions={run.transactions}
                highlightTxnRef={selectedPdfTxnRef}
                mode="modal"
                onClose={() => setPdfViewMode('none')}
                onSelectTxn={(ref) => setSelectedPdfTxnRef(ref)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
