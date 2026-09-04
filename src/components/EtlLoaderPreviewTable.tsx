import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  CheckCircle2,
  Edit3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CornerDownRight,
  Info,
  TableProperties,
  LayoutGrid,
  Check,
  RotateCcw,
  Plus,
  RefreshCw,
  Sparkles,
  Calendar,
  DollarSign
} from 'lucide-react';
import { YardiEtlRecord, EtlRecordOverride } from '../types/yardiMapping';
import { InvoiceETLFormat } from '../types/reconciliation';
import { formatCurrency } from '../utils/formatters';
import { YARDI_VOYAGER_SCHEMA_COLUMNS, exportToYardiVoyagerCsv } from '../utils/yardiEtlEngine';

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

type SortField = 
  | 'index'
  | 'invoiceNumber'
  | 'clientReference'
  | 'sourceEntityName'
  | 'payingEntityName'
  | 'payingBankName'
  | 'amount'
  | 'allocation'
  | 'dueDate'
  | 'currency'
  | 'vendorName'
  | 'beneficiaryName'
  | 'beneficiaryBankBic'
  | 'beneficiaryBankName'
  | 'glCode'
  | 'notes'
  | 'comeFromId';

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
  const [viewMode, setViewMode] = useState<'essential' | 'yardi_schema'>('essential');
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [mappingStatusFilter, setMappingStatusFilter] = useState<'all' | 'mapped' | 'unmapped'>('all');

  // Sorting state for Standard GL View
  const [sortField, setSortField] = useState<SortField>('invoiceNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Inline editing states
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState('');
  const [editingFieldId, setEditingFieldId] = useState<{ id: string; field: 'clientReference' | 'dueDate' | 'glCode' } | null>(null);
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

  // Sort records
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'invoiceNumber':
          comparison = a.invoiceNumber.localeCompare(b.invoiceNumber);
          break;
        case 'clientReference':
          comparison = (a.clientReference || '').localeCompare(b.clientReference || '');
          break;
        case 'sourceEntityName':
          comparison = (a.sourceEntityName || '').localeCompare(b.sourceEntityName || '');
          break;
        case 'payingEntityName':
          comparison = (a.payingEntityName || a.ourEntityName || '').localeCompare(b.payingEntityName || b.ourEntityName || '');
          break;
        case 'payingBankName':
          comparison = (a.payingBankName || '').localeCompare(b.payingBankName || '');
          break;
        case 'amount':
          comparison = a.apportionedGrossAmount - b.apportionedGrossAmount;
          break;
        case 'allocation':
          comparison = a.splitPercent - b.splitPercent;
          break;
        case 'dueDate':
          comparison = (a.dueDate || '').localeCompare(b.dueDate || '');
          break;
        case 'currency':
          comparison = (a.currency || '').localeCompare(b.currency || '');
          break;
        case 'vendorName':
          comparison = (a.ourVendorName || '').localeCompare(b.ourVendorName || '');
          break;
        case 'beneficiaryName':
          comparison = (a.beneficiaryName || '').localeCompare(b.beneficiaryName || '');
          break;
        case 'beneficiaryBankBic':
          comparison = (a.beneficiaryBankBic || '').localeCompare(b.beneficiaryBankBic || '');
          break;
        case 'beneficiaryBankName':
          comparison = (a.beneficiaryBankName || '').localeCompare(b.beneficiaryBankName || '');
          break;
        case 'glCode':
          comparison = a.glCode.localeCompare(b.glCode);
          break;
        case 'notes':
          comparison = a.notes.localeCompare(b.notes);
          break;
        case 'comeFromId':
          comparison = (a.removedFromBatchId || a.invoiceDisplayId || '').localeCompare(b.removedFromBatchId || b.invoiceDisplayId || '');
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredRecords, sortField, sortOrder]);

  const handleHeaderSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

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
  const handleStartEditField = (record: YardiEtlRecord, field: 'clientReference' | 'dueDate' | 'glCode') => {
    setEditingFieldId({ id: record.id, field });
    if (field === 'clientReference') setTempFieldValue(record.clientReference || '');
    else if (field === 'dueDate') setTempFieldValue(record.dueDate || '');
    else if (field === 'glCode') setTempFieldValue(record.glCode || '');
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

          {/* VIEW MODE TOGGLE (Standard GL View vs 87-Column Yardi Schema) */}
          <div className="flex items-center bg-gray-200/80 p-0.5 rounded-lg border border-gray-300">
            <button
              onClick={() => setViewMode('essential')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'essential'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="View with the exact 14 columns matching Step 1 Reconciled Invoices data"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Standard GL View</span>
            </button>
            <button
              onClick={() => setViewMode('yardi_schema')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'yardi_schema'
                  ? 'bg-[#EA580C] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Full 87-Column Yardi Voyager CSV format"
            >
              <TableProperties className="w-3.5 h-3.5" />
              <span>Yardi Voyager (87 Cols)</span>
            </button>
          </div>

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

      {/* SYNC NOTIFICATION BANNER */}
      <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-lg flex items-center justify-between gap-3 text-xs text-blue-900">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Data Consistency Active:</strong> Data in <strong>1. Select Reconciled Invoices</strong> and <strong>2. Loader File Preview & Inline Edit - Standard GL View</strong> are 100% synchronized. Any updates to <strong>Notes/Memo</strong>, <strong>Client Ref</strong>, <strong>Due Date</strong>, or <strong>GL Codes</strong> are reflected across both steps.
          </span>
        </div>
        {Object.keys(recordOverrides).length > 0 && (
          <button
            type="button"
            onClick={onResetOverrides}
            className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-800 font-semibold border border-blue-300 rounded text-[11px] flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
          >
            <RotateCcw className="w-3 h-3 text-blue-600" />
            <span>Reset {Object.keys(recordOverrides).length} Manual Edits</span>
          </button>
        )}
      </div>

      {/* DOWNLOAD SUCCESS TOAST BANNER */}
      {downloadNotification && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-900 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{downloadNotification}</span>
        </div>
      )}

      {/* SCHEMA INFO BADGE */}
      {viewMode === 'yardi_schema' && (
        <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-between gap-2 text-xs text-orange-950">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-[#EA580C] text-white rounded font-mono font-bold text-[10px]">
              YARDI SCHEMA
            </span>
            <span className="font-semibold">
              Export format matches all 87 standard Yardi Voyager / PayScan fields (TRANNUM, PERSON, OFFSET, ACCRUAL, POSTMONTH, PROPERTY, Ref_Property_Id, ACCOUNT, NOTES, REF, SEGMENTS, EXPENSETYPE, TRANCURRENCY, JOB, CATEGORY, etc.)
            </span>
          </div>
          <span className="text-[11px] font-mono text-orange-800 font-bold">87 / 87 Columns</span>
        </div>
      )}

      {/* INTERACTIVE TABLE CONTAINER */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto max-h-[560px]">
          {viewMode === 'yardi_schema' ? (
            /* YARDI 87 COLUMN TABLE */
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-gray-900 text-gray-100 border-b border-gray-800 text-[10px] font-mono uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center bg-gray-950">#</th>
                  {YARDI_VOYAGER_SCHEMA_COLUMNS.map((colName, cIdx) => (
                    <th key={`${colName}-${cIdx}`} className="py-2.5 px-3 font-semibold border-r border-gray-800">
                      {colName}
                    </th>
                  ))}
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
                      <td className="py-2 px-3">{r.yardiVendorCode || '-'}</td>
                      <td className="py-2 px-3">GL-2000 AP</td>
                      <td className="py-2 px-3">{r.status}</td>
                      <td className="py-2 px-3">{r.postMonth}</td>
                      <td className="py-2 px-3">{r.invoiceDate}</td>
                      <td className="py-2 px-3">{r.dueDate}</td>
                      <td className="py-2 px-3 text-right font-bold">{formatCurrency(r.apportionedGrossAmount, r.currency)}</td>
                      <td className="py-2 px-3">{r.yardiEntityCode || '-'}</td>
                      <td className="py-2 px-3">{r.yardiEntityCode || '-'}</td>
                      <td className="py-2 px-3 font-bold text-indigo-700">{r.glCode}</td>
                      <td className="py-2 px-3">{r.notes}</td>
                      <td className="py-2 px-3">{r.clientReference || r.invoiceNumber}</td>
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
          ) : (
            /* STANDARD GL VIEW - 100% MATCHING STEP 1 RECONCILED INVOICES DATA */
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-gray-100/95 backdrop-blur-xs border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider text-[10.5px] select-none">
                <tr>
                  {/* # ROW */}
                  <th className="py-3 px-3 w-10 text-center bg-gray-100">#</th>

                  {/* 1. INVOICE NUMBER */}
                  <th
                    onClick={() => handleHeaderSort('invoiceNumber')}
                    className="py-3 px-3.5 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>1. Invoice Number</span>
                      {sortField === 'invoiceNumber' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 2. CLIENT REFERENCE */}
                  <th
                    onClick={() => handleHeaderSort('clientReference')}
                    className="py-3 px-3.5 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>2. Client Reference</span>
                      {sortField === 'clientReference' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 3. SOURCE ENTITY NAME */}
                  <th
                    onClick={() => handleHeaderSort('sourceEntityName')}
                    className="py-3 px-3.5 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>3. Source Entity Name</span>
                      {sortField === 'sourceEntityName' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 4. PAYING ENTITY NAME */}
                  <th
                    onClick={() => handleHeaderSort('payingEntityName')}
                    className="py-3 px-3.5 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>4. Paying Entity Name</span>
                      {sortField === 'payingEntityName' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 5. PAYING BANK NAME */}
                  <th
                    onClick={() => handleHeaderSort('payingBankName')}
                    className="py-3 px-3.5 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>5. Paying Bank Name</span>
                      {sortField === 'payingBankName' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 6. AMOUNT */}
                  <th
                    onClick={() => handleHeaderSort('amount')}
                    className="py-3 px-3.5 text-right cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>6. Amount</span>
                      {sortField === 'amount' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 7. ALLOCATION */}
                  <th
                    onClick={() => handleHeaderSort('allocation')}
                    className="py-3 px-3.5 text-right cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>7. Allocation</span>
                      {sortField === 'allocation' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 8. DUE DATE */}
                  <th
                    onClick={() => handleHeaderSort('dueDate')}
                    className="py-3 px-3.5 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>8. Due Date</span>
                      {sortField === 'dueDate' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 9. CURRENCY */}
                  <th
                    onClick={() => handleHeaderSort('currency')}
                    className="py-3 px-3.5 text-center cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>9. Currency</span>
                      {sortField === 'currency' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 10. VENDOR NAME */}
                  <th
                    onClick={() => handleHeaderSort('vendorName')}
                    className="py-3 px-3.5 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>10. Vendor Name</span>
                      {sortField === 'vendorName' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 11. BENEFICIARY NAME */}
                  <th
                    onClick={() => handleHeaderSort('beneficiaryName')}
                    className="py-3 px-3.5 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>11. Beneficiary Name</span>
                      {sortField === 'beneficiaryName' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 12. BENEFICIARY BANK BIC CODE */}
                  <th
                    onClick={() => handleHeaderSort('beneficiaryBankBic')}
                    className="py-3 px-3.5 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>12. Beneficiary Bank BIC</span>
                      {sortField === 'beneficiaryBankBic' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 13. BENEFICIARY BANK NAME */}
                  <th
                    onClick={() => handleHeaderSort('beneficiaryBankName')}
                    className="py-3 px-3.5 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>13. Beneficiary Bank Name</span>
                      {sortField === 'beneficiaryBankName' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 14. GL ACCOUNT CODE (EDITABLE) */}
                  <th
                    onClick={() => handleHeaderSort('glCode')}
                    className="py-3 px-3.5 min-w-[170px] bg-indigo-50/70 text-indigo-950 font-bold border-x border-indigo-200/80 cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>14. GL Account Code (Editable)</span>
                      {sortField === 'glCode' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 15. NOTES / MEMO (EDITABLE) */}
                  <th
                    onClick={() => handleHeaderSort('notes')}
                    className="py-3 px-3.5 min-w-[260px] bg-orange-50/70 text-orange-950 font-bold border-x border-orange-200/80 cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-[#EA580C]" />
                      <span>15. Notes / Memo (Editable)</span>
                      {sortField === 'notes' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 16. COME FROM ID / BATCH TRACKING */}
                  <th
                    onClick={() => handleHeaderSort('comeFromId')}
                    className="py-3 px-3.5 text-center min-w-[120px] cursor-pointer hover:text-gray-900"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>16. Come From ID</span>
                      {sortField === 'comeFromId' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-sans text-xs">
                {sortedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="py-12 text-center text-gray-500">
                      <Info className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                      <div className="font-semibold text-gray-700">No ETL records matching current filters</div>
                      <div className="text-xs text-gray-400 mt-1">Try clearing filters or search query</div>
                    </td>
                  </tr>
                ) : (
                  sortedRecords.map((r, idx) => {
                    const isMulti = (r.totalSplitsForInvoice || 1) > 1;
                    const isEditingNote = editingNoteId === r.id;
                    const isEditingClientRef = editingFieldId?.id === r.id && editingFieldId?.field === 'clientReference';
                    const isEditingDueDate = editingFieldId?.id === r.id && editingFieldId?.field === 'dueDate';
                    const isEditingGl = editingFieldId?.id === r.id && editingFieldId?.field === 'glCode';

                    return (
                      <tr
                        key={r.id}
                        className={`hover:bg-gray-50/90 transition-colors ${
                          r.hasMappingError
                            ? 'bg-amber-50/40'
                            : isMulti
                            ? 'bg-purple-50/15'
                            : ''
                        }`}
                      >
                        {/* # ROW NUMBER */}
                        <td className="py-2.5 px-3 text-center text-[10px] text-gray-400 font-mono">
                          {idx + 1}
                        </td>

                        {/* 1. INVOICE NUMBER */}
                        <td className="py-2.5 px-3.5 font-medium text-gray-900">
                          <div className="font-bold flex items-center gap-1.5">
                            <span>{r.invoiceNumber}</span>
                            {r.invoiceDisplayId && (
                              <span className="px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded text-[9px] font-mono">
                                {r.invoiceDisplayId}
                              </span>
                            )}
                          </div>
                          {isMulti ? (
                            <div className="flex items-center gap-1 text-[10px] text-purple-700 font-semibold mt-0.5">
                              <CornerDownRight className="w-3 h-3 shrink-0" />
                              <span>Split {r.splitIndex} of {r.totalSplitsForInvoice} ({r.splitPercent.toFixed(1)}%)</span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-gray-500 mt-0.5">{r.invoiceDate}</div>
                          )}
                        </td>

                        {/* 2. CLIENT REFERENCE (INLINE EDITABLE) */}
                        <td className="py-2.5 px-3.5 text-gray-700 font-mono text-xs">
                          {isEditingClientRef ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={tempFieldValue}
                                onChange={e => setTempFieldValue(e.target.value)}
                                className="px-2 py-0.5 text-xs font-mono text-gray-800 bg-white border border-[#EA580C] rounded outline-hidden w-28"
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveField(r);
                                  if (e.key === 'Escape') setEditingFieldId(null);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveField(r)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => handleStartEditField(r, 'clientReference')}
                              className="group flex items-center gap-1 cursor-pointer hover:text-orange-600"
                              title="Click to edit Client Reference"
                            >
                              <span>{r.clientReference || '-'}</span>
                              <Edit3 className="w-2.5 h-2.5 text-gray-400 group-hover:text-[#EA580C] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </td>

                        {/* 3. SOURCE ENTITY NAME */}
                        <td className="py-2.5 px-3.5 text-gray-800">
                          <div className="font-semibold text-xs truncate max-w-[180px]" title={r.sourceEntityName || '-'}>
                            {r.sourceEntityName || '-'}
                          </div>
                        </td>

                        {/* 4. PAYING ENTITY NAME (WITH YARDI PROPERTY CODE BADGE) */}
                        <td className="py-2.5 px-3.5">
                          <div className="text-gray-900 font-semibold text-xs truncate max-w-[200px]" title={r.payingEntityName || r.ourEntityName}>
                            {r.payingEntityName || r.ourEntityName}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1">
                            {r.isEntityMapped ? (
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-mono text-[10px] font-bold">
                                {r.yardiEntityCode}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={onOpenMappingManager}
                                className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded font-mono text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                                title="Click to map Yardi Property Code"
                              >
                                <Plus className="w-2.5 h-2.5 text-amber-700" />
                                <span>Map Property Code</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 5. PAYING BANK NAME */}
                        <td className="py-2.5 px-3.5 text-gray-700">
                          <div className="text-xs truncate max-w-[180px]" title={r.payingBankName || '-'}>
                            {r.payingBankName || '-'}
                          </div>
                        </td>

                        {/* 6. AMOUNT */}
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-gray-900 text-xs">
                          {formatCurrency(r.apportionedGrossAmount, r.currency)}
                        </td>

                        {/* 7. ALLOCATION */}
                        <td className="py-2.5 px-3.5 text-right font-mono font-medium text-gray-700 text-xs">
                          {r.allocation || `${r.splitPercent.toFixed(2)}%`}
                        </td>

                        {/* 8. DUE DATE (INLINE EDITABLE) */}
                        <td className="py-2.5 px-3.5 text-gray-700 font-mono text-xs">
                          {isEditingDueDate ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="date"
                                value={tempFieldValue}
                                onChange={e => setTempFieldValue(e.target.value)}
                                className="px-1.5 py-0.5 text-xs font-mono text-gray-800 bg-white border border-[#EA580C] rounded outline-hidden"
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveField(r);
                                  if (e.key === 'Escape') setEditingFieldId(null);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveField(r)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => handleStartEditField(r, 'dueDate')}
                              className="group flex items-center gap-1 cursor-pointer hover:text-orange-600"
                              title="Click to edit Due Date"
                            >
                              <span>{r.dueDate || '-'}</span>
                              <Edit3 className="w-2.5 h-2.5 text-gray-400 group-hover:text-[#EA580C] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </td>

                        {/* 9. CURRENCY */}
                        <td className="py-2.5 px-3.5 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 font-mono border border-gray-200">
                            {r.currency}
                          </span>
                        </td>

                        {/* 10. VENDOR NAME (WITH YARDI VENDOR CODE BADGE) */}
                        <td className="py-2.5 px-3.5">
                          <div className="text-gray-900 font-semibold text-xs truncate max-w-[180px]" title={r.ourVendorName}>
                            {r.ourVendorName}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1">
                            {r.isVendorMapped ? (
                              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded font-mono text-[10px] font-bold">
                                {r.yardiVendorCode}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={onOpenMappingManager}
                                className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded font-mono text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                                title="Click to map Yardi Vendor Code"
                              >
                                <Plus className="w-2.5 h-2.5 text-amber-700" />
                                <span>Map Vendor Code</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 11. BENEFICIARY NAME */}
                        <td className="py-2.5 px-3.5 text-gray-800">
                          <div className="text-xs truncate max-w-[180px]" title={r.beneficiaryName || '-'}>
                            {r.beneficiaryName || '-'}
                          </div>
                        </td>

                        {/* 12. BENEFICIARY BANK BIC CODE */}
                        <td className="py-2.5 px-3.5 text-gray-700 font-mono text-xs">
                          {r.beneficiaryBankBic || '-'}
                        </td>

                        {/* 13. BENEFICIARY BANK NAME */}
                        <td className="py-2.5 px-3.5 text-gray-700">
                          <div className="text-xs truncate max-w-[180px]" title={r.beneficiaryBankName || '-'}>
                            {r.beneficiaryBankName || '-'}
                          </div>
                        </td>

                        {/* 14. GL ACCOUNT CODE (INLINE EDITABLE) */}
                        <td className="py-2.5 px-3.5 bg-indigo-50/40 border-x border-indigo-100">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={r.glCode}
                              onChange={e => onUpdateRecordOverride(r.id, { glCode: e.target.value })}
                              className="px-2 py-0.5 text-xs font-mono font-bold text-indigo-900 bg-white hover:bg-indigo-50/50 focus:bg-white border border-indigo-200 focus:border-[#EA580C] rounded outline-hidden w-36 shadow-2xs"
                              title="Click to edit GL Account Code"
                            />
                          </div>
                        </td>

                        {/* 15. NOTES / MEMO (SELECTIVE EDITABLE FIELD) */}
                        <td className="py-2.5 px-3.5 bg-orange-50/30 border-x border-orange-100">
                          {isEditingNote ? (
                            <div className="flex flex-col gap-1.5 bg-white p-2.5 border border-[#EA580C] rounded-lg shadow-lg animate-in fade-in min-w-[280px]">
                              <textarea
                                value={tempNoteText}
                                onChange={e => setTempNoteText(e.target.value)}
                                rows={2}
                                className="w-full p-1.5 text-xs text-gray-900 border border-gray-300 rounded outline-hidden focus:border-[#EA580C]"
                                placeholder="Enter custom posting note or memo..."
                                autoFocus
                              />
                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
                                <button
                                  type="button"
                                  onClick={() => handleSaveNote(r, true)}
                                  className="text-[10.5px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                                  title="Apply this note to all split line items for this invoice across both steps"
                                >
                                  Apply to All Invoice Lines
                                </button>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setEditingNoteId(null)}
                                    className="px-2 py-0.5 text-[10.5px] text-gray-500 hover:text-gray-800 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveNote(r, false)}
                                    className="px-2.5 py-1 bg-[#EA580C] hover:bg-[#D94E07] text-white text-[10.5px] font-bold rounded cursor-pointer shadow-xs"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => handleStartEditNote(r)}
                              className="group flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-white hover:bg-orange-50 border border-gray-200 hover:border-orange-300 rounded-md cursor-pointer transition-all shadow-2xs"
                              title="Click to edit Notes / Memo (Synchronizes directly with Step 1)"
                            >
                              <span className="text-xs text-gray-800 truncate max-w-[220px]">
                                {r.notes || 'Click to add note...'}
                              </span>
                              <Edit3 className="w-3 h-3 text-gray-400 group-hover:text-[#EA580C] shrink-0" />
                            </div>
                          )}
                        </td>

                        {/* 16. COME FROM ID / BATCH TRACKING */}
                        <td className="py-2.5 px-3.5 text-center">
                          {r.removedFromBatchId ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200" title={`Previously from ${r.removedFromBatchId}`}>
                              {r.removedFromBatchId}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                              {r.invoiceDisplayId || r.invoiceId || 'New'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
