import React, { useState } from 'react';
import { 
  FolderOpen, 
  UploadCloud, 
  Search, 
  FileText, 
  Download, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  Clock, 
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { ReconciliationRun } from '../types/reconciliation';
import { formatCurrency } from '../utils/formatters';

interface UploadedFilesViewProps {
  runs: ReconciliationRun[];
  onUploadClick: () => void;
  onViewRun: (run: ReconciliationRun) => void;
  onViewStatement: (run: ReconciliationRun) => void;
}

export const UploadedFilesView: React.FC<UploadedFilesViewProps> = ({
  runs,
  onUploadClick,
  onViewRun,
  onViewStatement
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'pdf' | 'csv' | 'mt940'>('all');

  const filteredRuns = runs.filter(run => {
    const matchesSearch = 
      run.statementFileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      run.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      run.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      run.id.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'pdf') return run.statementFileName.toLowerCase().endsWith('.pdf');
    if (filterType === 'csv') return run.statementFileName.toLowerCase().endsWith('.csv') || run.statementFileName.toLowerCase().endsWith('.xlsx');
    if (filterType === 'mt940') return run.statementFileName.toLowerCase().includes('mt940') || run.statementFileName.toLowerCase().includes('camt');
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-[#EA580C]">
              <FolderOpen className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Uploaded Statement & Feed Files
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-xl">
            Browse and manage all parsed bank statement archives, MT940 swift messages, ISO20022 XMLs, and transaction feeds.
          </p>
        </div>

        {/* Upload Button */}
        <button
          type="button"
          onClick={onUploadClick}
          className="bg-[#EA580C] hover:bg-[#D94E07] text-white px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer self-start md:self-auto"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload New File</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 border border-gray-200 rounded-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search files by name, bank, account number or Run ID..."
            className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#EA580C] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 mr-1">Filter:</span>
          {(['all', 'pdf', 'csv', 'mt940'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 text-xs rounded-md uppercase font-medium transition-colors cursor-pointer ${
                filterType === type
                  ? 'bg-[#EA580C] text-white font-bold shadow-2xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {type === 'all' ? 'All Files' : type.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Files Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRuns.map((run) => {
          const isPdf = run.statementFileName.toLowerCase().endsWith('.pdf');
          const percent = run.invoicesTotalCount ? Math.round((run.invoicesReconciledCount || 0) / run.invoicesTotalCount * 100) : 100;

          return (
            <div
              key={run.id}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-orange-300 hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-[#EA580C] shrink-0">
                      {isPdf ? <FileText className="w-5 h-5" /> : <FileSpreadsheet className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-mono text-xs font-bold text-gray-900 truncate max-w-[180px]" title={run.statementFileName}>
                        {run.statementFileName}
                      </h3>
                      <span className="text-[11px] text-gray-500">{run.statementFileSize} • {run.bankName}</span>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                    Parsed
                  </span>
                </div>

                <div className="space-y-2 py-2 border-y border-gray-100 text-xs font-sans">
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Account:</span>
                    <span className="font-mono font-medium text-gray-900">{run.accountNumber}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Period:</span>
                    <span className="font-mono text-gray-900">{run.statementPeriod.from} → {run.statementPeriod.to}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Transactions:</span>
                    <span className="font-bold text-gray-900">{run.totalTransactions} lines</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Reconciliation:</span>
                    <span className="font-semibold text-emerald-700">{run.invoicesReconciledCount || run.matchedCount} of {run.invoicesTotalCount || run.totalTransactions} ({percent}%)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 mt-2 gap-2">
                <button
                  type="button"
                  onClick={() => onViewStatement(run)}
                  className="flex-1 py-1.5 px-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-gray-200 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-gray-500" />
                  <span>Preview</span>
                </button>

                <button
                  type="button"
                  onClick={() => onViewRun(run)}
                  className="flex-1 py-1.5 px-2 bg-orange-50 hover:bg-orange-100 text-[#EA580C] rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-orange-200 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Workspace</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredRuns.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
          <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-800">No matching files found</h3>
          <p className="text-xs text-gray-500 mt-1">Try adjusting your search filters or upload a new file.</p>
          <button
            type="button"
            onClick={onUploadClick}
            className="mt-4 inline-flex items-center gap-2 bg-[#EA580C] hover:bg-[#D94E07] text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Statement</span>
          </button>
        </div>
      )}
    </div>
  );
};
