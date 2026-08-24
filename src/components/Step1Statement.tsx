import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Trash2, 
  CheckCircle2, 
  Calendar, 
  Building2, 
  AlertCircle,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';
import { BANK_ACCOUNTS } from '../data/mockData';
import { BankAccountOption } from '../types/reconciliation';
import { PdfStatementViewer } from './PdfStatementViewer';
import { formatCurrency } from '../utils/formatters';
import { DatePicker } from './DatePicker';

interface Step1StatementProps {
  selectedBankId: string;
  onSelectBank: (bankId: string) => void;
  periodFrom: string;
  onChangePeriodFrom: (date: string) => void;
  periodTo: string;
  onChangePeriodTo: (date: string) => void;
  fileName: string;
  fileSize: string;
  onFileUpload: (name: string, size: string) => void;
  onFileRemove: () => void;
  onContinue: () => void;
  onCancel: () => void;
}

export const Step1Statement: React.FC<Step1StatementProps> = ({
  selectedBankId,
  onSelectBank,
  periodFrom,
  onChangePeriodFrom,
  periodTo,
  onChangePeriodTo,
  fileName,
  fileSize,
  onFileUpload,
  onFileRemove,
  onContinue,
  onCancel,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const currentBank: BankAccountOption = BANK_ACCOUNTS.find(b => b.id === selectedBankId) || BANK_ACCOUNTS[0];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      onFileUpload(file.name, sizeMb);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      onFileUpload(file.name, sizeMb);
    }
  };

  const hasFile = Boolean(fileName);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* 2-Column Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[480px]">
        {/* LEFT COLUMN: Statement Details & Upload */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4 bg-white border border-gray-200 rounded-lg p-4 shadow-xs">
          <div className="space-y-3.5">
            <div className="border-b border-gray-100 pb-2">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Statement Details
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Specify institution, target account and upload statement records.
              </p>
            </div>

            {/* Bank Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Bank Institution
              </label>
              <div className="relative">
                <select
                  value={selectedBankId}
                  onChange={(e) => onSelectBank(e.target.value)}
                  aria-label="Bank Institution"
                  className="w-full bg-white border border-gray-200 rounded-md px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#EA580C] transition-colors font-medium appearance-none cursor-pointer"
                >
                  {BANK_ACCOUNTS.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.bankName}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 text-xs">
                  ▼
                </div>
              </div>
            </div>

            {/* Account Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Bank Account
              </label>
              <div className="relative">
                <select
                  value={selectedBankId}
                  onChange={(e) => onSelectBank(e.target.value)}
                  aria-label="Bank Account"
                  className="w-full bg-white border border-gray-200 rounded-md px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#EA580C] transition-colors font-mono appearance-none cursor-pointer"
                >
                  {BANK_ACCOUNTS.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.accountNumber} — {bank.accountName} ({bank.currency})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 text-xs">
                  ▼
                </div>
              </div>
            </div>

            {/* Date Range Selectors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Statement From
                </label>
                <DatePicker
                  value={periodFrom}
                  onChange={onChangePeriodFrom}
                  placeholder="01-Jan-2026"
                  className="w-full"
                  inputClassName="w-full py-1.5 px-3 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Statement To
                </label>
                <DatePicker
                  value={periodTo}
                  onChange={onChangePeriodTo}
                  placeholder="31-Jan-2026"
                  className="w-full"
                  inputClassName="w-full py-1.5 px-3 text-xs"
                  align="right"
                />
              </div>
            </div>

            {/* Upload Area */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Statement File
              </label>

              {!hasFile ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                    isDragging 
                      ? 'border-[#EA580C] bg-orange-50/50' 
                      : 'border-gray-300 hover:border-[#EA580C] bg-gray-50'
                  }`}
                >
                  <input
                    type="file"
                    id="statement-file-upload"
                    accept=".pdf,.csv,.xlsx,.ofx"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <label htmlFor="statement-file-upload" className="cursor-pointer block">
                    <div className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-600 shadow-2xs">
                      <UploadCloud className="w-5 h-5 text-[#EA580C]" />
                    </div>
                    <div className="text-xs font-bold text-gray-800">
                      Upload Bank Statement
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      Drag and drop or <span className="text-[#EA580C] underline font-semibold">browse</span>
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono mt-2">
                      Supported: .xlsx, .csv, .pdf, .ofx
                    </div>
                  </label>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-50 text-red-600 border border-red-200 rounded-md">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-mono text-xs font-bold text-gray-900 truncate max-w-[200px]">
                        {fileName}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                        <span className="font-mono">{fileSize}</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> 248 transactions detected
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onFileRemove}
                    className="px-2.5 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tips / Format Indicator */}
          <div className="p-3 bg-orange-50/60 border border-orange-200 rounded-lg text-[11px] text-gray-700 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#EA580C] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-gray-900">Auto-Extraction Enabled:</span> OCR parser extracts MT940 booking lines, ISO20022 camt.053 XML tags, and PDF text streams automatically.
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Statement Preview */}
        <div className="lg:col-span-7 flex flex-col bg-white border border-gray-200 rounded-lg p-4 shadow-xs">
          <div className="border-b border-gray-100 pb-2 mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              Statement Preview
            </h3>
            <span className="text-[11px] text-gray-500 font-mono">
              Live Render View
            </span>
          </div>

          <div className="flex-1 min-h-[380px]">
            <PdfStatementViewer
              fileName={fileName || 'HSBC_January_2026.pdf'}
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

      {/* STATEMENT SUMMARY SECTION (Below Upload / Preview Area) */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-xs">
        <div className="text-[11px] font-bold text-gray-800 uppercase tracking-wider mb-3">
          Statement Summary
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
          <div className="bg-gray-50 p-2.5 border border-gray-200 rounded-md">
            <div className="text-[10px] text-gray-500 uppercase font-medium">Bank</div>
            <div className="font-bold text-gray-900 truncate mt-0.5">{currentBank.bankName}</div>
          </div>
          <div className="bg-gray-50 p-2.5 border border-gray-200 rounded-md">
            <div className="text-[10px] text-gray-500 uppercase font-medium">Account</div>
            <div className="font-mono font-bold text-gray-900 mt-0.5">{currentBank.accountNumber}</div>
          </div>
          <div className="bg-gray-50 p-2.5 border border-gray-200 rounded-md">
            <div className="text-[10px] text-gray-500 uppercase font-medium">Period</div>
            <div className="font-mono text-gray-800 truncate mt-0.5">{periodFrom} → {periodTo}</div>
          </div>
          <div className="bg-gray-50 p-2.5 border border-gray-200 rounded-md">
            <div className="text-[10px] text-gray-500 uppercase font-medium">Transactions</div>
            <div className="font-mono font-bold text-gray-900 mt-0.5">248</div>
          </div>
          <div className="bg-green-50 p-2.5 border border-green-200 rounded-md">
            <div className="text-[10px] text-green-800 uppercase font-medium">Credits (+)</div>
            <div className="font-mono font-bold text-emerald-700 mt-0.5">{formatCurrency(320450.00)}</div>
          </div>
          <div className="bg-red-50 p-2.5 border border-red-200 rounded-md">
            <div className="text-[10px] text-red-800 uppercase font-medium">Debits (-)</div>
            <div className="font-mono font-bold text-red-600 mt-0.5">{formatCurrency(165210.00)}</div>
          </div>
          <div className="bg-blue-50 p-2.5 border border-blue-200 rounded-md">
            <div className="text-[10px] text-blue-800 uppercase font-medium">Closing Balance</div>
            <div className="font-mono font-bold text-blue-700 mt-0.5">{formatCurrency(155240.00)}</div>
          </div>
        </div>
      </div>

      {/* Bottom Modal Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-colors border border-gray-300 rounded-md cursor-pointer"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={onContinue}
          className="px-5 py-2 bg-[#EA580C] hover:bg-[#D94E07] text-white text-xs font-semibold transition-colors rounded-md flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <span>Continue to Auto Match</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
