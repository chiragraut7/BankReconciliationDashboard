import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  ArrowRight, 
  Check, 
  ArrowLeft,
  DollarSign,
  Layers,
  Sparkles
} from 'lucide-react';
import { BankTransaction, MatchedInvoice } from '../types/reconciliation';
import { formatCurrency, getMatchStatusClass } from '../utils/formatters';

interface Step3ReviewProps {
  bankName: string;
  accountNumber: string;
  fileName: string;
  periodFrom: string;
  periodTo: string;
  transactions: BankTransaction[];
  invoices: MatchedInvoice[];
  onApproveSingleSuggested: (txnId: string) => void;
  onUnmatchTxn: (txnId: string) => void;
  onViewInvoiceDetail: (invoice: MatchedInvoice) => void;
  onBackToMatch: () => void;
  onContinueToConfirm: () => void;
}

export const Step3Review: React.FC<Step3ReviewProps> = ({
  bankName,
  accountNumber,
  fileName,
  periodFrom,
  periodTo,
  transactions,
  invoices,
  onApproveSingleSuggested,
  onUnmatchTxn,
  onViewInvoiceDetail,
  onBackToMatch,
  onContinueToConfirm,
}) => {
  const [openSection, setOpenSection] = useState<'CONFIRMED' | 'SUGGESTED' | 'UNMATCHED' | 'ALL'>('ALL');

  const confirmedTxns = transactions.filter(
    t => t.status === 'Exact Match' || t.status === 'High Confidence' || t.status === 'Multi-Invoice' || t.status === 'Manual Match'
  );

  const suggestedTxns = transactions.filter(t => t.status === 'Suggested');
  const unmatchedTxns = transactions.filter(t => t.status === 'Unmatched' || t.status === 'Exception');

  const totalBankAmount = 485240.00;
  const totalMatchedAmount = confirmedTxns.reduce((acc, t) => acc + Math.abs(t.amount), 0) + 
    (suggestedTxns.length === 0 ? 0 : 0);
  const totalVariance = totalBankAmount - (485240.00 + (suggestedTxns.length > 0 ? -120.00 : 0));

  return (
    <div className="flex flex-col space-y-4">
      {/* Top Header Summary Strip */}
      <div className="bg-white p-3.5 border border-[#141414] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase font-bold text-gray-500">Statement Reference</div>
          <div className="text-xs font-bold text-[#141414] flex items-center gap-2">
            <span>{bankName}</span>
            <span className="font-mono text-gray-600 font-normal">{accountNumber}</span>
            <span className="text-gray-400">•</span>
            <span className="font-mono text-gray-800">{periodFrom} → {periodTo}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2.5 py-1 bg-gray-50 border border-gray-300 text-[#141414] font-bold">
            {fileName}
          </span>
        </div>
      </div>

      {/* KPI METRIC BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        <div className="bg-white p-2.5 border border-[#141414] shadow-xs text-xs">
          <div className="text-[10px] text-gray-500 uppercase font-bold">Total Txns</div>
          <div className="font-mono text-base font-bold text-[#141414] mt-0.5">248</div>
        </div>
        <div className="bg-white p-2.5 border border-[#141414] shadow-xs text-xs">
          <div className="text-[10px] text-green-700 uppercase font-bold">Auto Matched</div>
          <div className="font-mono text-base font-bold text-green-700 mt-0.5">219</div>
        </div>
        <div className="bg-white p-2.5 border border-[#141414] shadow-xs text-xs">
          <div className="text-[10px] text-blue-700 uppercase font-bold">Manual Matched</div>
          <div className="font-mono text-base font-bold text-blue-700 mt-0.5">12</div>
        </div>
        <div className="bg-white p-2.5 border border-[#141414] shadow-xs text-xs">
          <div className="text-[10px] text-amber-700 uppercase font-bold">Suggested</div>
          <div className="font-mono text-base font-bold text-amber-700 mt-0.5">{suggestedTxns.length}</div>
        </div>
        <div className="bg-white p-2.5 border border-[#141414] shadow-xs text-xs">
          <div className="text-[10px] text-red-600 uppercase font-bold">Unmatched</div>
          <div className="font-mono text-base font-bold text-red-600 mt-0.5">{unmatchedTxns.length}</div>
        </div>
        <div className="bg-white p-2.5 border border-[#141414] shadow-xs text-xs">
          <div className="text-[10px] text-gray-500 uppercase font-bold">Bank Amount</div>
          <div className="font-mono text-xs font-bold text-[#141414] mt-0.5">{formatCurrency(485240.00)}</div>
        </div>
        <div className="bg-white p-2.5 border border-[#141414] shadow-xs text-xs">
          <div className="text-[10px] text-gray-500 uppercase font-bold">Total Matched</div>
          <div className="font-mono text-xs font-bold text-[#141414] mt-0.5">{formatCurrency(485120.00)}</div>
        </div>
        <div className="bg-white p-2.5 border border-[#141414] shadow-xs text-xs">
          <div className="text-[10px] text-gray-500 uppercase font-bold">Variance</div>
          <div className={`font-mono text-xs font-bold mt-0.5 ${suggestedTxns.length === 0 ? 'text-green-700' : 'text-red-600'}`}>
            {suggestedTxns.length === 0 ? '$0.00' : '-$120.00'}
          </div>
        </div>
      </div>

      {/* THREE ACCORDION REVIEW SECTIONS */}
      <div className="space-y-4">
        {/* SECTION 1: Confirmed Matches */}
        <div className="bg-white border border-[#141414] shadow-xs overflow-hidden">
          <div className="p-3 bg-gray-50 border-b border-[#141414] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-700" />
              <span className="text-xs font-bold text-[#141414] uppercase tracking-wider">
                Confirmed Matches ({confirmedTxns.length})
              </span>
            </div>
            <span className="text-[10px] font-mono bg-green-50 text-green-800 border border-green-200 px-2 py-0.5 font-bold">
              Ready for Settlement
            </span>
          </div>

          <div className="divide-y divide-gray-200 max-h-[220px] overflow-y-auto">
            {confirmedTxns.map((txn) => {
              const matchedInvs = invoices.filter(inv => txn.matchedInvoiceIds.includes(inv.id));
              return (
                <div key={txn.id} className="p-3 flex items-center justify-between hover:bg-gray-50 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-gray-600 text-[11px]">{txn.bookingDate}</span>
                    <span className="font-mono font-bold text-[#141414]">{txn.id}</span>
                    <span className="text-gray-800 max-w-[220px] truncate">{txn.description}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-mono font-bold text-[#141414]">{formatCurrency(txn.amount)}</span>
                      <div className="text-[10px] text-green-700 font-mono font-bold">
                        {matchedInvs.length} Invoices Linked
                      </div>
                    </div>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 uppercase font-bold border ${getMatchStatusClass(txn.status)}`}>
                      {txn.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUnmatchTxn(txn.id)}
                      className="px-2 py-0.5 text-[10px] text-gray-500 hover:text-red-700 hover:bg-red-50 border border-gray-300 font-bold transition-colors cursor-pointer"
                    >
                      Unmatch
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: Suggested Matches */}
        <div className="bg-white border border-[#141414] shadow-xs overflow-hidden">
          <div className="p-3 bg-amber-50/60 border-b border-[#141414] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Suggested Matches ({suggestedTxns.length})
              </span>
            </div>
            <span className="text-[10px] font-mono bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 font-bold">
              Requires Review
            </span>
          </div>

          <div className="divide-y divide-gray-200 max-h-[220px] overflow-y-auto">
            {suggestedTxns.length > 0 ? (
              suggestedTxns.map((txn) => {
                const matchedInvs = invoices.filter(inv => txn.matchedInvoiceIds.includes(inv.id));
                return (
                  <div key={txn.id} className="p-3 flex items-center justify-between hover:bg-gray-50 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-gray-600 text-[11px]">{txn.bookingDate}</span>
                        <span className="font-mono font-bold text-[#141414]">{txn.id}</span>
                        <span className="text-[#141414] font-medium">{txn.description}</span>
                      </div>
                      <div className="text-[11px] text-gray-600 flex items-center gap-2">
                        <span>Matched: {matchedInvs[0]?.invoiceNumber || 'INV-10491'}</span>
                        <span>•</span>
                        <span className="text-amber-700 font-bold">Tolerance / Fee: {formatCurrency(txn.variance)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-[#141414]">{formatCurrency(txn.amount)}</span>
                      <button
                        type="button"
                        onClick={() => onApproveSingleSuggested(txn.id)}
                        className="px-2.5 py-1 bg-green-700 hover:bg-green-800 text-white text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Check className="w-3 h-3" />
                        <span>Approve</span>
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-gray-500 italic">
                All suggested matches have been confirmed.
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: Unmatched Exceptions */}
        <div className="bg-white border border-[#141414] shadow-xs overflow-hidden">
          <div className="p-3 bg-red-50/60 border-b border-[#141414] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-xs font-bold text-red-900 uppercase tracking-wider">
                Unmatched Exceptions ({unmatchedTxns.length})
              </span>
            </div>
            <span className="text-[10px] font-mono bg-red-100 text-red-900 border border-red-300 px-2 py-0.5 font-bold">
              Carryover / Accrual
            </span>
          </div>

          <div className="divide-y divide-gray-200 max-h-[220px] overflow-y-auto">
            {unmatchedTxns.map((txn) => (
              <div key={txn.id} className="p-3 flex items-center justify-between hover:bg-gray-50 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-gray-600 text-[11px]">{txn.bookingDate}</span>
                  <span className="font-mono font-bold text-[#141414]">{txn.id}</span>
                  <span className="text-gray-800 truncate max-w-[280px]">{txn.description}</span>
                  <span className="text-[10px] text-gray-600 font-mono bg-gray-100 px-1.5 py-0.5 border border-gray-300">
                    {txn.category || 'Bank Charge'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`font-mono font-bold ${txn.amount >= 0 ? 'text-[#141414]' : 'text-red-600'}`}>
                    {formatCurrency(txn.amount)}
                  </span>
                  <span className="text-[10px] font-mono bg-gray-100 text-gray-700 px-2 py-0.5 border border-gray-300 font-bold">
                    Will Carry Over
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-[#141414]">
        <button
          type="button"
          onClick={onBackToMatch}
          className="px-4 py-2 bg-white hover:bg-gray-100 text-[#141414] text-xs font-bold transition-colors border border-[#141414] cursor-pointer flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Match</span>
        </button>

        <button
          type="button"
          onClick={onContinueToConfirm}
          className="px-5 py-2 bg-[#141414] hover:bg-gray-800 text-white text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <span>Continue to Final Confirmation</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
