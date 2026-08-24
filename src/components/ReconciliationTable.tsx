import React, { useState } from 'react';
import { 
  Eye, 
  ArrowUpDown, 
  ChevronDown,
  FileText,
  Play,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { ReconciliationRun } from '../types/reconciliation';
import { formatCurrency } from '../utils/formatters';

interface ReconciliationTableProps {
  runs: ReconciliationRun[];
  onViewRun: (run: ReconciliationRun) => void;
  onContinueRun: (run: ReconciliationRun) => void;
  onViewStatement: (run: ReconciliationRun) => void;
  onDeleteRun: (runId: string) => void;
}

export const ReconciliationTable: React.FC<ReconciliationTableProps> = ({
  runs,
  onViewRun,
  onContinueRun,
  onViewStatement,
  onDeleteRun,
}) => {
  const [sortField, setSortField] = useState<'id' | 'date' | 'submission' | 'reconcile'>('submission');
  const [sortAsc, setSortAsc] = useState(false);
  const [entriesPerPage, setEntriesPerPage] = useState<number>(15);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  const handleSort = (field: 'id' | 'date' | 'submission' | 'reconcile') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedRuns = [...runs].sort((a, b) => {
    if (sortField === 'id') {
      return sortAsc ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
    }
    if (sortField === 'date') {
      const dateA = a.reconciliationDate || a.statementPeriod.from;
      const dateB = b.reconciliationDate || b.statementPeriod.from;
      return sortAsc ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
    }
    if (sortField === 'submission') {
      const subA = a.submissionNumber ?? 0;
      const subB = b.submissionNumber ?? 0;
      return sortAsc ? subA - subB : subB - subA;
    }
    if (sortField === 'reconcile') {
      const pctA = a.invoicesTotalCount ? (a.invoicesReconciledCount || 0) / a.invoicesTotalCount : a.confidence;
      const pctB = b.invoicesTotalCount ? (b.invoicesReconciledCount || 0) / b.invoicesTotalCount : b.confidence;
      return sortAsc ? pctA - pctB : pctB - pctA;
    }
    return 0;
  });

  const totalEntries = sortedRuns.length;
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedRuns = sortedRuns.slice(startIndex, startIndex + entriesPerPage);
  const startEntry = totalEntries === 0 ? 0 : startIndex + 1;
  const endEntry = Math.min(startIndex + entriesPerPage, totalEntries);

  return (
    <div className="w-full space-y-4">
      {/* Entries per page & Counter Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-500 font-sans">
        <div className="flex items-center gap-2">
          <span>Show</span>
          <div className="relative inline-block">
            <select
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              aria-label="Entries per page"
              className="bg-white border border-gray-200 rounded-md px-2.5 py-1 text-xs text-gray-700 font-medium appearance-none pr-7 focus:outline-none focus:border-[#EA580C] cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-2 text-gray-400 pointer-events-none" />
          </div>
          <span>entries per page</span>
        </div>

        <div className="text-gray-500">
          Showing {startEntry} to {endEntry} of {totalEntries} entries
        </div>
      </div>

      {/* Main Table */}
      <div className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-gray-200 bg-white text-[11px] uppercase font-bold text-gray-500 tracking-wider">
                {/* RECONCILIATION ID */}
                <th 
                  className="py-3 px-5 font-bold cursor-pointer hover:text-gray-800 select-none"
                  onClick={() => handleSort('id')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>RECONCILIATION ID</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>

                {/* RECONCILIATION DATE */}
                <th 
                  className="py-3 px-5 font-bold cursor-pointer hover:text-gray-800 select-none"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>RECONCILIATION DATE</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>

                {/* SUBMISSION# */}
                <th 
                  className="py-3 px-5 font-bold cursor-pointer hover:text-gray-800 select-none"
                  onClick={() => handleSort('submission')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>SUBMISSION#</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>

                {/* INVOICE RECONCILE */}
                <th 
                  className="py-3 px-5 font-bold cursor-pointer hover:text-gray-800 select-none min-w-[240px]"
                  onClick={() => handleSort('reconcile')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>INVOICE RECONCILE</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>

                {/* ACTION */}
                <th className="py-3 px-5 text-center font-bold uppercase tracking-wider text-gray-500 w-24">
                  ACTION
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {paginatedRuns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    No reconciliation runs found matching your search.
                  </td>
                </tr>
              ) : (
                paginatedRuns.map((run) => {
                  const reconciledCount = run.invoicesReconciledCount ?? run.matchedCount;
                  const totalCount = run.invoicesTotalCount ?? run.totalTransactions;
                  const percent = totalCount > 0 ? Math.round((reconciledCount / totalCount) * 100) : 0;
                  const isFull = percent === 100;
                  const isZero = percent === 0;

                  return (
                    <tr 
                      key={run.id}
                      className="hover:bg-orange-50/30 transition-colors group cursor-pointer"
                      onClick={() => onViewRun(run)}
                    >
                      {/* RECONCILIATION ID */}
                      <td className="py-3 px-5 whitespace-nowrap">
                        <div className="font-semibold text-[#EA580C] hover:underline">
                          {run.id}
                        </div>
                        <div className="text-[11px] text-gray-400 font-normal mt-0.5">
                          {run.refNumber || `Ref #${run.submissionNumber || '1'}`}
                        </div>
                      </td>

                      {/* RECONCILIATION DATE */}
                      <td className="py-3 px-5 whitespace-nowrap text-gray-700 font-medium">
                        {run.reconciliationDate || run.statementPeriod.from}
                      </td>

                      {/* SUBMISSION# */}
                      <td className="py-3 px-5 whitespace-nowrap text-gray-700 font-medium">
                        {run.submissionNumber ?? '—'}
                      </td>

                      {/* INVOICE RECONCILE */}
                      <td className="py-3 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {/* Progress bar line */}
                          <div className="w-28 h-1.5 bg-gray-100 rounded-full overflow-hidden shrink-0">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                isFull 
                                  ? 'bg-[#10B981]' 
                                  : isZero 
                                  ? 'bg-transparent' 
                                  : 'bg-[#EA580C]'
                              }`}
                              style={{ width: `${Math.max(percent, 0)}%` }}
                            />
                          </div>

                          {/* Progress Text e.g. 14/16 (88%) */}
                          <span className={`font-semibold text-xs ${
                            isFull 
                              ? 'text-[#059669]' 
                              : isZero 
                              ? 'text-gray-500' 
                              : 'text-[#EA580C]'
                          }`}>
                            {reconciledCount}/{totalCount} ({percent}%)
                          </span>
                        </div>

                        {/* Amount Subtext e.g. £83,450.00 */}
                        <div className="text-[11px] text-gray-400 font-mono mt-1">
                          {formatCurrency(run.totalAmount, run.currency || 'GBP')}
                        </div>
                      </td>

                      {/* ACTION: Eye Icon & Quick Options */}
                      <td 
                        className="py-3 px-5 text-center whitespace-nowrap relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onViewRun(run)}
                            className="p-1.5 text-gray-400 hover:text-[#EA580C] hover:bg-orange-50 rounded-full transition-colors cursor-pointer"
                            title="Inspect Reconciliation Run"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveDropdownId(activeDropdownId === run.id ? null : run.id)}
                            className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                            title="More Options"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Context Dropdown */}
                        {activeDropdownId === run.id && (
                          <div className="absolute right-6 top-10 z-30 w-44 bg-white border border-gray-200 rounded-lg shadow-xl py-1 text-left text-xs font-sans">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveDropdownId(null);
                                onViewRun(run);
                              }}
                              className="w-full px-3 py-2 text-gray-700 hover:bg-orange-50 hover:text-[#EA580C] flex items-center gap-2 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#EA580C]" />
                              <span>View Workspace</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveDropdownId(null);
                                onContinueRun(run);
                              }}
                              className="w-full px-3 py-2 text-gray-700 hover:bg-orange-50 hover:text-[#EA580C] flex items-center gap-2 cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Run Auto-Match</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveDropdownId(null);
                                onViewStatement(run);
                              }}
                              className="w-full px-3 py-2 text-gray-700 hover:bg-orange-50 hover:text-[#EA580C] flex items-center gap-2 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-red-500" />
                              <span>Statement Document</span>
                            </button>

                            <div className="my-1 border-t border-gray-100" />

                            <button
                              type="button"
                              onClick={() => {
                                setActiveDropdownId(null);
                                onDeleteRun(run.id);
                              }}
                              className="w-full px-3 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Entry</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Bar */}
      {totalEntries > entriesPerPage && (
        <div className="flex items-center justify-between pt-2 text-xs text-gray-500">
          <div>
            Page {currentPage} of {Math.ceil(totalEntries / entriesPerPage)}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 border border-gray-200 rounded text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={currentPage >= Math.ceil(totalEntries / entriesPerPage)}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-3 py-1.5 border border-gray-200 rounded text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
