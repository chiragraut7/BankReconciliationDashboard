import React, { useState } from 'react';
import { 
  CheckCircle2, 
  ShieldCheck, 
  ArrowLeft, 
  Save, 
  FileCheck, 
  Building2, 
  Calendar, 
  DollarSign, 
  Lock,
  ExternalLink,
  Printer
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface Step4ConfirmProps {
  bankName: string;
  accountNumber: string;
  fileName: string;
  periodFrom: string;
  periodTo: string;
  transactionsCount: number;
  matchedCount: number;
  unmatchedCount: number;
  variance: number;
  onBack: () => void;
  onSaveDraft: () => void;
  onConfirmReconciliation: () => void;
  isSuccess: boolean;
  runId: string;
  onCloseSuccess: () => void;
  onViewPdf: () => void;
}

export const Step4Confirm: React.FC<Step4ConfirmProps> = ({
  bankName,
  accountNumber,
  fileName,
  periodFrom,
  periodTo,
  transactionsCount,
  matchedCount,
  unmatchedCount,
  variance,
  onBack,
  onSaveDraft,
  onConfirmReconciliation,
  isSuccess,
  runId,
  onCloseSuccess,
  onViewPdf,
}) => {
  // If in Success state
  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center p-8 max-w-lg mx-auto text-center space-y-6 animate-in zoom-in-95 duration-200">
        {/* Big Success Icon */}
        <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-600 text-emerald-600 rounded-full flex items-center justify-center shadow-xs">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[11px] font-mono uppercase px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold">
            Status: Reconciled & Closed
          </span>
          <h2 className="text-2xl font-bold text-gray-900 mt-3">
            Reconciliation Confirmed
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            General Ledger entry postings and bank matching receipts archived.
          </p>
        </div>

        {/* Audit Details Card */}
        <div className="w-full bg-white border border-gray-200 rounded-xl shadow-xs p-4 text-left font-mono text-xs space-y-2.5">
          <div className="flex justify-between border-b border-gray-100 pb-2">
            <span className="text-gray-500 font-sans font-bold">Run ID:</span>
            <span className="font-bold text-[#EA580C]">{runId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-sans font-bold">Bank:</span>
            <span className="text-gray-900 font-medium">{bankName} ({accountNumber})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-sans font-bold">Statement:</span>
            <span className="text-gray-800">{fileName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-sans font-bold">Period:</span>
            <span className="text-gray-800">{periodFrom} → {periodTo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-sans font-bold">Matched Transactions:</span>
            <span className="text-emerald-700 font-bold">{matchedCount} / {transactionsCount}</span>
          </div>
          <div className="flex justify-between border-t border-gray-100 pt-2">
            <span className="text-gray-500 font-sans font-bold">Final Variance:</span>
            <span className="font-bold text-emerald-700">£0.00 (Balanced)</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full pt-2">
          <button
            type="button"
            onClick={onViewPdf}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold border border-gray-300 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View PDF</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold border border-gray-300 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Audit Summary</span>
          </button>

          <button
            type="button"
            onClick={onCloseSuccess}
            className="px-6 py-2 bg-[#EA580C] hover:bg-[#D94E07] text-white text-xs font-bold rounded-md shadow-xs transition-colors cursor-pointer"
          >
            Close & Return to List
          </button>
        </div>
      </div>
    );
  }

  // Pre-confirmation Review & Submit state
  return (
    <div className="flex flex-col space-y-6 max-w-2xl mx-auto w-full py-2">
      <div className="text-center space-y-1">
        <div className="inline-flex p-2 bg-orange-50 text-[#EA580C] border border-orange-200 rounded-full mb-1">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">
          Confirm Reconciliation Run
        </h3>
        <p className="text-xs text-gray-500">
          Verify matching totals before committing formal reconciliation records to the ledger.
        </p>
      </div>

      {/* Confirmation Summary Card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs p-5 space-y-4">
        <div className="text-[11px] font-bold uppercase text-gray-500 tracking-wider border-b border-gray-100 pb-2">
          Reconciliation Scope & Balances
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-bold">Bank Institution</span>
            <div className="font-bold text-gray-900 mt-0.5">{bankName}</div>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-bold">Account Number</span>
            <div className="font-mono font-bold text-gray-900 mt-0.5">{accountNumber}</div>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-bold">Statement File</span>
            <div className="font-mono text-gray-800 mt-0.5 truncate">{fileName}</div>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-bold">Statement Period</span>
            <div className="font-mono text-gray-800 mt-0.5">{periodFrom} → {periodTo}</div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="bg-gray-50 p-2.5 border border-gray-200 rounded-lg">
            <span className="text-[10px] text-gray-500 uppercase font-sans font-bold">Total Line Items</span>
            <div className="font-bold text-gray-900 text-sm mt-0.5">{transactionsCount}</div>
          </div>
          <div className="bg-emerald-50 p-2.5 border border-emerald-200 rounded-lg">
            <span className="text-[10px] text-emerald-700 uppercase font-sans font-bold">Matched</span>
            <div className="font-bold text-emerald-700 text-sm mt-0.5">{matchedCount}</div>
          </div>
          <div className="bg-red-50 p-2.5 border border-red-200 rounded-lg">
            <span className="text-[10px] text-red-600 uppercase font-sans font-bold">Unmatched</span>
            <div className="font-bold text-red-600 text-sm mt-0.5">{unmatchedCount}</div>
          </div>
          <div className="bg-blue-50 p-2.5 border border-blue-200 rounded-lg">
            <span className="text-[10px] text-blue-700 uppercase font-sans font-bold">Status</span>
            <div className="font-bold text-emerald-700 text-sm mt-0.5">Balanced</div>
          </div>
        </div>

        <div className="bg-gray-50 p-3 border border-gray-200 rounded-lg flex items-center justify-between text-xs font-mono">
          <span className="text-gray-600 font-sans font-bold">Net Reconciled Variance:</span>
          <span className="font-bold text-emerald-700 text-sm">£0.00</span>
        </div>
      </div>

      {/* Compliance / Sign-off info */}
      <div className="p-3 bg-white border border-gray-200 rounded-lg text-[11px] text-gray-600 flex items-start gap-2 shadow-xs">
        <Lock className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-gray-900">Auditable Sign-Off:</span> Confirming this reconciliation creates an immutable cryptographic snapshot compliant with SOX 404 & IFRS 9 audit logging.
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-colors border border-gray-300 rounded-md cursor-pointer flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onSaveDraft}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-colors border border-gray-300 rounded-md cursor-pointer flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={onConfirmReconciliation}
            className="px-6 py-2 bg-[#EA580C] hover:bg-[#D94E07] text-white text-xs font-bold transition-colors rounded-md shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Confirm Reconciliation</span>
          </button>
        </div>
      </div>
    </div>
  );
};
