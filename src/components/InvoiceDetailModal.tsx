import React from 'react';
import { 
  X, 
  FileText, 
  Building2, 
  Calendar, 
  Tag, 
  CheckCircle2, 
  DollarSign, 
  CreditCard,
  Layers,
  ArrowUpRight,
  Printer
} from 'lucide-react';
import { MatchedInvoice } from '../types/reconciliation';
import { formatCurrency, getMatchStatusClass } from '../utils/formatters';

interface InvoiceDetailModalProps {
  invoice: MatchedInvoice | null;
  onClose: () => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  onClose,
}) => {
  if (!invoice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white border border-[#141414] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-[#141414]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-50 text-blue-800 border border-blue-200">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[#141414] text-sm">
                  {invoice.invoiceNumber}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 uppercase font-bold border ${getMatchStatusClass(invoice.status)}`}>
                  {invoice.status}
                </span>
                <span className="text-[11px] font-mono bg-white text-gray-700 px-1.5 py-0.2 border border-gray-300 font-bold">
                  {invoice.type === 'AP' ? 'Accounts Payable' : 'Accounts Receivable'}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Issued by {invoice.entityName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-[#141414] hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-gray-800">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-3.5 border border-gray-200">
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">Invoice Date</div>
              <div className="font-mono font-bold text-[#141414] mt-0.5">{invoice.date}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">Due Date</div>
              <div className="font-mono font-bold text-[#141414] mt-0.5">{invoice.dueDate}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">PO Reference</div>
              <div className="font-mono font-bold text-[#141414] mt-0.5">{invoice.poNumber || 'N/A'}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">Match Confidence</div>
              <div className="font-mono font-bold text-green-700 mt-0.5">{invoice.matchConfidence}%</div>
            </div>
          </div>

          {/* Description & Entity */}
          <div className="bg-gray-50 p-3.5 border border-gray-200 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500">Customer / Vendor</span>
                <div className="font-bold text-[#141414] text-sm">{invoice.entityName}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-gray-500">Total Due Amount</span>
                <div className="font-mono font-bold text-base text-[#141414]">{formatCurrency(invoice.amount)}</div>
              </div>
            </div>
            {invoice.description && (
              <p className="text-xs text-gray-600 pt-2 border-t border-gray-200">
                {invoice.description}
              </p>
            )}
          </div>

          {/* Line Items Table */}
          {invoice.lineItems && invoice.lineItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Itemized Line Items
                </span>
                <span className="text-[10px] text-gray-500 font-mono font-bold">
                  {invoice.lineItems.length} Lines
                </span>
              </div>
              <div className="border border-gray-300 overflow-hidden">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead className="bg-gray-100 text-gray-700 border-b border-gray-300 text-[10px] uppercase font-bold">
                    <tr>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-gray-800">
                    {invoice.lineItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="py-2 px-3 font-sans text-xs text-[#141414] font-medium">{item.description}</td>
                        <td className="py-2 px-3 text-center text-gray-600">{item.quantity}</td>
                        <td className="py-2 px-3 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                        <td className="py-2 px-3 text-right font-bold text-[#141414]">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Matched Bank Transaction Linkage */}
          {invoice.matchedBankTxnId && (
            <div className="p-3 bg-green-50 border border-green-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-700" />
                <div>
                  <span className="font-mono text-xs font-bold text-green-900">
                    Linked to Bank Txn {invoice.matchedBankTxnId}
                  </span>
                  <p className="text-[11px] text-green-700">
                    Automatic settlement verification satisfied.
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs text-green-800 font-bold">
                {formatCurrency(invoice.amount)}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-[#141414]">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-[#141414] font-bold transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Invoice Record</span>
          </button>
          
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#141414] hover:bg-gray-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
