import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Receipt, 
  Download, 
  Check, 
  Calendar, 
  CalendarRange,
  Building2, 
  Share2, 
  CheckCircle2, 
  Search,
  FileText,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  Eye,
  ExternalLink,
  Trash2,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Layers,
  Table,
  Code,
  Copy,
  Users2
} from 'lucide-react';
import { InvoiceBatch, ReconciliationRun, MatchedInvoice, InvoiceBatchItem, InvoiceETLFormat } from '../types/reconciliation';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { MappingManagerModal } from './MappingManagerModal';
import { EtlLoaderPreviewTable } from './EtlLoaderPreviewTable';
import { formatCurrency, parseInvoiceDate } from '../utils/formatters';
import { computeEntitySplits } from '../utils/entitySplits';
import { 
  YardiVendorMapping, 
  YardiEntityMapping, 
  YardiEtlRecord, 
  EtlRecordOverride 
} from '../types/yardiMapping';
import { 
  getStoredVendorMappings, 
  getStoredEntityMappings, 
  saveStoredVendorMappings, 
  saveStoredEntityMappings,
  validateBatchMappings,
  findEntityMapping,
  generateAutoYardiVendorCode,
  generateAutoYardiEntityCode
} from '../utils/yardiMapping';
import { 
  generateInvoiceEtlRecords, 
  formatEtlContent 
} from '../utils/yardiEtlEngine';

interface ViewInvoiceBatchDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: InvoiceBatch | null;
  reconciliationRuns?: ReconciliationRun[];
  onExportToErp?: (batch: InvoiceBatch) => void;
  onRemoveInvoice?: (batchId: string, invoiceId: string, invoice: InvoiceBatchItem) => void;
}

export const ViewInvoiceBatchDetailsModal: React.FC<ViewInvoiceBatchDetailsModalProps> = ({
  isOpen,
  onClose,
  batch,
  onExportToErp,
  onRemoveInvoice
}) => {
  // Active Workspace Tab: 'invoices' | 'loader' | 'raw'
  const [activeTab, setActiveTab] = useState<'invoices' | 'loader' | 'raw'>('invoices');

  // Format selection (sync with batch.format if valid or default to YARDI_VOYAGER_LOADER)
  const [format, setFormat] = useState<InvoiceETLFormat>(() => {
    if (batch?.format && ['YARDI_VOYAGER_LOADER', 'NETSUITE_CSV', 'SAP_GL_FEED', 'XML_PEPPOL_UBL', 'JSON_INVOICE_STREAM'].includes(batch.format)) {
      return batch.format as InvoiceETLFormat;
    }
    return 'YARDI_VOYAGER_LOADER';
  });

  // Mapping State (Synced with persistent localStorage)
  const [vendorMappings, setVendorMappings] = useState<YardiVendorMapping[]>(() => getStoredVendorMappings());
  const [entityMappings, setEntityMappings] = useState<YardiEntityMapping[]>(() => getStoredEntityMappings());
  const [isMappingModalOpen, setIsMappingModalOpen] = useState<boolean>(false);

  // ETL Record Field Overrides (Selective user edits on notes, GL code, descriptions)
  const [recordOverrides, setRecordOverrides] = useState<Record<string, EtlRecordOverride>>({});

  // Filter toolbar state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'AR' | 'AP'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [currencyFilter, setCurrencyFilter] = useState<string>('All');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [isCopiedFile, setIsCopiedFile] = useState<boolean>(false);
  const [inspectingInvoice, setInspectingInvoice] = useState<MatchedInvoice | null>(null);

  // Date Range & Sorting State
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'All' | 'Last7Days' | 'Last30Days' | 'Aug2026' | 'Sep2026' | 'Custom'>('All');
  const [sortField, setSortField] = useState<'date' | 'dueDate' | 'amount' | 'convertedAmount' | 'currency' | 'invoiceNumber' | 'entityName' | 'poNumber'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Reset tab and format when batch changes
  useEffect(() => {
    if (batch?.format && ['YARDI_VOYAGER_LOADER', 'NETSUITE_CSV', 'SAP_GL_FEED', 'XML_PEPPOL_UBL', 'JSON_INVOICE_STREAM'].includes(batch.format)) {
      setFormat(batch.format as InvoiceETLFormat);
    }
  }, [batch?.id, batch?.format]);

  // Unique filters from batch invoices
  const uniqueCurrencies = useMemo(() => {
    if (!batch) return [];
    return Array.from(new Set((batch.invoices || []).map(inv => inv.currency || 'USD'))).sort();
  }, [batch]);

  const uniqueCategories = useMemo(() => {
    if (!batch) return [];
    return Array.from(
      new Set(
        (batch.invoices || [])
          .map(inv => inv.expensesType || inv.category || 'General Operations')
          .filter(Boolean)
      )
    ).sort();
  }, [batch]);

  // VALIDATION of Batch Mappings (Flag missing Vendor and Entity codes)
  const batchValidation = useMemo(() => {
    if (!batch) {
      return {
        isValid: true,
        totalRecords: 0,
        validRecordsCount: 0,
        errorRecordsCount: 0,
        missingVendors: [],
        missingEntities: [],
        unmappedVendors: [],
        unmappedEntities: []
      };
    }
    return validateBatchMappings(batch.invoices || [], vendorMappings, entityMappings);
  }, [batch, vendorMappings, entityMappings]);

  // GENERATE GRANULAR ETL RECORDS (Explodes entities and line items into granular GL entries)
  const etlRecords = useMemo(() => {
    if (!batch) return [];
    return generateInvoiceEtlRecords(
      batch.invoices || [],
      batch.id,
      vendorMappings,
      entityMappings,
      recordOverrides
    );
  }, [batch, vendorMappings, entityMappings, recordOverrides]);

  // GENERATE FORMATTED FILE CONTENT
  const generatedEtlContent = useMemo(() => {
    if (!batch) return '';
    return formatEtlContent(etlRecords, format, batch.id);
  }, [etlRecords, format, batch]);

  // Handle single record override update
  const handleUpdateRecordOverride = (recordId: string, override: Partial<EtlRecordOverride>) => {
    setRecordOverrides(prev => ({
      ...prev,
      [recordId]: {
        ...(prev[recordId] || {}),
        ...override
      }
    }));
  };

  // Handle applying a single note to all exploded lines of an invoice
  const handleApplyNoteToInvoice = (invoiceId: string, note: string) => {
    setRecordOverrides(prev => {
      const next = { ...prev };
      etlRecords.forEach(r => {
        if (r.invoiceId === invoiceId) {
          next[r.id] = {
            ...(next[r.id] || {}),
            notes: note
          };
        }
      });
      return next;
    });
  };

  // Reset all overrides
  const handleResetOverrides = () => {
    if (confirm('Reset all edited notes, descriptions, and custom GL codes to default values?')) {
      setRecordOverrides({});
    }
  };

  // Auto-generate missing codes for batch items
  const handleAutoMapBatchMissing = () => {
    let updatedV = [...vendorMappings];
    let updatedE = [...entityMappings];

    (batchValidation.missingVendors || []).forEach(vName => {
      const existing = updatedV.find(v => v.ourVendorName.toLowerCase() === vName.toLowerCase());
      if (existing) {
        existing.yardiVendorCode = generateAutoYardiVendorCode(vName);
        existing.status = 'Mapped';
      } else {
        updatedV.push({
          id: `VMAP-AUTO-${Date.now()}-${Math.random()}`,
          ourVendorCode: `VND-${vName.slice(0, 4).toUpperCase()}`,
          ourVendorName: vName,
          yardiVendorCode: generateAutoYardiVendorCode(vName),
          yardiVendorName: `${vName} Yardi AP`,
          defaultGlAccount: 'GL-6000 OPEX',
          status: 'Mapped'
        });
      }
    });

    (batchValidation.missingEntities || []).forEach(eName => {
      const existing = updatedE.find(e => e.ourEntityName.toLowerCase() === eName.toLowerCase());
      if (existing) {
        existing.yardiEntityCode = generateAutoYardiEntityCode(eName);
        existing.status = 'Mapped';
      } else {
        updatedE.push({
          id: `EMAP-AUTO-${Date.now()}-${Math.random()}`,
          ourEntityCode: `ENT-${eName.slice(0, 4).toUpperCase()}`,
          ourEntityName: eName,
          yardiEntityCode: generateAutoYardiEntityCode(eName),
          yardiEntityName: `${eName} Property SPV`,
          fundCode: 'FUND-01',
          status: 'Mapped'
        });
      }
    });

    setVendorMappings(updatedV);
    setEntityMappings(updatedE);
    saveStoredVendorMappings(updatedV);
    saveStoredEntityMappings(updatedE);
  };

  const handleDatePresetChange = (preset: 'All' | 'Last7Days' | 'Last30Days' | 'Aug2026' | 'Sep2026' | 'Custom') => {
    setDatePreset(preset);
    if (preset === 'All') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'Aug2026') {
      setStartDate('2026-08-01');
      setEndDate('2026-08-31');
    } else if (preset === 'Sep2026') {
      setStartDate('2026-09-01');
      setEndDate('2026-09-30');
    } else if (preset === 'Last7Days') {
      setStartDate('2026-08-25');
      setEndDate('2026-09-01');
    } else if (preset === 'Last30Days') {
      setStartDate('2026-08-02');
      setEndDate('2026-09-01');
    }
  };

  const handleHeaderSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(
        field === 'date' || field === 'dueDate' || field === 'amount' || field === 'convertedAmount' ? 'desc' : 'asc'
      );
    }
  };

  // Filtered and sorted invoices for the table
  const filteredInvoices = useMemo(() => {
    if (!batch) return [];
    return (batch.invoices || [])
      .filter(inv => {
        const matchesType = typeFilter === 'All' || inv.type === typeFilter;
        const matchesCategory = categoryFilter === 'All' || (inv.expensesType || inv.category) === categoryFilter;
        const matchesCurrency = currencyFilter === 'All' || inv.currency === currencyFilter;
        
        // Date Range Matching
        const invDate = parseInvoiceDate(inv.date);
        let matchesDateRange = true;
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (invDate && invDate < start) {
            matchesDateRange = false;
          }
        }
        if (endDate && matchesDateRange) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (invDate && invDate > end) {
            matchesDateRange = false;
          }
        }

        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = !q ||
          (inv.invoiceNumber || '').toLowerCase().includes(q) ||
          (inv.invoiceIdDisplay && inv.invoiceIdDisplay.toLowerCase().includes(q)) ||
          (inv.jobNumber && inv.jobNumber.toLowerCase().includes(q)) ||
          (inv.poNumber && inv.poNumber.toLowerCase().includes(q)) ||
          (inv.entityName || '').toLowerCase().includes(q) ||
          (inv.entity && inv.entity.toLowerCase().includes(q)) ||
          (inv.payingEntity && inv.payingEntity.toLowerCase().includes(q)) ||
          (inv.expensesType && inv.expensesType.toLowerCase().includes(q)) ||
          (inv.paymentTerms && inv.paymentTerms.toLowerCase().includes(q)) ||
          (inv.description && inv.description.toLowerCase().includes(q)) ||
          (inv.amount ?? 0).toString().includes(q) ||
          (inv.date || '').toLowerCase().includes(q);

        return matchesType && matchesCategory && matchesCurrency && matchesDateRange && matchesSearch;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortField === 'date') {
          const dateA = parseInvoiceDate(a.date)?.getTime() || 0;
          const dateB = parseInvoiceDate(b.date)?.getTime() || 0;
          comparison = dateA - dateB;
        } else if (sortField === 'dueDate') {
          const dateA = parseInvoiceDate(a.dueDate)?.getTime() || 0;
          const dateB = parseInvoiceDate(b.dueDate)?.getTime() || 0;
          comparison = dateA - dateB;
        } else if (sortField === 'amount') {
          comparison = (a.amount || 0) - (b.amount || 0);
        } else if (sortField === 'convertedAmount') {
          const amtA = a.convertedAmount ?? (a.currency === 'USD' ? a.amount : (a.amount || 0) * (a.exchangeRate || 1));
          const amtB = b.convertedAmount ?? (b.currency === 'USD' ? b.amount : (b.amount || 0) * (b.exchangeRate || 1));
          comparison = amtA - amtB;
        } else if (sortField === 'currency') {
          comparison = (a.currency || '').localeCompare(b.currency || '');
        } else if (sortField === 'invoiceNumber') {
          comparison = (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '');
        } else if (sortField === 'entityName') {
          comparison = (a.entityName || '').localeCompare(b.entityName || '');
        } else if (sortField === 'poNumber') {
          comparison = (a.poNumber || '').localeCompare(b.poNumber || '');
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [batch, typeFilter, categoryFilter, currencyFilter, startDate, endDate, searchQuery, sortField, sortOrder]);

  if (!isOpen || !batch) return null;

  const handleCopyRef = (ref: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(generatedEtlContent);
    setIsCopiedFile(true);
    setTimeout(() => setIsCopiedFile(false), 2000);
  };

  const handleInspectInvoice = (inv: InvoiceBatchItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const matched: MatchedInvoice = {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceIdDisplay: inv.invoiceIdDisplay || '#73',
      date: inv.date,
      dueDate: inv.dueDate,
      entityName: inv.entityName,
      type: inv.type,
      amount: inv.amount,
      currency: inv.currency,
      settlementCurrency: inv.settlementCurrency,
      exchangeRate: inv.exchangeRate,
      convertedAmount: inv.convertedAmount,
      fxGainLoss: inv.fxGainLoss,
      status: inv.status as any,
      matchConfidence: inv.matchConfidence,
      matchedBankTxnId: inv.matchedBankTxnId,
      poNumber: inv.poNumber,
      description: inv.description,
      jobNumber: inv.jobNumber,
      expensesType: inv.expensesType,
      vendorVatNumber: inv.vendorVatNumber,
      postMonth: inv.postMonth,
      submittedOn: inv.submittedOn,
      fromDate: (inv as any).fromDate,
      toDate: (inv as any).toDate,
      paymentTerms: inv.paymentTerms,
      entity: inv.entity,
      payingEntity: inv.payingEntity,
      payingEntities: (inv as any).payingEntities,
      approvalWorkflow: (inv as any).approvalWorkflow,
      bankName: inv.bankName || inv.matchedBankName,
      paymentCurrency: inv.paymentCurrency || inv.currency,
      totalIncVat: inv.totalIncVat,
      totalExVat: inv.totalExVat,
      taxAmount: (inv as any).taxAmount,
      isApproved: inv.isApproved,
      isReconciled: true,
      checklist: inv.checklist,
      apportionment: inv.apportionment,
      richLineItems: inv.richLineItems
    };
    setInspectingInvoice(matched);
  };

  const handleDownload = () => {
    const ext = format === 'XML_PEPPOL_UBL' ? 'xml' : format === 'JSON_INVOICE_STREAM' ? 'json' : 'csv';
    const blob = new Blob([generatedEtlContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${batch.id}_${batch.name.replace(/\s+/g, '_')}_export.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleRowExpand = (rowKey: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedRowId(prev => (prev === rowKey ? null : rowKey));
  };

  return (
    <>
      <div className="fixed inset-0 z-50 p-5 bg-black/60 backdrop-blur-xs flex items-center justify-center animate-in fade-in duration-150 font-sans">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col w-full h-full overflow-hidden">
          
          {/* MODAL HEADER */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-100 text-[#EA580C] rounded-xl border border-orange-200 shadow-2xs">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-gray-900 font-mono tracking-tight">
                    {batch.id}
                  </h3>
                  <span className="text-xs text-gray-500 font-medium">•</span>
                  <span className="text-sm font-semibold text-gray-800">{batch.name}</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    batch.status === 'Ready' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : batch.status === 'Exported' 
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-gray-100 text-gray-700 border-gray-200'
                  }`}>
                    {batch.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Created by <strong className="text-gray-700">{batch.createdBy}</strong> on {batch.createdAt} • Target: <span className="font-semibold text-gray-700">{batch.exportDestination || 'Yardi Voyager PayScan GL Engine'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Mapping Manager Quick Button */}
              <button
                type="button"
                onClick={() => setIsMappingModalOpen(true)}
                className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Manage Yardi Vendor & Entity Code Mappings"
              >
                <Users2 className="w-3.5 h-3.5 text-gray-600" />
                <span>Mappings ({vendorMappings.length}V / {entityMappings.length}E)</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-gray-600" />
                <span>Download ({format === 'XML_PEPPOL_UBL' ? 'XML' : format === 'JSON_INVOICE_STREAM' ? 'JSON' : 'CSV'})</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* SUMMARY KPI STRIP */}
          <div className="px-6 py-3 bg-white border-b border-gray-200 shrink-0">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Reconciled Invoices
                </span>
                <span className="text-base font-bold text-gray-900 mt-0.5 block">
                  {(batch.invoices || []).length} Invoices
                </span>
              </div>

              <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Batch Total (USD Equiv)
                </span>
                <span className="text-base font-bold text-[#EA580C] font-mono mt-0.5 block">
                  ${(batch.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Granular GL Rows
                </span>
                <span className="text-base font-bold text-purple-900 font-mono mt-0.5 block">
                  {etlRecords.length} Ledger Entries
                </span>
              </div>

              <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  AP / AR Breakdown
                </span>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    AP: ${(batch.apAmount || 0).toLocaleString()}
                  </span>
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    AR: ${(batch.arAmount || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Posting Date & Status
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-xs font-semibold text-gray-800 font-mono">
                    {batch.postingDate || '2026-08-31'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* MAPPING WARNING BANNER (IF UNMAPPED COUNTERPARTIES EXIST) */}
          {batchValidation.errorRecordsCount > 0 && (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between shrink-0 animate-in slide-in-from-top-1">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="text-xs text-amber-900">
                  <strong>Mapping Alert:</strong> {batchValidation.errorRecordsCount} item(s) in this batch reference unmapped counterparties or legal entities.
                  {(batchValidation.missingVendors || []).length > 0 && (
                    <span className="ml-1">Vendors: <code className="bg-amber-100 px-1 rounded">{(batchValidation.missingVendors || []).join(', ')}</code></span>
                  )}
                  {(batchValidation.missingEntities || []).length > 0 && (
                    <span className="ml-1">• Entities: <code className="bg-amber-100 px-1 rounded">{(batchValidation.missingEntities || []).join(', ')}</code></span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleAutoMapBatchMissing}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Map All Missing</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsMappingModalOpen(true)}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-xs font-bold cursor-pointer transition-colors"
                >
                  Configure Manually &rarr;
                </button>
              </div>
            </div>
          )}

          {/* WORKSPACE NAVIGATION TABS (PARITY WITH CREATE BATCH) */}
          <div className="px-6 py-2.5 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('invoices')}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'invoices'
                    ? 'bg-orange-50 text-[#EA580C] border border-orange-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Table className="w-4 h-4" />
                <span>1. Batch Invoices & Apportionment</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-gray-200 text-gray-800">
                  {(batch.invoices || []).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('loader')}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'loader'
                    ? 'bg-orange-50 text-[#EA580C] border border-orange-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>2. Loader File Preview & Inline Edit</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EA580C] text-white">
                  {etlRecords.length} GL Rows
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('raw')}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'raw'
                    ? 'bg-orange-50 text-[#EA580C] border border-orange-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Code className="w-4 h-4" />
                <span>3. Raw ETL Stream ({format.split('_')[0]})</span>
              </button>
            </div>

            {/* BATCH TOTAL INDICATOR */}
            <div className="flex items-center gap-3 text-xs">
              <span className="text-gray-500 font-medium">Batch Value:</span>
              <span className="font-mono font-extrabold text-gray-900 text-sm">
                ${(batch.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </span>
            </div>
          </div>

          {/* MODAL MAIN CONTENT */}
          <div className="flex-1 overflow-y-auto p-5 bg-[#F6F8FA]">
            
            {/* TAB 1: INVOICES & APPORTIONMENT BREAKDOWN */}
            {activeTab === 'invoices' && (
              <div className="space-y-4">
                {/* COMPILED INVOICES TABLE */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse font-sans text-xs">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                          {/* INVOICE # & ID */}
                          <th 
                            onClick={() => handleHeaderSort('invoiceNumber')}
                            className="py-2.5 px-3 min-w-[150px] cursor-pointer hover:bg-gray-100/80 select-none transition-colors"
                            title="Click to sort by Invoice Number"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Invoice # / ID</span>
                              {sortField === 'invoiceNumber' ? (
                                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />
                              )}
                            </div>
                          </th>

                          {/* CUSTOMER / VENDOR */}
                          <th 
                            onClick={() => handleHeaderSort('entityName')}
                            className="py-2.5 px-3 min-w-[220px] cursor-pointer hover:bg-gray-100/80 select-none transition-colors"
                            title="Click to sort by Vendor / Entity"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Vendor / Entity</span>
                              {sortField === 'entityName' ? (
                                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />
                              )}
                            </div>
                          </th>

                          {/* PO & JOB NUMBER */}
                          <th 
                            onClick={() => handleHeaderSort('poNumber')}
                            className="py-2.5 px-3 min-w-[140px] cursor-pointer hover:bg-gray-100/80 select-none transition-colors"
                            title="Click to sort by PO Number"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>PO & Job #</span>
                              {sortField === 'poNumber' ? (
                                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />
                              )}
                            </div>
                          </th>

                          {/* INVOICE DATE */}
                          <th 
                            onClick={() => handleHeaderSort('date')}
                            className="py-2.5 px-3 min-w-[120px] cursor-pointer hover:bg-gray-100/80 select-none transition-colors bg-orange-50/40"
                            title="Click to sort by Invoice Date"
                          >
                            <div className="flex items-center gap-1.5 text-orange-950 font-extrabold">
                              <Calendar className="w-3 h-3 text-[#EA580C]" />
                              <span>Dates</span>
                              {sortField === 'date' ? (
                                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-orange-400 hover:text-[#EA580C]" />
                              )}
                            </div>
                          </th>

                          {/* CURRENCY */}
                          <th 
                            onClick={() => handleHeaderSort('currency')}
                            className="py-2.5 px-3 min-w-[80px] cursor-pointer hover:bg-gray-100/80 select-none transition-colors"
                            title="Click to sort by Currency"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Currency</span>
                              {sortField === 'currency' ? (
                                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />
                              )}
                            </div>
                          </th>

                          {/* AMOUNT */}
                          <th 
                            onClick={() => handleHeaderSort('amount')}
                            className="py-2.5 px-3 text-right min-w-[120px] cursor-pointer hover:bg-gray-100/80 select-none transition-colors"
                            title="Click to sort by Gross Amount"
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <span>Gross Amount</span>
                              {sortField === 'amount' ? (
                                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />
                              )}
                            </div>
                          </th>

                          {/* SETTLEMENT USD */}
                          <th 
                            onClick={() => handleHeaderSort('convertedAmount')}
                            className="py-2.5 px-3 text-right min-w-[130px] cursor-pointer hover:bg-gray-100/80 select-none transition-colors"
                            title="Click to sort by USD Equivalent"
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <span>USD Equiv</span>
                              {sortField === 'convertedAmount' ? (
                                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />
                              )}
                            </div>
                          </th>

                          {/* ACTIONS */}
                          <th className="py-2.5 px-3 text-center w-24"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredInvoices.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-gray-400">
                              <div className="max-w-sm mx-auto text-center space-y-1.5">
                                <AlertCircle className="w-5 h-5 text-gray-300 mx-auto" />
                                <p className="font-semibold text-gray-600 text-xs">No invoices match your search</p>
                                <p className="text-[11px] text-gray-400">Try clearing the search query or changing filters.</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredInvoices.map((inv, index) => {
                            const rowKey = `${inv.sourceRunId || 'run'}_${inv.id}_${index}`;
                            const isExpanded = expandedRowId === rowKey;
                            const isCrossCurrency = inv.currency !== 'USD';
                            const entitySplits = computeEntitySplits(inv);
                            const hasMultipleSplits = entitySplits.length > 1;
                            const richLinesCount = inv.richLineItems?.length || 0;

                            return (
                              <React.Fragment key={rowKey}>
                                <tr
                                  onClick={(e) => toggleRowExpand(rowKey, e)}
                                  className={`cursor-pointer transition-colors ${
                                    isExpanded
                                      ? 'bg-[#FFF8F3] border-l-4 border-l-[#EA580C]'
                                      : 'hover:bg-gray-50'
                                  }`}
                                  title="Click row to expand/collapse multi-entity breakdown"
                                >
                                  {/* INVOICE NUMBER & ID */}
                                  <td className="py-2.5 px-3 font-mono font-bold text-gray-900 whitespace-nowrap text-xs">
                                    <div className="flex items-center gap-1.5">
                                      {inv.invoiceIdDisplay && (
                                        <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-gray-200">
                                          {inv.invoiceIdDisplay}
                                        </span>
                                      )}
                                      <span>{inv.invoiceNumber}</span>
                                      <button
                                        type="button"
                                        onClick={(e) => handleCopyRef(inv.invoiceNumber, e)}
                                        className="text-gray-400 hover:text-gray-700 cursor-pointer p-0.5 rounded"
                                        title={copiedRef === inv.invoiceNumber ? 'Copied!' : 'Copy Invoice #'}
                                      >
                                        {copiedRef === inv.invoiceNumber ? (
                                          <Check className="w-3 h-3 text-emerald-600" />
                                        ) : (
                                          <FileText className="w-3 h-3 text-gray-400 hover:text-[#EA580C]" />
                                        )}
                                      </button>
                                    </div>
                                    <span className="text-[10px] text-gray-500 block font-sans mt-0.5">
                                      {inv.type === 'AP' ? 'Vendor Bill' : 'Customer Invoice'}
                                    </span>
                                  </td>

                                  {/* CUSTOMER / VENDOR */}
                                  <td className="py-2.5 px-3 text-xs">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border shrink-0 ${
                                        inv.type === 'AP' 
                                          ? 'bg-amber-50 text-amber-800 border-amber-200' 
                                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      }`}>
                                        {inv.type}
                                      </span>
                                      <span className="font-bold text-gray-900 truncate max-w-[180px]">
                                        {inv.entityName}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                      {hasMultipleSplits ? (
                                        <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-purple-200 inline-flex items-center gap-1">
                                          <Building2 className="w-2.5 h-2.5 text-purple-600" />
                                          <span>Split ({entitySplits.length} Properties)</span>
                                        </span>
                                      ) : (
                                        inv.entity && (
                                          <span className="text-[10px] text-gray-500 block truncate max-w-[180px]" title={inv.entity}>
                                            {inv.entity}
                                          </span>
                                        )
                                      )}
                                      {richLinesCount > 0 && (
                                        <span className="bg-blue-50 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-blue-200">
                                          {richLinesCount} {richLinesCount === 1 ? 'Line Item' : 'Line Items'}
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* PO & JOB NUMBER */}
                                  <td className="py-2.5 px-3 font-mono text-xs whitespace-nowrap">
                                    <div className="font-bold text-gray-900">
                                      {inv.poNumber || 'PO-DIRECT'}
                                    </div>
                                    {inv.jobNumber && (
                                      <span className="text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200 block w-fit mt-0.5">
                                        {inv.jobNumber}
                                      </span>
                                    )}
                                  </td>

                                  {/* INVOICE DATE */}
                                  <td className="py-2.5 px-3 font-mono text-gray-700 whitespace-nowrap text-xs">
                                    <div>{inv.date}</div>
                                    <div className="text-[10px] text-gray-400 font-sans">Due: {inv.dueDate}</div>
                                  </td>

                                  {/* CURRENCY */}
                                  <td className="py-2.5 px-3 font-mono text-xs whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                                        inv.currency === 'USD'
                                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                                          : inv.currency === 'EUR'
                                          ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                          : inv.currency === 'GBP'
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                          : inv.currency === 'CAD' || inv.currency === 'AUD'
                                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                                          : 'bg-purple-50 text-purple-800 border-purple-200'
                                      }`}>
                                        {inv.currency || 'USD'}
                                      </span>
                                    </div>
                                  </td>

                                  {/* AMOUNT */}
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900 whitespace-nowrap text-xs">
                                    <div>{formatCurrency(inv.amount, inv.currency)}</div>
                                    {isCrossCurrency && (
                                      <span className="text-[10px] text-orange-600 font-sans font-semibold">
                                        FX @ {inv.exchangeRate?.toFixed(4) || '1.0000'}
                                      </span>
                                    )}
                                  </td>

                                  {/* SETTLEMENT USD */}
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800 whitespace-nowrap text-xs">
                                    <div>
                                      {formatCurrency(
                                        inv.convertedAmount ?? (inv.currency === 'USD' ? inv.amount : inv.amount * (inv.exchangeRate || 1)),
                                        'USD'
                                      )}
                                    </div>
                                    <span className="text-[10px] text-emerald-600 font-sans font-medium">
                                      Settled
                                    </span>
                                  </td>

                                  {/* ACTION ICONS */}
                                  <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={(e) => handleInspectInvoice(inv, e)}
                                        className="p-1.5 bg-white hover:bg-orange-50 text-gray-500 hover:text-[#EA580C] border border-gray-200 hover:border-orange-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                                        title="Inspect invoice details"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>

                                      {onRemoveInvoice && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (batch) {
                                              onRemoveInvoice(batch.id, inv.id, inv);
                                            }
                                          }}
                                          className="p-1.5 bg-white hover:bg-red-50 text-gray-400 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                                          title="Remove invoice from this batch (returns to unbatched pool)"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={(e) => toggleRowExpand(rowKey, e)}
                                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                          isExpanded
                                            ? 'bg-orange-100 text-orange-800 border-orange-300'
                                            : 'bg-white hover:bg-gray-100 text-gray-500 hover:text-gray-700 border-gray-200'
                                        }`}
                                        title={isExpanded ? "Collapse entity breakdown" : "Expand entity breakdown"}
                                      >
                                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-orange-600' : 'text-gray-400'}`} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {/* EXPANDED ACCORDION ROW FOR DETAILS & MULTI-ENTITY SPLITS */}
                                {isExpanded && (
                                  <tr className="bg-[#FFF8F3] border-b-2 border-orange-200/80">
                                    <td colSpan={8} className="p-4 pl-10">
                                      <div className="bg-white border border-orange-200/90 rounded-xl p-4 shadow-xs space-y-3.5 ring-1 ring-orange-100/80">
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 pb-2.5">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <Receipt className="w-4 h-4 text-[#EA580C]" />
                                            <span className="text-xs font-bold text-gray-900">
                                              {inv.invoiceIdDisplay ? `${inv.invoiceIdDisplay} | ` : ''}{inv.invoiceNumber}
                                            </span>
                                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                                              Batch Item Approved ✓
                                            </span>
                                            {hasMultipleSplits ? (
                                              <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-200 inline-flex items-center gap-1">
                                                <Building2 className="w-3 h-3 text-purple-600" />
                                                Multi-Entity Apportionment ({entitySplits.length} Accounts/Funds)
                                              </span>
                                            ) : (
                                              <span className="bg-blue-50 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-blue-200">
                                                Single Entity Direct Settlement
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-3 text-xs font-mono">
                                            <button
                                              type="button"
                                              onClick={(e) => handleInspectInvoice(inv, e)}
                                              className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1 cursor-pointer"
                                            >
                                              <span>Open Full Modal View</span>
                                              <ExternalLink className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>

                                        {/* Match Details breakdown */}
                                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                                          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Customer / Vendor Entity</span>
                                            <span className="font-bold text-gray-900 block">{inv.entityName}</span>
                                            <span className="text-[11px] text-gray-500">{inv.description || 'Commercial trading balance'}</span>
                                          </div>

                                          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">PO & Classification</span>
                                            <div className="text-gray-900 font-bold font-mono">
                                              {inv.poNumber || 'PO-DIRECT'}
                                            </div>
                                            <span className="text-[11px] text-gray-600 block mt-0.5">{inv.paymentTerms || 'Net 30 days'} • {inv.expensesType || 'OPEX'}</span>
                                          </div>

                                          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Pre-approval Checklist</span>
                                            <div className="space-y-0.5 text-[11px] text-emerald-800 font-medium">
                                              <div>✓ Vendor Profile Verified</div>
                                              <div>✓ Reconciliation Verified</div>
                                              <div>✓ GL Split Budget Validated</div>
                                            </div>
                                          </div>

                                          <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
                                            <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block mb-1">Posting Reconciliation Value</span>
                                            <span className="text-sm font-bold font-mono text-gray-900 block">
                                              {formatCurrency(inv.amount, inv.currency)}
                                            </span>
                                            {isCrossCurrency && (
                                              <span className="text-xs font-mono font-bold text-emerald-800 block mt-0.5">
                                                = {formatCurrency(inv.convertedAmount ?? (inv.amount * (inv.exchangeRate || 1)), 'USD')}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {/* DEDICATED MULTI-ENTITY SPLIT & APPORTIONMENT BREAKDOWN TABLE */}
                                        <div className="border border-purple-200 bg-purple-50/30 rounded-xl p-3 space-y-2">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                              <Building2 className="w-3.5 h-3.5 text-purple-700" />
                                              <span className="text-xs font-bold text-purple-950">
                                                {hasMultipleSplits 
                                                  ? `Multi-Entity Apportionment & Split Allocation (${entitySplits.length} Entities)` 
                                                  : 'Entity Allocation Details'}
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded border border-purple-200">
                                              Total: {formatCurrency(inv.amount, inv.currency)} ({isCrossCurrency ? `${formatCurrency(inv.convertedAmount ?? (inv.amount * (inv.exchangeRate || 1)), 'USD')} USD Equiv` : 'USD'})
                                            </span>
                                          </div>

                                          <div className="bg-white rounded-lg border border-purple-200 overflow-hidden shadow-2xs">
                                            <table className="w-full text-left text-xs border-collapse">
                                              <thead>
                                                <tr className="bg-purple-100/70 text-purple-900 border-b border-purple-200 text-[11px]">
                                                  <th className="py-2 px-3 font-bold">Allocated Entity / Property</th>
                                                  <th className="py-2 px-2.5 font-bold">Yardi Code</th>
                                                  <th className="py-2 px-2.5 text-right font-bold">Split %</th>
                                                  <th className="py-2 px-3 text-right font-bold">Net Amount</th>
                                                  <th className="py-2 px-3 text-right font-bold">Gross Amount</th>
                                                  {isCrossCurrency && (
                                                    <th className="py-2 px-3 text-right font-bold">USD Settlement</th>
                                                  )}
                                                  <th className="py-2 px-3 font-bold">Allocated GL / Categories</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-purple-100">
                                                {entitySplits.map((sp, idx) => {
                                                  const mappedProperty = findEntityMapping(sp.entityName, entityMappings);
                                                  return (
                                                    <tr key={idx} className="hover:bg-purple-50/50">
                                                      <td className="py-2 px-3 font-medium text-gray-900">
                                                        <div className="flex items-center gap-1.5">
                                                          <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                                            {idx + 1}
                                                          </span>
                                                          <span className="font-bold text-gray-900">{sp.entityName}</span>
                                                        </div>
                                                      </td>
                                                      <td className="py-2 px-2.5 text-gray-600 text-[11px] font-mono">
                                                        {mappedProperty?.yardiEntityCode ? (
                                                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded font-bold text-[10px] border border-emerald-200">
                                                            {mappedProperty.yardiEntityCode}
                                                          </span>
                                                        ) : (
                                                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded font-bold text-[10px] border border-amber-200">
                                                            Unmapped
                                                          </span>
                                                        )}
                                                      </td>
                                                      <td className="py-2 px-2.5 text-right font-mono font-bold text-purple-900">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                          <span className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.5 rounded font-bold">
                                                            {sp.percent.toFixed(2)}%
                                                          </span>
                                                        </div>
                                                      </td>
                                                      <td className="py-2 px-3 text-right font-mono text-gray-700 font-medium">
                                                        {formatCurrency(sp.netAmount, inv.currency)}
                                                      </td>
                                                      <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">
                                                        {formatCurrency(sp.grossAmount, inv.currency)}
                                                      </td>
                                                      {isCrossCurrency && (
                                                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                                                          {formatCurrency(sp.convertedAmount, 'USD')}
                                                        </td>
                                                      )}
                                                      <td className="py-2 px-3">
                                                        {(sp.glCodes || []).length > 0 ? (
                                                          <div className="flex flex-wrap gap-1">
                                                            {(sp.glCodes || []).map((code, cIdx) => (
                                                              <span key={cIdx} className="bg-gray-100 text-gray-700 font-mono text-[10px] px-1.5 py-0.5 rounded border border-gray-200">
                                                                {code}
                                                              </span>
                                                            ))}
                                                          </div>
                                                        ) : (
                                                          <span className="text-[11px] text-gray-400 font-sans">
                                                            {inv.expensesType || inv.category || 'General Operational Split'}
                                                          </span>
                                                        )}
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                              </tbody>
                                              <tfoot className="bg-purple-50/80 font-bold border-t border-purple-200 text-[11px]">
                                                <tr>
                                                  <td className="py-2 px-3 text-purple-950 font-bold" colSpan={2}>
                                                    Total Apportionment ({(entitySplits || []).length} {(entitySplits || []).length > 1 ? 'Entities' : 'Entity'})
                                                  </td>
                                                  <td className="py-2 px-2.5 text-right text-purple-950 font-mono font-bold">
                                                    100.00%
                                                  </td>
                                                  <td className="py-2 px-3 text-right text-purple-950 font-mono">
                                                    {formatCurrency(
                                                      entitySplits.reduce((acc, curr) => acc + curr.netAmount, 0),
                                                      inv.currency
                                                    )}
                                                  </td>
                                                  <td className="py-2 px-3 text-right text-purple-950 font-mono font-bold">
                                                    {formatCurrency(inv.amount, inv.currency)}
                                                  </td>
                                                  {isCrossCurrency && (
                                                    <td className="py-2 px-3 text-right text-emerald-800 font-mono font-bold">
                                                      {formatCurrency(inv.convertedAmount ?? (inv.amount * (inv.exchangeRate || 1)), 'USD')}
                                                    </td>
                                                  )}
                                                  <td className="py-2 px-3 text-emerald-700 font-medium text-[10px]">
                                                    ✓ Fully Reconciled & Split Validated
                                                  </td>
                                                </tr>
                                              </tfoot>
                                            </table>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: INTERACTIVE & EDITABLE ETL LOADER TABLE */}
            {activeTab === 'loader' && (
              <EtlLoaderPreviewTable
                records={etlRecords}
                format={format}
                onFormatChange={setFormat}
                recordOverrides={recordOverrides}
                onUpdateRecordOverride={handleUpdateRecordOverride}
                onApplyNoteToInvoice={handleApplyNoteToInvoice}
                onResetOverrides={handleResetOverrides}
                onOpenMappingManager={() => setIsMappingModalOpen(true)}
              />
            )}

            {/* TAB 3: RAW ETL STREAM */}
            {activeTab === 'raw' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        Generated Raw Output Stream ({format})
                      </h3>
                      <p className="text-xs text-gray-500">
                        Compiled from {(batch.invoices || []).length} batch invoices resulting in {etlRecords.length} granular GL ledger entries.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 mr-2">
                      <span className="text-xs font-semibold text-gray-500">Format:</span>
                      <select
                        value={format}
                        onChange={(e) => setFormat(e.target.value as InvoiceETLFormat)}
                        className="px-2.5 py-1 text-xs bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EA580C] focus:outline-hidden cursor-pointer font-semibold"
                      >
                        <option value="YARDI_VOYAGER_LOADER">Yardi PayScan GL Loader (CSV)</option>
                        <option value="NETSUITE_CSV">Oracle NetSuite Feed (CSV)</option>
                        <option value="SAP_GL_FEED">SAP General Ledger (CSV)</option>
                        <option value="XML_PEPPOL_UBL">PEPPOL BIS Billing 3.0 (XML)</option>
                        <option value="JSON_INVOICE_STREAM">JSON REST Payload (JSON)</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyPreview}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isCopiedFile ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                      <span>{isCopiedFile ? 'Copied!' : 'Copy Stream'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownload}
                      className="px-3 py-1.5 bg-[#EA580C] hover:bg-[#D94E07] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download {format === 'XML_PEPPOL_UBL' ? 'XML' : format === 'JSON_INVOICE_STREAM' ? 'JSON' : 'CSV'}</span>
                    </button>
                  </div>
                </div>

                {/* Code display box */}
                <div className="bg-[#1E293B] text-emerald-400 p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-[500px] border border-gray-800 leading-relaxed shadow-inner">
                  <pre>{generatedEtlContent}</pre>
                </div>
              </div>
            )}
          </div>

          {/* MODAL FOOTER */}
          <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>

            <div className="flex items-center gap-3">
              {activeTab === 'invoices' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('loader')}
                  className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>Preview Loader File</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('invoices')}
                  className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Invoices</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (onExportToErp) onExportToErp(batch);
                  onClose();
                }}
                className="px-4 py-2 bg-[#EA580C] hover:bg-[#D94E07] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Post & Sync to ERP</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* INSPECT INVOICE MODAL */}
      {inspectingInvoice && (
        <InvoiceDetailModal
          invoice={inspectingInvoice}
          onClose={() => setInspectingInvoice(null)}
        />
      )}

      {/* YARDI VENDOR & ENTITY MAPPINGS MANAGER MODAL */}
      <MappingManagerModal
        isOpen={isMappingModalOpen}
        onClose={() => setIsMappingModalOpen(false)}
        vendorMappings={vendorMappings}
        entityMappings={entityMappings}
        onUpdateVendorMappings={(updated) => {
          setVendorMappings(updated);
          saveStoredVendorMappings(updated);
        }}
        onUpdateEntityMappings={(updated) => {
          setEntityMappings(updated);
          saveStoredEntityMappings(updated);
        }}
        unmappedVendorFilter={batchValidation.missingVendors}
        unmappedEntityFilter={batchValidation.missingEntities}
      />
    </>
  );
};
