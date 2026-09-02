import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  ArrowUpDown, 
  Receipt, 
  Download, 
  Eye, 
  CheckCircle2, 
  Clock, 
  FileSpreadsheet, 
  Share2, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Building2, 
  MoreHorizontal,
  Layers,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { InvoiceBatch, InvoiceBatchStatus } from '../types/reconciliation';

interface InvoiceBatchesTableProps {
  batches: InvoiceBatch[];
  onCreateNewBatch: () => void;
  onViewBatch: (batch: InvoiceBatch) => void;
  onDeleteBatch: (batchId: string) => void;
  onExportBatch: (batch: InvoiceBatch) => void;
}

export const InvoiceBatchesTable: React.FC<InvoiceBatchesTableProps> = ({
  batches,
  onCreateNewBatch,
  onViewBatch,
  onDeleteBatch,
  onExportBatch
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | InvoiceBatchStatus>('All');
  const [formatFilter, setFormatFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<'id' | 'name' | 'status' | 'createdBy' | 'lastModified' | 'totalAmount'>('lastModified');
  const [sortAsc, setSortAsc] = useState(false);
  const [entriesPerPage, setEntriesPerPage] = useState<number>(15);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Sorting handler
  const handleSort = (field: 'id' | 'name' | 'status' | 'createdBy' | 'lastModified' | 'totalAmount') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Filtered & Sorted batches
  const filteredBatches = useMemo(() => {
    return (batches || [])
      .filter((batch) => {
        const q = searchTerm.toLowerCase().trim();
        const matchesSearch = !q ||
          (batch.id || '').toLowerCase().includes(q) ||
          (batch.name || '').toLowerCase().includes(q) ||
          (batch.createdBy || '').toLowerCase().includes(q) ||
          (batch.invoices || []).some(inv => 
            (inv.entityName || '').toLowerCase().includes(q) ||
            (inv.invoiceNumber || '').toLowerCase().includes(q) ||
            (inv.matchedBankName || '').toLowerCase().includes(q)
          );

        const matchesStatus = statusFilter === 'All' || batch.status === statusFilter;
        const matchesFormat = formatFilter === 'All' || batch.format === formatFilter;

        return matchesSearch && matchesStatus && matchesFormat;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortField === 'id') {
          comparison = (a.id || '').localeCompare(b.id || '');
        } else if (sortField === 'name') {
          comparison = (a.name || '').localeCompare(b.name || '');
        } else if (sortField === 'status') {
          comparison = (a.status || '').localeCompare(b.status || '');
        } else if (sortField === 'createdBy') {
          comparison = (a.createdBy || '').localeCompare(b.createdBy || '');
        } else if (sortField === 'lastModified') {
          comparison = (a.lastModified || '').localeCompare(b.lastModified || '');
        } else if (sortField === 'totalAmount') {
          comparison = (a.totalAmount || 0) - (b.totalAmount || 0);
        }
        return sortAsc ? comparison : -comparison;
      });
  }, [batches, searchTerm, statusFilter, formatFilter, sortField, sortAsc]);

  // Statistics
  const stats = useMemo(() => {
    const list = batches || [];
    const totalCount = list.length;
    const readyCount = list.filter(b => b.status === 'Ready').length;
    const exportedCount = list.filter(b => b.status === 'Exported').length;
    const totalAmount = list.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
    const totalInvoices = list.reduce((acc, b) => acc + (b.totalInvoicesCount || 0), 0);
    return { totalCount, readyCount, exportedCount, totalAmount, totalInvoices };
  }, [batches]);

  // Download Sample Invoice ETL File
  const handleDownloadInvoiceFile = (batch: InvoiceBatch, e: React.MouseEvent) => {
    e.stopPropagation();
    let csvHeader = "INVOICE_NUMBER,TYPE,ENTITY_NAME,DATE,DUE_DATE,AMOUNT,CURRENCY,BANK_NAME,MATCHED_TXN,STATUS\n";
    let rows = (batch.invoices || []).map(inv => 
      `"${inv.invoiceNumber || ''}","${inv.type || ''}","${inv.entityName || ''}","${inv.date || ''}","${inv.dueDate || ''}",${inv.amount || 0},"${inv.currency || ''}","${inv.matchedBankName || ''}","${inv.matchedBankTxnId || ''}","${inv.status || ''}"`
    ).join("\n");
    const mockContent = csvHeader + rows;
    const blob = new Blob([mockContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${batch.name || 'batch'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFormatBadge = (format: string) => {
    switch (format) {
      case 'YARDI_VOYAGER_LOADER':
        return { label: 'Yardi PayScan', bg: 'bg-orange-50 text-[#EA580C] border-orange-200' };
      case 'NETSUITE_INVOICE_SYNC':
        return { label: 'NetSuite Sync', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'SAP_AR_AP_FEED':
        return { label: 'SAP AP/AR Feed', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'QUICKBOOKS_INVOICE_JOURNAL':
        return { label: 'QuickBooks IIF', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'CSV_INVOICE_RECON':
        return { label: 'Reconciliation CSV', bg: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 'JSON_INVOICE_STREAM':
        return { label: 'JSON Stream', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'XML_PEPPOL_UBL':
        return { label: 'PEPPOL UBL XML', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      default:
        return { label: format, bg: 'bg-gray-50 text-gray-700 border-gray-200' };
    }
  };

  const getStatusBadge = (status: InvoiceBatchStatus) => {
    switch (status) {
      case 'Ready':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Exported':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Processing':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Draft':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'Failed':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP SUMMARY METRICS STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-gray-500 text-[11px] font-bold uppercase tracking-wider block">
              Total Invoice Batches
            </span>
            <span className="text-2xl font-black text-gray-900 mt-1 block">
              {stats.totalCount}
            </span>
            <span className="text-xs text-gray-400 mt-0.5 block font-medium">
              {stats.totalInvoices} Reconciled Invoices
            </span>
          </div>
          <div className="p-3 bg-orange-50 text-[#EA580C] rounded-xl border border-orange-100">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-gray-500 text-[11px] font-bold uppercase tracking-wider block">
              Ready to Export
            </span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">
              {stats.readyCount}
            </span>
            <span className="text-xs text-gray-400 mt-0.5 block font-medium">
              Matched & verified against bank
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-gray-500 text-[11px] font-bold uppercase tracking-wider block">
              Synchronized / Exported
            </span>
            <span className="text-2xl font-black text-blue-600 mt-1 block">
              {stats.exportedCount}
            </span>
            <span className="text-xs text-gray-400 mt-0.5 block font-medium">
              Posted to AP/AR ledger
            </span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Share2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-gray-500 text-[11px] font-bold uppercase tracking-wider block">
              Total Invoices Value
            </span>
            <span className="text-2xl font-black text-gray-900 mt-1 block font-mono">
              ${stats.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-gray-400 mt-0.5 block font-medium">
              Across all AP & AR batches
            </span>
          </div>
          <div className="p-3 bg-gray-50 text-gray-700 rounded-xl border border-gray-200">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. TABLE TOOLBAR & CONTROLS */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Invoice Batch ID, Name, Creator, Customer/Vendor, or Bank..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#EA580C] focus:bg-white focus:outline-hidden"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EA580C] focus:outline-hidden cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Ready">Ready</option>
              <option value="Exported">Exported</option>
              <option value="Processing">Processing</option>
              <option value="Draft">Draft</option>
            </select>
          </div>

          {/* Format Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500">Format:</span>
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EA580C] focus:outline-hidden cursor-pointer"
            >
              <option value="All">All Formats</option>
              <option value="YARDI_VOYAGER_LOADER">Yardi PayScan / GL Loader</option>
              <option value="NETSUITE_INVOICE_SYNC">NetSuite Sync</option>
              <option value="SAP_AR_AP_FEED">SAP AP/AR Feed</option>
              <option value="QUICKBOOKS_INVOICE_JOURNAL">QuickBooks IIF</option>
              <option value="CSV_INVOICE_RECON">Reconciliation CSV</option>
              <option value="JSON_INVOICE_STREAM">JSON Stream</option>
              <option value="XML_PEPPOL_UBL">PEPPOL UBL XML</option>
            </select>
          </div>

          {/* Entries per page */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500">Show:</span>
            <select
              value={entriesPerPage}
              onChange={(e) => setEntriesPerPage(Number(e.target.value))}
              className="px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EA580C] focus:outline-hidden cursor-pointer font-mono"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. INVOICE BATCHES TABLE */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 select-none">
                {/* 1. Batch ID */}
                <th
                  onClick={() => handleSort('id')}
                  className="py-3 px-4 cursor-pointer hover:text-gray-900 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Batch ID</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>

                {/* 2. Batch Name */}
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-gray-900 transition-colors min-w-[220px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Batch Name</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>

                {/* Volume / Records */}
                <th
                  onClick={() => handleSort('totalAmount')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-gray-900 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Total Amount</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>

                {/* 3. Status */}
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-4 text-center cursor-pointer hover:text-gray-900 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>

                {/* 4. Created By */}
                <th
                  onClick={() => handleSort('createdBy')}
                  className="py-3 px-4 cursor-pointer hover:text-gray-900 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Created By</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>

                {/* 5. Last Modify */}
                <th
                  onClick={() => handleSort('lastModified')}
                  className="py-3 px-4 cursor-pointer hover:text-gray-900 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Last Modify</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>

                {/* 6. Action Buttons */}
                <th className="py-3 px-4 text-center">
                  <span>Action</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="max-w-xs mx-auto text-center space-y-3">
                      <div className="w-12 h-12 bg-orange-50 text-[#EA580C] rounded-full flex items-center justify-center mx-auto border border-orange-100">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-gray-800 text-sm">No Invoice Batches Found</h4>
                      <p className="text-xs text-gray-500">
                        {searchTerm ? 'Try adjusting your search criteria or filters.' : 'Create your first invoice batch by selecting reconciled invoices.'}
                      </p>
                      <button
                        type="button"
                        onClick={onCreateNewBatch}
                        className="px-4 py-2 bg-[#EA580C] text-white rounded-lg font-bold text-xs hover:bg-[#D94E07] cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Invoice Batch</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBatches.slice(0, entriesPerPage).map((batch) => {
                  const formatBadge = getFormatBadge(batch.format);
                  const statusClass = getStatusBadge(batch.status);

                  return (
                    <tr
                      key={batch.id}
                      onClick={() => onViewBatch(batch)}
                      className="hover:bg-gray-50/90 transition-colors cursor-pointer group"
                    >
                      {/* 1. Batch ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-gray-900 bg-gray-100 group-hover:bg-orange-100 group-hover:text-[#EA580C] px-2 py-0.5 rounded border border-gray-200 transition-colors">
                            {batch.id}
                          </span>
                        </div>
                      </td>

                      {/* 2. Batch Name & Format */}
                      <td className="py-3.5 px-4 min-w-[220px]">
                        <div>
                          <span className="font-bold text-gray-900 block truncate group-hover:text-[#EA580C] transition-colors">
                            {batch.name}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.2 rounded-full border ${formatBadge.bg}`}>
                              {formatBadge.label}
                            </span>
                            {batch.fileSize && (
                              <span className="text-[10px] text-gray-400 font-mono">
                                {batch.fileSize}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono font-bold text-gray-900 block">
                          ${batch.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <div className="flex items-center justify-end gap-2 text-[10px] text-gray-400 font-mono mt-0.5">
                          <span className="text-gray-600 font-bold">{batch.totalInvoicesCount} invoices</span>
                          {batch.apAmount > 0 && (
                            <span className="text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                              AP ${batch.apAmount.toLocaleString()}
                            </span>
                          )}
                          {batch.arAmount > 0 && (
                            <span className="text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200">
                              AR ${batch.arAmount.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusClass}`}>
                          {batch.status === 'Ready' && <CheckCircle2 className="w-3 h-3" />}
                          {batch.status === 'Exported' && <CheckCircle2 className="w-3 h-3 text-blue-600" />}
                          {batch.status === 'Processing' && <Clock className="w-3 h-3 animate-spin" />}
                          {batch.status === 'Draft' && <Clock className="w-3 h-3" />}
                          <span>{batch.status}</span>
                        </span>
                      </td>

                      {/* 4. Created By */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold font-mono shrink-0">
                            {batch.createdBy.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="font-medium text-gray-700 truncate max-w-[130px]">
                            {batch.createdBy}
                          </span>
                        </div>
                      </td>

                      {/* 5. Last Modify */}
                      <td className="py-3.5 px-4 text-gray-600 font-mono text-[11px]">
                        {batch.lastModified}
                      </td>

                      {/* 6. Action Menu */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div 
                          className="relative inline-block text-left group/action"
                          onMouseLeave={() => {
                            if (openMenuId === batch.id) {
                              setOpenMenuId(null);
                            }
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setOpenMenuId(openMenuId === batch.id ? null : batch.id)}
                            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 group-hover/action:bg-gray-100 group-hover/action:text-gray-900 rounded-md border border-gray-200 transition-colors cursor-pointer shadow-2xs focus:outline-hidden"
                            title="Actions Menu"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {/* Hover Display Action Menu (only displays when hovering action button) */}
                          <div 
                            className={`absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1.5 z-40 transition-all duration-150 transform origin-top-right ${
                              openMenuId === batch.id 
                                ? 'opacity-100 scale-100 pointer-events-auto visible' 
                                : 'opacity-0 scale-95 pointer-events-none invisible group-hover/action:opacity-100 group-hover/action:scale-100 group-hover/action:pointer-events-auto group-hover/action:visible'
                            }`}
                          >
                            <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 mb-1">
                              Invoice Batch Actions
                            </div>

                            {/* View Batch */}
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                onViewBatch(batch);
                              }}
                              className="w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-[#EA580C] flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4 text-gray-500" />
                              <span>View Details</span>
                            </button>

                            {/* Download File */}
                            <button
                              type="button"
                              onClick={(e) => {
                                setOpenMenuId(null);
                                handleDownloadInvoiceFile(batch, e);
                              }}
                              className="w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <Download className="w-4 h-4 text-gray-500" />
                              <span>Download CSV</span>
                            </button>

                            {/* Export to ERP */}
                            {batch.status !== 'Exported' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onExportBatch(batch);
                                }}
                                className="w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <Share2 className="w-4 h-4 text-gray-500" />
                                <span>Sync to AP/AR</span>
                              </button>
                            )}

                            <div className="my-1 border-t border-gray-100" />

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                onDeleteBatch(batch.id);
                              }}
                              className="w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                              <span>Delete Batch</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION / FOOTER */}
        <div className="px-6 py-3.5 bg-gray-50/80 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div>
            Showing <span className="font-bold text-gray-800">{Math.min(filteredBatches.length, entriesPerPage)}</span> of <span className="font-bold text-gray-800">{filteredBatches.length}</span> invoice batches
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              className="p-1.5 text-gray-400 bg-white border border-gray-200 rounded-md cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 bg-white border border-gray-200 rounded-md font-bold text-gray-800 font-mono">
              1
            </span>
            <button
              type="button"
              disabled
              className="p-1.5 text-gray-400 bg-white border border-gray-200 rounded-md cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
