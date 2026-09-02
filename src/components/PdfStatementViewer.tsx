import React, { useState, useEffect, useRef } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink, 
  Download,
  FileText,
  Building2,
  CheckCircle2,
  ShieldCheck,
  X,
  Target,
  Sparkles,
  Search,
  Printer
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { BankTransaction } from '../types/reconciliation';

interface PdfStatementViewerProps {
  fileName: string;
  bankName: string;
  accountNumber: string;
  periodFrom: string;
  periodTo: string;
  openingBalance?: number;
  closingBalance?: number;
  credits?: number;
  debits?: number;
  transactionsCount?: number;
  transactions?: BankTransaction[];
  highlightTxnRef?: string | null;
  onSelectTxn?: (txnRef: string) => void;
  onClose?: () => void;
  mode?: 'split' | 'modal' | 'full';
  onSwitchToModal?: () => void;
}

const DEFAULT_TRANSACTIONS = [
  { id: 'TXN-10021', date: '23-Jan-2026', reference: 'ACH-889212', description: 'ACME PAYMENT SUPPLIES DIRECT DEBIT', debit: null, credit: 12500.00, balance: 124140.00 },
  { id: 'TXN-10022', date: '24-Jan-2026', reference: 'WIRE-992014', description: 'ACME & NEXUS CONSOLIDATED SETTLEMENT', debit: null, credit: 25000.00, balance: 149140.00 },
  { id: 'TXN-10023', date: '12-Jan-2026', reference: 'FED-449102', description: 'STARLIGHT FINANCIAL GROUP INFLOW', debit: null, credit: 92400.00, balance: 111640.00 },
  { id: 'TXN-10024', date: '28-Jan-2026', reference: 'ACH-110294', description: 'DATASPHERE ANALYTICS SAAS SUBSCRIPTION', debit: null, credit: 48500.00, balance: 197640.00 },
  { id: 'TXN-10025', date: '21-Jan-2026', reference: 'TT-771920', description: 'GLOBAL LOGISTICS UK FREIGHT DISPATCH', debit: null, credit: 8080.00, balance: 119720.00 },
  { id: 'TXN-10026', date: '15-Jan-2026', reference: 'FEE-HSBC-01', description: 'TREASURY ACCOUNT MAINTENANCE FEE', debit: 450.00, credit: null, balance: 111190.00 },
  { id: 'TXN-10027', date: '30-Jan-2026', reference: 'WIRE-330192', description: 'BESPOKE SOFTWARE LABS REMITTANCE', debit: null, credit: 21600.00, balance: 155240.00 }
];

export const openStatementPdfInNewTab = ({
  fileName = 'HSBC_August_2026.pdf',
  bankName = 'HSBC Bank USA',
  accountNumber = '•••• 4821',
  periodFrom = '2026-08-01',
  periodTo = '2026-08-31',
  openingBalance = 0.00,
  closingBalance = 155240.00,
  credits = 320450.00,
  debits = 165210.00,
  transactions,
  highlightTxnRef,
  currentPage = 1,
  totalPages = 8
}: {
  fileName?: string;
  bankName?: string;
  accountNumber?: string;
  periodFrom?: string;
  periodTo?: string;
  openingBalance?: number;
  closingBalance?: number;
  credits?: number;
  debits?: number;
  transactions?: BankTransaction[] | any[];
  highlightTxnRef?: string | null;
  currentPage?: number;
  totalPages?: number;
}) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${fileName} - Bank Statement</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px 20px; margin: 0; }
          .statement-container { max-width: 880px; margin: 0 auto; background: #ffffff; color: #0f172a; padding: 40px; border-radius: 6px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #ea580c; padding-bottom: 16px; margin-bottom: 24px; }
          .bank-title { font-size: 24px; font-weight: bold; color: #ea580c; letter-spacing: -0.5px; }
          .bank-sub { font-size: 12px; color: #475569; margin-top: 2px; }
          .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; font-size: 13px; }
          .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 6px; }
          .meta-label { font-weight: 600; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
          .meta-val { font-size: 14px; font-weight: bold; color: #0f172a; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 16px; }
          th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-weight: 700; color: #334155; border-bottom: 2px solid #cbd5e1; font-family: monospace; font-size: 11px; }
          td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; font-family: monospace; }
          .text-right { text-align: right; }
          .credit { color: #059669; font-weight: 700; }
          .debit { color: #dc2626; font-weight: 700; }
          .footer { margin-top: 36px; border-top: 1px solid #e2e8f0; padding-top: 14px; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; }
          .selected-row { background-color: #fff7ed !important; font-weight: bold; border-left: 3px solid #ea580c; }
          .selected-tag { background: #ea580c; color: #fff; font-size: 9px; padding: 2px 6px; border-radius: 3px; margin-left: 6px; }
          @media print {
            body { background: #fff; padding: 0; }
            .statement-container { box-shadow: none; padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="statement-container">
          <div class="header">
            <div>
              <div class="bank-title">${bankName.toUpperCase()}</div>
              <div class="bank-sub">Commercial & Global Corporate Banking</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: bold; font-size: 16px; color: #1e293b;">MONTHLY ACCOUNT STATEMENT</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Period: ${periodFrom} to ${periodTo}</div>
            </div>
          </div>
          
          <div class="meta-grid">
            <div class="meta-box">
              <div class="meta-label">Account Number</div>
              <div class="meta-val">US44 HSBC 4821 0092 1882 (${accountNumber})</div>
              <div class="meta-label" style="margin-top: 10px;">Currency</div>
              <div class="meta-val">USD - United States Dollar</div>
            </div>
            <div class="meta-box">
              <div class="meta-label">Financial Summary</div>
              <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                <span style="color: #64748b;">Opening Balance:</span> <strong>$${openingBalance.toLocaleString('en-US', {minimumFractionDigits: 2})}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 2px;">
                <span style="color: #64748b;">Total Credits:</span> <strong style="color: #059669;">+$${credits.toLocaleString('en-US', {minimumFractionDigits: 2})}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 2px;">
                <span style="color: #64748b;">Total Debits:</span> <strong style="color: #dc2626;">-$${debits.toLocaleString('en-US', {minimumFractionDigits: 2})}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; margin-top: 6px; padding-top: 6px;">
                <span>Closing Balance:</span> <strong style="font-size: 14px; color: #ea580c;">$${closingBalance.toLocaleString('en-US', {minimumFractionDigits: 2})}</strong>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h4 style="margin: 0; font-size: 12px; text-transform: uppercase; color: #475569; letter-spacing: 0.5px;">Transactions Ledger (Page ${currentPage} of ${totalPages})</h4>
            <span style="font-size: 11px; color: #94a3b8; font-family: monospace;">Total Items: ${(transactions || DEFAULT_TRANSACTIONS).length}</span>
          </div>

          <table>
            <thead>
              <tr>
                <th>DATE</th>
                <th>REFERENCE</th>
                <th>DESCRIPTION</th>
                <th class="text-right">DEBIT (-)</th>
                <th class="text-right">CREDIT (+)</th>
                <th class="text-right">BALANCE</th>
              </tr>
            </thead>
            <tbody>
              ${(transactions || DEFAULT_TRANSACTIONS).map(t => {
                const isCredit = 'amount' in t ? (t as BankTransaction).type === 'credit' : !!(t as any).credit;
                const amt = 'amount' in t ? (t as BankTransaction).amount : ((t as any).credit || (t as any).debit || 0);
                const isSelected = highlightTxnRef && (t.reference === highlightTxnRef);
                return `
                  <tr class="${isSelected ? 'selected-row' : ''}">
                    <td>${'bookingDate' in t ? (t as BankTransaction).bookingDate : (t as any).date}</td>
                    <td>${t.reference} ${isSelected ? '<span class="selected-tag">SELECTED</span>' : ''}</td>
                    <td>${t.description}</td>
                    <td class="text-right ${!isCredit ? 'debit' : ''}">${!isCredit ? '$' + amt.toLocaleString('en-US', {minimumFractionDigits: 2}) : '-'}</td>
                    <td class="text-right ${isCredit ? 'credit' : ''}">${isCredit ? '$' + amt.toLocaleString('en-US', {minimumFractionDigits: 2}) : '-'}</td>
                    <td class="text-right">$145,000.00</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="footer">
            <div>${bankName} plc. Authorized & Regulated Banking Institution.</div>
            <div>Page ${currentPage} of ${totalPages} • Generated Audit Record</div>
          </div>
        </div>
      </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
};

export const PdfStatementViewer: React.FC<PdfStatementViewerProps> = ({
  fileName,
  bankName,
  accountNumber,
  periodFrom,
  periodTo,
  openingBalance = 0.00,
  closingBalance = 155240.00,
  credits = 320450.00,
  debits = 165210.00,
  transactionsCount = 248,
  transactions,
  highlightTxnRef,
  onSelectTxn,
  onClose,
  mode = 'modal',
  onSwitchToModal
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(mode === 'split' ? 90 : 100);
  const totalPages = 8;
  const activeRowRef = useRef<HTMLTableRowElement | null>(null);

  // Auto-scroll to selected part/transaction whenever highlightTxnRef changes
  useEffect(() => {
    if (highlightTxnRef && activeRowRef.current) {
      activeRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [highlightTxnRef]);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 15, 160));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 15, 60));
  };

  const handleFit = () => {
    setZoomLevel(mode === 'split' ? 90 : 100);
  };

  const handleViewInNewTab = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${fileName} - Bank Statement</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px 20px; }
            .statement-container { max-width: 850px; margin: 0 auto; background: #ffffff; color: #0f172a; padding: 40px; border-radius: 4px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #dc2626; padding-bottom: 16px; margin-bottom: 24px; }
            .bank-title { font-size: 24px; font-weight: bold; color: #dc2626; letter-spacing: -0.5px; }
            .bank-sub { font-size: 12px; color: #475569; }
            .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; font-size: 13px; }
            .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 4px; }
            .meta-label { font-weight: 600; color: #64748b; font-size: 11px; text-transform: uppercase; }
            .meta-val { font-size: 14px; font-weight: bold; color: #0f172a; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 16px; }
            th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-weight: 600; color: #334155; border-bottom: 1px solid #cbd5e1; font-family: monospace; }
            td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; font-family: monospace; }
            .text-right { text-align: right; }
            .credit { color: #059669; font-weight: 600; }
            .debit { color: #dc2626; }
            .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="statement-container">
            <div class="header">
              <div>
                <div class="bank-title">${bankName.toUpperCase()}</div>
                <div class="bank-sub">Commercial & Global Corporate Banking</div>
              </div>
              <div style="text-align: right;">
                <div style="font-weight: bold; font-size: 16px;">MONTHLY ACCOUNT STATEMENT</div>
                <div style="font-size: 12px; color: #64748b;">Period: ${periodFrom} to ${periodTo}</div>
              </div>
            </div>
            
            <div class="meta-grid">
              <div class="meta-box">
                <div class="meta-label">Account Number</div>
                <div class="meta-val">US44 HSBC 4821 0092 1882 (${accountNumber})</div>
                <div class="meta-label" style="margin-top: 8px;">Currency</div>
                <div class="meta-val">USD - United States Dollar</div>
              </div>
              <div class="meta-box">
                <div class="meta-label">Financial Summary</div>
                <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                  <span>Opening Balance:</span> <strong>$${openingBalance.toLocaleString('en-US', {minimumFractionDigits: 2})}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span>Total Credits:</span> <strong style="color: #059669;">+$${credits.toLocaleString('en-US', {minimumFractionDigits: 2})}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span>Total Debits:</span> <strong style="color: #dc2626;">-$${debits.toLocaleString('en-US', {minimumFractionDigits: 2})}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; margin-top: 4px; padding-top: 4px;">
                  <span>Closing Balance:</span> <strong style="font-size: 14px;">$${closingBalance.toLocaleString('en-US', {minimumFractionDigits: 2})}</strong>
                </div>
              </div>
            </div>

            <h4 style="margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; color: #475569; letter-spacing: 0.5px;">Transactions Ledger (Page ${currentPage} of ${totalPages})</h4>
            <table>
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>REFERENCE</th>
                  <th>DESCRIPTION</th>
                  <th class="text-right">DEBIT (-)</th>
                  <th class="text-right">CREDIT (+)</th>
                  <th class="text-right">BALANCE</th>
                </tr>
              </thead>
              <tbody>
                ${(transactions || DEFAULT_TRANSACTIONS).map(t => {
                  const isCredit = 'amount' in t ? (t as BankTransaction).type === 'credit' : !!(t as any).credit;
                  const amt = 'amount' in t ? (t as BankTransaction).amount : ((t as any).credit || (t as any).debit || 0);
                  const isSelected = highlightTxnRef && (t.reference === highlightTxnRef);
                  return `
                    <tr style="${isSelected ? 'background-color: #fef3c7; font-weight: bold;' : ''}">
                      <td>${'bookingDate' in t ? (t as BankTransaction).bookingDate : (t as any).date}</td>
                      <td>${t.reference} ${isSelected ? '★ SELECTED' : ''}</td>
                      <td>${t.description}</td>
                      <td class="text-right ${!isCredit ? 'debit' : ''}">${!isCredit ? '$' + amt.toLocaleString('en-US', {minimumFractionDigits: 2}) : '-'}</td>
                      <td class="text-right ${isCredit ? 'credit' : ''}">${isCredit ? '$' + amt.toLocaleString('en-US', {minimumFractionDigits: 2}) : '-'}</td>
                      <td class="text-right">$145,000.00</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

            <div class="footer">
              <div>HSBC Bank plc. Registered in England and Wales. Regulated by the Prudential Regulation Authority and Financial Conduct Authority.</div>
              <div>Page ${currentPage} of ${totalPages}</div>
            </div>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([`Statement: ${fileName}\nBank: ${bankName}\nAccount: ${accountNumber}\nPeriod: ${periodFrom} - ${periodTo}\nTransactions: ${transactionsCount}\nCredits: ${credits}\nDebits: ${debits}\nClosing Balance: ${closingBalance}`], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = fileName.replace(/\.[^/.]+$/, "") + ".txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Convert transactions array for ledger rows
  const ledgerRows = transactions ? transactions.map(t => ({
    id: t.id,
    date: t.bookingDate,
    reference: t.reference,
    description: t.description,
    debit: t.type === 'debit' ? t.amount : null,
    credit: t.type === 'credit' ? t.amount : null,
    balance: 145000.00
  })) : DEFAULT_TRANSACTIONS;

  return (
    <div className="flex flex-col h-full bg-[#E4E3E0] border border-gray-300 rounded-lg shadow-xs overflow-hidden font-sans">
      {/* Top Banner for Instant Selected Part Sync (Option 1 Header) */}
      {highlightTxnRef && (
        <div className="bg-[#1E293B] text-white px-3 py-2 flex items-center justify-between text-xs border-b border-slate-700 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#EA580C]"></span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 font-mono">
              Instant Selected Part:
            </span>
            <span className="font-mono font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded text-[11px] truncate">
              {highlightTxnRef}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (activeRowRef.current) {
                  activeRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              className="px-2 py-0.5 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer transition-colors"
              title="Jump to highlighted part in statement"
            >
              <Target className="w-3 h-3" />
              <span>Focus Part</span>
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Close PDF view and restore table layout"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* PDF Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200 text-xs text-gray-700 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <FileText className="w-4 h-4 text-red-600 shrink-0" />
          <span className="font-bold text-[#141414] truncate max-w-[140px] sm:max-w-[200px]" title={fileName}>
            {fileName}
          </span>
          <span className="bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 text-[9px] uppercase font-mono font-bold rounded">
            PDF
          </span>
          {mode === 'split' && (
            <span className="hidden sm:inline-block bg-orange-50 text-[#EA580C] border border-orange-200 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded">
              Split Mode
            </span>
          )}
        </div>

        {/* Page Nav & Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 hover:bg-gray-100 disabled:opacity-40 text-gray-700 rounded transition-colors cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          
          <span className="font-mono text-[#141414] font-bold px-1.5 py-0.5 text-[11px] bg-gray-50 border border-gray-200 rounded">
            {currentPage}/{totalPages}
          </span>

          <button
            type="button"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 hover:bg-gray-100 disabled:opacity-40 text-gray-700 rounded transition-colors cursor-pointer"
            title="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-[1px] bg-gray-200 mx-0.5" />

          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 hover:bg-gray-100 text-gray-700 rounded transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3 h-3" />
          </button>

          <span className="font-mono text-[10px] text-gray-600 font-bold w-7 text-center">
            {zoomLevel}%
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 hover:bg-gray-100 text-gray-700 rounded transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={handleFit}
            className="p-1 hover:bg-gray-100 text-gray-700 transition-colors text-[10px] px-1 font-bold rounded cursor-pointer hidden sm:inline-block"
            title="Fit to view"
          >
            Fit
          </button>
        </div>

        {/* Top-Right Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {mode === 'split' && onSwitchToModal && (
            <button
              type="button"
              onClick={onSwitchToModal}
              className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-gray-100 text-gray-700 text-[10px] font-bold transition-colors cursor-pointer border border-gray-300 rounded shadow-2xs"
              title="Expand to Full Screen Modal (Option 2)"
            >
              <Maximize2 className="w-3 h-3 text-gray-600" />
              <span className="hidden md:inline">Full Modal</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleViewInNewTab}
            className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-gray-100 text-gray-700 text-[10px] font-bold transition-colors cursor-pointer border border-gray-300 rounded shadow-2xs hidden sm:inline-flex"
            title="View in new browser tab"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="hidden md:inline">New Tab</span>
          </button>
          
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1 p-1 bg-white hover:bg-gray-100 text-gray-700 text-[10px] transition-colors cursor-pointer border border-gray-300 rounded shadow-2xs"
            title="Download Statement"
          >
            <Download className="w-3 h-3" />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded transition-colors cursor-pointer ml-1 border border-gray-200"
              title="Close PDF Viewer (Restore View)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* PDF Document Canvas Viewport */}
      <div className="flex-1 overflow-auto bg-[#ECEBE8] p-3 flex justify-center items-start">
        <div 
          className="w-full max-w-[650px] bg-white text-[#141414] shadow-md transition-transform origin-top border border-gray-300 rounded-sm"
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
        >
          {/* Document Sheet Header */}
          <div className="p-5 border-b-2 border-red-600 bg-white">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-red-600 flex items-center justify-center text-white font-black text-xs rounded-xs">
                    H
                  </div>
                  <span className="text-base font-black tracking-tight text-[#141414] uppercase font-sans">
                    {bankName}
                  </span>
                </div>
                <div className="text-[9px] text-gray-500 mt-0.5 tracking-wide">
                  GLOBAL LIQUIDITY & COMMERCIAL SETTLEMENT
                </div>
                <div className="text-[9px] text-gray-600 font-mono mt-0.5">
                  BIC: HSBCEU22 • SWIFT: HSBCUS33
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold uppercase text-[#141414] tracking-wider">
                  MONTHLY ACCOUNT STATEMENT
                </div>
                <div className="text-[10px] text-gray-600 mt-0.5">
                  Period: <span className="font-semibold text-[#141414]">{periodFrom}</span> to <span className="font-semibold text-[#141414]">{periodTo}</span>
                </div>
                <div className="text-[9px] text-emerald-800 font-bold inline-flex items-center gap-1 mt-1 bg-emerald-50 px-1.5 py-0.5 border border-emerald-300 rounded">
                  <ShieldCheck className="w-2.5 h-2.5" /> Official Bank Record
                </div>
              </div>
            </div>

            {/* Account & Summary strip */}
            <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-gray-200 text-[11px]">
              <div className="bg-gray-50 p-2 border border-gray-200 rounded">
                <div className="text-[9px] uppercase font-bold text-gray-500">Account Reference</div>
                <div className="font-mono font-bold text-[#141414] text-[11px] mt-0.5">US44 HSBC 4821 0092 1882 ({accountNumber})</div>
                <div className="text-[9px] text-gray-600 mt-0.5 flex justify-between">
                  <span>Currency: <strong className="text-[#141414]">USD</strong></span>
                  <span>Branch: <strong className="text-[#141414]">New York Main</strong></span>
                </div>
              </div>
              <div className="bg-gray-50 p-2 border border-gray-200 font-mono text-[10px] rounded">
                <div className="flex justify-between text-gray-600">
                  <span>Opening Bal:</span>
                  <span className="font-bold text-[#141414]">{formatCurrency(openingBalance)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Total Credits (+):</span>
                  <span className="font-bold">+{formatCurrency(credits)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Total Debits (-):</span>
                  <span className="font-bold">-{formatCurrency(debits)}</span>
                </div>
                <div className="flex justify-between text-[#141414] font-bold border-t border-gray-300 pt-0.5 mt-0.5">
                  <span>Closing Balance:</span>
                  <span className="text-[11px] font-bold">{formatCurrency(closingBalance)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Statement Transaction Table */}
          <div className="p-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">
                  TRANSACTION LEDGER (Page {currentPage} of {totalPages})
                </span>
                {highlightTxnRef && (
                  <span className="bg-orange-100 text-[#EA580C] text-[9px] px-1.5 py-0.2 rounded font-bold uppercase">
                    Sync Active
                  </span>
                )}
              </div>
              <span className="text-[9px] font-mono text-gray-500 font-bold">
                {ledgerRows.length} Line Items
              </span>
            </div>

            <table className="w-full text-[10px] border-collapse font-mono">
              <thead>
                <tr className="border-b-2 border-gray-800 text-gray-700 bg-gray-100 uppercase font-bold text-[9px]">
                  <th className="text-left py-1 px-1.5">Date</th>
                  <th className="text-left py-1 px-1.5">Ref / ID</th>
                  <th className="text-left py-1 px-1.5">Description</th>
                  <th className="text-right py-1 px-1.5">Debit (-)</th>
                  <th className="text-right py-1 px-1.5">Credit (+)</th>
                  <th className="text-right py-1 px-1.5">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-800">
                {ledgerRows.map((row) => {
                  const isSelected = highlightTxnRef && (
                    row.reference.toLowerCase() === highlightTxnRef.toLowerCase() ||
                    highlightTxnRef.toLowerCase().includes(row.reference.toLowerCase())
                  );

                  return (
                    <tr 
                      key={row.id || row.reference}
                      ref={isSelected ? activeRowRef : undefined}
                      onClick={() => onSelectTxn && onSelectTxn(row.reference)}
                      className={`transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-amber-100 ring-2 ring-[#EA580C] ring-inset font-bold text-gray-950 shadow-xs' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="py-1.5 px-1.5 whitespace-nowrap text-gray-600 font-medium">
                        {row.date}
                      </td>
                      <td className="py-1.5 px-1.5 font-bold whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className={isSelected ? 'text-[#EA580C]' : 'text-[#141414]'}>
                            {row.reference}
                          </span>
                          {isSelected && (
                            <span className="bg-[#EA580C] text-white text-[8px] px-1 py-0.2 rounded font-sans uppercase font-bold tracking-tight shrink-0">
                              Selected
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 px-1.5 text-gray-800 truncate max-w-[160px]" title={row.description}>
                        {row.description}
                      </td>
                      <td className="py-1.5 px-1.5 text-right font-medium">
                        {row.debit ? (
                          <span className="text-red-600 font-bold">-${row.debit.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1.5 px-1.5 text-right font-medium">
                        {row.credit ? (
                          <span className="text-emerald-700 font-bold">+${row.credit.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1.5 px-1.5 text-right font-bold text-gray-900">
                        ${row.balance.toLocaleString('en-US', {minimumFractionDigits: 2})}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Document Security Seal */}
            <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center text-[9px] text-gray-500 font-sans">
              <div>
                <span className="font-bold text-gray-700">Digital Audit Trail ID:</span> SHA256: 8f9b...a4e1 (Verified)
              </div>
              <div className="font-mono text-gray-400">
                Ledger Page {currentPage} of {totalPages}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
