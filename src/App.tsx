import React, { useState, useEffect } from 'react';
import { Plus, HelpCircle, X, Layers, FileSpreadsheet } from 'lucide-react';
import { ReconciliationRun, ETLBatch } from './types/reconciliation';
import { INITIAL_RECONCILIATION_RUNS, INITIAL_ETL_BATCHES } from './data/mockData';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ReconciliationListTable } from './components/ReconciliationListTable';
import { AddNewReconciliationModal } from './components/AddNewReconciliationModal';
import { ViewReconciliationModal } from './components/ViewReconciliationModal';
import { PdfStatementViewer } from './components/PdfStatementViewer';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { EtlBatchesTable } from './components/EtlBatchesTable';
import { CreateBatchModal } from './components/CreateBatchModal';
import { ViewBatchDetailsModal } from './components/ViewBatchDetailsModal';

export default function App() {
  // Master state for all reconciliation records
  const [runs, setRuns] = useState<ReconciliationRun[]>(INITIAL_RECONCILIATION_RUNS);
  
  // Master state for ETL batches
  const [batches, setBatches] = useState<ETLBatch[]>(INITIAL_ETL_BATCHES);
  
  // Navigation tab: 'reconciliations' | 'batches' | other sidebar tabs
  const [activeNavTab, setActiveNavTab] = useState<string>('reconciliations');

  // Modal states for Reconciliations
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [viewingRun, setViewingRun] = useState<ReconciliationRun | null>(null);
  const [pdfViewingRun, setPdfViewingRun] = useState<ReconciliationRun | null>(null);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);

  // Modal states for ETL Batches
  const [isCreateBatchModalOpen, setIsCreateBatchModalOpen] = useState<boolean>(false);
  const [viewingBatch, setViewingBatch] = useState<ETLBatch | null>(null);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when inside inputs/textareas
      if (
        ['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)
      ) {
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        if (activeNavTab === 'batches') {
          setIsCreateBatchModalOpen(true);
        } else {
          setIsAddModalOpen(true);
        }
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setIsCreateBatchModalOpen(true);
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        setViewingRun(null);
        setPdfViewingRun(null);
        setIsShortcutsOpen(false);
        setIsCreateBatchModalOpen(false);
        setViewingBatch(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeNavTab]);

  // Handler to open View Reconciliation modal
  const handleViewRun = (run: ReconciliationRun) => {
    setViewingRun(run);
  };

  // Handler to save new reconciliation run from Add modal
  const handleSaveNewRun = (newRun: ReconciliationRun, isLocked: boolean) => {
    setRuns(prev => [newRun, ...prev]);
  };

  // Handler to open PDF statement preview from View modal
  const handleViewPdf = (run: ReconciliationRun) => {
    setPdfViewingRun(run);
  };

  // Handler to create new ETL batch
  const handleCreateBatch = (newBatch: ETLBatch) => {
    setBatches(prev => [newBatch, ...prev]);
    setActiveNavTab('batches');
  };

  // Handler to delete batch
  const handleDeleteBatch = (batchId: string) => {
    if (confirm('Are you sure you want to delete this ETL batch?')) {
      setBatches(prev => prev.filter(b => b.id !== batchId));
    }
  };

  // Handler to mark batch as exported / synced to ERP
  const handleExportBatch = (batch: ETLBatch) => {
    setBatches(prev => prev.map(b => b.id === batch.id ? { ...b, status: 'Exported', lastModified: 'Just now' } : b));
    alert(`Batch ${batch.id} (${batch.name}) successfully queued for transmission to ${batch.exportDestination || 'SAP General Ledger Feed'}.`);
  };

  return (
    <div className="min-h-screen bg-[#FBFBFB] text-[#1E293B] flex flex-col font-sans selection:bg-[#EA580C] selection:text-white">
      {/* Top Header Bar for 4see PRO */}
      <Header onOpenShortcuts={() => setIsShortcutsOpen(true)} />

      {/* Main Body with Left Menu & 100% Full Width Workspace */}
      <div className="flex flex-1 w-full overflow-hidden">
        {/* Left Navigation Menu */}
        <Sidebar
          activeTab={activeNavTab}
          onSelectTab={setActiveNavTab}
          reconciliationCount={runs.length}
          batchCount={batches.length}
        />

        {/* Main 100% Full-Width Workspace */}
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 overflow-y-auto bg-[#F6F8FA]">
          {activeNavTab === 'batches' ? (
            /* ========================================================================= */
            /* ETL BATCHES WORKSPACE SCREEN                                              */
            /* ========================================================================= */
            <>
              {/* 1. MAIN PAGE TITLE & TOP ACTION BAR FOR BATCHES */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight uppercase font-['Open_Sans',sans-serif]">
                      CREATE BATCH
                    </h1>
                    <span className="bg-orange-100 text-[#EA580C] text-xs font-bold px-2.5 py-0.5 rounded-full border border-orange-200 font-mono">
                      {batches.length} Batches
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 font-normal">
                    Generate, review, and export structured ETL posting files derived from reconciled bank statements.
                  </p>
                </div>

                {/* Top-Right Primary Button: [ + Create new Batch ] */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveNavTab('reconciliations')}
                    className="px-3.5 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-gray-500" />
                    <span>View Reconciliations</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCreateBatchModalOpen(true)}
                    className="w-full sm:w-auto bg-[#EA580C] hover:bg-[#D94E07] active:bg-[#C2410C] text-white px-5 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create new Batch</span>
                  </button>
                </div>
              </div>

              {/* 2. ETL BATCHES LIST TABLE (100% Width) */}
              <div className="w-full">
                <EtlBatchesTable
                  batches={batches}
                  onCreateNewBatch={() => setIsCreateBatchModalOpen(true)}
                  onViewBatch={(batch) => setViewingBatch(batch)}
                  onDeleteBatch={handleDeleteBatch}
                  onExportBatch={handleExportBatch}
                />
              </div>
            </>
          ) : (
            /* ========================================================================= */
            /* RECONCILIATIONS WORKSPACE SCREEN                                          */
            /* ========================================================================= */
            <>
              {/* 1. MAIN PAGE TITLE & TOP ACTION BAR */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight uppercase font-['Open_Sans',sans-serif]">
                      RECONCILIATIONS
                    </h1>
                    <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-gray-200 font-mono">
                      {runs.length} Records
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 font-normal">
                    Manage and review bank statement reconciliations across all accounts.
                  </p>
                </div>

                {/* Top-Right Action Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateBatchModalOpen(true)}
                    className="px-4 py-2.5 text-xs font-bold text-[#EA580C] bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Create an ETL batch from reconciled statements"
                  >
                    <Layers className="w-4 h-4 text-[#EA580C]" />
                    <span>Create ETL Batch</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="w-full sm:w-auto bg-[#EA580C] hover:bg-[#D94E07] active:bg-[#C2410C] text-white px-5 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add new bank statement</span>
                  </button>
                </div>
              </div>

              {/* 2. RECONCILIATION LIST TABLE (100% Width) */}
              <div className="w-full">
                <ReconciliationListTable
                  runs={runs}
                  onViewRun={handleViewRun}
                  onAddNew={() => setIsAddModalOpen(true)}
                />
              </div>
            </>
          )}
        </main>
      </div>

      {/* 3 - 14. ADD NEW RECONCILIATION MODAL (Editable, 2-column workspace, drag & drop, accordions) */}
      <AddNewReconciliationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveNewRun}
      />

      {/* 15 - 19. VIEW RECONCILIATION MODAL (Read-only, Statement accordions, no editing) */}
      <ViewReconciliationModal
        isOpen={!!viewingRun}
        onClose={() => setViewingRun(null)}
        run={viewingRun}
        onViewPdf={handleViewPdf}
      />

      {/* FULL SCREEN CREATE NEW BATCH MODAL */}
      <CreateBatchModal
        isOpen={isCreateBatchModalOpen}
        onClose={() => setIsCreateBatchModalOpen(false)}
        reconciliationRuns={runs}
        onCreateBatch={handleCreateBatch}
      />

      {/* VIEW BATCH DETAILS & ETL STREAM MODAL */}
      <ViewBatchDetailsModal
        isOpen={!!viewingBatch}
        onClose={() => setViewingBatch(null)}
        batch={viewingBatch}
        reconciliationRuns={runs}
        onExportToErp={handleExportBatch}
      />

      {/* Standalone PDF Statement Viewer Modal */}
      {pdfViewingRun && (
        <div className="fixed inset-0 z-60 p-5 bg-black/60 backdrop-blur-xs flex items-center justify-center animate-in fade-in duration-150 font-sans">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col w-full h-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-3.5 bg-gray-50 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-gray-900">Bank Statement PDF Preview</span>
                <span className="text-xs text-gray-500 font-mono">({pdfViewingRun.statementFileName})</span>
              </div>
              <button
                type="button"
                onClick={() => setPdfViewingRun(null)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <PdfStatementViewer
                fileName={pdfViewingRun.statementFileName}
                bankName={pdfViewingRun.bankName}
                accountNumber={pdfViewingRun.accountNumber}
                periodFrom={pdfViewingRun.statementPeriod.from}
                periodTo={pdfViewingRun.statementPeriod.to}
                openingBalance={pdfViewingRun.openingBalance}
                closingBalance={pdfViewingRun.closingBalance}
                credits={pdfViewingRun.credits}
                debits={pdfViewingRun.debits}
                transactionsCount={pdfViewingRun.totalTransactions}
              />
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}
