import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  FileText, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  ChevronRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { MatchedInvoice, BankTransaction, ReconciliationRun } from '../types/reconciliation';
import { BANK_ACCOUNTS, INITIAL_INVOICES, INITIAL_TRANSACTIONS } from '../data/mockData';
import { Step1Statement } from './Step1Statement';
import { AutoMatchProcessing } from './AutoMatchProcessing';
import { Step2MatchWorkspace } from './Step2MatchWorkspace';
import { Step3Review } from './Step3Review';
import { Step4Confirm } from './Step4Confirm';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { PdfStatementViewer } from './PdfStatementViewer';

interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingRun?: ReconciliationRun | null;
  onSaveRun: (run: ReconciliationRun) => void;
}

export type StepKey = 'STATEMENT' | 'PROCESSING' | 'MATCH' | 'REVIEW' | 'CONFIRM';

export const ReconciliationModal: React.FC<ReconciliationModalProps> = ({
  isOpen,
  onClose,
  existingRun,
  onSaveRun,
}) => {
  // Step state
  const [currentStep, setCurrentStep] = useState<StepKey>('STATEMENT');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  // Form & Reconciliation state
  const [selectedBankId, setSelectedBankId] = useState<string>('hsbc-4821');
  const [periodFrom, setPeriodFrom] = useState<string>('01-Jan-2026');
  const [periodTo, setPeriodTo] = useState<string>('31-Jan-2026');
  const [fileName, setFileName] = useState<string>('HSBC_January_2026.pdf');
  const [fileSize, setFileSize] = useState<string>('2.4 MB');

  // Transactions and Invoices data
  const [transactions, setTransactions] = useState<BankTransaction[]>(INITIAL_TRANSACTIONS);
  const [invoices, setInvoices] = useState<MatchedInvoice[]>(INITIAL_INVOICES);

  // Modals inside modal
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<MatchedInvoice | null>(null);
  const [showPdfViewerModal, setShowPdfViewerModal] = useState<boolean>(false);

  // Load existing run data if passed
  useEffect(() => {
    if (existingRun) {
      const bank = BANK_ACCOUNTS.find(b => b.bankName === existingRun.bankName) || BANK_ACCOUNTS[0];
      setSelectedBankId(bank.id);
      setPeriodFrom(existingRun.statementPeriod.from);
      setPeriodTo(existingRun.statementPeriod.to);
      setFileName(existingRun.statementFileName);
      setFileSize(existingRun.statementFileSize);
      if (existingRun.transactions && existingRun.transactions.length > 0) {
        setTransactions(existingRun.transactions);
      }
      if (existingRun.invoices && existingRun.invoices.length > 0) {
        setInvoices(existingRun.invoices);
      }
      setCurrentStep('MATCH');
    } else {
      // Reset to initial
      setSelectedBankId('hsbc-4821');
      setPeriodFrom('01-Jan-2026');
      setPeriodTo('31-Jan-2026');
      setFileName('HSBC_January_2026.pdf');
      setFileSize('2.4 MB');
      setTransactions(INITIAL_TRANSACTIONS);
      setInvoices(INITIAL_INVOICES);
      setCurrentStep('STATEMENT');
      setIsSuccess(false);
    }
  }, [existingRun, isOpen]);

  if (!isOpen) return null;

  const currentBank = BANK_ACCOUNTS.find(b => b.id === selectedBankId) || BANK_ACCOUNTS[0];

  const handleFileUpload = (name: string, size: string) => {
    setFileName(name);
    setFileSize(size);
  };

  const handleFileRemove = () => {
    setFileName('');
    setFileSize('');
  };

  // Step transitions
  const handleStartAutoMatch = () => {
    setCurrentStep('PROCESSING');
  };

  const handleProcessingComplete = () => {
    setCurrentStep('MATCH');
  };

  const handleApproveSingleSuggested = (txnId: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === txnId) {
        return {
          ...t,
          status: 'Exact Match',
          matchConfidence: 100,
          variance: 0.00,
          matchReasons: [...t.matchReasons, 'Approved during controller review'],
        };
      }
      return t;
    }));
  };

  const handleUnmatchTxn = (txnId: string) => {
    const txn = transactions.find(t => t.id === txnId);
    if (!txn) return;
    const matchedInvIds = txn.matchedInvoiceIds;

    setTransactions(prev => prev.map(t => {
      if (t.id === txnId) {
        return {
          ...t,
          status: 'Unmatched',
          matchConfidence: 0,
          matchedInvoiceIds: [],
          matchReasons: ['Unmatched during review'],
          variance: t.amount,
        };
      }
      return t;
    }));

    setInvoices(prev => prev.map(inv => {
      if (matchedInvIds.includes(inv.id)) {
        return {
          ...inv,
          status: 'Unmatched',
          matchConfidence: 0,
          matchedBankTxnId: undefined,
        };
      }
      return inv;
    }));
  };

  const handleSaveDraft = () => {
    const matchedCount = transactions.filter(t => t.status !== 'Unmatched' && t.status !== 'Exception').length;
    const run: ReconciliationRun = {
      id: existingRun ? existingRun.id : `REC-2026-${Math.floor(10000 + Math.random() * 90000).toString().slice(0, 5)}`,
      bankName: currentBank.bankName,
      accountNumber: currentBank.accountNumber,
      accountType: currentBank.accountName,
      currency: 'USD',
      statementPeriod: { from: periodFrom, to: periodTo },
      statementFileName: fileName || 'HSBC_Jan_2026.pdf',
      statementFileSize: fileSize || '2.4 MB',
      totalTransactions: 248,
      matchedCount: matchedCount,
      suggestedCount: transactions.filter(t => t.status === 'Suggested').length,
      unmatchedCount: transactions.filter(t => t.status === 'Unmatched' || t.status === 'Exception').length,
      manualMatchedCount: transactions.filter(t => t.status === 'Manual Match').length,
      totalAmount: 485240.00,
      variance: -120.00,
      confidence: 92,
      status: 'Needs Review',
      credits: 320450.00,
      debits: 165210.00,
      openingBalance: 0,
      closingBalance: 155240.00,
      createdAt: existingRun ? existingRun.createdAt : '2026-02-24 10:00:00',
      updatedAt: 'Just now',
      reconciledBy: 'E. Sterling (Lead Controller)',
      transactions,
      invoices,
    };
    onSaveRun(run);
    onClose();
  };

  const handleConfirmReconciliation = () => {
    setIsSuccess(true);
  };

  const handleFinishAndCommit = () => {
    const run: ReconciliationRun = {
      id: existingRun ? existingRun.id : `REC-2026-00842`,
      bankName: currentBank.bankName,
      accountNumber: currentBank.accountNumber,
      accountType: currentBank.accountName,
      currency: 'USD',
      statementPeriod: { from: periodFrom, to: periodTo },
      statementFileName: fileName || 'HSBC_Jan_2026.pdf',
      statementFileSize: fileSize || '2.4 MB',
      totalTransactions: 248,
      matchedCount: 240,
      suggestedCount: 0,
      unmatchedCount: 8,
      manualMatchedCount: 12,
      totalAmount: 485240.00,
      variance: 0.00,
      confidence: 99,
      status: 'Reconciled',
      credits: 320450.00,
      debits: 165210.00,
      openingBalance: 0,
      closingBalance: 155240.00,
      createdAt: existingRun ? existingRun.createdAt : '2026-02-24 10:00:00',
      updatedAt: 'Just now',
      reconciledBy: 'E. Sterling (Lead Controller)',
      transactions,
      invoices,
    };
    onSaveRun(run);
    onClose();
  };

  // Compact step indicator elements
  const stepsList = [
    { key: 'STATEMENT', label: '01 Statement' },
    { key: 'MATCH', label: '02 Match' },
    { key: 'REVIEW', label: '03 Review' },
    { key: 'CONFIRM', label: '04 Confirm' },
  ];

  const getStepNumber = (step: StepKey) => {
    if (step === 'STATEMENT') return 1;
    if (step === 'PROCESSING' || step === 'MATCH') return 2;
    if (step === 'REVIEW') return 3;
    if (step === 'CONFIRM') return 4;
    return 1;
  };

  const currentStepNum = getStepNumber(currentStep);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className={`bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ${
          isMaximized 
            ? 'w-full h-full max-w-none max-h-none rounded-none' 
            : 'w-full max-w-6xl max-h-[94vh]'
        }`}
      >
        {/* MODAL HEADER: Title + Step Indicator + Window Controls */}
        <div className="flex flex-wrap items-center justify-between px-6 py-3.5 bg-gray-50 border-b border-gray-200 shrink-0 gap-3">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-orange-50 text-[#EA580C] border border-orange-200 rounded-md">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                {existingRun ? `Reconciliation ${existingRun.id}` : 'New Reconciliation'}
              </h2>
              <p className="text-[11px] text-gray-500 font-mono">
                {currentBank.bankName} • {currentBank.accountNumber}
              </p>
            </div>
          </div>

          {/* Compact Step Indicator */}
          {!isSuccess && (
            <div className="flex items-center gap-1 sm:gap-2 bg-white px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-sans">
              {stepsList.map((st, idx) => {
                const stepNum = idx + 1;
                const isActive = currentStepNum === stepNum;
                const isPassed = currentStepNum > stepNum;

                return (
                  <React.Fragment key={st.key}>
                    <button
                      type="button"
                      onClick={() => {
                        if (isPassed || (stepNum <= currentStepNum)) {
                          setCurrentStep(st.key as StepKey);
                        }
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs ${
                        isActive
                          ? 'bg-[#EA580C] text-white font-bold shadow-2xs'
                          : isPassed
                          ? 'text-emerald-700 hover:text-emerald-800 font-medium'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {isPassed && <Check className="w-3 h-3 text-emerald-600" />}
                      <span>{st.label}</span>
                    </button>
                    {idx < stepsList.length - 1 && (
                      <span className="text-gray-300 select-none">→</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* Right actions: Maximize & Close */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors cursor-pointer"
              title={isMaximized ? "Restore window" : "Maximize window"}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MODAL MAIN SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F8FAFC]">
          {/* STEP 1: STATEMENT */}
          {currentStep === 'STATEMENT' && (
            <Step1Statement
              selectedBankId={selectedBankId}
              onSelectBank={setSelectedBankId}
              periodFrom={periodFrom}
              onChangePeriodFrom={setPeriodFrom}
              periodTo={periodTo}
              onChangePeriodTo={setPeriodTo}
              fileName={fileName}
              fileSize={fileSize}
              onFileUpload={handleFileUpload}
              onFileRemove={handleFileRemove}
              onContinue={handleStartAutoMatch}
              onCancel={onClose}
            />
          )}

          {/* PROCESSING STATE */}
          {currentStep === 'PROCESSING' && (
            <AutoMatchProcessing
              onComplete={handleProcessingComplete}
              transactionsCount={248}
            />
          )}

          {/* STEP 2: MATCH WORKSPACE */}
          {currentStep === 'MATCH' && (
            <Step2MatchWorkspace
              bankName={currentBank.bankName}
              accountNumber={currentBank.accountNumber}
              fileName={fileName}
              periodFrom={periodFrom}
              periodTo={periodTo}
              transactions={transactions}
              invoices={invoices}
              onUpdateTransactions={setTransactions}
              onUpdateInvoices={setInvoices}
              onViewInvoiceDetail={(inv) => setSelectedInvoiceForDetail(inv)}
              onViewStatementDetail={() => setShowPdfViewerModal(true)}
              onProceedToReview={() => setCurrentStep('REVIEW')}
              onBackToStatement={() => setCurrentStep('STATEMENT')}
            />
          )}

          {/* STEP 3: REVIEW */}
          {currentStep === 'REVIEW' && (
            <Step3Review
              bankName={currentBank.bankName}
              accountNumber={currentBank.accountNumber}
              fileName={fileName}
              periodFrom={periodFrom}
              periodTo={periodTo}
              transactions={transactions}
              invoices={invoices}
              onApproveSingleSuggested={handleApproveSingleSuggested}
              onUnmatchTxn={handleUnmatchTxn}
              onViewInvoiceDetail={(inv) => setSelectedInvoiceForDetail(inv)}
              onBackToMatch={() => setCurrentStep('MATCH')}
              onContinueToConfirm={() => setCurrentStep('CONFIRM')}
            />
          )}

          {/* STEP 4: CONFIRM & SUCCESS */}
          {currentStep === 'CONFIRM' && (
            <Step4Confirm
              bankName={currentBank.bankName}
              accountNumber={currentBank.accountNumber}
              fileName={fileName}
              periodFrom={periodFrom}
              periodTo={periodTo}
              transactionsCount={248}
              matchedCount={240}
              unmatchedCount={8}
              variance={0.00}
              onBack={() => setCurrentStep('REVIEW')}
              onSaveDraft={handleSaveDraft}
              onConfirmReconciliation={handleConfirmReconciliation}
              isSuccess={isSuccess}
              runId={existingRun ? existingRun.id : 'REC-2026-00842'}
              onCloseSuccess={handleFinishAndCommit}
              onViewPdf={() => setShowPdfViewerModal(true)}
            />
          )}
        </div>
      </div>

      {/* Embedded Invoice Detail Slide-Over / Modal */}
      {selectedInvoiceForDetail && (
        <InvoiceDetailModal
          invoice={selectedInvoiceForDetail}
          onClose={() => setSelectedInvoiceForDetail(null)}
        />
      )}

      {/* Embedded Standalone PDF Viewer Dialog */}
      {showPdfViewerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-[#141414] w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-[#141414]">
              <span className="text-xs font-bold text-[#141414] font-mono">
                Source Document: {fileName}
              </span>
              <button
                type="button"
                onClick={() => setShowPdfViewerModal(false)}
                className="p-1 text-gray-500 hover:text-[#141414]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 p-2 bg-[#E4E3E0]">
              <PdfStatementViewer
                fileName={fileName}
                bankName={currentBank.bankName}
                accountNumber={currentBank.accountNumber}
                periodFrom={periodFrom}
                periodTo={periodTo}
                transactionsCount={248}
                credits={320450.00}
                debits={165210.00}
                closingBalance={155240.00}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
