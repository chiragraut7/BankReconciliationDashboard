import React, { useState } from 'react';
import {
  Search,
  Filter,
  Download,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowUpDown,
  Building2,
  Users2,
  FileSpreadsheet,
  CornerDownRight,
  Info
} from 'lucide-react';
import { YardiEtlRecord, EtlRecordOverride } from '../types/yardiMapping';
import { InvoiceETLFormat } from '../types/reconciliation';
import { formatCurrency } from '../utils/formatters';

interface EtlLoaderPreviewTableProps {
  records: YardiEtlRecord[];
  format: InvoiceETLFormat;
  onFormatChange: (format: InvoiceETLFormat) => void;
  recordOverrides: Record<string, EtlRecordOverride>;
  onUpdateRecordOverride: (recordId: string, override: Partial<EtlRecordOverride>) => void;
  onApplyNoteToInvoice: (invoiceId: string, note: string) => void;
  onResetOverrides: () => void;
  onOpenMappingManager: () => void;
}

export const EtlLoaderPreviewTable: React.FC<EtlLoaderPreviewTableProps> = ({
  records,
  format,
  onFormatChange,
  recordOverrides,
  onUpdateRecordOverride,
  onApplyNoteToInvoice,
  onResetOverrides,
  onOpenMappingManager
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [onlyErrorsFilter, setOnlyErrorsFilter] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Derive unique lists for filters
  const uniqueEntities = Array.from(new Set(records.map(r => r.ourEntityName))).sort();
  const uniqueVendors = Array.from(new Set(records.map(r => r.ourVendorName))).sort();

  // Filter records
  const filteredRecords = records.filter(r => {
    if (onlyErrorsFilter && !r.hasMappingError) return false;
    if (entityFilter !== 'all' && r.ourEntityName !== entityFilter) return false;
    if (vendorFilter !== 'all' && r.ourVendorName !== vendorFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.invoiceNumber.toLowerCase().includes(q) ||
      r.ourVendorName.toLowerCase().includes(q) ||
      r.yardiVendorCode.toLowerCase().includes(q) ||
      r.ourEntityName.toLowerCase().includes(q) ||
      r.yardiEntityCode.toLowerCase().includes(q) ||
      r.glCode.toLowerCase().includes(q) ||
      r.lineDescription.toLowerCase().includes(q) ||
      r.notes.toLowerCase().includes(q) ||
      (r.poNumber && r.poNumber.toLowerCase().includes(q))
    );
  });

  const totalErrorCount = records.filter(r => r.hasMappingError).length;
  const multiSplitCount = records.filter(r => (r.totalSplitsForInvoice || 1) > 1).length;
  const totalAmountUsd = records.reduce((sum, r) => sum + r.apportionedUsdAmount, 0);

  const handleStartEditNote = (record: YardiEtlRecord) => {
    setEditingNoteId(record.id);
    setTempNoteText(record.notes);
  };

  const handleSaveNote = (record: YardiEtlRecord, applyToAllForInvoice: boolean = false) => {
    if (applyToAllForInvoice) {
      onApplyNoteToInvoice(record.invoiceId, tempNoteText);
    } else {
      onUpdateRecordOverride(record.id, { notes: tempNoteText });
    }
    setEditingNoteId(null);
  };

  return (
    <div className="space-y-4">
      {/* FILTER & SEARCH TOOLBAR */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 grow">
          <div className="relative min-w-[200px] grow max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by invoice, GL code, notes, property..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs outline-hidden focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C]"
            />
          </div>

          <select
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-700 font-medium outline-hidden focus:border-[#EA580C]"
          >
            <option value="all">All Legal Entities ({uniqueEntities.length})</option>
            {uniqueEntities.map(ent => (
              <option key={ent} value={ent}>{ent}</option>
            ))}
          </select>

          <select
            value={vendorFilter}
            onChange={e => setVendorFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-700 font-medium outline-hidden focus:border-[#EA580C]"
          >
            <option value="all">All Vendors ({uniqueVendors.length})</option>
            {uniqueVendors.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>

          <button
            onClick={() => setOnlyErrorsFilter(!onlyErrorsFilter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              onlyErrorsFilter
                ? 'bg-amber-100 border-amber-300 text-amber-900'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Missing Mappings Only ({totalErrorCount})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenMappingManager}
            className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Users2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Edit Code Mappings</span>
          </button>
        </div>
      </div>

      {/* INTERACTIVE EDITABLE LOADER TABLE */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto max-h-[520px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-gray-100/95 backdrop-blur-xs border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Invoice & Split</th>
                <th className="py-2.5 px-3">Target Entity (Yardi Property)</th>
                <th className="py-2.5 px-3">Vendor (Yardi PayScan)</th>
                <th className="py-2.5 px-3">GL Account Code</th>
                <th className="py-2.5 px-3">Line Description</th>
                <th className="py-2.5 px-3 text-right">Split %</th>
                <th className="py-2.5 px-3 text-right">Allocated Gross</th>
                <th className="py-2.5 px-3 text-right">Tax / VAT</th>
                <th className="py-2.5 px-3 text-center">Curr</th>
                <th className="py-2.5 px-3 min-w-[220px]">Notes / Memo (Editable)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-gray-500">
                    <Info className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                    <div className="font-semibold">No ETL records matching current filters</div>
                    <div className="text-xs text-gray-400 mt-1">Try clearing filters or search query</div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => {
                  const isMulti = (r.totalSplitsForInvoice || 1) > 1;
                  const isEditingNote = editingNoteId === r.id;

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-gray-50/90 transition-colors ${
                        r.hasMappingError
                          ? 'bg-amber-50/50'
                          : isMulti
                          ? 'bg-blue-50/15'
                          : ''
                      }`}
                    >
                      {/* ROW # */}
                      <td className="py-2 px-3 text-center text-[10px] text-gray-400 font-mono">
                        {idx + 1}
                      </td>

                      {/* INVOICE NUMBER & SPLIT INDICATOR */}
                      <td className="py-2 px-3">
                        <div className="font-bold text-gray-900 flex items-center gap-1.5">
                          <span>{r.invoiceNumber}</span>
                          {r.invoiceDisplayId && (
                            <span className="px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded text-[9px] font-mono">
                              {r.invoiceDisplayId}
                            </span>
                          )}
                        </div>
                        {isMulti ? (
                          <div className="flex items-center gap-1 text-[10px] text-indigo-700 font-semibold mt-0.5">
                            <CornerDownRight className="w-3 h-3 shrink-0" />
                            <span>Split {r.splitIndex} of {r.totalSplitsForInvoice} ({r.splitPercent.toFixed(1)}%)</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-gray-500 mt-0.5">{r.invoiceDate}</div>
                        )}
                      </td>

                      {/* TARGET ENTITY & YARDI PROPERTY CODE */}
                      <td className="py-2 px-3">
                        <div className="text-gray-900 font-semibold text-[11px] truncate max-w-[170px]" title={r.ourEntityName}>
                          {r.ourEntityName}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1">
                          {r.isEntityMapped ? (
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-mono text-[10px] font-bold">
                              {r.yardiEntityCode}
                            </span>
                          ) : (
                            <button
                              onClick={onOpenMappingManager}
                              className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded font-mono text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                              title="Click to map Yardi Property Code"
                            >
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                              <span>Map Property Code</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* VENDOR & YARDI VENDOR CODE */}
                      <td className="py-2 px-3">
                        <div className="text-gray-900 font-medium text-[11px] truncate max-w-[150px]" title={r.ourVendorName}>
                          {r.ourVendorName}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1">
                          {r.isVendorMapped ? (
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded font-mono text-[10px] font-bold">
                              {r.yardiVendorCode}
                            </span>
                          ) : (
                            <button
                              onClick={onOpenMappingManager}
                              className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded font-mono text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                              title="Click to map Yardi Vendor Code"
                            >
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                              <span>Map Vendor Code</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* GL ACCOUNT CODE (INLINE EDITABLE) */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={r.glCode}
                          onChange={e => onUpdateRecordOverride(r.id, { glCode: e.target.value })}
                          className="px-2 py-0.5 text-[11px] font-mono font-bold text-gray-800 bg-transparent hover:bg-gray-100 focus:bg-white border border-transparent focus:border-[#EA580C] rounded outline-hidden w-28"
                          title="Click to edit GL Account Code"
                        />
                      </td>

                      {/* LINE DESCRIPTION (INLINE EDITABLE) */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={r.lineDescription}
                          onChange={e => onUpdateRecordOverride(r.id, { lineDescription: e.target.value })}
                          className="px-2 py-0.5 text-[11px] text-gray-700 bg-transparent hover:bg-gray-100 focus:bg-white border border-transparent focus:border-[#EA580C] rounded outline-hidden w-full max-w-[180px] truncate"
                          title="Click to edit Line Item Description"
                        />
                      </td>

                      {/* SPLIT % */}
                      <td className="py-2 px-3 text-right font-mono font-semibold text-gray-700">
                        {r.splitPercent.toFixed(1)}%
                      </td>

                      {/* APPORTIONED GROSS AMOUNT */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">
                        {formatCurrency(r.apportionedGrossAmount, r.currency)}
                      </td>

                      {/* APPORTIONED TAX / VAT */}
                      <td className="py-2 px-3 text-right font-mono text-gray-500">
                        {r.apportionedTaxAmount > 0
                          ? formatCurrency(r.apportionedTaxAmount, r.currency)
                          : '0.00'}
                      </td>

                      {/* CURRENCY */}
                      <td className="py-2 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 font-mono">
                          {r.currency}
                        </span>
                      </td>

                      {/* NOTES / MEMO (SELECTIVE EDITABLE FIELD) */}
                      <td className="py-2 px-3">
                        {isEditingNote ? (
                          <div className="flex flex-col gap-1.5 bg-white p-2 border border-orange-300 rounded-lg shadow-md animate-in fade-in">
                            <textarea
                              value={tempNoteText}
                              onChange={e => setTempNoteText(e.target.value)}
                              rows={2}
                              className="w-full p-1.5 text-xs text-gray-900 border border-gray-300 rounded outline-hidden focus:border-[#EA580C]"
                              placeholder="Enter custom posting note or memo..."
                              autoFocus
                            />
                            <div className="flex items-center justify-between gap-2">
                              <button
                                onClick={() => handleSaveNote(r, true)}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                                title="Apply this note to all split line items for this invoice"
                              >
                                Apply to All Invoice Lines
                              </button>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setEditingNoteId(null)}
                                  className="px-2 py-0.5 text-[10px] text-gray-500 hover:text-gray-800 cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveNote(r, false)}
                                  className="px-2.5 py-0.5 bg-[#EA580C] hover:bg-[#D94E07] text-white text-[10px] font-bold rounded cursor-pointer"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => handleStartEditNote(r)}
                            className="group flex items-center justify-between gap-1 px-2 py-1 bg-gray-50 hover:bg-orange-50/80 border border-gray-200 hover:border-orange-300 rounded cursor-pointer transition-all"
                            title="Click to edit Notes / Memo for this ETL record"
                          >
                            <span className="text-[11px] text-gray-700 truncate max-w-[200px]">
                              {r.notes || 'Click to add note...'}
                            </span>
                            <Edit3 className="w-3 h-3 text-gray-400 group-hover:text-[#EA580C] shrink-0" />
                          </div>
                        )}
                      </td>

                      {/* STATUS */}
                      <td className="py-2 px-3 text-center">
                        {r.hasMappingError ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300" title={r.mappingErrorMessage}>
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                            Unmapped
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Check className="w-2.5 h-2.5 text-emerald-600" />
                            Ready
                          </span>
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
    </div>
  );
};
