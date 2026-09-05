import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  CheckCircle2,
  Edit2,
  X,
  Info,
  TableProperties,
  Check,
  RotateCcw,
  Sparkles,
  DollarSign
} from 'lucide-react';
import { YardiEtlRecord, EtlRecordOverride } from '../types/yardiMapping';
import { InvoiceETLFormat } from '../types/reconciliation';
import { formatCurrency } from '../utils/formatters';
import { YARDI_VOYAGER_SCHEMA_COLUMNS, exportToYardiVoyagerCsv } from '../utils/yardiEtlEngine';

const COMMON_GL_ACCOUNTS = [
  'GL-6000 OPEX',
  'GL-6100 ESG',
  'GL-6200 LEG',
  'GL-6300 AUD',
  'GL-6400 IT',
  'GL-6500 MKT',
  'GL-6900 ADM',
  'GL-7200 VAL',
  'GL-7400 TAX',
  'GL-2000 AP'
];

interface EtlLoaderPreviewTableProps {
  records: YardiEtlRecord[];
  format: InvoiceETLFormat;
  onFormatChange: (format: InvoiceETLFormat) => void;
  recordOverrides: Record<string, EtlRecordOverride>;
  onUpdateRecordOverride: (recordId: string, override: Partial<EtlRecordOverride>) => void;
  onApplyNoteToInvoice: (invoiceId: string, note: string) => void;
  onResetOverrides: () => void;
  onOpenMappingManager?: () => void;
  batchName?: string;
  batchId?: string;
}

export const EtlLoaderPreviewTable: React.FC<EtlLoaderPreviewTableProps> = ({
  records,
  format,
  onFormatChange,
  recordOverrides,
  onUpdateRecordOverride,
  onApplyNoteToInvoice,
  onResetOverrides,
  onOpenMappingManager,
  batchName,
  batchId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [mappingStatusFilter, setMappingStatusFilter] = useState<'all' | 'mapped' | 'unmapped'>('all');

  // Inline editing states
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState('');
  const [editingFieldId, setEditingFieldId] = useState<{
    id: string;
    field: 'clientReference' | 'dueDate' | 'glCode' | 'yardiEntityCode' | 'yardiVendorCode';
  } | null>(null);
  const [tempFieldValue, setTempFieldValue] = useState('');

  // Notifications
  const [downloadNotification, setDownloadNotification] = useState<string | null>(null);

  // Derive unique lists for filters
  const uniqueEntities = useMemo(() => {
    return Array.from(new Set(records.map(r => r.ourEntityName || r.payingEntityName || ''))).filter(Boolean).sort();
  }, [records]);

  const uniqueVendors = useMemo(() => {
    return Array.from(new Set(records.map(r => r.ourVendorName || ''))).filter(Boolean).sort();
  }, [records]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (entityFilter !== 'all' && r.ourEntityName !== entityFilter && r.payingEntityName !== entityFilter) return false;
      if (vendorFilter !== 'all' && r.ourVendorName !== vendorFilter) return false;
      if (mappingStatusFilter === 'mapped' && r.hasMappingError) return false;
      if (mappingStatusFilter === 'unmapped' && !r.hasMappingError) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.invoiceNumber.toLowerCase().includes(q) ||
        (r.clientReference && r.clientReference.toLowerCase().includes(q)) ||
        (r.sourceEntityName && r.sourceEntityName.toLowerCase().includes(q)) ||
        (r.payingEntityName && r.payingEntityName.toLowerCase().includes(q)) ||
        r.ourEntityName.toLowerCase().includes(q) ||
        r.yardiEntityCode.toLowerCase().includes(q) ||
        r.ourVendorName.toLowerCase().includes(q) ||
        r.yardiVendorCode.toLowerCase().includes(q) ||
        (r.payingBankName && r.payingBankName.toLowerCase().includes(q)) ||
        (r.beneficiaryName && r.beneficiaryName.toLowerCase().includes(q)) ||
        (r.beneficiaryBankBic && r.beneficiaryBankBic.toLowerCase().includes(q)) ||
        (r.beneficiaryBankName && r.beneficiaryBankName.toLowerCase().includes(q)) ||
        r.glCode.toLowerCase().includes(q) ||
        r.lineDescription.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q) ||
        (r.poNumber && r.poNumber.toLowerCase().includes(q)) ||
        (r.removedFromBatchId && r.removedFromBatchId.toLowerCase().includes(q))
      );
    });
  }, [records, entityFilter, vendorFilter, mappingStatusFilter, searchQuery]);

  const totalErrorCount = records.filter(r => r.hasMappingError).length;
  const multiSplitCount = records.filter(r => (r.totalSplitsForInvoice || 1) > 1).length;
  const totalAmountUsd = records.reduce((sum, r) => sum + r.apportionedUsdAmount, 0);

  // Note inline edit handlers
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

  // Field inline edit handlers
  const handleStartEditField = (
    record: YardiEtlRecord,
    field: 'clientReference' | 'dueDate' | 'glCode' | 'yardiEntityCode' | 'yardiVendorCode'
  ) => {
    setEditingFieldId({ id: record.id, field });
    if (field === 'clientReference') setTempFieldValue(record.clientReference || '');
    else if (field === 'dueDate') setTempFieldValue(record.dueDate || '');
    else if (field === 'glCode') setTempFieldValue(record.glCode || '');
    else if (field === 'yardiEntityCode') setTempFieldValue(record.yardiEntityCode || '');
    else if (field === 'yardiVendorCode') setTempFieldValue(record.yardiVendorCode || '');
  };

  const handleSaveField = (record: YardiEtlRecord) => {
    if (!editingFieldId) return;
    const { field } = editingFieldId;
    if (field === 'clientReference') {
      onUpdateRecordOverride(record.id, { clientReference: tempFieldValue });
    } else if (field === 'dueDate') {
      onUpdateRecordOverride(record.id, { dueDate: tempFieldValue });
    } else if (field === 'glCode') {
      onUpdateRecordOverride(record.id, { glCode: tempFieldValue });
    } else if (field === 'yardiEntityCode') {
      onUpdateRecordOverride(record.id, { yardiEntityCode: tempFieldValue });
    } else if (field === 'yardiVendorCode') {
      onUpdateRecordOverride(record.id, { yardiVendorCode: tempFieldValue });
    }
    setEditingFieldId(null);
  };

  // Download CSV Handler
  const handleDownloadCsv = (exportRecords: YardiEtlRecord[] = records, scopeLabel: string = 'All') => {
    if (exportRecords.length === 0) {
      alert('No records to download.');
      return;
    }
    const csvContent = exportToYardiVoyagerCsv(exportRecords);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const safeName = (batchName || batchId || 'Batch')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_');
    const timestamp = new Date().toISOString().slice(0, 10);
    link.download = `${safeName}_Yardi_Voyager_Loader_${timestamp}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadNotification(`Downloaded ${exportRecords.length} records (${scopeLabel}) as Yardi Voyager CSV`);
    setTimeout(() => setDownloadNotification(null), 3500);
  };

  return (
    <div className="space-y-4">
      {/* FILTER & CONTROL TOOLBAR */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 grow">
          <div className="relative min-w-[220px] grow max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by invoice, GL code, client ref, bank, notes..."
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

          <select
            value={mappingStatusFilter}
            onChange={e => setMappingStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-700 font-medium outline-hidden focus:border-[#EA580C]"
          >
            <option value="all">All Mapping Statuses</option>
            <option value="mapped">Mapped Only</option>
            <option value="unmapped">Unmapped / Attention Needed ({totalErrorCount})</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {Object.keys(recordOverrides).length > 0 && (
            <button
              type="button"
              onClick={onResetOverrides}
              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold border border-gray-300 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Reset all manual inline edits"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
              <span>Reset {Object.keys(recordOverrides).length} Edits</span>
            </button>
          )}

          {/* CSV DOWNLOAD BUTTON */}
          <button
            type="button"
            onClick={() => handleDownloadCsv(records, 'All Records')}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border border-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Download full 87-column Yardi Voyager PayScan CSV Loader file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
            <span className="ml-0.5 px-1.5 py-0.2 bg-emerald-700/80 text-[10px] rounded-full font-mono">
              {records.length}
            </span>
          </button>
        </div>
      </div>

      {/* DOWNLOAD SUCCESS TOAST BANNER */}
      {downloadNotification && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-900 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{downloadNotification}</span>
        </div>
      )}

      {/* INTERACTIVE TABLE CONTAINER */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto max-h-[560px]">
          {/* YARDI 87 COLUMN TABLE */}
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-gray-900 text-gray-100 border-b border-gray-800 text-[10px] font-mono uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center bg-gray-950">#</th>
                  {YARDI_VOYAGER_SCHEMA_COLUMNS.map((colName, cIdx) => {
                    const isEditable = ['ACCOUNT', 'NOTES', 'REF', 'DUEDATE', 'PROPERTY', 'PERSON'].includes(colName);
                    return (
                      <th
                        key={`${colName}-${cIdx}`}
                        className={`py-2.5 px-3 font-semibold border-r border-gray-800 ${
                          isEditable ? 'bg-gray-850 text-amber-300' : ''
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span>{colName}</span>
                          {isEditable && (
                            <span className="px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[8px] font-sans font-bold border border-amber-400/30">
                              EDIT
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-mono text-[11px]">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={YARDI_VOYAGER_SCHEMA_COLUMNS.length + 1} className="py-12 text-center text-gray-500 font-sans">
                      <Info className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                      <div className="font-semibold">No ETL records matching current filters</div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-amber-50/40">
                      <td className="py-2 px-3 text-center text-gray-400 bg-gray-50/50">{idx + 1}</td>
                      <td className="py-2 px-3 font-bold">{r.invoiceNumber}</td>
                      
                      {/* PERSON (Yardi Vendor Code) - Editable */}
                      <td className="py-2 px-3">
                        {editingFieldId?.id === r.id && editingFieldId?.field === 'yardiVendorCode' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={tempFieldValue}
                              onChange={(e) => setTempFieldValue(e.target.value)}
                              className="px-1.5 py-0.5 text-xs font-mono bg-white border border-[#EA580C] text-gray-900 rounded focus:outline-hidden w-28"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveField(r)}
                              className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                              title="Save"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingFieldId(null)}
                              className="p-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => handleStartEditField(r, 'yardiVendorCode')}
                            className={`cursor-pointer hover:bg-amber-100/60 px-1 py-0.5 rounded flex items-center justify-between gap-1 group ${
                              recordOverrides[r.id]?.yardiVendorCode ? 'text-amber-800 font-bold bg-amber-50 border border-amber-200' : ''
                            }`}
                            title="Click to edit Yardi Vendor Code"
                          >
                            <span>{r.yardiVendorCode || '-'}</span>
                            <Edit2 className="w-2.5 h-2.5 text-gray-400 group-hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </td>

                      <td className="py-2 px-3">GL-2000 AP</td>
                      <td className="py-2 px-3">{r.status}</td>
                      <td className="py-2 px-3">{r.postMonth}</td>
                      <td className="py-2 px-3">{r.invoiceDate}</td>
                      
                      {/* DUEDATE - Editable */}
                      <td className="py-2 px-3">
                        {editingFieldId?.id === r.id && editingFieldId?.field === 'dueDate' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              value={tempFieldValue}
                              onChange={(e) => setTempFieldValue(e.target.value)}
                              className="px-1.5 py-0.5 text-xs font-mono bg-white border border-[#EA580C] text-gray-900 rounded focus:outline-hidden"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveField(r)}
                              className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                              title="Save"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingFieldId(null)}
                              className="p-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => handleStartEditField(r, 'dueDate')}
                            className={`cursor-pointer hover:bg-amber-100/60 px-1 py-0.5 rounded flex items-center justify-between gap-1 group ${
                              recordOverrides[r.id]?.dueDate ? 'text-amber-800 font-bold bg-amber-50 border border-amber-200' : ''
                            }`}
                            title="Click to edit Due Date"
                          >
                            <span>{r.dueDate}</span>
                            <Edit2 className="w-2.5 h-2.5 text-gray-400 group-hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </td>

                      <td className="py-2 px-3 text-right font-bold">{formatCurrency(r.apportionedGrossAmount, r.currency)}</td>
                      
                      {/* PROPERTY - Editable */}
                      <td className="py-2 px-3">
                        {editingFieldId?.id === r.id && editingFieldId?.field === 'yardiEntityCode' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={tempFieldValue}
                              onChange={(e) => setTempFieldValue(e.target.value)}
                              className="px-1.5 py-0.5 text-xs font-mono bg-white border border-[#EA580C] text-gray-900 rounded focus:outline-hidden w-28"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveField(r)}
                              className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                              title="Save"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingFieldId(null)}
                              className="p-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => handleStartEditField(r, 'yardiEntityCode')}
                            className={`cursor-pointer hover:bg-amber-100/60 px-1 py-0.5 rounded flex items-center justify-between gap-1 group ${
                              recordOverrides[r.id]?.yardiEntityCode ? 'text-amber-800 font-bold bg-amber-50 border border-amber-200' : ''
                            }`}
                            title="Click to edit Property Code"
                          >
                            <span>{r.yardiEntityCode || '-'}</span>
                            <Edit2 className="w-2.5 h-2.5 text-gray-400 group-hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </td>

                      {/* Ref_Property_Id */}
                      <td className="py-2 px-3">{r.yardiEntityCode || '-'}</td>

                      {/* ACCOUNT (GL Code) - Editable */}
                      <td className="py-2 px-3 font-bold text-indigo-700">
                        <select
                          value={r.glCode}
                          onChange={(e) => onUpdateRecordOverride(r.id, { glCode: e.target.value })}
                          className={`text-xs font-mono rounded px-1.5 py-0.5 font-bold cursor-pointer transition-colors ${
                            recordOverrides[r.id]?.glCode
                              ? 'bg-amber-50 border border-amber-300 text-amber-900'
                              : 'bg-white border border-gray-300 text-indigo-700 hover:border-indigo-400'
                          }`}
                          title="Select or override GL Account"
                        >
                          {COMMON_GL_ACCOUNTS.map(glCode => (
                            <option key={glCode} value={glCode}>
                              {glCode}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* NOTES - Editable */}
                      <td className="py-2 px-3">
                        {editingNoteId === r.id ? (
                          <div className="flex items-center gap-1 min-w-[260px]">
                            <input
                              type="text"
                              value={tempNoteText}
                              onChange={(e) => setTempNoteText(e.target.value)}
                              className="px-2 py-0.5 text-xs font-sans border border-[#EA580C] rounded bg-white w-full focus:outline-hidden"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveNote(r, false)}
                              className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                              title="Save Note"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingNoteId(null)}
                              className="p-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => handleStartEditNote(r)}
                            className={`cursor-pointer hover:bg-amber-100/60 px-1 py-0.5 rounded flex items-center justify-between gap-1 group max-w-[220px] ${
                              recordOverrides[r.id]?.notes ? 'text-amber-900 font-medium bg-amber-50 border border-amber-200' : 'text-gray-700'
                            }`}
                            title="Click to edit Memo / Notes"
                          >
                            <span className="truncate">{r.notes || '-'}</span>
                            <Edit2 className="w-2.5 h-2.5 text-gray-400 group-hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </div>
                        )}
                      </td>

                      {/* REF (Client Reference) - Editable */}
                      <td className="py-2 px-3">
                        {editingFieldId?.id === r.id && editingFieldId?.field === 'clientReference' ? (
                          <div className="flex items-center gap-1 min-w-[160px]">
                            <input
                              type="text"
                              value={tempFieldValue}
                              onChange={(e) => setTempFieldValue(e.target.value)}
                              className="px-1.5 py-0.5 text-xs font-mono bg-white border border-[#EA580C] text-gray-900 rounded focus:outline-hidden w-full"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveField(r)}
                              className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                              title="Save"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingFieldId(null)}
                              className="p-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => handleStartEditField(r, 'clientReference')}
                            className={`cursor-pointer hover:bg-amber-100/60 px-1 py-0.5 rounded flex items-center justify-between gap-1 group ${
                              recordOverrides[r.id]?.clientReference ? 'text-amber-800 font-bold bg-amber-50 border border-amber-200' : ''
                            }`}
                            title="Click to edit Client Reference (REF)"
                          >
                            <span>{r.clientReference || r.invoiceNumber}</span>
                            <Edit2 className="w-2.5 h-2.5 text-gray-400 group-hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </td>

                      <td className="py-2 px-3">01</td>
                      <td className="py-2 px-3">{r.expensesType}</td>
                      <td className="py-2 px-3">{r.currency}</td>
                      <td className="py-2 px-3">{r.jobNumber || '-'}</td>
                      <td className="py-2 px-3">{r.category}</td>
                      <td className="py-2 px-3">{r.vendorVatNumber || '-'}</td>
                      <td className="py-2 px-3">{r.fromDate}</td>
                      <td className="py-2 px-3">{r.toDate}</td>
                      <td className="py-2 px-3">INV</td>
                      <td className="py-2 px-3">{r.paymentTerms}</td>
                      <td className="py-2 px-3">{r.poNumber || '-'}</td>
                      <td className="py-2 px-3">0.00</td>
                      <td className="py-2 px-3">{r.apportionedTaxAmount > 0 ? formatCurrency(r.apportionedTaxAmount, r.currency) : '0.00'}</td>
                      <td className="py-2 px-3">0.00</td>
                      <td className="py-2 px-3">{formatCurrency(r.apportionedNetAmount, r.currency)}</td>
                      <td className="py-2 px-3">{r.exchangeRate.toFixed(4)}</td>
                      <td className="py-2 px-3">{formatCurrency(r.apportionedUsdAmount, 'USD')}</td>
                      {Array.from({ length: 56 }).map((_, cI) => (
                        <td key={cI} className="py-2 px-3 text-gray-300">-</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};
