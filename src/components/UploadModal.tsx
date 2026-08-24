import React, { useState } from 'react';
import { 
  X, 
  UploadCloud, 
  FileText, 
  FileSpreadsheet, 
  CheckCircle2, 
  Trash2, 
  Calendar, 
  Building2, 
  AlertCircle,
  ArrowRight,
  Sparkles,
  Info,
  Clock
} from 'lucide-react';
import { BANK_ACCOUNTS } from '../data/mockData';
import { BankAccountOption } from '../types/reconciliation';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (data: {
    bankId: string;
    bankName: string;
    accountNumber: string;
    periodFrom: string;
    periodTo: string;
    fileName: string;
    fileSize: string;
    transactionsCount: number;
    credits: number;
    debits: number;
    closingBalance: number;
  }) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete
}) => {
  const [selectedBankId, setSelectedBankId] = useState<string>('hsbc-4821');
  const [periodFrom, setPeriodFrom] = useState<string>('01-Feb-2026');
  const [periodTo, setPeriodTo] = useState<string>('28-Feb-2026');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: string;
    type: string;
    extractedTxnCount: number;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFileType, setSelectedFileType] = useState<'bank_statement' | 'invoice_batch' | 'pos_feed'>('bank_statement');

  if (!isOpen) return null;

  const currentBank: BankAccountOption = BANK_ACCOUNTS.find(b => b.id === selectedBankId) || BANK_ACCOUNTS[0];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processSelectedFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    setIsProcessing(true);
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    
    // Simulate smart OCR parsing
    setTimeout(() => {
      setUploadedFile({
        name: file.name,
        size: sizeMb === '0.0 MB' ? '1.8 MB' : sizeMb,
        type: file.name.split('.').pop()?.toUpperCase() || 'PDF',
        extractedTxnCount: Math.floor(Math.random() * 80) + 120
      });
      setIsProcessing(false);
    }, 600);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
  };

  const handleProceed = () => {
    const finalFileName = uploadedFile?.name || `${currentBank.bankName.replace(/\s+/g, '_')}_Statement_Feb2026.pdf`;
    const finalFileSize = uploadedFile?.size || '2.1 MB';
    const finalTxnCount = uploadedFile?.extractedTxnCount || 148;

    onUploadComplete({
      bankId: currentBank.id,
      bankName: currentBank.bankName,
      accountNumber: currentBank.accountNumber,
      periodFrom,
      periodTo,
      fileName: finalFileName,
      fileSize: finalFileSize,
      transactionsCount: finalTxnCount,
      credits: 285400.00,
      debits: 142100.00,
      closingBalance: 143300.00
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
      <div className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden w-full max-w-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-100 border border-orange-200 flex items-center justify-center text-[#EA580C]">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 tracking-tight">
                Upload New Statement & Reconcile
              </h2>
              <p className="text-xs text-gray-500">
                Upload bank feeds, MT940, CSV or PDF statements to initialize matching
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Document Type Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Document Category
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedFileType('bank_statement')}
                className={`flex flex-col items-start p-3 border rounded-lg transition-all text-left cursor-pointer ${
                  selectedFileType === 'bank_statement'
                    ? 'border-[#EA580C] bg-orange-50/60 ring-1 ring-[#EA580C]'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-gray-900 mb-0.5">
                  <Building2 className={`w-3.5 h-3.5 ${selectedFileType === 'bank_statement' ? 'text-[#EA580C]' : 'text-gray-500'}`} />
                  <span>Bank Statement</span>
                </div>
                <span className="text-[11px] text-gray-500 leading-tight">
                  MT940, ISO 20022, PDF, OFX, CSV
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFileType('invoice_batch')}
                className={`flex flex-col items-start p-3 border rounded-lg transition-all text-left cursor-pointer ${
                  selectedFileType === 'invoice_batch'
                    ? 'border-[#EA580C] bg-orange-50/60 ring-1 ring-[#EA580C]'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-gray-900 mb-0.5">
                  <FileSpreadsheet className={`w-3.5 h-3.5 ${selectedFileType === 'invoice_batch' ? 'text-[#EA580C]' : 'text-gray-500'}`} />
                  <span>Invoice Batch</span>
                </div>
                <span className="text-[11px] text-gray-500 leading-tight">
                  ERP exports, AR/AP Ledger feeds
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFileType('pos_feed')}
                className={`flex flex-col items-start p-3 border rounded-lg transition-all text-left cursor-pointer ${
                  selectedFileType === 'pos_feed'
                    ? 'border-[#EA580C] bg-orange-50/60 ring-1 ring-[#EA580C]'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-gray-900 mb-0.5">
                  <Clock className={`w-3.5 h-3.5 ${selectedFileType === 'pos_feed' ? 'text-[#EA580C]' : 'text-gray-500'}`} />
                  <span>POS / Merchant</span>
                </div>
                <span className="text-[11px] text-gray-500 leading-tight">
                  Stripe, Adyen, Square settlements
                </span>
              </button>
            </div>
          </div>

          {/* Bank & Account Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Target Bank Institution
              </label>
              <div className="relative">
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#EA580C] transition-colors font-medium appearance-none cursor-pointer"
                >
                  {BANK_ACCOUNTS.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.bankName}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400 text-xs">
                  ▼
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Account Number & Currency
              </label>
              <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-xs font-mono font-semibold text-gray-800 flex items-center justify-between">
                <span>{currentBank.accountNumber}</span>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-600 font-sans">
                  {currentBank.currency} Account
                </span>
              </div>
            </div>
          </div>

          {/* Statement Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Statement From Date
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={periodFrom}
                  onChange={(e) => setPeriodFrom(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#EA580C] font-mono"
                  placeholder="01-Feb-2026"
                />
                <Calendar className="w-4 h-4 absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Statement To Date
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={periodTo}
                  onChange={(e) => setPeriodTo(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#EA580C] font-mono"
                  placeholder="28-Feb-2026"
                />
                <Calendar className="w-4 h-4 absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Dropzone Area */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Select Statement File
            </label>

            {!uploadedFile ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                  isDragging 
                    ? 'border-[#EA580C] bg-orange-50/60' 
                    : 'border-gray-200 hover:border-[#EA580C] bg-gray-50/50'
                }`}
              >
                <input
                  type="file"
                  id="modal-file-upload-input"
                  accept=".csv,.xlsx,.xls,.pdf,.ofx,.xml,.txt"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <label htmlFor="modal-file-upload-input" className="cursor-pointer block">
                  <div className="w-12 h-12 bg-white border border-gray-200 rounded-full flex items-center justify-center mx-auto mb-2 text-[#EA580C] shadow-xs">
                    {isProcessing ? (
                      <Sparkles className="w-6 h-6 animate-pulse text-[#EA580C]" />
                    ) : (
                      <UploadCloud className="w-6 h-6" />
                    )}
                  </div>
                  <div className="text-sm font-bold text-gray-800">
                    {isProcessing ? 'Analyzing & Extracting...' : 'Click to Browse or Drag File Here'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Upload official bank statement PDF, CSV export, or standard MT940 / ISO20022 camt.053
                  </div>
                  <div className="inline-flex items-center gap-1.5 mt-3 text-[11px] text-gray-400 font-mono bg-white px-2.5 py-1 rounded border border-gray-200">
                    <span>Supports .PDF, .CSV, .XLSX, .OFX, .XML</span>
                  </div>
                </label>
              </div>
            ) : (
              <div className="bg-orange-50/40 border border-orange-200 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 bg-white text-[#EA580C] border border-orange-200 rounded-lg shadow-2xs">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-gray-900 font-mono">
                      {uploadedFile.name}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                      <span>{uploadedFile.size}</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {uploadedFile.extractedTxnCount} transactions parsed
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="px-2.5 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Info Box */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-600 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-gray-800">Automated Pipeline:</span> Uploading will automatically trigger OCR line extraction, amount sign normalization, and run rule-based 3-way invoice matching.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-md border border-gray-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleProceed}
            className="px-5 py-2 bg-[#EA580C] hover:bg-[#D94E07] text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <span>Proceed to Matching Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
