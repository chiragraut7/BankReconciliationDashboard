import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Calendar, 
  Clock,
  Receipt,
  CheckCircle2, 
  Info,
  Layers,
  Building2,
  Printer,
  CreditCard,
  MessageSquare,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  UserCheck
} from 'lucide-react';
import { MatchedInvoice } from '../types/reconciliation';
import { formatCurrency } from '../utils/formatters';

interface InvoiceDetailModalProps {
  invoice: MatchedInvoice | null;
  onClose: () => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'audit'>('details');
  const [expandedEntityCards, setExpandedEntityCards] = useState<Record<string, boolean>>({
    'entity-0': true,
    'entity-1': true,
    'entity-2': true,
    'entity-3': true
  });

  if (!invoice) return null;

  const currency = invoice.currency || 'USD';
  const displayId = invoice.invoiceIdDisplay || '#73';
  const invoiceNum = invoice.invoiceNumber;
  const vendorName = invoice.entityName;
  const entityName = invoice.entity || 'Novus Lux Fairhaven Intermediate 06 SCSp';
  const payingEntity = invoice.payingEntity || entityName;
  const bankName = invoice.bankName || 'GL12_EUDL_COINVEST_BNP_GBP';
  const paymentCurrency = invoice.paymentCurrency || currency;
  const jobNumber = invoice.jobNumber || '—';
  const expensesType = invoice.expensesType || '—';
  const vendorVatNumber = invoice.vendorVatNumber || '—';
  const postMonth = invoice.postMonth || '03/2026';
  const submittedOn = invoice.submittedOn || invoice.date || '27/08/2026';
  const fromDate = invoice.fromDate || '—';
  const toDate = invoice.toDate || '—';
  const paymentTerms = invoice.paymentTerms || `Net 0 days`;
  const totalIncVat = invoice.totalIncVat ?? invoice.amount;
  const totalExVat = invoice.totalExVat ?? (invoice.taxAmount ? invoice.amount - invoice.taxAmount : invoice.amount);

  // Rich Line Items fallback if standard invoice
  const richLineItems = invoice.richLineItems && invoice.richLineItems.length > 0 
    ? invoice.richLineItems 
    : [
        {
          id: 'LI-1',
          glCode: 'GL-6100 ESG',
          description: invoice.description || 'Enterprise Advisory & Infrastructure Services',
          quantity: 1,
          unitPrice: invoice.amount,
          netAmount: invoice.amount,
          taxRate: '0%',
          taxAmount: 0.00,
          totalAmount: invoice.amount,
          splits: [
            { target: entityName, percent: 100.0, amount: invoice.amount, vat: 0.0, totalAmount: invoice.amount }
          ]
        }
      ];

  const totalNetAmount = richLineItems.reduce((sum, item) => sum + item.netAmount, 0);
  const totalTaxAmount = richLineItems.reduce((sum, item) => sum + item.taxAmount, 0);
  const totalGrossAmount = richLineItems.reduce((sum, item) => sum + item.totalAmount, 0);

  // Multi-entity payment information list
  const payingEntitiesList = invoice.payingEntities && invoice.payingEntities.length > 0
    ? invoice.payingEntities
    : invoice.apportionment && invoice.apportionment.length > 1
      ? invoice.apportionment.map(ap => ({
          entityName: ap.payingEntity,
          bankName: ap.bank,
          paymentCurrency: paymentCurrency,
          tier: ap.tier || 'Tier 1',
          status: ap.status || 'Submitted For Review'
        }))
      : [
          {
            entityName: payingEntity,
            bankName: bankName,
            paymentCurrency: paymentCurrency,
            tier: 'Tier 1',
            status: 'Approved'
          }
        ];

  // Apportionment fallback
  const apportionment = invoice.apportionment && invoice.apportionment.length > 0
    ? invoice.apportionment
    : [
        {
          payingEntity: payingEntity,
          bank: bankName,
          net: totalNetAmount,
          vat: totalTaxAmount,
          gross: totalGrossAmount,
          percent: 100,
          tier: 'Tier 1',
          status: 'Approved',
          color: '#831843'
        }
      ];

  // Colors for multi-entity apportionment bar
  const defaultColors = ['#831843', '#6B21A8', '#0369A1', '#0F766E', '#B45309'];

  const toggleEntityCard = (key: string) => {
    setExpandedEntityCards(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
      <div 
        className="bg-white border border-gray-300 w-full max-w-7xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[96vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP STATUS BAR (MATCHING SCREENSHOT) */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-white border-b border-gray-200 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 text-sm font-mono tracking-tight">
              {displayId} | Invoice - {invoiceNum}
            </span>
          </div>

          {/* Center Status Reconciled Pill */}
          <div className="flex items-center gap-3">
            <span className="text-gray-700 text-xs flex items-center gap-1.5 font-medium">
              <span>Invoice amount reconciled?</span>
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold border border-emerald-300">
                ✓
              </span>
            </span>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-600 font-medium">Status :</span>
              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold px-2 py-0.5 rounded shadow-2xs">
                Submitted For Review
              </span>
            </div>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-1 text-gray-700 text-xs">
              <span className="font-medium">Approval Workflow :</span>
              <UserCheck className="w-3.5 h-3.5 text-orange-600" />
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded border border-orange-200 transition-colors cursor-pointer"
              title="Download PDF"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'comments' ? 'details' : 'comments')}
              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded border border-orange-200 transition-colors cursor-pointer"
              title="Comments / Notes"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'audit' ? 'details' : 'audit')}
              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded border border-orange-200 transition-colors cursor-pointer"
              title="Audit Log"
            >
              <ClipboardCheck className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors ml-2 cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MAIN BODY: 2 COLUMN LAYOUT (LEFT: DETAILS, RIGHT: PRE-APPROVAL CHECKLIST) */}
        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row bg-[#F8F9FA]">
          
          {/* LEFT / CENTER CONTENT */}
          <div className="flex-1 p-5 space-y-4 overflow-y-auto">
            
            {/* VENDOR HEADER & SUMMARY CARD */}
            <div className="bg-white p-4 rounded-md border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight font-sans">
                  {vendorName}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded border border-gray-200">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Invoice Date</span>
                    <strong className="text-gray-900 font-mono">{invoice.date}</strong>
                  </div>
                  <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded border border-gray-200">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Submitted On</span>
                    <strong className="text-gray-900 font-mono">{submittedOn}</strong>
                  </div>
                  <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded border border-gray-200">
                    <span className="w-3.5 h-3.5 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-[10px] font-bold">
                      $
                    </span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Currency</span>
                    <strong className="text-gray-900 font-mono">{currency}</strong>
                  </div>
                </div>
              </div>

              {/* Amounts Header on Right */}
              <div className="flex items-center gap-3">
                <div className="text-right bg-orange-50/60 p-2.5 px-3.5 rounded border border-orange-200">
                  <div className="flex items-center justify-end gap-1 text-[10px] uppercase font-bold text-gray-600">
                    <Receipt className="w-3 h-3 text-orange-600" />
                    <span>Total Inc. VAT</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-orange-700">
                    {formatCurrency(totalIncVat, currency)}
                  </div>
                </div>

                <div className="text-right bg-gray-50 p-2.5 px-3.5 rounded border border-gray-200">
                  <div className="flex items-center justify-end gap-1 text-[10px] uppercase font-bold text-gray-600">
                    <span>Ex VAT</span>
                  </div>
                  <div className="text-sm font-bold font-mono text-gray-800">
                    {formatCurrency(totalExVat, currency)}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 1: INVOICE DETAILS */}
            <div className="bg-white rounded-md border border-gray-200 overflow-hidden shadow-2xs">
              <div className="px-4 py-2 bg-gray-50/80 border-b border-gray-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-600" />
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Invoice Details
                </h3>
              </div>
              
              <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6 text-xs">
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-400">Job Number</div>
                  <div className="font-mono font-bold text-gray-900 mt-0.5">{jobNumber}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-400">Expenses Type</div>
                  <div className="font-bold text-gray-900 mt-0.5">{expensesType}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-400">Vendor VAT Number</div>
                  <div className="font-mono text-gray-800 mt-0.5">{vendorVatNumber}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                    <span>Payment Terms</span>
                    <Info className="w-3 h-3 text-orange-500 inline" />
                  </div>
                  <div className="font-bold text-gray-900 mt-0.5">{paymentTerms}</div>
                  <div className="text-[10px] text-gray-400 font-mono">Due: {invoice.dueDate}</div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-400">Post Month</div>
                  <div className="font-mono font-bold text-gray-900 mt-0.5">{postMonth}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-400">Submitted On</div>
                  <div className="font-mono font-bold text-gray-900 mt-0.5">{submittedOn}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-400">From Date</div>
                  <div className="font-mono text-gray-700 mt-0.5">{fromDate}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-400">To Date</div>
                  <div className="font-mono text-gray-700 mt-0.5">{toDate}</div>
                </div>

                <div className="col-span-2 md:col-span-4 pt-1 border-t border-gray-100">
                  <div className="text-[10px] uppercase font-bold text-gray-400">Entity</div>
                  <div className="font-semibold text-gray-900 mt-1 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded text-xs">
                    {entityName}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: PAYMENT INFORMATION */}
            <div className="bg-white rounded-md border border-gray-200 overflow-hidden shadow-2xs">
              <div className="px-4 py-2 bg-gray-50/80 border-b border-gray-200 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-600" />
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Payment Information
                </h3>
              </div>

              <div className="p-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase text-gray-400 border-b border-gray-100">
                    <tr>
                      <th className="pb-2 font-bold">Paying Entity</th>
                      <th className="pb-2 font-bold">Bank Name</th>
                      <th className="pb-2 font-bold">Payment Currency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                    {payingEntitiesList.map((pe, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="py-2.5 font-sans font-medium text-gray-900">{pe.entityName}</td>
                        <td className="py-2.5 text-gray-700">{pe.bankName}</td>
                        <td className="py-2.5 font-bold text-gray-900">{pe.paymentCurrency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 3: INVOICE LINE ITEMS */}
            <div className="bg-white rounded-md border border-gray-200 overflow-hidden shadow-2xs">
              <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-gray-600" />
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                      Invoice Line Items
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Each line item is linked to its corresponding budget position, shown inline.
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 text-[10px] uppercase font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Net Amount</th>
                      <th className="py-2.5 px-3 text-center">Tax Rate%</th>
                      <th className="py-2.5 px-3 text-right">Tax Amount</th>
                      <th className="py-2.5 px-3 text-center">Other Amount</th>
                      <th className="py-2.5 px-3 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-800">
                    {richLineItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-sans text-xs text-gray-900 font-medium">
                          {item.description}
                        </td>
                        <td className="py-2.5 px-3 text-center text-gray-600">{item.quantity}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">{formatCurrency(item.unitPrice, currency)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900">{formatCurrency(item.netAmount, currency)}</td>
                        <td className="py-2.5 px-3 text-center text-gray-600">{item.taxRate}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">{formatCurrency(item.taxAmount, currency)}</td>
                        <td className="py-2.5 px-3 text-center text-gray-400">—</td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900">{formatCurrency(item.totalAmount, currency)}</td>
                      </tr>
                    ))}

                    {/* Totals Row */}
                    <tr className="bg-gray-50/80 font-bold border-t border-gray-200">
                      <td colSpan={3} className="py-2.5 px-3 font-sans text-xs uppercase text-gray-700">
                        Totals
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-900 font-mono">
                        {formatCurrency(totalNetAmount, currency)}
                      </td>
                      <td className="py-2.5 px-3"></td>
                      <td className="py-2.5 px-3 text-right text-gray-700 font-mono">
                        {formatCurrency(totalTaxAmount, currency)}
                      </td>
                      <td className="py-2.5 px-3"></td>
                      <td className="py-2.5 px-3 text-right text-gray-900 font-mono">
                        {formatCurrency(totalGrossAmount, currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 4: PAYING ENTITY APPORTIONMENT */}
            <div className="bg-white rounded-md border border-gray-200 overflow-hidden shadow-2xs">
              <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-orange-100 text-orange-700 flex items-center justify-center">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                      Paying Entity Apportionment
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      {formatCurrency(totalGrossAmount, currency)} net split across paying entities
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-white px-2.5 py-1 rounded border border-gray-200 shadow-2xs">
                  <span className="text-[11px] font-medium">Original Commitment Allocation:</span>
                  <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
                </div>
              </div>

              {/* Multi-Entity Color Segmented Bar */}
              <div className="px-4 pt-3 pb-1">
                <div className="w-full h-3 rounded-full overflow-hidden flex bg-gray-100 border border-gray-200">
                  {apportionment.map((ap, idx) => {
                    const barColor = ap.color || defaultColors[idx % defaultColors.length];
                    return (
                      <div 
                        key={idx}
                        style={{ width: `${ap.percent}%`, backgroundColor: barColor }}
                        className="h-full transition-all duration-300"
                        title={`${ap.payingEntity}: ${ap.percent.toFixed(2)}%`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="overflow-x-auto p-4 pt-2">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead className="text-[10px] uppercase text-gray-400 border-b border-gray-100">
                    <tr>
                      <th className="pb-2 font-bold">Paying Entity</th>
                      <th className="pb-2 font-bold">Bank</th>
                      <th className="pb-2 font-bold text-right">Net</th>
                      <th className="pb-2 font-bold text-right">VAT</th>
                      <th className="pb-2 font-bold text-right">Gross</th>
                      <th className="pb-2 font-bold text-right">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-800">
                    {apportionment.map((ap, idx) => {
                      const badgeColor = ap.color || defaultColors[idx % defaultColors.length];
                      return (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="py-2.5 font-sans font-medium text-gray-900 flex items-center gap-2">
                            <span 
                              className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[9px] font-bold shrink-0"
                              style={{ backgroundColor: badgeColor }}
                            >
                              {getInitials(ap.payingEntity)}
                            </span>
                            <span>{ap.payingEntity}</span>
                          </td>
                          <td className="py-2.5 text-gray-600 font-mono text-[10px]">{ap.bank}</td>
                          <td className="py-2.5 text-right text-gray-800">{formatCurrency(ap.net, currency)}</td>
                          <td className="py-2.5 text-right text-gray-600">{formatCurrency(ap.vat, currency)}</td>
                          <td className="py-2.5 text-right font-bold text-gray-900">{formatCurrency(ap.gross, currency)}</td>
                          <td className="py-2.5 text-right font-bold text-purple-900">{ap.percent.toFixed(2)}%</td>
                        </tr>
                      );
                    })}
                    <tr className="font-bold border-t border-gray-200 bg-gray-50/40">
                      <td colSpan={2} className="py-2.5 font-sans text-xs text-gray-900">Total</td>
                      <td className="py-2.5 text-right text-gray-900">{formatCurrency(totalNetAmount, currency)}</td>
                      <td className="py-2.5 text-right text-gray-700">{formatCurrency(totalTaxAmount, currency)}</td>
                      <td className="py-2.5 text-right text-gray-900">{formatCurrency(totalGrossAmount, currency)}</td>
                      <td className="py-2.5 text-right text-purple-900">
                        {apportionment.reduce((acc, curr) => acc + curr.percent, 0).toFixed(2)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 5: INDIVIDUAL PAYING ENTITY BREAKDOWN CARDS (ACCORDIONS) */}
            <div className="space-y-3">
              {apportionment.map((ap, idx) => {
                const cardKey = `entity-${idx}`;
                const isExpanded = expandedEntityCards[cardKey] ?? true;
                const badgeColor = ap.color || defaultColors[idx % defaultColors.length];

                // Determine line items for this specific entity
                const lineItemsForEntity = ap.lineBreakdown && ap.lineBreakdown.length > 0
                  ? ap.lineBreakdown
                  : richLineItems.map(item => {
                      const sharePct = ap.percent;
                      const allocated = (item.totalAmount * sharePct) / 100;
                      return {
                        description: item.description,
                        allocated: allocated,
                        sharePercent: sharePct
                      };
                    });

                return (
                  <div key={idx} className="bg-white rounded-md border border-gray-200 overflow-hidden shadow-2xs">
                    {/* Entity Header */}
                    <div 
                      onClick={() => toggleEntityCard(cardKey)}
                      className="p-3.5 px-4 bg-gray-50/90 hover:bg-gray-100/80 cursor-pointer flex flex-wrap items-center justify-between gap-3 transition-colors select-none"
                    >
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span 
                          className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs"
                          style={{ backgroundColor: badgeColor }}
                        >
                          {getInitials(ap.payingEntity)}
                        </span>
                        <span className="font-bold text-gray-900 text-xs sm:text-sm">
                          {ap.payingEntity}
                        </span>
                        <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded border border-gray-300">
                          {ap.tier || 'Tier 1'}
                        </span>
                        <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
                          {ap.status || 'Submitted For Review'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-base sm:text-lg font-bold font-mono text-gray-900">
                            {formatCurrency(ap.gross, currency)}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            + {formatCurrency(ap.vat, currency)} VAT = {formatCurrency(ap.gross, currency)}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="p-1 text-gray-400 hover:text-gray-700"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Entity Line Breakdown Table */}
                    {isExpanded && (
                      <div className="p-4 border-t border-gray-200 bg-white">
                        <div className="text-[10px] uppercase font-bold text-gray-400 mb-2 tracking-wider">
                          Line Breakdown
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left font-mono text-[11px]">
                            <thead className="text-[10px] uppercase text-gray-400 border-b border-gray-100">
                              <tr>
                                <th className="pb-2 font-bold">Description</th>
                                <th className="pb-2 text-right font-bold">Allocated</th>
                                <th className="pb-2 text-right font-bold">% Share</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-800">
                              {lineItemsForEntity.map((li, lIdx) => (
                                <tr key={lIdx} className="hover:bg-gray-50/50">
                                  <td className="py-2.5 font-sans font-medium text-gray-900 text-xs">
                                    {li.description}
                                  </td>
                                  <td className="py-2.5 text-right font-bold text-gray-900">
                                    {formatCurrency(li.allocated, currency)}
                                  </td>
                                  <td className="py-2.5 text-right text-gray-600 font-mono">
                                    {li.sharePercent.toFixed(3)}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>

          {/* RIGHT PRE-APPROVAL CHECKLIST SIDEBAR (MATCHING SCREENSHOT) */}
          <div className="w-full lg:w-72 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 p-5 space-y-6 shrink-0">
            
            <div className="p-3.5 bg-emerald-50/50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Pre-approval checklist</span>
              </div>
              <p className="text-[11px] text-emerald-700 mt-1">
                All items must be reviewed before proceeding
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2.5 text-xs text-gray-800 p-2 hover:bg-gray-50 rounded transition-colors">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold border border-emerald-300">
                  ✓
                </div>
                <span className="font-medium">Client Information Verified</span>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-gray-800 p-2 hover:bg-gray-50 rounded transition-colors">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold border border-emerald-300">
                  ✓
                </div>
                <span className="font-medium">Vendor Information Verified</span>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-gray-800 p-2 hover:bg-gray-50 rounded transition-colors">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold border border-emerald-300">
                  ✓
                </div>
                <span className="font-medium">Invoice Reconciliation Verified</span>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-gray-800 p-2 hover:bg-gray-50 rounded transition-colors">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold border border-emerald-300">
                  ✓
                </div>
                <span className="font-medium">Invoice Number Verified</span>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-gray-800 p-2 hover:bg-gray-50 rounded transition-colors">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold border border-emerald-300">
                  ✓
                </div>
                <span className="font-medium">Invoice Payment DueDate</span>
              </div>
            </div>

            {/* Reconciliation Linkage Card */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-2">
              <div className="text-[10px] uppercase font-bold text-gray-500">Reconciliation Linkage</div>
              <div className="font-mono text-gray-900 font-bold">
                {invoice.matchedBankTxnId ? `Bank Txn ${invoice.matchedBankTxnId}` : 'Reconciled Direct'}
              </div>
              <p className="text-[11px] text-gray-500">
                Auto-matched with {invoice.matchConfidence}% confidence.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="pt-4 border-t border-gray-200 space-y-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="w-full py-2 px-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official PDF</span>
              </button>
            </div>
          </div>

        </div>

        {/* BOTTOM STATUS FOOTER (MATCHING SCREENSHOT) */}
        <div className="px-5 py-2.5 bg-white border-t border-gray-200 flex items-center justify-between text-xs font-sans shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-900 font-mono">
              {invoiceNum}
            </span>
            <span className="text-gray-400">•</span>
            <span className="font-bold text-gray-900 font-mono">
              {formatCurrency(totalGrossAmount, currency)} Gross
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-amber-700 font-bold flex items-center gap-1">
              <span>●</span>
              <span>Pending Review</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

