import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  UploadCloud, 
  FileText, 
  Trash2, 
  Calendar, 
  Building2, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  GripVertical, 
  Search, 
  Lock, 
  Save, 
  Sparkles,
  ArrowRight,
  Info,
  Check,
  ArrowDownToLine,
  Eye,
  Maximize2,
  ExternalLink,
  Split,
  Target,
  Loader2,
  Cpu,
  Zap,
  FileCheck
} from 'lucide-react';
import { 
  BankTransaction, 
  MatchedInvoice, 
  ReconciliationRun, 
  BankAccountOption 
} from '../types/reconciliation';
import { BANK_ACCOUNTS, INITIAL_TRANSACTIONS, INITIAL_INVOICES } from '../data/mockData';
import { formatCurrency } from '../utils/formatters';
import { DatePicker } from './DatePicker';
import { PdfStatementViewer, openStatementPdfInNewTab } from './PdfStatementViewer';

interface AddNewReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (run: ReconciliationRun, isLocked: boolean) => void;
}

interface PendingMatch {
  txnId: string;
  invoices: MatchedInvoice[];
  txn: BankTransaction;
}

export const AddNewReconciliationModal: React.FC<AddNewReconciliationModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  // Top fields state
  const [reconciliationDate, setReconciliationDate] = useState<string>('24-Aug-2026');
  const [selectedBankId, setSelectedBankId] = useState<string>('hsbc-corp');
  const [periodFrom, setPeriodFrom] = useState<string>('01-Aug-2026');
  const [periodTo, setPeriodTo] = useState<string>('31-Aug-2026');

  // File Upload State
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: string;
    period: string;
  } | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Auto-Match Processing Modal State
  const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false);
  const [processingStage, setProcessingStage] = useState<'parsing' | 'matching' | 'finalizing' | 'done'>('parsing');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [stagedFile, setStagedFile] = useState<{
    name: string;
    size: string;
    period: string;
  } | null>(null);

  // Reset state when modal is opened
  useEffect(() => {
    if (isOpen) {
      setUploadedFile(null);
      setStagedFile(null);
      setIsProcessingModalOpen(false);
      setProcessingStage('parsing');
      setProcessingProgress(0);
      setTransactions(INITIAL_TRANSACTIONS);
      setInvoices(INITIAL_INVOICES);
      setExpandedTxnIds(new Set(['TXN-10021', 'TXN-10025']));
      setPendingMatch(null);
      setTxnSearch('');
      setInvoiceSearch('');
      setInvoiceFilter('unmatched');
      setSelectedTxnIds(new Set());
      setSelectedInvoiceIds(new Set());
      setIsDirty(false);
      setShowDiscardConfirm(false);
    }
  }, [isOpen]);

  // Transactions & Invoices matching workspace state
  const [transactions, setTransactions] = useState<BankTransaction[]>(INITIAL_TRANSACTIONS);
  const [invoices, setInvoices] = useState<MatchedInvoice[]>(INITIAL_INVOICES);

  // Expanded accordion transaction IDs
  const [expandedTxnIds, setExpandedTxnIds] = useState<Set<string>>(
    new Set(['TXN-10021', 'TXN-10025'])
  );

  // Drag & drop state for invoice matching
  const [draggedInvoices, setDraggedInvoices] = useState<MatchedInvoice[]>([]);
  const [dragOverTxnId, setDragOverTxnId] = useState<string | null>(null);

  // Pending Match confirmation popup / drawer
  const [pendingMatch, setPendingMatch] = useState<PendingMatch | null>(null);

  // Search & Filters in workspace
  const [txnSearch, setTxnSearch] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState<'unmatched' | 'matched' | 'all'>('unmatched');

  // Selection sets
  const [selectedTxnIds, setSelectedTxnIds] = useState<Set<string>>(new Set());
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());

  // Dirty state tracking for Cancel confirmation
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // PDF Viewer State: 'none' | 'split' (instant sync with selected line) | 'modal' (full window)
  const [pdfViewMode, setPdfViewMode] = useState<'none' | 'split' | 'modal'>('none');
  const [selectedPdfTxnRef, setSelectedPdfTxnRef] = useState<string | null>('ACH-889212');
  const [isPdfDropdownOpen, setIsPdfDropdownOpen] = useState(false);

  const currentBank: BankAccountOption = 
    BANK_ACCOUNTS.find(b => b.id === selectedBankId) || BANK_ACCOUNTS[0];

  // Toggle accordion expansion for a transaction row
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

  // Drag handlers for Invoices (Single or Multi-Select Batch)
  const handleDragStart = (e: React.DragEvent, inv: MatchedInvoice) => {
    let toDrag: MatchedInvoice[] = [inv];
    if (selectedInvoiceIds.has(inv.id)) {
      const allSelected = invoices.filter(i => selectedInvoiceIds.has(i.id) && !i.matchedBankTxnId);
      if (allSelected.length > 0) {
        toDrag = allSelected;
      }
    } else {
      setSelectedInvoiceIds(new Set([inv.id]));
    }
    setDraggedInvoices(toDrag);
    e.dataTransfer.setData('text/plain', JSON.stringify(toDrag));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedInvoices([]);
    setDragOverTxnId(null);
  };

  // Drop handlers for Bank Transactions
  const handleTxnDragOver = (e: React.DragEvent, txnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTxnId !== txnId) {
      setDragOverTxnId(txnId);
    }
  };

  const handleTxnDragLeave = (e: React.DragEvent, txnId: string) => {
    if (dragOverTxnId === txnId) {
      setDragOverTxnId(null);
    }
  };

  const handleTxnDrop = (e: React.DragEvent, targetTxn: BankTransaction) => {
    e.preventDefault();
    setDragOverTxnId(null);

    let invsToMatch = draggedInvoices;
    if (!invsToMatch || invsToMatch.length === 0) {
      try {
        const raw = e.dataTransfer.getData('text/plain');
        if (raw) {
          const parsed = JSON.parse(raw);
          invsToMatch = Array.isArray(parsed) ? parsed : [parsed];
        }
      } catch (err) {
        console.error('Error parsing dropped invoice(s)', err);
      }
    }

    if (!invsToMatch || invsToMatch.length === 0) return;

    // Open Match Confirmation with all dropped invoices
    setPendingMatch({
      txnId: targetTxn.id,
      invoices: invsToMatch,
      txn: targetTxn
    });
  };

  // Confirm Match action (handles multiple dropped invoices)
  const handleConfirmMatch = () => {
    if (!pendingMatch) return;
    const { txnId, invoices: droppedInvs } = pendingMatch;
    const droppedIds = droppedInvs.map(i => i.id);

    setIsDirty(true);

    // 1. Update target transaction
    setTransactions(prevTxns =>
      prevTxns.map(t => {
        if (t.id === txnId) {
          const updatedMatchedIds = Array.from(new Set([...t.matchedInvoiceIds, ...droppedIds]));
          // Calculate sum of all matched invoices
          const allMatchedInvoices = invoices.filter(inv => 
            updatedMatchedIds.includes(inv.id) || droppedIds.includes(inv.id)
          );
          const totalMatchedAmount = allMatchedInvoices.reduce((sum, inv) => sum + inv.amount, 0);
          const variance = Math.abs(t.amount - totalMatchedAmount);

          return {
            ...t,
            matchedInvoiceIds: updatedMatchedIds,
            status: (updatedMatchedIds.length > 1 ? 'Multi-Invoice' : 'Exact Match') as any,
            matchConfidence: 100,
            variance: variance,
            matchReasons: [
              ...t.matchReasons.filter(r => !r.includes('Match')),
              ...droppedInvs.map(inv => `Matched with Invoice ${inv.invoiceNumber} (${formatCurrency(inv.amount)})`)
            ]
          };
        }
        return t;
      })
    );

    // 2. Update invoice status
    setInvoices(prevInvoices =>
      prevInvoices.map(inv => {
        if (droppedIds.includes(inv.id)) {
          return {
            ...inv,
            matchedBankTxnId: txnId,
            status: droppedIds.length > 1 ? 'Multi-Invoice' : 'Exact Match',
            matchConfidence: 100
          };
        }
        return inv;
      })
    );

    // Remove matched invoices from current selection
    setSelectedInvoiceIds(prev => {
      const next = new Set(prev);
      droppedIds.forEach(id => next.delete(id));
      return next;
    });

    // Automatically expand accordion for this transaction
    setExpandedTxnIds(prev => new Set([...prev, txnId]));
    setPendingMatch(null);
  };

  // Cancel pending match
  const handleCancelMatch = () => {
    setPendingMatch(null);
  };

  // Remove individual invoice from pending match before confirmation
  const handleRemoveFromPendingMatch = (invoiceId: string) => {
    setPendingMatch(prev => {
      if (!prev) return null;
      const updated = prev.invoices.filter(i => i.id !== invoiceId);
      if (updated.length === 0) return null;
      return {
        ...prev,
        invoices: updated
      };
    });
  };

  // Remove matched invoice from a transaction
  const handleUnmatchInvoice = (txnId: string, invoiceId: string) => {
    setIsDirty(true);

    // 1. Remove from transaction
    setTransactions(prevTxns =>
      prevTxns.map(t => {
        if (t.id === txnId) {
          const nextMatchedIds = t.matchedInvoiceIds.filter(id => id !== invoiceId);
          const remainingInvoices = invoices.filter(inv => nextMatchedIds.includes(inv.id));
          const totalMatched = remainingInvoices.reduce((sum, inv) => sum + inv.amount, 0);
          const variance = Math.abs(t.amount - totalMatched);

          return {
            ...t,
            matchedInvoiceIds: nextMatchedIds,
            status: (nextMatchedIds.length === 0 ? 'Unmatched' : nextMatchedIds.length === 1 ? 'Exact Match' : 'Multi-Invoice') as any,
            variance: nextMatchedIds.length === 0 ? t.amount : variance,
            matchConfidence: nextMatchedIds.length === 0 ? 0 : t.matchConfidence
          };
        }
        return t;
      })
    );

    // 2. Free up invoice
    setInvoices(prevInvoices =>
      prevInvoices.map(inv => {
        if (inv.id === invoiceId) {
          return {
            ...inv,
            matchedBankTxnId: undefined,
            status: 'Unmatched',
            matchConfidence: 0
          };
        }
        return inv;
      })
    );
  };

  // Helper: Auto-Match All suggestions
  const handleAutoMatchAll = () => {
    setIsDirty(true);
    // Link matching amounts
    let currentInvs = [...invoices];
    const newTxns = transactions.map(txn => {
      if (txn.matchedInvoiceIds.length > 0) return txn;
      const matchingInv = currentInvs.find(inv => !inv.matchedBankTxnId && inv.amount === txn.amount);
      if (matchingInv) {
        matchingInv.matchedBankTxnId = txn.id;
        matchingInv.status = 'Exact Match';
        matchingInv.matchConfidence = 100;
        return {
          ...txn,
          matchedInvoiceIds: [matchingInv.id],
          status: 'Exact Match' as const,
          matchConfidence: 100,
          variance: 0.00
        };
      }
      return txn;
    });

    setTransactions(newTxns);
    setInvoices(currentInvs);
  };

  // Orchestrate statement upload & auto-match processing modal simulation
  const initiateStatementUpload = (fileData: { name: string; size: string; period: string }) => {
    setStagedFile(fileData);
    setIsProcessingModalOpen(true);
    setProcessingStage('parsing');
    setProcessingProgress(20);

    const timer1 = setTimeout(() => {
      setProcessingStage('matching');
      setProcessingProgress(60);
    }, 450);

    const timer2 = setTimeout(() => {
      setProcessingStage('finalizing');
      setProcessingProgress(90);
    }, 950);

    const timer3 = setTimeout(() => {
      setProcessingStage('done');
      setProcessingProgress(100);
    }, 1450);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  };

  const handleApplyAutoMatchAndOpen = () => {
    if (stagedFile) {
      setUploadedFile(stagedFile);
    }
    // Apply auto matching
    setTransactions(INITIAL_TRANSACTIONS);
    setInvoices(INITIAL_INVOICES);
    setIsProcessingModalOpen(false);
    setIsDirty(true);
  };

  const handleSkipAutoMatch = () => {
    if (stagedFile) {
      setUploadedFile(stagedFile);
    }
    // Clear all pre-matches for raw manual workspace
    setTransactions(prev => prev.map(t => ({
      ...t,
      matchedInvoiceIds: [],
      status: 'Unmatched',
      matchConfidence: 0,
      variance: t.amount,
      matchReasons: []
    })));
    setInvoices(prev => prev.map(inv => ({
      ...inv,
      matchedBankTxnId: undefined,
      status: 'Unmatched',
      matchConfidence: 0
    })));
    setIsProcessingModalOpen(false);
    setIsDirty(true);
  };

  // Handle local file selection
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      initiateStatementUpload({
        name: file.name,
        size: sizeMb === '0.0 MB' ? '2.4 MB' : sizeMb,
        period: `${periodFrom} → ${periodTo}`
      });
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      initiateStatementUpload({
        name: file.name,
        size: sizeMb === '0.0 MB' ? '2.4 MB' : sizeMb,
        period: `${periodFrom} → ${periodTo}`
      });
    }
  };

  // Calculations for dynamic summary bar
  const totalTransactionsCount = transactions.length;
  const matchedTxnCount = transactions.filter(t => t.matchedInvoiceIds.length > 0).length;
  const unmatchedTxnCount = totalTransactionsCount - matchedTxnCount;

  const unmatchedInvoicesCount = invoices.filter(inv => !inv.matchedBankTxnId).length;
  const matchedInvoicesCount = invoices.filter(inv => !!inv.matchedBankTxnId).length;

  const statementTotalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const matchedTotalAmount = transactions
    .filter(t => t.matchedInvoiceIds.length > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const totalVariance = Math.abs(statementTotalAmount - matchedTotalAmount);

  // Filtered views: Unmatched ("Drop Invoice" targets) on top, Matched placed at the end
  const filteredTransactions = useMemo(() => {
    return [...transactions]
      .filter(t => {
        if (!txnSearch) return true;
        const term = txnSearch.toLowerCase();
        return (
          t.reference.toLowerCase().includes(term) ||
          t.description.toLowerCase().includes(term) ||
          t.amount.toString().includes(term)
        );
      })
      .sort((a, b) => {
        const aMatched = a.matchedInvoiceIds.length > 0 ? 1 : 0;
        const bMatched = b.matchedInvoiceIds.length > 0 ? 1 : 0;
        return aMatched - bMatched; // 0 (unmatched) on top, 1 (matched) at the end
      });
  }, [transactions, txnSearch]);

  const filteredInvoices = invoices.filter(inv => {
    if (invoiceFilter === 'unmatched' && inv.matchedBankTxnId) return false;
    if (invoiceFilter === 'matched' && !inv.matchedBankTxnId) return false;
    if (!invoiceSearch) return true;
    const term = invoiceSearch.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(term) ||
      inv.entityName.toLowerCase().includes(term) ||
      inv.amount.toString().includes(term)
    );
  });

  // Save / Save & Lock handlers
  const handleSaveAction = (isLocked: boolean) => {
    const newRunId = `REC-000${Math.floor(100 + Math.random() * 900)}`;
    const newRun: ReconciliationRun = {
      id: newRunId,
      refNumber: `Ref #${newRunId.split('-')[1]}`,
      reconciliationDate: reconciliationDate,
      submissionNumber: parseInt(newRunId.split('-')[1], 10) || 125,
      bankName: currentBank.bankName,
      accountNumber: currentBank.accountNumber,
      currency: 'USD',
      statementPeriod: {
        from: periodFrom,
        to: periodTo
      },
      statementFileName: uploadedFile ? uploadedFile.name : 'HSBC_August_2026.pdf',
      statementFileSize: uploadedFile ? uploadedFile.size : '2.4 MB',
      totalTransactions: totalTransactionsCount,
      matchedCount: matchedTxnCount,
      suggestedCount: 0,
      unmatchedCount: unmatchedTxnCount,
      manualMatchedCount: 0,
      invoicesTotalCount: invoices.length,
      invoicesReconciledCount: invoices.filter(i => i.matchedBankTxnId).length,
      totalAmount: statementTotalAmount,
      variance: totalVariance,
      confidence: matchedTxnCount === totalTransactionsCount ? 100 : Math.round((matchedTxnCount / totalTransactionsCount) * 100),
      status: isLocked ? 'Locked' : 'Saved',
      credits: statementTotalAmount,
      debits: 68900.00,
      openingBalance: 450000.00,
      closingBalance: 450000.00 + statementTotalAmount,
      createdAt: reconciliationDate,
      updatedAt: reconciliationDate,
      reconciledBy: 'Dharmendra Joshi (Lead Controller)',
      transactions: transactions,
      invoices: invoices
    };

    onSave(newRun, isLocked);
    onClose();
  };

  const handleCancelClick = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 p-5 bg-black/60 backdrop-blur-xs flex items-center justify-center animate-in fade-in duration-150 font-sans">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col w-full h-full overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-gray-50 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-100 border border-orange-200 flex items-center justify-center text-[#EA580C] font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 tracking-tight">
                Add New Reconciliation
              </h2>
              <p className="text-[11px] text-gray-500">
                Configure statement period, upload statement file, and drag invoices to reconcile transactions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCancelClick}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      {/* Modal Scrollable Workspace */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#F6F8FA]">
        <div className="max-w-[1700px] mx-auto space-y-5">
          {/* 4. RECONCILIATION INFORMATION & 5. STATEMENT UPLOAD */}
          {uploadedFile ? (
            /* Compact Header View when statement is uploaded to maximize workspace screen real-estate */
            <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Left: Compact Reconciliation Info fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                  <div className="bg-gray-50/70 border border-gray-100 rounded-lg p-2">
                    <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Bank Name
                    </span>
                    <div className="text-xs font-bold text-gray-900 mt-1 truncate" title={`${currentBank.bankName} (${currentBank.accountNumber})`}>
                      {currentBank.bankName} <span className="font-mono text-gray-600 font-normal">({currentBank.accountNumber})</span>
                    </div>
                  </div>

                  <div className="bg-gray-50/70 border border-gray-100 rounded-lg p-2">
                    <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Statement Period
                    </span>
                    <div className="text-xs font-bold text-gray-900 mt-1 font-mono flex items-center gap-1.5">
                      <span>{periodFrom}</span>
                      <span className="text-gray-400 font-normal">→</span>
                      <span>{periodTo}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Compact Uploaded File Badge with in-badge View PDF & Remove action icons */}
                <div className="flex items-center justify-between lg:justify-end gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 lg:border-l border-gray-200 lg:pl-3">
                  <div className="flex items-center gap-2 bg-orange-50/70 border border-orange-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
                    <FileText className="w-4 h-4 text-[#EA580C] shrink-0" />
                    <div className="min-w-0 pr-1">
                      <div className="font-mono text-xs font-bold text-gray-900 truncate max-w-[130px] sm:max-w-[170px]">
                        {uploadedFile.name}
                      </div>
                      <div className="text-[10px] text-gray-500 font-sans">
                        {uploadedFile.size}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 border-l border-orange-200/80 pl-1.5 ml-0.5">
                      {/* View PDF in new tab icon */}
                      <button
                        type="button"
                        onClick={() => {
                          openStatementPdfInNewTab({
                            fileName: uploadedFile.name,
                            bankName: currentBank.bankName,
                            accountNumber: currentBank.accountNumber,
                            periodFrom: periodFrom,
                            periodTo: periodTo,
                            transactions: transactions,
                            highlightTxnRef: selectedPdfTxnRef
                          });
                        }}
                        className="p-1 hover:bg-orange-200/70 text-[#EA580C] hover:text-[#C2410C] rounded transition-colors cursor-pointer shrink-0 flex items-center justify-center group"
                        title="View PDF Statement in new tab (target _blank)"
                      >
                        <ExternalLink className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      </button>

                      {/* Remove file icon inside selected element */}
                      <button
                        type="button"
                        onClick={() => { setUploadedFile(null); setPdfViewMode('none'); setIsDirty(true); }}
                        className="p-1 hover:bg-red-100 text-gray-400 hover:text-red-600 rounded transition-colors cursor-pointer shrink-0 flex items-center justify-center group"
                        title="Remove / Change File"
                      >
                        <Trash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Full expanded form before file upload */
            <>
              {/* 4. RECONCILIATION INFORMATION */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>Reconciliation Information</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Bank Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                      Bank Name
                    </label>
                    <div className="relative">
                      <select
                        value={selectedBankId}
                        onChange={(e) => { setSelectedBankId(e.target.value); setIsDirty(true); }}
                        className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] appearance-none cursor-pointer"
                      >
                        {BANK_ACCOUNTS.map((bank) => (
                          <option key={bank.id} value={bank.id}>
                            {bank.bankName} ({bank.accountNumber})
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400 text-xs">
                        ▼
                      </div>
                    </div>
                  </div>

                  {/* Statement Date Range */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                      Statement Date Range
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <DatePicker
                        value={periodFrom}
                        onChange={(val) => { setPeriodFrom(val); setIsDirty(true); }}
                        placeholder="01-Aug-2026"
                        className="w-full"
                        inputClassName="w-full py-2 px-2.5 text-xs"
                      />
                      <DatePicker
                        value={periodTo}
                        onChange={(val) => { setPeriodTo(val); setIsDirty(true); }}
                        placeholder="31-Aug-2026"
                        className="w-full"
                        inputClassName="w-full py-2 px-2.5 text-xs"
                        align="right"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. STATEMENT UPLOAD */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
                  Upload Bank Statement
                </label>

                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={handleFileDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                    isDraggingFile 
                      ? 'border-[#EA580C] bg-orange-50/50' 
                      : 'border-gray-300 hover:border-[#EA580C] bg-white'
                  }`}
                >
                  <input
                    type="file"
                    id="modal-add-statement-file"
                    accept=".xlsx,.csv,.pdf,.ofx"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center">
                    <UploadCloud className="w-8 h-8 mx-auto text-[#EA580C] mb-2" />
                    <div className="text-xs font-bold text-gray-800">
                      Drag & Drop Bank Statement
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      or <label htmlFor="modal-add-statement-file" className="text-[#EA580C] font-semibold underline cursor-pointer">Browse File</label>
                    </div>
                    <div className="text-[11px] font-mono text-gray-400 mt-1.5 mb-3">
                      Supported: .xlsx, .csv, .pdf, .ofx
                    </div>

                    {/* Quick Demo Upload Button */}
                    <button
                      type="button"
                      onClick={() => {
                        initiateStatementUpload({
                          name: 'HSBC_August_2026.pdf',
                          size: '2.4 MB',
                          period: `${periodFrom} → ${periodTo}`
                        });
                      }}
                      className="px-3.5 py-1.5 bg-white hover:bg-orange-50 text-[#EA580C] border border-orange-300 hover:border-[#EA580C] text-xs font-bold rounded-md shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Upload Demo Statement (HSBC_August_2026.pdf)</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {!uploadedFile ? (
            /* Empty placeholder before statement upload */
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-orange-100/80 border border-orange-200 flex items-center justify-center text-[#EA580C]">
                <Layers className="w-6 h-6" />
              </div>
              <div className="max-w-md">
                <h3 className="text-sm font-bold text-gray-900">
                  Upload Bank Statement to Display Transactions & Invoices
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Please upload or select your bank statement above (.xlsx, .csv, .pdf, or .ofx). Once uploaded, the matching tables and reconciliation summary will automatically display.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUploadedFile({
                    name: 'HSBC_August_2026.pdf',
                    size: '2.4 MB',
                    period: `${periodFrom} → ${periodTo}`
                  });
                  setIsDirty(true);
                }}
                className="mt-1 px-4 py-2 bg-[#EA580C] hover:bg-[#D94E07] text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Upload Statement to Begin</span>
              </button>
            </div>
          ) : (
            <>
              {/* 13. RECONCILIATION TOTALS SUMMARY BAR */}
              <div className="bg-white border border-gray-200 text-gray-900 rounded-xl p-3.5 shadow-sm grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs animate-in fade-in duration-200">
                <div className="border-r border-gray-200 pr-2">
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Transactions</span>
                  <div className="text-base font-bold font-mono text-gray-900 mt-0.5">{totalTransactionsCount}</div>
                </div>
                <div className="border-r border-gray-200 pr-2">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Matched</span>
                  <div className="text-base font-bold font-mono text-emerald-600 mt-0.5">{matchedTxnCount}</div>
                </div>
                <div className="border-r border-gray-200 pr-2">
                  <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">Unmatched</span>
                  <div className="text-base font-bold font-mono text-amber-600 mt-0.5">{unmatchedTxnCount}</div>
                </div>
                <div className="border-r border-gray-200 pr-2">
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Statement Amount</span>
                  <div className="text-base font-bold font-mono text-gray-900 mt-0.5">{formatCurrency(statementTotalAmount)}</div>
                </div>
                <div className="border-r border-gray-200 pr-2">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Matched Amount</span>
                  <div className="text-base font-bold font-mono text-emerald-600 mt-0.5">{formatCurrency(matchedTotalAmount)}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Variance</span>
                  <div className={`text-base font-bold font-mono mt-0.5 ${totalVariance === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {formatCurrency(totalVariance)}
                  </div>
                </div>
              </div>

              {/* 11. MATCH CONFIRMATION MODAL / DRAWER (When dragging invoice(s)) */}
              {pendingMatch && (() => {
                const totalDroppedAmount = pendingMatch.invoices.reduce((s, inv) => s + inv.amount, 0);
                const variance = Math.abs(pendingMatch.txn.amount - totalDroppedAmount);

                return (
                  <div className="bg-orange-50/95 border-2 border-[#EA580C] rounded-xl p-4 shadow-lg animate-in zoom-in-95 duration-150 space-y-3">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-orange-200 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-[#EA580C] text-white rounded-md shadow-2xs">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                            <span>Match Confirmation</span>
                            <span className="bg-[#EA580C] text-white text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                              {pendingMatch.invoices.length} {pendingMatch.invoices.length > 1 ? 'Invoices' : 'Invoice'}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-600 mt-0.5">
                            Drop match onto Statement transaction <strong className="font-mono text-gray-900">{pendingMatch.txn.reference}</strong> ({pendingMatch.txn.bookingDate})
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        <button
                          type="button"
                          onClick={handleCancelMatch}
                          className="px-3.5 py-1.5 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-md border border-gray-300 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmMatch}
                          className="px-4 py-1.5 bg-[#EA580C] hover:bg-[#D94E07] text-white text-xs font-bold rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm Match ({pendingMatch.invoices.length})</span>
                        </button>
                      </div>
                    </div>

                    {/* Comparative Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-white border border-orange-200 rounded-lg p-2.5 shadow-2xs">
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Statement Txn Amount</span>
                        <div className="font-mono font-bold text-gray-900 text-xs mt-0.5 truncate">{pendingMatch.txn.reference}</div>
                        <div className="font-mono text-base font-bold text-gray-900 mt-1">{formatCurrency(pendingMatch.txn.amount)}</div>
                      </div>

                      <div className="bg-white border border-orange-200 rounded-lg p-2.5 shadow-2xs">
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Total Invoices Amount</span>
                        <div className="font-mono font-bold text-gray-900 text-xs mt-0.5">
                          {pendingMatch.invoices.length} {pendingMatch.invoices.length > 1 ? 'Invoices Combined' : 'Invoice'}
                        </div>
                        <div className="font-mono text-base font-bold text-gray-900 mt-1">{formatCurrency(totalDroppedAmount)}</div>
                      </div>

                      <div className="bg-white border border-orange-200 rounded-lg p-2.5 shadow-2xs">
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Variance</span>
                        <div className={`font-mono text-base font-bold mt-1 ${variance === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {formatCurrency(variance)}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {variance === 0 ? '✓ Exact amount match' : 'Difference between statement & invoices'}
                        </div>
                      </div>
                    </div>

                    {/* Dropped Invoices Pill List */}
                    <div className="bg-white border border-orange-200 rounded-lg p-2.5 max-h-36 overflow-y-auto space-y-1.5">
                      <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider flex items-center justify-between">
                        <span>Invoices to be attached:</span>
                        <span className="font-mono text-gray-500">{pendingMatch.invoices.length} items</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {pendingMatch.invoices.map((inv) => (
                          <div key={inv.id} className="bg-gray-50 border border-gray-200 rounded px-2 py-1.5 flex items-center justify-between text-xs font-mono group hover:border-orange-300 transition-colors">
                            <div className="truncate pr-1 min-w-0">
                              <span className="font-bold text-gray-900 block truncate">{inv.invoiceNumber}</span>
                              <span className="text-[10px] text-gray-500 font-sans block truncate">{inv.entityName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-gray-900 font-bold">{formatCurrency(inv.amount)}</span>
                              <button
                                type="button"
                                title={`Remove ${inv.invoiceNumber} from this match`}
                                onClick={() => handleRemoveFromPendingMatch(inv.id)}
                                className="p-0.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 6 & 7. WORKSPACE: LEFT (Bank Statement) + [Instant Split PDF replaces Invoices section] */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start animate-in fade-in duration-200">
            {/* 6. LEFT SIDE: Bank Statement */}
            <div className={`${pdfViewMode === 'split' ? 'lg:col-span-6' : 'lg:col-span-7'} bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs flex flex-col transition-all duration-200`}>
              {/* Header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#EA580C]" />
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Bank Statement
                  </h3>
                  <span className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-600 font-mono">
                    {unmatchedTxnCount} to drop • {matchedTxnCount} matched
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Option 1 Split PDF quick toggle button */}
                  <button
                    type="button"
                    onClick={() => {
                      setPdfViewMode(pdfViewMode === 'split' ? 'none' : 'split');
                      if (pdfViewMode !== 'split' && !selectedPdfTxnRef && filteredTransactions.length > 0) {
                        setSelectedPdfTxnRef(filteredTransactions[0].reference);
                      }
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs border ${
                      pdfViewMode === 'split'
                        ? 'bg-orange-100 text-[#EA580C] border-orange-300'
                        : 'bg-white text-gray-700 hover:text-gray-900 border-gray-300 hover:bg-gray-50'
                    }`}
                    title="Toggle Option 1: Instant Split PDF View (Hides Invoices, Synced with selected line)"
                  >
                    <Split className="w-3.5 h-3.5 text-[#EA580C]" />
                    <span>{pdfViewMode === 'split' ? 'Show Invoices' : 'Split PDF'}</span>
                  </button>

                  <div className="relative max-w-[140px] sm:max-w-[160px]">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" />
                    <input
                      type="text"
                      value={txnSearch}
                      onChange={(e) => setTxnSearch(e.target.value)}
                      placeholder="Search statement..."
                      className="w-full pl-7 pr-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#EA580C]"
                    />
                  </div>
                </div>
              </div>

              {/* Transactions Table with Drag Drop & Accordions */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Reference</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTransactions.map((txn) => {
                      const isExpanded = expandedTxnIds.has(txn.id);
                      const isMatched = txn.matchedInvoiceIds.length > 0;
                      const isDropTarget = dragOverTxnId === txn.id;

                      // Find matched invoice objects
                      const matchedInvoicesForTxn = invoices.filter(inv => 
                        txn.matchedInvoiceIds.includes(inv.id)
                      );
                      const totalMatchedAmount = matchedInvoicesForTxn.reduce((sum, inv) => sum + inv.amount, 0);
                      const variance = Math.abs(txn.amount - totalMatchedAmount);

                      return (
                        <React.Fragment key={txn.id}>
                          {/* Main Statement Row */}
                          <tr
                            onDragOver={(e) => handleTxnDragOver(e, txn.id)}
                            onDragLeave={(e) => handleTxnDragLeave(e, txn.id)}
                            onDrop={(e) => handleTxnDrop(e, txn)}
                            onClick={() => {
                              toggleAccordion(txn.id);
                              setSelectedPdfTxnRef(txn.reference);
                            }}
                            className={`cursor-pointer transition-colors ${
                              isDropTarget
                                ? 'bg-orange-100 ring-2 ring-[#EA580C]'
                                : selectedPdfTxnRef === txn.reference && pdfViewMode === 'split'
                                  ? 'bg-orange-50/90 ring-1 ring-orange-300'
                                  : isExpanded
                                    ? 'bg-[#FFF8F3] border-l-4 border-l-[#EA580C]'
                                    : isMatched
                                      ? 'bg-emerald-50/30 hover:bg-emerald-50/60'
                                      : 'hover:bg-amber-50/30 bg-white'
                            }`}
                          >
                            {/* Date */}
                            <td className="py-2.5 px-3 font-mono text-gray-700 whitespace-nowrap">
                              {txn.bookingDate}
                            </td>

                            {/* Reference */}
                            <td className="py-2.5 px-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className={selectedPdfTxnRef === txn.reference && pdfViewMode === 'split' ? 'text-[#EA580C]' : ''}>
                                  {txn.reference}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPdfTxnRef(txn.reference);
                                    setPdfViewMode('split');
                                  }}
                                  title="Sync & View in PDF (Option 1)"
                                  className="p-0.5 hover:bg-orange-100 text-gray-400 hover:text-[#EA580C] rounded transition-colors"
                                >
                                  <FileText className="w-3 h-3" />
                                </button>
                              </div>
                            </td>

                            {/* Description */}
                            <td className="py-2.5 px-3 font-medium text-gray-800 max-w-[170px] truncate" title={txn.description}>
                              {txn.description}
                            </td>

                            {/* Amount */}
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                              {formatCurrency(txn.amount)}
                            </td>

                            {/* Status & Accordion Toggle Icon */}
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                {isMatched ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    <span>
                                      {matchedInvoicesForTxn.length > 1 
                                        ? `Matched (${matchedInvoicesForTxn.length})` 
                                        : 'Matched'}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    <ArrowDownToLine className="w-2.5 h-2.5 text-amber-600" />
                                    <span>Drop Invoice</span>
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

                          {/* 9 & 10. MATCHED INVOICE ACCORDION (Expanded state directly under row) */}
                          {isExpanded && (
                            <tr className="bg-[#FFF8F3] border-b-2 border-orange-200/80">
                              <td colSpan={5} className="p-3.5 pl-5">
                                <div className="bg-white border border-orange-200/90 rounded-xl p-3.5 shadow-sm space-y-2.5 ring-1 ring-orange-100/80">
                                  {isMatched ? (
                                    <>
                                      <div className="flex items-center justify-between border-b border-orange-100 pb-2">
                                        <div className="text-[11px] font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                          <span>Matched Invoices ({matchedInvoicesForTxn.length})</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-mono">
                                          <span className="text-gray-500 font-sans">Statement Amount:</span>
                                          <span className="font-bold text-gray-900 bg-orange-50/80 px-2 py-0.5 rounded border border-orange-200">{formatCurrency(txn.amount)}</span>
                                        </div>
                                      </div>

                                      {/* List of matched invoices in accordion */}
                                      <div className="space-y-1.5">
                                        {matchedInvoicesForTxn.map((inv) => (
                                          <div 
                                            key={inv.id}
                                            className="flex items-center justify-between bg-emerald-50/50 border border-emerald-200 rounded p-2 text-xs"
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              <span className="font-mono font-bold text-emerald-900 bg-white px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                                                {inv.invoiceNumber}
                                              </span>
                                              <span className="text-gray-700 font-medium truncate">{inv.entityName}</span>
                                              <span className="text-[11px] text-gray-400 font-mono shrink-0">({inv.date})</span>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                              <span className="font-mono font-bold text-gray-900">
                                                {formatCurrency(inv.amount)}
                                              </span>
                                              <button
                                                type="button"
                                                title="Unmatch invoice"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleUnmatchInvoice(txn.id, inv.id);
                                                }}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors cursor-pointer"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>

                                      {/* Accordion Summary calculation */}
                                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs font-mono">
                                        <div className="flex items-center gap-2 text-emerald-700 font-sans font-bold">
                                          <Check className="w-3.5 h-3.5" />
                                          <span>Match Status: Confirmed</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <span>Total Matched: <strong>{formatCurrency(totalMatchedAmount)}</strong></span>
                                          <span className={variance === 0 ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                                            Variance: {formatCurrency(variance)}
                                          </span>
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="py-2 text-center text-xs text-gray-400">
                                      <div className="font-medium text-gray-600">No invoice matched yet</div>
                                      <div className="text-[11px] text-gray-400 mt-0.5">
                                        Drag and drop one or more invoices from the right column onto this row to reconcile.
                                      </div>
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

            {/* OPTION 1: INSTANT SPLIT PDF VIEW PANEL (Replaces Invoices section when Split mode is active) */}
            {pdfViewMode === 'split' ? (
              <div className="lg:col-span-6 h-[620px] bg-white border border-gray-200 rounded-xl overflow-hidden shadow-md flex flex-col animate-in fade-in zoom-in-95 duration-150">
                <PdfStatementViewer
                  fileName={uploadedFile ? uploadedFile.name : 'HSBC_August_2026.pdf'}
                  bankName={currentBank.bankName}
                  accountNumber={currentBank.accountNumber}
                  periodFrom={periodFrom}
                  periodTo={periodTo}
                  transactions={transactions}
                  highlightTxnRef={selectedPdfTxnRef}
                  mode="split"
                  onClose={() => setPdfViewMode('none')}
                  onSwitchToModal={() => setPdfViewMode('modal')}
                  onSelectTxn={(ref) => setSelectedPdfTxnRef(ref)}
                />
              </div>
            ) : (
              /* 7. RIGHT SIDE: Invoices List (Shown when PDF is hidden) */
              <div className="lg:col-span-5 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs flex flex-col transition-all duration-200">
                {/* Header */}
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 shrink-0">
                    <FileText className="w-4 h-4 text-[#EA580C]" />
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                      Invoices
                    </h3>
                    <span className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-600 font-mono">
                      {unmatchedInvoicesCount} available
                    </span>
                  </div>

                  {/* Search Bar inside Header Right Side */}
                  <div className="relative max-w-[180px] sm:max-w-[210px] w-full">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" />
                    <input
                      type="text"
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      placeholder="Search invoices..."
                      className="w-full pl-7 pr-3 py-1 bg-white border border-gray-200 rounded text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#EA580C]"
                    />
                  </div>
                </div>

                {/* Multi-selection Action Toolbar (shows when 1 or more invoices are selected) */}
                {(() => {
                  const selectedInvs = invoices.filter(inv => selectedInvoiceIds.has(inv.id) && !inv.matchedBankTxnId);
                  const selectedTotal = selectedInvs.reduce((sum, inv) => sum + inv.amount, 0);

                  if (selectedInvs.length > 0) {
                    return (
                      <div className="px-3 py-2 bg-orange-50 border-b border-orange-200 flex items-center justify-between text-xs text-orange-950 animate-in fade-in">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold bg-[#EA580C] text-white text-[10px] px-2 py-0.5 rounded-full">
                            {selectedInvs.length}
                          </span>
                          <span className="font-medium text-[11px]">
                            Selected (<strong>{formatCurrency(selectedTotal)}</strong>)
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-[#EA580C] font-semibold flex items-center gap-1">
                            <GripVertical className="w-3.5 h-3.5" />
                            <span>Drag any to drop batch</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceIds(new Set())}
                            className="text-gray-500 hover:text-gray-800 underline cursor-pointer text-[10px] ml-1"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Invoices Draggable List Table */}
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  {filteredInvoices.length === 0 ? (
                    <div className="py-12 px-4 text-center text-xs space-y-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="font-bold text-gray-800">
                        {invoiceFilter === 'unmatched'
                          ? 'All available invoices matched!'
                          : invoiceSearch
                            ? `No invoices matching "${invoiceSearch}"`
                            : 'No invoices found'}
                      </div>
                      <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                        {invoiceFilter === 'unmatched'
                          ? 'Matched invoices are hidden from this list and linked in the statement accordions on the left.'
                          : 'Adjust your search query or filter selection above.'}
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs font-sans border-collapse">
                      <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] z-10">
                        <tr>
                          {/* Select All Checkbox */}
                          <th className="py-2 px-2 w-8 text-center">
                            <input
                              type="checkbox"
                              checked={
                                filteredInvoices.filter(i => !i.matchedBankTxnId).length > 0 &&
                                filteredInvoices
                                  .filter(i => !i.matchedBankTxnId)
                                  .every(i => selectedInvoiceIds.has(i.id))
                              }
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const newSet = new Set(selectedInvoiceIds);
                                  filteredInvoices
                                    .filter(i => !i.matchedBankTxnId)
                                    .forEach(i => newSet.add(i.id));
                                  setSelectedInvoiceIds(newSet);
                                } else {
                                  const newSet = new Set(selectedInvoiceIds);
                                  filteredInvoices.forEach(i => newSet.delete(i.id));
                                  setSelectedInvoiceIds(newSet);
                                }
                              }}
                              className="rounded border-gray-300 text-[#EA580C] focus:ring-[#EA580C] cursor-pointer"
                              title="Select / Deselect all available invoices"
                            />
                          </th>
                          <th className="py-2 px-1 w-5"></th>
                          <th className="py-2 px-2.5">Invoice Number</th>
                          <th className="py-2 px-2.5">Date</th>
                          <th className="py-2 px-2.5">Customer / Vendor</th>
                          <th className="py-2 px-2.5 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredInvoices.map((inv) => {
                          const isMatched = !!inv.matchedBankTxnId;
                          const isSelected = selectedInvoiceIds.has(inv.id);
                          const isDraggingThis = draggedInvoices.some(d => d.id === inv.id);

                          return (
                            <tr
                              key={inv.id}
                              draggable={!isMatched}
                              onDragStart={(e) => handleDragStart(e, inv)}
                              onDragEnd={handleDragEnd}
                              onClick={() => {
                                if (isMatched) return;
                                setSelectedInvoiceIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(inv.id)) next.delete(inv.id);
                                  else next.add(inv.id);
                                  return next;
                                });
                              }}
                              className={`cursor-grab active:cursor-grabbing transition-colors ${
                                isDraggingThis
                                  ? 'opacity-40 bg-orange-100 ring-1 ring-[#EA580C]'
                                  : isSelected
                                    ? 'bg-orange-50/80 hover:bg-orange-100/70'
                                    : isMatched
                                      ? 'bg-emerald-50/20 hover:bg-emerald-50/40'
                                      : 'hover:bg-orange-50/40 bg-white'
                              }`}
                            >
                              {/* Row Select Checkbox */}
                              <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  disabled={isMatched}
                                  checked={isSelected}
                                  onChange={() => {
                                    setSelectedInvoiceIds(prev => {
                                      const next = new Set(prev);
                                      if (next.has(inv.id)) next.delete(inv.id);
                                      else next.add(inv.id);
                                      return next;
                                    });
                                  }}
                                  className="rounded border-gray-300 text-[#EA580C] focus:ring-[#EA580C] cursor-pointer disabled:opacity-30"
                                />
                              </td>

                              {/* Drag handle icon */}
                              <td className="py-2.5 px-1 text-center text-gray-400">
                                <GripVertical className="w-3.5 h-3.5 mx-auto" />
                              </td>

                              {/* Invoice Number */}
                              <td className="py-2.5 px-2.5 font-mono font-bold text-gray-900 whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  <span>{inv.invoiceNumber}</span>
                                  {isMatched && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Matched" />
                                  )}
                                </div>
                              </td>

                              {/* Invoice Date */}
                              <td className="py-2.5 px-2.5 font-mono text-gray-600 whitespace-nowrap text-[11px]">
                                {inv.date}
                              </td>

                              {/* Customer / Vendor */}
                              <td className="py-2.5 px-2.5 font-medium text-gray-800 truncate max-w-[120px]" title={inv.entityName}>
                                {inv.entityName}
                              </td>

                              {/* Amount */}
                              <td className="py-2.5 px-2.5 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                                {formatCurrency(inv.amount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Drag Hint Footer */}
                <div className="p-2.5 bg-gray-50 border-t border-gray-200 text-[11px] text-gray-500 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                  <span>Select multiple invoices and drag any row to match multiple invoices to one statement line.</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  </div>

      {/* 14. ADD RECONCILIATION ACTIONS (Footer) */}
      <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 shrink-0 flex items-center justify-between">
        <button
          type="button"
          onClick={handleCancelClick}
          className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-md border border-gray-300 transition-colors cursor-pointer"
        >
          Cancel
        </button>

        <div className="flex items-center gap-2.5">
          {/* Save (Editable) */}
          <button
            type="button"
            onClick={() => handleSaveAction(false)}
            className="px-4 py-2 bg-white hover:bg-orange-50 text-[#EA580C] border border-[#EA580C] text-xs font-bold rounded-md shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>

          {/* Save & Lock */}
          <button
            type="button"
            onClick={() => handleSaveAction(true)}
            className="px-5 py-2 bg-[#EA580C] hover:bg-[#D94E07] text-white text-xs font-bold rounded-md shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Save & Lock</span>
          </button>
        </div>
      </div>

        {/* Discard changes confirmation dialog */}
        {showDiscardConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs">
            <div className="bg-white border border-gray-200 rounded-xl p-5 max-w-sm w-full shadow-xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-full">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Discard unsaved changes?</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    You have made matching edits that will be lost if you close now.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-semibold rounded-md"
                >
                  Continue Editing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-md"
                >
                  Discard & Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* OPTION 2: FULL DOCUMENT PDF MODAL OVERLAY */}
        {pdfViewMode === 'modal' && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
            <div className="w-full max-w-5xl h-[92vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
              <PdfStatementViewer
                fileName={uploadedFile ? uploadedFile.name : 'HSBC_August_2026.pdf'}
                bankName={currentBank.bankName}
                accountNumber={currentBank.accountNumber}
                periodFrom={periodFrom}
                periodTo={periodTo}
                transactions={transactions}
                highlightTxnRef={selectedPdfTxnRef}
                mode="modal"
                onClose={() => setPdfViewMode('none')}
                onSelectTxn={(ref) => setSelectedPdfTxnRef(ref)}
              />
            </div>
          </div>
        )}

        {/* 15. STATEMENT AUTO-MATCH PROCESSING MODAL */}
        {isProcessingModalOpen && stagedFile && (
          <div className="fixed inset-0 z-70 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#EA580C] shrink-0">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 leading-tight">
                      {processingStage === 'done' ? 'Statement Processed & Auto-Matched' : 'Processing Bank Statement'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs font-mono text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded border border-gray-200 truncate max-w-[260px]">
                        {stagedFile.name}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        {stagedFile.size}
                      </span>
                    </div>
                  </div>
                </div>

                {processingStage === 'done' && (
                  <button
                    type="button"
                    onClick={handleApplyAutoMatchAndOpen}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-semibold text-gray-700">
                      {processingStage === 'parsing' && 'Extracting transactions & OCR parsing...'}
                      {processingStage === 'matching' && 'Cross-referencing invoices & ledger...'}
                      {processingStage === 'finalizing' && 'Executing auto-match rule engine...'}
                      {processingStage === 'done' && 'Auto-matching complete!'}
                    </span>
                    <span className="font-mono font-bold text-[#EA580C]">
                      {processingProgress}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#EA580C] transition-all duration-300 rounded-full"
                      style={{ width: `${processingProgress}%` }}
                    />
                  </div>
                </div>

                {/* Processing Steps Checklist */}
                <div className="space-y-3 bg-gray-50/80 border border-gray-200/80 rounded-xl p-4 text-xs sm:text-sm">
                  {/* Step 1 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {processingProgress >= 40 ? (
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                      ) : (
                        <Loader2 className="w-4.5 h-4.5 text-[#EA580C] animate-spin shrink-0" />
                      )}
                      <span className={`text-xs sm:text-sm ${processingProgress >= 40 ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                        Extract statement line items & balances
                      </span>
                    </div>
                    {processingProgress >= 40 && (
                      <span className="text-xs font-mono font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        10 items
                      </span>
                    )}
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {processingProgress >= 85 ? (
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                      ) : processingProgress >= 40 ? (
                        <Loader2 className="w-4.5 h-4.5 text-[#EA580C] animate-spin shrink-0" />
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-full border border-gray-300 shrink-0" />
                      )}
                      <span className={`text-xs sm:text-sm ${processingProgress >= 85 ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                        Amount, date & reference correlation
                      </span>
                    </div>
                    {processingProgress >= 85 && (
                      <span className="text-xs font-mono font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        100% matched
                      </span>
                    )}
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {processingStage === 'done' ? (
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                      ) : processingProgress >= 85 ? (
                        <Loader2 className="w-4.5 h-4.5 text-[#EA580C] animate-spin shrink-0" />
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-full border border-gray-300 shrink-0" />
                      )}
                      <span className={`text-xs sm:text-sm ${processingStage === 'done' ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                        Multi-invoice batch correlation & tolerance
                      </span>
                    </div>
                    {processingStage === 'done' && (
                      <span className="text-xs font-mono font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Applied
                      </span>
                    )}
                  </div>
                </div>

                {/* Auto-Match Result Stats (Shown when ready) */}
                {processingStage === 'done' && (
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-bold text-emerald-900 flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600" />
                        7 Transactions Auto-Matched
                      </span>
                      <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                        88% Reconciled
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center pt-1 border-t border-emerald-200/60">
                      <div className="bg-white/90 rounded-lg p-2.5 border border-emerald-100">
                        <div className="text-[11px] text-gray-500 font-medium">Auto-Matched</div>
                        <div className="font-mono font-bold text-sm text-gray-900 mt-0.5">7 items</div>
                      </div>
                      <div className="bg-white/90 rounded-lg p-2.5 border border-emerald-100">
                        <div className="text-[11px] text-gray-500 font-medium">Unmatched</div>
                        <div className="font-mono font-bold text-sm text-orange-600 mt-0.5">3 items</div>
                      </div>
                      <div className="bg-white/90 rounded-lg p-2.5 border border-emerald-100">
                        <div className="text-[11px] text-gray-500 font-medium">Matched Sum</div>
                        <div className="font-mono font-bold text-sm text-emerald-700 mt-0.5">$184.8k</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
                {processingStage === 'done' ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSkipAutoMatch}
                      className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Clear & Manual Match
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyAutoMatchAndOpen}
                      className="px-5 py-2.5 bg-[#EA580C] hover:bg-[#D94E07] text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer ml-auto"
                    >
                      <span>Apply Matches & Open Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-gray-400 font-mono">
                      Running rule heuristics...
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyAutoMatchAndOpen}
                      className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer ml-auto"
                    >
                      Skip to Results
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
