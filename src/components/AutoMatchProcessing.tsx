import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  ArrowRight, 
  Cpu, 
  FileCheck, 
  Search, 
  Layers, 
  FileSpreadsheet, 
  CheckSquare 
} from 'lucide-react';

interface AutoMatchProcessingProps {
  onComplete: () => void;
  transactionsCount?: number;
}

export const AutoMatchProcessing: React.FC<AutoMatchProcessingProps> = ({
  onComplete,
  transactionsCount = 248,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [progress, setProgress] = useState<number>(15);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  const steps = [
    { label: 'Reading bank statement', detail: 'Parsing OFX/PDF structure & MT940 tags' },
    { label: 'Extracting transactions', detail: '248 ledger records indexed' },
    { label: 'Loading invoices', detail: 'Syncing AR/AP ledger records from ERP' },
    { label: 'Matching invoice numbers', detail: 'Direct reference matching active' },
    { label: 'Comparing amounts', detail: 'Evaluating tolerance & currency rates' },
    { label: 'Checking dates', detail: 'Applying date window ±5 business days' },
    { label: 'Generating suggestions', detail: 'Evaluating fuzzy matching & multi-invoices' },
  ];

  useEffect(() => {
    // Step progression animation
    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < steps.length - 1) {
          const next = prev + 1;
          setProgress(Math.round(((next + 1) / steps.length) * 100));
          return next;
        } else {
          clearInterval(timer);
          setIsFinished(true);
          setProgress(100);
          return prev;
        }
      });
    }, 450);

    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-[460px] text-[#141414] max-w-xl mx-auto w-full">
      {/* Top Header Badge */}
      <div className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-200 rounded-full text-gray-700 text-xs font-mono mb-4 shadow-2xs">
        <Cpu className="w-3.5 h-3.5 animate-spin text-[#EA580C]" />
        <span>4SEE RECONCILIATION ENGINE v4.2</span>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-1">
        {isFinished ? 'Auto Match Complete' : 'Running Auto Match'}
      </h2>
      <p className="text-xs text-gray-500 mb-6 text-center max-w-md">
        {isFinished
          ? 'Automated reconciliation rules applied across 248 line items.'
          : 'Synthesizing bank statement feeds with enterprise invoice records...'}
      </p>

      {/* Progress Bar Container */}
      <div className="w-full bg-white p-5 border border-gray-200 rounded-xl shadow-xs mb-6">
        <div className="flex items-center justify-between text-xs font-mono mb-2">
          <span className="text-gray-500 font-bold uppercase">Reconciliation Pipeline</span>
          <span className="text-[#EA580C] font-bold">{progress}%</span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-6">
          <div 
            className="bg-[#EA580C] h-full transition-all duration-300 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps List */}
        <div className="space-y-2.5">
          {steps.map((step, idx) => {
            const isDone = idx < currentStepIndex || isFinished;
            const isCurrent = idx === currentStepIndex && !isFinished;

            return (
              <div 
                key={step.label}
                className={`flex items-center justify-between px-3 py-1.5 text-xs rounded-md ${
                  isCurrent ? 'bg-orange-50 border border-orange-200' : 'bg-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-[#EA580C] animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-gray-300 shrink-0" />
                  )}
                  <span className={`font-medium ${isDone ? 'text-gray-900' : isCurrent ? 'text-[#EA580C] font-bold' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-gray-400 hidden sm:inline">
                  {step.detail}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Post Processing Result KPI Summary */}
      {isFinished && (
        <div className="w-full bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-xs animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3 text-xs">
            <span className="text-gray-500 font-bold uppercase">Engine Match Output</span>
            <span className="text-gray-900 font-bold">{transactionsCount} Bank Transactions</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-emerald-50 p-2.5 border border-emerald-200 rounded-lg">
              <div className="font-mono text-lg font-bold text-emerald-700">219</div>
              <div className="text-[10px] text-gray-600 font-medium mt-0.5">Exact / High Conf</div>
            </div>
            <div className="bg-amber-50 p-2.5 border border-amber-200 rounded-lg">
              <div className="font-mono text-lg font-bold text-amber-700">17</div>
              <div className="text-[10px] text-gray-600 font-medium mt-0.5">Suggested</div>
            </div>
            <div className="bg-red-50 p-2.5 border border-red-200 rounded-lg">
              <div className="font-mono text-lg font-bold text-red-600">8</div>
              <div className="text-[10px] text-gray-600 font-medium mt-0.5">Unmatched</div>
            </div>
            <div className="bg-purple-50 p-2.5 border border-purple-200 rounded-lg">
              <div className="font-mono text-lg font-bold text-purple-700">4</div>
              <div className="text-[10px] text-gray-600 font-medium mt-0.5">Exceptions</div>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      {isFinished ? (
        <button
          type="button"
          onClick={onComplete}
          className="w-full sm:w-auto px-8 py-2.5 bg-[#EA580C] hover:bg-[#D94E07] text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>View Matches</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="button"
          disabled
          className="w-full sm:w-auto px-8 py-2.5 bg-gray-100 text-gray-400 font-bold text-xs rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          <span>Processing Reconciliation Engine...</span>
        </button>
      )}
    </div>
  );
};
