import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Receipt, 
  CheckSquare, 
  Square, 
  Search, 
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
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { ReconciliationRun, InvoiceBatch, InvoiceETLFormat, InvoiceBatchItem, BankTransaction } from '../types/reconciliation';

interface CreateInvoiceBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  reconciliationRuns: ReconciliationRun[];
  onCreateBatch: (batch: InvoiceBatch) => void;
}

export const CreateInvoiceBatchModal: React.FC<CreateInvoiceBatchModalProps> = ({
  isOpen,
  onClose,
  reconciliationRuns,
  onCreateBatch
}) => {
  // Batch Form State
  const defaultBatchId = useMemo(() => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `INV-BATCH-2026-${randomSuffix}`;
  }, []);

  const [batchId, setBatchId] = useState<string>(defaultBatchId);
  const [batchName, setBatchName] = useState<string>('Invoice_Consolidated_Batch_' + new Date().toISOString().slice(0, 10));
  const [format, setFormat] = useState<InvoiceETLFormat>('NETSUITE_INVOICE_SYNC');
  const [postingDate, setPostingDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [exportDestination, setExportDestination] = useState<string>('Oracle NetSuite AP/AR Feed');
  const [notes, setNotes] = useState<string>('Consolidated invoice batch derived from balanced bank reconciliations.');

  // Workspace Tabs
  const [activeTab, setActiveTab] = useState<'invoices' | 'preview'>('invoices');

  // Filters & Search
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>('All');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'All' | 'AR' | 'AP'>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Expanded row details map
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Copied indicator
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [isCopiedFile, setIsCopiedFile] = useState<boolean>(false);

  // Flatten all reconciled invoices across runs
  const allReconciledInvoices: InvoiceBatchItem[] = useMemo(() => {
    const items: InvoiceBatchItem[] = [];
    const seenIds = new Set<string>();

    reconciliationRuns.forEach(run => {
      // Find matching bank txns for references
      const txnMap = new Map<string, BankTransaction>((run.transactions || []).map(t => [t.id, t]));

      (run.invoices || []).forEach(inv => {
        // Reconciled invoice check
        const isReconciled = inv.matchedBankTxnId || inv.status !== 'Unmatched';
        const key = `${run.id}_${inv.id}`;

        if (isReconciled && !seenIds.has(key)) {
          seenIds.add(key);
          const matchedTxn = inv.matchedBankTxnId ? txnMap.get(inv.matchedBankTxnId) : undefined;
          
          items.push({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            date: inv.date,
            dueDate: inv.dueDate,
            entityName: inv.entityName,
            type: inv.type,
            amount: inv.amount,
            currency: inv.currency || run.currency || 'USD',
            status: inv.status,
            matchConfidence: inv.matchConfidence,
            matchedBankName: run.bankName,
            matchedBankTxnId: inv.matchedBankTxnId,
            matchedBankRef: matchedTxn ? matchedTxn.reference : inv.matchedBankTxnId,
            sourceRunId: run.id,
            poNumber: inv.poNumber,
            description: inv.description
          });
        }
      });
    });

    return items;
  }, [reconciliationRuns]);

  // Selected Invoices IDs for the batch (default to selecting all reconciled invoices)
  const [selectedInvoiceKeys, setSelectedInvoiceKeys] = useState<Set<string>>(() => {
    return new Set(allReconciledInvoices.map(inv => `${inv.sourceRunId}_${inv.id}`));
  });

  // Re-synchronize selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedInvoiceKeys(new Set(allReconciledInvoices.map(inv => `${inv.sourceRunId}_${inv.id}`)));
      setBatchId(`INV-BATCH-2026-${Math.floor(100 + Math.random() * 900)}`);
      setBatchName('Invoice_Consolidated_Batch_' + new Date().toISOString().slice(0, 10));
      setActiveTab('invoices');
      setSearchTerm('');
      setSelectedBankFilter('All');
      setSelectedTypeFilter('All');
    }
  }, [isOpen, allReconciledInvoices]);

  // Filtered invoices for the table
  const filteredInvoices = useMemo(() => {
    return allReconciledInvoices.filter(inv => {
      const matchesBank = selectedBankFilter === 'All' || inv.matchedBankName === selectedBankFilter;
      const matchesType = selectedTypeFilter === 'All' || inv.type === selectedTypeFilter;

      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.matchedBankRef && inv.matchedBankRef.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (inv.description && inv.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        inv.amount.toString().includes(searchTerm);

      return matchesBank && matchesType && matchesSearch;
    });
  }, [allReconciledInvoices, selectedBankFilter, selectedTypeFilter, searchTerm]);

  // Selected invoice objects
  const selectedInvoices = useMemo(() => {
    return allReconciledInvoices.filter(inv => selectedInvoiceKeys.has(`${inv.sourceRunId}_${inv.id}`));
  }, [allReconciledInvoices, selectedInvoiceKeys]);

  // Aggregated totals of selected invoices
  const batchTotals = useMemo(() => {
    const totalCount = selectedInvoices.length;
    const totalAmount = selectedInvoices.reduce((acc, inv) => acc + inv.amount, 0);
    const apAmount = selectedInvoices.filter(inv => inv.type === 'AP').reduce((acc, inv) => acc + inv.amount, 0);
    const arAmount = selectedInvoices.filter(inv => inv.type === 'AR').reduce((acc, inv) => acc + inv.amount, 0);
    const uniqueBanks = Array.from(new Set(selectedInvoices.map(inv => inv.matchedBankName)));

    return {
      totalCount,
      totalAmount,
      apAmount,
      arAmount,
      uniqueBanks
    };
  }, [selectedInvoices]);

  // Unique bank options
  const uniqueBanks = useMemo(() => {
    return Array.from(new Set(allReconciledInvoices.map(inv => inv.matchedBankName)));
  }, [allReconciledInvoices]);

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

  // Toggle single item selection
  const handleToggleInvoice = (key: string) => {
    setSelectedInvoiceKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Toggle select all visible
  const isAllSelected = filteredInvoices.length > 0 && filteredInvoices.every(inv => selectedInvoiceKeys.has(`${inv.sourceRunId}_${inv.id}`));
  const isSomeSelected = filteredInvoices.some(inv => selectedInvoiceKeys.has(`${inv.sourceRunId}_${inv.id}`)) && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedInvoiceKeys(prev => {
        const next = new Set(prev);
        filteredInvoices.forEach(inv => next.delete(`${inv.sourceRunId}_${inv.id}`));
        return next;
      });
    } else {
      setSelectedInvoiceKeys(prev => {
        const next = new Set(prev);
        filteredInvoices.forEach(inv => next.add(`${inv.sourceRunId}_${inv.id}`));
        return next;
      });
    }
  };

  // Copy reference handler
  const handleCopyRef = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    setTimeout(() => setCopiedRef(null), 1500);
  };

  // Generate simulated file content for preview
  const generatedEtlContent = useMemo(() => {
    if (format === 'NETSUITE_INVOICE_SYNC') {
      const headers = ['ExternalID', 'InvoiceNumber', 'TranType', 'Entity', 'TranDate', 'DueDate', 'Amount', 'Currency', 'MatchedBank', 'BankRef', 'PostingPeriod', 'Status'];
      const rows = selectedInvoices.map(inv => {
        return [
          `${batchId}_${inv.id}`,
          `"${inv.invoiceNumber}"`,
          inv.type === 'AP' ? 'VENDOR_BILL' : 'CUST_INVOICE',
          `"${inv.entityName}"`,
          inv.date,
          inv.dueDate,
          inv.amount.toFixed(2),
          inv.currency,
          `"${inv.matchedBankName}"`,
          `"${inv.matchedBankRef || ''}"`,
          'Aug 2026',
          inv.status
        ].join(',');
      });
      return [headers.join(','), ...rows].join('\n');
    } else if (format === 'SAP_AR_AP_FEED') {
      const headers = ['BATCH_REF', 'DOC_NUM', 'DOC_TYPE', 'BP_NAME', 'DOC_DATE', 'NET_AMOUNT', 'WAERS', 'HOUSE_BANK', 'BANK_TXN_REF', 'RECON_FLAG'];
      const rows = selectedInvoices.map(inv => {
        return [
          batchId,
          inv.invoiceNumber,
          inv.type === 'AP' ? 'KR_INVOICE' : 'DR_INVOICE',
          `"${inv.entityName}"`,
          inv.date,
          inv.amount.toFixed(2),
          inv.currency,
          `"${inv.matchedBankName}"`,
          `"${inv.matchedBankRef || ''}"`,
          'X'
        ].join(',');
      });
      return [headers.join(','), ...rows].join('\n');
    } else if (format === 'JSON_INVOICE_STREAM') {
      return JSON.stringify({
        batchHeader: {
          batchId,
          batchName,
          format,
          postingDate,
          totalInvoices: batchTotals.totalCount,
          totalAmount: batchTotals.totalAmount,
          apAmount: batchTotals.apAmount,
          arAmount: batchTotals.arAmount,
          currency: 'USD',
          createdAt: new Date().toISOString()
        },
        invoices: selectedInvoices.map(inv => ({
          invoiceNumber: inv.invoiceNumber,
          type: inv.type,
          entity: inv.entityName,
          issueDate: inv.date,
          dueDate: inv.dueDate,
          amount: inv.amount,
          currency: inv.currency,
          matchedBank: inv.matchedBankName,
          bankReference: inv.matchedBankRef,
          status: inv.status
        }))
      }, null, 2);
    } else if (format === 'XML_PEPPOL_UBL') {
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<InvoiceBatch xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">\n`;
      xml += `  <BatchID>${batchId}</BatchID>\n`;
      xml += `  <BatchName>${batchName}</BatchName>\n`;
      xml += `  <PostingDate>${postingDate}</PostingDate>\n`;
      xml += `  <TotalAmount currency="USD">${batchTotals.totalAmount.toFixed(2)}</TotalAmount>\n`;
      xml += `  <InvoicesCount>${batchTotals.totalCount}</InvoicesCount>\n  <InvoiceList>\n`;
      selectedInvoices.forEach(inv => {
        xml += `    <Invoice>\n      <ID>${inv.invoiceNumber}</ID>\n      <Type>${inv.type}</Type>\n      <Entity>${inv.entityName}</Entity>\n      <Amount>${inv.amount.toFixed(2)}</Amount>\n      <BankName>${inv.matchedBankName}</BankName>\n      <BankRef>${inv.matchedBankRef || ''}</BankRef>\n    </Invoice>\n`;
      });
      xml += `  </InvoiceList>\n</InvoiceBatch>`;
      return xml;
    } else {
      // CSV_INVOICE_RECON / QUICKBOOKS
      const header = "BATCH_ID,INVOICE_NUMBER,TYPE,ENTITY_NAME,INVOICE_DATE,DUE_DATE,AMOUNT,CURRENCY,BANK_NAME,MATCHED_REF,STATUS\n";
      const rows = selectedInvoices.map(inv => 
        `"${batchId}","${inv.invoiceNumber}","${inv.type}","${inv.entityName}","${inv.date}","${inv.dueDate}",${inv.amount.toFixed(2)},"${inv.currency}","${inv.matchedBankName}","${inv.matchedBankRef || ''}","${inv.status}"`
      ).join("\n");
      return header + rows;
    }
  }, [batchId, batchName, format, postingDate, batchTotals, selectedInvoices]);

  // Copy Preview
  const handleCopyPreview = () => {
    navigator.clipboard.writeText(generatedEtlContent);
    setIsCopiedFile(true);
    setTimeout(() => setIsCopiedFile(false), 2000);
  };

  // Submit Handler
  const handleCreateSubmit = (statusToSave: 'Ready' | 'Draft') => {
    if (selectedInvoices.length === 0) {
      alert('Please select at least one reconciled invoice for this batch.');
      return;
    }

    const newBatch: InvoiceBatch = {
      id: batchId,
      name: batchName.trim() || `Invoice_Batch_${new Date().toISOString().slice(0, 10)}`,
      format,
      status: statusToSave,
      invoiceIds: selectedInvoices.map(i => i.id),
      invoices: selectedInvoices,
      totalInvoicesCount: batchTotals.totalCount,
      totalAmount: batchTotals.totalAmount,
      arAmount: batchTotals.arAmount,
      apAmount: batchTotals.apAmount,
      currency: 'USD',
      createdBy: 'Dharmendra Joshi',
      createdAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      lastModified: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      postingDate,
      exportDestination: format === 'NETSUITE_INVOICE_SYNC' ? 'Oracle NetSuite AP/AR Feed' : format === 'SAP_AR_AP_FEED' ? 'SAP Financials AP/AR Feed' : 'Accounting File Importer',
      fileSize: `${Math.max(10, Math.round(generatedEtlContent.length / 1024))} KB`,
      notes
    };

    onCreateBatch(newBatch);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-xs flex items-center justify-center animate-in fade-in duration-150 font-sans">
      {/* 100% Full Screen Modal Container (Matching CreateBatchModal layout) */}
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col w-full h-[96vh] max-w-[1720px] overflow-hidden">
        
        {/* TOP MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 text-[#EA580C] rounded-lg border border-orange-200 shadow-2xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-gray-900 tracking-tight uppercase font-['Open_Sans',sans-serif]">
                  CREATE NEW INVOICE BATCH
                </h2>
                <span className="bg-[#EA580C] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full font-mono shadow-2xs">
                  Reconciled Invoices Feed
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Select specific reconciled customer and vendor invoices to compile into ERP-ready posting batches.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 bg-white px-3.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-gray-900">{batchTotals.totalCount}</span> Invoices Selected
              <span className="text-gray-300">|</span>
              <span className="font-semibold text-amber-700">AP: ${batchTotals.apAmount.toLocaleString()}</span>
              <span className="text-gray-300">|</span>
              <span className="font-semibold text-emerald-700">AR: ${batchTotals.arAmount.toLocaleString()}</span>
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
              Invoice Batch ID
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
              placeholder="e.g. Consolidated_Invoice_August_2026_Export"
              className="w-full px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-[#EA580C] focus:outline-hidden"
            />
          </div>
        </div>

        {/* MAIN BODY AREA */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F6F8FA]">
          {activeTab === 'invoices' ? (
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
                    placeholder="Search by Invoice # (INV-...), Customer/Vendor, Bank, Matched Ref, or Amount..."
                    className="w-full pl-8.5 pr-3 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#EA580C] focus:bg-white focus:outline-hidden"
                  />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Type Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-gray-500">Type:</span>
                    <select
                      value={selectedTypeFilter}
                      onChange={(e) => setSelectedTypeFilter(e.target.value as any)}
                      className="px-2 py-1 text-xs bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EA580C] focus:outline-hidden cursor-pointer font-medium"
                    >
                      <option value="All">All Types (AP & AR)</option>
                      <option value="AP">AP (Vendor Bills)</option>
                      <option value="AR">AR (Customer Invoices)</option>
                    </select>
                  </div>

                  {/* Bank Filter */}
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    <select
                      value={selectedBankFilter}
                      onChange={(e) => setSelectedBankFilter(e.target.value)}
                      className="px-2 py-1 text-xs bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EA580C] focus:outline-hidden cursor-pointer font-medium"
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
                    <span>Status: Matched ({allReconciledInvoices.length})</span>
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

              {/* INVOICES SELECTION TABLE (MATCHING EXACT COMPACT STYLING) */}
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
                        <th className="py-2 px-3 min-w-[100px]">Invoice Date</th>

                        {/* BANK NAME */}
                        <th className="py-2 px-3 min-w-[140px]">Bank Name</th>

                        {/* INVOICE NUMBER */}
                        <th className="py-2 px-3 min-w-[130px]">Invoice #</th>

                        {/* ENTITY NAME & TYPE */}
                        <th className="py-2 px-3 min-w-[220px]">Customer / Vendor</th>

                        {/* MATCHED BANK REF */}
                        <th className="py-2 px-3 min-w-[150px]">Matched Bank Ref</th>

                        {/* AMOUNT */}
                        <th className="py-2 px-3 text-right min-w-[120px]">Amount</th>

                        {/* MATCH STATUS */}
                        <th className="py-2 px-3 text-center min-w-[130px]">Match Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-gray-400">
                            <div className="max-w-sm mx-auto text-center space-y-1.5">
                              <AlertCircle className="w-5 h-5 text-gray-300 mx-auto" />
                              <p className="font-semibold text-gray-600 text-xs">No invoices found</p>
                              <p className="text-[11px] text-gray-400">Try adjusting your search query or filter options.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredInvoices.map((inv) => {
                          const key = `${inv.sourceRunId}_${inv.id}`;
                          const isSelected = selectedInvoiceKeys.has(key);
                          const isExpanded = expandedRows.has(key);

                          return (
                            <React.Fragment key={key}>
                              <tr
                                onClick={() => handleToggleInvoice(key)}
                                className={`cursor-pointer transition-colors ${
                                  isExpanded
                                    ? 'bg-[#FFF8F3] border-l-4 border-l-[#EA580C]'
                                    : isSelected 
                                      ? 'bg-orange-50/70 hover:bg-orange-50/90' 
                                      : 'hover:bg-gray-50'
                                }`}
                              >
                                {/* Checkbox */}
                                <td className="py-1.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleInvoice(key)}
                                    className="cursor-pointer text-gray-400 hover:text-[#EA580C] transition-colors inline-flex items-center justify-center"
                                  >
                                    {isSelected ? (
                                      <CheckSquare className="w-3.5 h-3.5 text-[#EA580C]" />
                                    ) : (
                                      <Square className="w-3.5 h-3.5 text-gray-300" />
                                    )}
                                  </button>
                                </td>

                                {/* INVOICE DATE */}
                                <td className="py-1.5 px-3 font-mono text-gray-700 whitespace-nowrap text-xs">
                                  {inv.date}
                                </td>

                                {/* BANK NAME */}
                                <td className="py-1.5 px-3 whitespace-nowrap text-xs text-gray-800 font-medium">
                                  <div className="flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                    <span className="truncate max-w-[160px]">{inv.matchedBankName}</span>
                                  </div>
                                </td>

                                {/* INVOICE NUMBER */}
                                <td className="py-1.5 px-3 font-mono font-bold text-gray-900 whitespace-nowrap text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <span>{inv.invoiceNumber}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopyRef(inv.invoiceNumber, e)}
                                      className="text-gray-400 hover:text-gray-700 p-0.5 rounded cursor-pointer transition-colors"
                                      title={copiedRef === inv.invoiceNumber ? 'Copied!' : 'Copy Invoice #'}
                                    >
                                      {copiedRef === inv.invoiceNumber ? (
                                        <Check className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <FileText className="w-3 h-3 text-gray-400 hover:text-[#EA580C]" />
                                      )}
                                    </button>
                                  </div>
                                </td>

                                {/* CUSTOMER / VENDOR */}
                                <td className="py-1.5 px-3 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border shrink-0 ${
                                      inv.type === 'AP' 
                                        ? 'bg-amber-50 text-amber-800 border-amber-200' 
                                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    }`}>
                                      {inv.type}
                                    </span>
                                    <span className="font-bold text-gray-900 truncate max-w-[180px]">
                                      {inv.entityName}
                                    </span>
                                  </div>
                                  {inv.description && (
                                    <span className="text-[10px] text-gray-400 block truncate max-w-[220px] mt-0.5">
                                      {inv.description}
                                    </span>
                                  )}
                                </td>

                                {/* MATCHED BANK REF */}
                                <td className="py-1.5 px-3 font-mono text-gray-700 whitespace-nowrap text-xs">
                                  {inv.matchedBankRef ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-gray-800">{inv.matchedBankRef}</span>
                                      <button
                                        type="button"
                                        onClick={(e) => handleCopyRef(inv.matchedBankRef!, e)}
                                        className="text-gray-400 hover:text-gray-700 p-0.5 rounded cursor-pointer transition-colors"
                                        title={copiedRef === inv.matchedBankRef ? 'Copied!' : 'Copy Ref'}
                                      >
                                        {copiedRef === inv.matchedBankRef ? (
                                          <Check className="w-3 h-3 text-emerald-600" />
                                        ) : (
                                          <FileText className="w-3 h-3 text-gray-400 hover:text-[#EA580C]" />
                                        )}
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 italic font-normal">—</span>
                                  )}
                                </td>

                                {/* AMOUNT */}
                                <td className="py-1.5 px-3 text-right font-mono font-bold text-gray-900 whitespace-nowrap text-xs">
                                  ${inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>

                                {/* MATCH STATUS / EXPAND BUTTON */}
                                <td className="py-1.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={(e) => toggleRowExpand(key, e)}
                                    className="inline-flex items-center justify-center gap-1.5 cursor-pointer py-0.5 px-2 rounded hover:bg-gray-100 transition-colors"
                                  >
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>100% Matched</span>
                                    </span>
                                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180 text-orange-600' : ''}`} />
                                  </button>
                                </td>
                              </tr>

                              {/* EXPANDED ACCORDION ROW FOR DETAILS */}
                              {isExpanded && (
                                <tr className="bg-[#FFF8F3] border-b-2 border-orange-200/80">
                                  <td colSpan={8} className="p-3.5 pl-10">
                                    <div className="bg-white border border-orange-200/90 rounded-xl p-3.5 shadow-xs space-y-2.5 ring-1 ring-orange-100/80">
                                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 pb-2">
                                        <div className="flex items-center gap-2">
                                          <Receipt className="w-4 h-4 text-[#EA580C]" />
                                          <span className="text-xs font-bold text-gray-800">
                                            Invoice Line Details ({inv.invoiceNumber})
                                          </span>
                                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                            inv.type === 'AP' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                          }`}>
                                            {inv.type === 'AP' ? 'Accounts Payable Bill' : 'Accounts Receivable Invoice'}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs font-mono">
                                          <span className="text-gray-500 font-sans">Due Date: <strong className="text-gray-800">{inv.dueDate}</strong></span>
                                          <span className="text-gray-500 font-sans">Confidence: <strong className="text-emerald-700">{inv.matchConfidence || 100}%</strong></span>
                                        </div>
                                      </div>

                                      {/* Match Details breakdown */}
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                        <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Customer / Vendor Entity</span>
                                          <span className="font-bold text-gray-900 block">{inv.entityName}</span>
                                          <span className="text-[11px] text-gray-500">{inv.description || 'Commercial trading balance'}</span>
                                        </div>

                                        <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Matched Bank Origin</span>
                                          <div className="flex items-center gap-1 text-gray-900 font-semibold">
                                            <Building2 className="w-3.5 h-3.5 text-gray-500" />
                                            <span>{inv.matchedBankName}</span>
                                          </div>
                                          <span className="text-[11px] text-gray-500 font-mono">Txn Ref: {inv.matchedBankRef || 'N/A'}</span>
                                        </div>

                                        <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
                                          <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block mb-1">Posting Reconciliation Value</span>
                                          <span className="text-sm font-bold font-mono text-gray-900 block">
                                            ${inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {inv.currency}
                                          </span>
                                          <span className="text-[10px] text-emerald-700 font-medium">Reconciled to general ledger</span>
                                        </div>
                                      </div>
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
                    onClick={() => setActiveTab('invoices')}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 border border-gray-200 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                    title="Back to Selection"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Invoices</span>
                  </button>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 font-['Open_Sans',sans-serif]">
                      Generated Invoice Stream ({format})
                    </h3>
                    <p className="text-xs text-gray-500">
                      Compiled directly from {batchTotals.totalCount} selected invoices (AP: ${batchTotals.apAmount.toLocaleString()} | AR: ${batchTotals.arAmount.toLocaleString()}).
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
                      const ext = format === 'XML_PEPPOL_UBL' ? 'xml' : format === 'JSON_INVOICE_STREAM' ? 'json' : 'csv';
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
              disabled={selectedInvoices.length === 0}
              onClick={() => handleCreateSubmit('Ready')}
              className={`px-5 py-2 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-xs transition-colors cursor-pointer ${
                selectedInvoices.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#EA580C] hover:bg-[#D94E07] active:bg-[#C2410C]'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate & Create Batch ({selectedInvoices.length} Invoices)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
