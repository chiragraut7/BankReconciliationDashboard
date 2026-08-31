import React, { useState } from 'react';
import { 
  Eye, 
  Search, 
  CheckCircle2, 
  Lock, 
  FileText, 
  ArrowUpDown, 
  Building2, 
  Filter,
  Layers,
  Calendar
} from 'lucide-react';
import { ReconciliationRun } from '../types/reconciliation';
import { formatCurrency } from '../utils/formatters';

interface ReconciliationListTableProps {
  runs: ReconciliationRun[];
  onViewRun: (run: ReconciliationRun) => void;
  onAddNew: () => void;
}

export const ReconciliationListTable: React.FC<ReconciliationListTableProps> = ({
  runs,
  onViewRun,
  onAddNew
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Locked' | 'Saved'>('All');
  const [sortField, setSortField] = useState<'id' | 'reconciliationDate' | 'bankName' | 'totalAmount' | 'invoiceReconciliation'>('id');
  const [sortAsc, setSortAsc] = useState(false);
  const [entriesPerPage, setEntriesPerPage] = useState<number>(15);

  const getInvoiceStats = (run: ReconciliationRun) => {
    const total = run.invoicesTotalCount ?? (run.invoices?.length || 20);
    const reconciled = run.invoicesReconciledCount ?? (run.invoices?.filter(inv => inv.matchedBankTxnId).length || run.matchedCount || 0);
    const percentage = total > 0 ? Math.round((reconciled / total) * 100) : 100;
    return { total, reconciled, percentage };
  };

  const handleSort = (field: 'id' | 'reconciliationDate' | 'bankName' | 'totalAmount' | 'invoiceReconciliation') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const filteredRuns = runs
    .filter((run) => {
      const matchesSearch = 
        run.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        run.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (run.reconciliationDate && run.reconciliationDate.toLowerCase().includes(searchTerm.toLowerCase())) ||
        run.statementFileName.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;
      if (statusFilter === 'All') return true;
      return run.status === statusFilter;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'id') {
        comparison = a.id.localeCompare(b.id);
      } else if (sortField === 'reconciliationDate') {
        comparison = (a.reconciliationDate || '').localeCompare(b.reconciliationDate || '');
      } else if (sortField === 'bankName') {
        comparison = a.bankName.localeCompare(b.bankName);
      } else if (sortField === 'totalAmount') {
        comparison = a.totalAmount - b.totalAmount;
      } else if (sortField === 'invoiceReconciliation') {
        const statsA = getInvoiceStats(a);
        const statsB = getInvoiceStats(b);
        comparison = statsA.percentage - statsB.percentage;
      }
      return sortAsc ? comparison : -comparison;
    });

  return (
    <div className="space-y-4">
      {/* Table Filter & Search Controls Bar */}
      <div className="bg-white p-3.5 border border-gray-200 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ID, bank, date..."
            className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#EA580C] focus:bg-white transition-colors"
          />
        </div>

        {/* Status Filters and Entries per page */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 font-medium hidden md:inline">Status:</span>
            {(['All', 'Locked', 'Saved'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                  statusFilter === filter
                    ? 'bg-[#EA580C] text-white shadow-2xs font-bold'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-gray-200 hidden sm:block" />

          {/* Entries per page */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="hidden sm:inline">Show</span>
            <select
              value={entriesPerPage}
              onChange={(e) => setEntriesPerPage(Number(e.target.value))}
              className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 focus:outline-none focus:border-[#EA580C] cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Reconciliation Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px] select-none">
                <th 
                  onClick={() => handleSort('id')} 
                  className="py-3 px-4 cursor-pointer hover:text-gray-900 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Reconciliation ID</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('reconciliationDate')} 
                  className="py-3 px-4 cursor-pointer hover:text-gray-900 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Reconciliation Date</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('bankName')} 
                  className="py-3 px-4 cursor-pointer hover:text-gray-900 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Bank Name</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('totalAmount')} 
                  className="py-3 px-4 text-right cursor-pointer hover:text-gray-900 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Reconciliation Amount</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('invoiceReconciliation')} 
                  className="py-3 px-4 cursor-pointer hover:text-gray-900 transition-colors min-w-[190px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Invoice Reconciliation</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">
                  <span>Status</span>
                </th>
                <th className="py-3 px-4 text-right">
                  <span>Action</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRuns.slice(0, entriesPerPage).map((run) => {
                const stats = getInvoiceStats(run);
                return (
                  <tr 
                    key={run.id}
                    className="hover:bg-orange-50/30 transition-colors group"
                  >
                    {/* A. Reconciliation ID */}
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <div className="flex items-center gap-2">
                        <span className="text-[#EA580C] hover:underline cursor-pointer" onClick={() => onViewRun(run)}>
                          {run.id}
                        </span>
                        {run.refNumber && (
                          <span className="text-[10px] text-gray-400 font-sans font-normal">
                            ({run.refNumber})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* B. Reconciliation Date */}
                    <td className="py-3.5 px-4 font-mono text-gray-700">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{run.reconciliationDate || run.createdAt}</span>
                      </div>
                    </td>

                    {/* C. Bank Name */}
                    <td className="py-3.5 px-4 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        <span>{run.bankName}</span>
                        <span className="text-[11px] font-mono text-gray-400">
                          {run.accountNumber}
                        </span>
                      </div>
                    </td>

                    {/* D. Reconciliation Amount */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900 text-sm">
                      {formatCurrency(run.totalAmount, run.currency || 'USD')}
                    </td>

                    {/* E. Invoice Reconciliation Progress */}
                    <td className="py-3.5 px-4 min-w-[190px]">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-gray-900">
                            {stats.reconciled} / {stats.total} Matched
                          </span>
                          <span className={`font-bold font-mono text-[11px] ${
                            stats.percentage === 100 ? 'text-emerald-600' : 'text-[#EA580C]'
                          }`}>
                            {stats.percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              stats.percentage === 100 ? 'bg-emerald-600' : 'bg-[#EA580C]'
                            }`} 
                            style={{ width: `${stats.percentage}%` }} 
                          />
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        run.status === 'Locked' 
                          ? 'bg-gray-100 text-gray-700 border-gray-300' 
                          : run.status === 'Saved' 
                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {run.status === 'Locked' && <Lock className="w-2.5 h-2.5" />}
                        {run.status === 'Saved' && <CheckCircle2 className="w-2.5 h-2.5" />}
                        <span>{run.status || 'Saved'}</span>
                      </span>
                    </td>

                    {/* F. Action (Display: [ View ]) */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onViewRun(run)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-orange-50/60 text-[#EA580C] hover:text-[#D94E07] border border-orange-200 hover:border-[#EA580C] rounded-md font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-4 py-3 bg-gray-50/70 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-2">
          <span>
            Showing <strong className="text-gray-800">{Math.min(filteredRuns.length, 1)}</strong> to <strong className="text-gray-800">{Math.min(filteredRuns.length, entriesPerPage)}</strong> of <strong className="text-gray-800">{filteredRuns.length}</strong> reconciliations
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-400">4see PRO High-Density Audit Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
};
