import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Layers, 
  Download, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileSpreadsheet, 
  Share2, 
  Trash2, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Database,
  Building2,
  FileCode2,
  Sparkles,
  MoreHorizontal
} from 'lucide-react';
import { ETLBatch, BatchStatus } from '../types/reconciliation';

interface EtlBatchesTableProps {
  batches: ETLBatch[];
  onCreateNewBatch: () => void;
  onViewBatch: (batch: ETLBatch) => void;
  onDeleteBatch: (batchId: string) => void;
  onExportBatch: (batch: ETLBatch) => void;
}

export const EtlBatchesTable: React.FC<EtlBatchesTableProps> = ({
  batches,
  onCreateNewBatch,
  onViewBatch,
  onDeleteBatch,
  onExportBatch
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | BatchStatus>('All');
  const [formatFilter, setFormatFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<'id' | 'name' | 'status' | 'createdBy' | 'lastModified' | 'totalAmount'>('lastModified');
  const [sortAsc, setSortAsc] = useState(false);
  const [entriesPerPage, setEntriesPerPage] = useState<number>(15);
  const [currentPage, setCurrentPage] = useState<number>(1);
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
    return batches
      .filter((batch) => {
        const matchesSearch =
          batch.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          batch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          batch.createdBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
          batch.reconciliationNames.some(name => name.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = statusFilter === 'All' || batch.status === statusFilter;
        const matchesFormat = formatFilter === 'All' || batch.format === formatFilter;

        return matchesSearch && matchesStatus && matchesFormat;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortField === 'id') {
          comparison = a.id.localeCompare(b.id);
        } else if (sortField === 'name') {
          comparison = a.name.localeCompare(b.name);
        } else if (sortField === 'status') {
          comparison = a.status.localeCompare(b.status);
        } else if (sortField === 'createdBy') {
          comparison = a.createdBy.localeCompare(b.createdBy);
        } else if (sortField === 'lastModified') {
          comparison = a.lastModified.localeCompare(b.lastModified);
        } else if (sortField === 'totalAmount') {
          comparison = a.totalAmount - b.totalAmount;
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
    return { totalCount, readyCount, exportedCount, totalAmount };
  }, [batches]);

  // Download Sample ETL File
  const handleDownloadEtlFile = (batch: ETLBatch, e: React.MouseEvent) => {
    e.stopPropagation();
    const mockContent = `BATCH_ID,STATEMENT_NAME,POSTING_DATE,AMOUNT,STATUS\n${batch.id},"${batch.name}",${batch.postingDate || '2026-08-31'},${batch.totalAmount},${batch.status}`;
    const ext = batch.format === 'XML_CAMT054' ? 'xml' : batch.format === 'JSON_PAYMENTS' ? 'json' : 'csv';
    const blob = new Blob([mockContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${batch.name}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFormatBadge = (format: string) => {
    switch (format) {
      case 'CSV_ERP':
        return { label: 'SAP CSV', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'CSV_NETSUITE':
        return { label: 'NetSuite CSV', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'XML_CAMT054':
        return { label: 'Camt.054 XML', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'QUICKBOOKS_IIF':
        return { label: 'QuickBooks IIF', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'JSON_PAYMENTS':
        return { label: 'JSON Stream', bg: 'bg-teal-50 text-teal-700 border-teal-200' };
      default:
        return { label: format, bg: 'bg-gray-50 text-gray-700 border-gray-200' };
    }
  };

  const getStatusBadge = (status: BatchStatus) => {
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
              Total Batches
            </span>
            <span className="text-2xl font-black text-gray-900 mt-1 block">
              {stats.totalCount}
            </span>
            <span className="text-xs text-gray-400 mt-0.5 block">
              Derived from reconciliations
            </span>
          </div>
          <div className="p-3 bg-orange-50 text-[#EA580C] rounded-xl border border-orange-100">
            <Layers className="w-5 h-5" />
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
            <span className="text-xs text-gray-400 mt-0.5 block">
              Balanced & verified
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
            <span className="text-xs text-gray-400 mt-0.5 block">
              Posted to core ledger
            </span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Database className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-gray-500 text-[11px] font-bold uppercase tracking-wider block">
              Total Batched Value
            </span>
            <span className="text-2xl font-black text-gray-900 mt-1 block font-mono">
              ${stats.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-gray-400 mt-0.5 block">
              Across all currencies (USD)
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
            placeholder="Search by Batch ID, Name, Creator, or Reconciled Statement..."
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
              <option value="CSV_ERP">SAP CSV</option>
              <option value="CSV_NETSUITE">NetSuite CSV</option>
              <option value="XML_CAMT054">ISO 20022 Camt.054 XML</option>
              <option value="QUICKBOOKS_IIF">QuickBooks IIF</option>
              <option value="JSON_PAYMENTS">JSON Stream</option>
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

      {/* 3. ETL BATCHES TABLE */}
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
                        <Layers className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-gray-800 text-sm">No ETL Batches Found</h4>
                      <p className="text-xs text-gray-500">
                        {searchTerm ? 'Try adjusting your search criteria or filters.' : 'Create your first ETL batch by selecting reconciled bank statements.'}
                      </p>
                      <button
                        type="button"
                        onClick={onCreateNewBatch}
                        className="px-4 py-2 bg-[#EA580C] text-white rounded-lg font-bold text-xs hover:bg-[#D94E07] cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create New Batch</span>
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
                        <span className="text-[10px] text-gray-400 font-mono">
                          {batch.totalTransactionsCount} txns • {batch.totalInvoicesCount} invs
                        </span>
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

                      {/* 6. Action: Horizontal Three Line (Menu) with Hover Display */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div 
                          className="relative inline-block text-left group/action"
                          onMouseLeave={() => {
                            if (openMenuId === batch.id) {
                              setOpenMenuId(null);
                            }
                          }}
                        >
                          {/* Three Dots Button */}
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
                              Batch Actions
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
                                handleDownloadEtlFile(batch, e);
                              }}
                              className="w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <Download className="w-4 h-4 text-gray-500" />
                              <span>Download File</span>
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
                                <span>Sync to ERP</span>
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
            Showing <span className="font-bold text-gray-800">{Math.min(filteredBatches.length, entriesPerPage)}</span> of <span className="font-bold text-gray-800">{filteredBatches.length}</span> batch records
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
