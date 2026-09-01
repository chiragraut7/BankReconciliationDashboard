import React, { useState, useMemo } from 'react';
import { 
  X, 
  Receipt, 
  Download, 
  Check, 
  Calendar, 
  Building2, 
  Share2, 
  CheckCircle2, 
  Search,
  FileText,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { InvoiceBatch, ReconciliationRun } from '../types/reconciliation';

interface ViewInvoiceBatchDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: InvoiceBatch | null;
  reconciliationRuns?: ReconciliationRun[];
  onExportToErp?: (batch: InvoiceBatch) => void;
}

export const ViewInvoiceBatchDetailsModal: React.FC<ViewInvoiceBatchDetailsModalProps> = ({
  isOpen,
  onClose,
  batch,
  onExportToErp
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'AR' | 'AP'>('All');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Filtered invoices for the table
  const filteredInvoices = useMemo(() => {
    if (!batch) return [];
    return (batch.invoices || []).filter(inv => {
      const matchesType = typeFilter === 'All' || inv.type === typeFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.entityName.toLowerCase().includes(q) ||
        inv.matchedBankName.toLowerCase().includes(q) ||
        (inv.matchedBankRef && inv.matchedBankRef.toLowerCase().includes(q)) ||
        (inv.description && inv.description.toLowerCase().includes(q)) ||
        inv.amount.toString().includes(q) ||
        inv.date.toLowerCase().includes(q);

      return matchesType && matchesSearch;
    });
  }, [batch, typeFilter, searchQuery]);

  if (!isOpen || !batch) return null;

  const handleCopyRef = (ref: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const handleDownload = () => {
    const isXml = batch.format === 'XML_PEPPOL_UBL';
    const isJson = batch.format === 'JSON_INVOICE_STREAM';
    let fileContent = '';
    let ext = 'csv';

    if (isJson) {
      ext = 'json';
      fileContent = JSON.stringify(batch, null, 2);
    } else if (isXml) {
      ext = 'xml';
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<InvoiceBatch xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">\n`;
      xml += `  <BatchID>${batch.id}</BatchID>\n`;
      xml += `  <BatchName>${batch.name}</BatchName>\n`;
      xml += `  <PostingDate>${batch.postingDate || '2026-08-31'}</PostingDate>\n`;
      xml += `  <TotalAmount currency="${batch.currency || 'USD'}">${batch.totalAmount.toFixed(2)}</TotalAmount>\n`;
      xml += `  <InvoicesCount>${batch.totalInvoicesCount}</InvoicesCount>\n  <InvoiceList>\n`;
      batch.invoices.forEach(inv => {
        xml += `    <Invoice>\n      <ID>${inv.invoiceNumber}</ID>\n      <Type>${inv.type}</Type>\n      <Entity>${inv.entityName}</Entity>\n      <Amount>${inv.amount.toFixed(2)}</Amount>\n      <BankName>${inv.matchedBankName}</BankName>\n      <BankRef>${inv.matchedBankRef || ''}</BankRef>\n    </Invoice>\n`;
      });
      xml += `  </InvoiceList>\n</InvoiceBatch>`;
      fileContent = xml;
    } else {
      ext = 'csv';
      const header = "BATCH_ID,INVOICE_NUMBER,TYPE,ENTITY_NAME,INVOICE_DATE,DUE_DATE,AMOUNT,CURRENCY,BANK_NAME,MATCHED_REF,STATUS\n";
      const rows = batch.invoices.map(inv => 
        `"${batch.id}","${inv.invoiceNumber}","${inv.type}","${inv.entityName}","${inv.date}","${inv.dueDate}",${inv.amount.toFixed(2)},"${inv.currency}","${inv.matchedBankName}","${inv.matchedBankRef || ''}","${inv.status}"`
      ).join("\n");
      fileContent = header + rows;
    }

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${batch.id}_${batch.name.replace(/\s+/g, '_')}_export.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleRowExpand = (rowKey: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedRowId(prev => (prev === rowKey ? null : rowKey));
  };

  return (
    <div className="fixed inset-0 z-50 p-3 sm:p-5 bg-black/65 backdrop-blur-xs flex items-center justify-center animate-in fade-in duration-150 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col w-full max-w-6xl max-h-[92vh] overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 text-[#EA580C] rounded-xl border border-orange-200 shadow-2xs">
              <Receipt className="w-5 h-5" />
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
                Created by <strong className="text-gray-700">{batch.createdBy}</strong> on {batch.createdAt} • Target: <span className="font-semibold text-gray-700">{batch.exportDestination || 'Oracle NetSuite AP/AR Feed'}</span>
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

            {/* Invoices Count & Breakdown */}
            <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                Invoices Breakdown
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-lg font-black text-gray-900 font-mono">
                  {batch.totalInvoicesCount}
                </span>
                <span className="text-xs text-gray-400 font-medium">/</span>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-mono">
                  AP: ${batch.apAmount.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-mono">
                  AR: ${batch.arAmount.toLocaleString()}
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
                placeholder="Search by Invoice # (INV-...), Customer/Vendor, Bank, Amount, or Matched Ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#EA580C] focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Type Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-gray-500">Type:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="px-2.5 py-1 text-xs bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EA580C] focus:outline-hidden cursor-pointer font-medium"
                >
                  <option value="All">All (AP & AR)</option>
                  <option value="AP">AP (Vendor Bills)</option>
                  <option value="AR">AR (Customer Invoices)</option>
                </select>
              </div>

              {/* Matched status indicator */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Status: Matched ({filteredInvoices.length})</span>
              </div>
            </div>
          </div>

          {/* COMPILED INVOICES TABLE */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                    {/* INVOICE DATE */}
                    <th className="py-2 px-3 min-w-[100px]">Invoice Date</th>

                    {/* BANK NAME */}
                    <th className="py-2 px-3 min-w-[140px]">Bank Name</th>

                    {/* INVOICE # */}
                    <th className="py-2 px-3 min-w-[130px]">Invoice #</th>

                    {/* CUSTOMER / VENDOR */}
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
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        <div className="max-w-sm mx-auto text-center space-y-1.5">
                          <AlertCircle className="w-5 h-5 text-gray-300 mx-auto" />
                          <p className="font-semibold text-gray-600 text-xs">No invoices match your search</p>
                          <p className="text-[11px] text-gray-400">Try clearing the search query or changing filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv, index) => {
                      const rowKey = `${inv.sourceRunId || 'run'}_${inv.id}_${index}`;
                      const isExpanded = expandedRowId === rowKey;

                      return (
                        <React.Fragment key={rowKey}>
                          <tr
                            onClick={(e) => toggleRowExpand(rowKey, e)}
                            className={`cursor-pointer transition-colors ${
                              isExpanded
                                ? 'bg-[#FFF8F3] border-l-4 border-l-[#EA580C]'
                                : 'hover:bg-gray-50'
                            }`}
                          >
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
                                  className="text-gray-400 hover:text-gray-700 cursor-pointer p-0.5 rounded"
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
                                    className="text-gray-400 hover:text-gray-700 cursor-pointer p-0.5 rounded"
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
                                onClick={(e) => toggleRowExpand(rowKey, e)}
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
                              <td colSpan={7} className="p-3.5 pl-10">
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
              if (onExportToErp) onExportToErp(batch);
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
