import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Receipt, 
  CheckSquare, 
  Square, 
  Search, 
  Building2, 
  Calendar, 
  CalendarRange,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  DollarSign, 
  CheckCircle2, 
  FileText, 
  ArrowRight, 
  ArrowLeft, 
  Download, 
  AlertCircle, 
  AlertTriangle, 
  Copy, 
  Check, 
  Sparkles, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  Tag, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Eye, 
  ExternalLink, 
  Layers, 
  History, 
  RotateCcw, 
  SlidersHorizontal, 
  Users2, 
  Table, 
  Code,
  Plus
} from 'lucide-react';
import { ReconciliationRun, InvoiceBatch, InvoiceETLFormat, InvoiceBatchItem, BankTransaction, MatchedInvoice } from '../types/reconciliation';
import { INITIAL_INVOICES } from '../data/mockData';
import { InvoiceDetailModal } from './InvoiceDetailModal';
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
  findVendorMapping,
  findEntityMapping,
  generateAutoYardiVendorCode,
  generateAutoYardiEntityCode
} from '../utils/yardiMapping';
import { 
  generateInvoiceEtlRecords, 
  formatEtlContent 
} from '../utils/yardiEtlEngine';
import { MappingManagerModal } from './MappingManagerModal';
import { EtlLoaderPreviewTable } from './EtlLoaderPreviewTable';

interface CreateInvoiceBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  reconciliationRuns: ReconciliationRun[];
  onCreateBatch: (batch: InvoiceBatch) => void;
  removedInvoices?: InvoiceBatchItem[];
}

export const CreateInvoiceBatchModal: React.FC<CreateInvoiceBatchModalProps> = ({
  isOpen,
  onClose,
  reconciliationRuns,
  onCreateBatch,
  removedInvoices = []
}) => {
  // Batch Form State
  const defaultBatchId = useMemo(() => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `INV-BATCH-2026-${randomSuffix}`;
  }, []);

  const [batchId, setBatchId] = useState<string>(defaultBatchId);
  const [batchName, setBatchName] = useState<string>('Yardi_Invoice_Consolidated_' + new Date().toISOString().slice(0, 10));
  const [format, setFormat] = useState<InvoiceETLFormat>('YARDI_VOYAGER_LOADER');
  const [postingDate, setPostingDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [exportDestination, setExportDestination] = useState<string>('Yardi Voyager PayScan GL Engine');
  const [notes, setNotes] = useState<string>('Consolidated invoice batch with granular line-item splits and Yardi GL mappings.');

  // Workspace Tabs: 'invoices' | 'loader'
  const [activeTab, setActiveTab] = useState<'invoices' | 'loader'>('invoices');

  // Mapping State (Synced with persistent localStorage)
  const [vendorMappings, setVendorMappings] = useState<YardiVendorMapping[]>(() => getStoredVendorMappings());
  const [entityMappings, setEntityMappings] = useState<YardiEntityMapping[]>(() => getStoredEntityMappings());
  const [isMappingModalOpen, setIsMappingModalOpen] = useState<boolean>(false);

  // Quick Map Modal State for unmapped Vendor / Entity
  const [quickMapTarget, setQuickMapTarget] = useState<{
    type: 'vendor' | 'entity';
    name: string;
    originalCode?: string;
  } | null>(null);
  const [quickMapYardiCode, setQuickMapYardiCode] = useState<string>('');
  const [quickMapGlOrFund, setQuickMapGlOrFund] = useState<string>('GL-6000 OPEX');
  const [mappingNotification, setMappingNotification] = useState<string | null>(null);

  // ETL Record Field Overrides (Selective user edits on notes, GL code, descriptions)
  const [recordOverrides, setRecordOverrides] = useState<Record<string, EtlRecordOverride>>({});

  // Filters & Search
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'All' | 'AR' | 'AP'>('All');
  const [selectedCurrencyFilter, setSelectedCurrencyFilter] = useState<string>('All');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<'All' | 'Removed' | 'Fresh'>('Fresh');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Date Range & Sorting State
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'All' | 'Last7Days' | 'Last30Days' | 'Aug2026' | 'Sep2026' | 'Custom'>('All');
  const [sortField, setSortField] = useState<'date' | 'dueDate' | 'amount' | 'convertedAmount' | 'currency' | 'invoiceNumber' | 'entityName' | 'poNumber' | 'removedFromBatchId'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Expanded row details map
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Selected Invoice for Detail Modal (Invoice inspection)
  const [inspectingInvoice, setInspectingInvoice] = useState<MatchedInvoice | null>(null);

  // Copied indicator
  const [isCopiedFile, setIsCopiedFile] = useState<boolean>(false);

  // Flatten all reconciled invoices across runs, initial pool, and unbatched removed invoices
  const allReconciledInvoices: InvoiceBatchItem[] = useMemo(() => {
    const items: InvoiceBatchItem[] = [];
    const seenInvoiceIds = new Set<string>();

    // 0. Include any dynamically removed invoices from existing batches
    if (removedInvoices && removedInvoices.length > 0) {
      removedInvoices.forEach(inv => {
        if (!seenInvoiceIds.has(inv.id)) {
          seenInvoiceIds.add(inv.id);
          items.push(inv);
        }
      });
    }

    // 1. Gather from reconciliation runs
    reconciliationRuns.forEach(run => {
      const txnMap = new Map<string, BankTransaction>((run.transactions || []).map(t => [t.id, t]));

      (run.invoices || []).forEach(inv => {
        const isReconciled = inv.isReconciled || inv.matchedBankTxnId || inv.status !== 'Unmatched';
        if (isReconciled && !seenInvoiceIds.has(inv.id)) {
          seenInvoiceIds.add(inv.id);
          const matchedTxn = inv.matchedBankTxnId ? txnMap.get(inv.matchedBankTxnId) : undefined;
          
          items.push({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            invoiceIdDisplay: inv.invoiceIdDisplay,
            date: inv.date,
            dueDate: inv.dueDate,
            entityName: inv.entityName,
            type: inv.type,
            amount: inv.amount,
            currency: inv.currency || run.currency || 'USD',
            settlementCurrency: inv.settlementCurrency || 'USD',
            exchangeRate: inv.exchangeRate,
            convertedAmount: inv.convertedAmount,
            fxGainLoss: inv.fxGainLoss,
            status: inv.status,
            matchConfidence: inv.matchConfidence,
            matchedBankName: inv.bankName || run.bankName,
            matchedBankTxnId: inv.matchedBankTxnId,
            matchedBankRef: matchedTxn ? matchedTxn.reference : inv.matchedBankTxnId,
            sourceRunId: run.id,
            poNumber: inv.poNumber,
            description: inv.description,
            jobNumber: inv.jobNumber,
            expensesType: inv.expensesType,
            category: inv.category,
            vendorVatNumber: inv.vendorVatNumber,
            postMonth: inv.postMonth,
            submittedOn: inv.submittedOn,
            paymentTerms: inv.paymentTerms,
            entity: inv.entity,
            payingEntity: inv.payingEntity,
            bankName: inv.bankName,
            paymentCurrency: inv.paymentCurrency,
            totalIncVat: inv.totalIncVat,
            totalExVat: inv.totalExVat,
            isApproved: inv.isApproved ?? true,
            isReconciled: true,
            checklist: inv.checklist,
            apportionment: inv.apportionment,
            richLineItems: inv.richLineItems,
            removedFromBatchId: inv.removedFromBatchId,
            removedFromBatchName: inv.removedFromBatchName,
            removedAt: inv.removedAt,
            removalReason: inv.removalReason
          });
        }
      });
    });

    // 2. Gather from INITIAL_INVOICES pool (which contains the rich NEXUS #150, BX #151, KKR #152, APOLLO #153, BT, Siemens, Vodafone, INV-40016)
    INITIAL_INVOICES.forEach(inv => {
      const isReconciled = inv.isReconciled || (inv.matchedBankTxnId !== undefined && inv.status !== 'Unmatched');
      if (isReconciled && !seenInvoiceIds.has(inv.id)) {
        seenInvoiceIds.add(inv.id);
        items.push({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          invoiceIdDisplay: inv.invoiceIdDisplay,
          date: inv.date,
          dueDate: inv.dueDate,
          entityName: inv.entityName,
          type: inv.type,
          amount: inv.amount,
          currency: inv.currency || 'USD',
          settlementCurrency: inv.settlementCurrency || 'USD',
          exchangeRate: inv.exchangeRate,
          convertedAmount: inv.convertedAmount,
          fxGainLoss: inv.fxGainLoss,
          status: inv.status,
          matchConfidence: inv.matchConfidence,
          matchedBankName: inv.bankName || 'HSBC Corporate',
          matchedBankTxnId: inv.matchedBankTxnId,
          matchedBankRef: inv.matchedBankTxnId,
          sourceRunId: 'REC-000124',
          poNumber: inv.poNumber,
          description: inv.description,
          jobNumber: inv.jobNumber,
          expensesType: inv.expensesType,
          category: inv.category,
          vendorVatNumber: inv.vendorVatNumber,
          postMonth: inv.postMonth,
          submittedOn: inv.submittedOn,
          paymentTerms: inv.paymentTerms,
          entity: inv.entity,
          payingEntity: inv.payingEntity,
          bankName: inv.bankName,
          paymentCurrency: inv.paymentCurrency,
          totalIncVat: inv.totalIncVat,
          totalExVat: inv.totalExVat,
          isApproved: inv.isApproved ?? true,
          isReconciled: true,
          checklist: inv.checklist,
          apportionment: inv.apportionment,
          richLineItems: inv.richLineItems,
          removedFromBatchId: (inv as any).removedFromBatchId,
          removedFromBatchName: (inv as any).removedFromBatchName,
          removedAt: (inv as any).removedAt,
          removalReason: (inv as any).removalReason
        });
      }
    });

    return items;
  }, [reconciliationRuns, removedInvoices]);

  // Selected Invoices Set - default to selecting the fresh (new) reconciled invoices
  const [selectedInvoiceKeys, setSelectedInvoiceKeys] = useState<Set<string>>(() => {
    const defaultSelected = new Set<string>();
    allReconciledInvoices.filter(inv => !inv.removedFromBatchId).slice(0, 10).forEach(inv => {
      defaultSelected.add(`${inv.sourceRunId}_${inv.id}`);
    });
    return defaultSelected;
  });

  // Unique lists for filters
  const uniqueCurrencies = useMemo(() => {
    const set = new Set<string>();
    allReconciledInvoices.forEach(inv => {
      if (inv.currency) set.add(inv.currency);
    });
    return Array.from(set).sort();
  }, [allReconciledInvoices]);

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    allReconciledInvoices.forEach(inv => {
      if (inv.expensesType) set.add(inv.expensesType);
      else if (inv.category) set.add(inv.category);
    });
    return Array.from(set).sort();
  }, [allReconciledInvoices]);

  const removedInvoicesCount = useMemo(() => {
    return allReconciledInvoices.filter(inv => !!inv.removedFromBatchId).length;
  }, [allReconciledInvoices]);

  const freshInvoicesCount = useMemo(() => {
    return allReconciledInvoices.filter(inv => !inv.removedFromBatchId).length;
  }, [allReconciledInvoices]);

  // Date Preset handler
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

  // Filter and sort items
  const filteredInvoices = useMemo(() => {
    return allReconciledInvoices
      .filter(inv => {
        const matchesCategory = selectedCategoryFilter === 'All' || inv.expensesType === selectedCategoryFilter || inv.category === selectedCategoryFilter;
        const matchesType = selectedTypeFilter === 'All' || inv.type === selectedTypeFilter;
        const matchesCurrency = selectedCurrencyFilter === 'All' || inv.currency === selectedCurrencyFilter;
        
        let matchesSource = true;
        if (selectedSourceFilter === 'Removed') {
          matchesSource = !!inv.removedFromBatchId;
        } else if (selectedSourceFilter === 'Fresh') {
          matchesSource = !inv.removedFromBatchId;
        }

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

        const matchesSearch = !searchTerm ||
          inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (inv.invoiceIdDisplay && inv.invoiceIdDisplay.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (inv.jobNumber && inv.jobNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (inv.poNumber && inv.poNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (inv.removedFromBatchId && inv.removedFromBatchId.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (inv.removalReason && inv.removalReason.toLowerCase().includes(searchTerm.toLowerCase())) ||
          inv.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (inv.entity && inv.entity.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (inv.payingEntity && inv.payingEntity.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (inv.expensesType && inv.expensesType.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (inv.paymentTerms && inv.paymentTerms.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (inv.description && inv.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
          inv.amount.toString().includes(searchTerm);

        return matchesCategory && matchesType && matchesCurrency && matchesSource && matchesDateRange && matchesSearch;
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
          comparison = a.amount - b.amount;
        } else if (sortField === 'convertedAmount') {
          const amtA = a.convertedAmount ?? (a.currency === 'USD' ? a.amount : a.amount * (a.exchangeRate || 1));
          const amtB = b.convertedAmount ?? (b.currency === 'USD' ? b.amount : b.amount * (b.exchangeRate || 1));
          comparison = amtA - amtB;
        } else if (sortField === 'currency') {
          comparison = (a.currency || '').localeCompare(b.currency || '');
        } else if (sortField === 'invoiceNumber') {
          comparison = a.invoiceNumber.localeCompare(b.invoiceNumber);
        } else if (sortField === 'entityName') {
          comparison = a.entityName.localeCompare(b.entityName);
        } else if (sortField === 'poNumber') {
          comparison = (a.poNumber || '').localeCompare(b.poNumber || '');
        } else if (sortField === 'removedFromBatchId') {
          comparison = (a.removedFromBatchId || '').localeCompare(b.removedFromBatchId || '');
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [allReconciledInvoices, selectedCategoryFilter, selectedTypeFilter, selectedCurrencyFilter, selectedSourceFilter, startDate, endDate, searchTerm, sortField, sortOrder]);

  // Selected invoice objects
  const selectedInvoices = useMemo(() => {
    return allReconciledInvoices.filter(inv => selectedInvoiceKeys.has(`${inv.sourceRunId}_${inv.id}`));
  }, [allReconciledInvoices, selectedInvoiceKeys]);

  // Aggregated totals of selected invoices (in USD equivalent)
  const batchTotals = useMemo(() => {
    const totalCount = selectedInvoices.length;
    const totalAmount = selectedInvoices.reduce((acc, inv) => {
      const converted = inv.convertedAmount ?? (inv.currency === 'USD' ? inv.amount : inv.amount * (inv.exchangeRate || 1));
      return acc + converted;
    }, 0);
    const apAmount = selectedInvoices.filter(inv => inv.type === 'AP').reduce((acc, inv) => {
      const converted = inv.convertedAmount ?? (inv.currency === 'USD' ? inv.amount : inv.amount * (inv.exchangeRate || 1));
      return acc + converted;
    }, 0);
    const arAmount = selectedInvoices.filter(inv => inv.type === 'AR').reduce((acc, inv) => {
      const converted = inv.convertedAmount ?? (inv.currency === 'USD' ? inv.amount : inv.amount * (inv.exchangeRate || 1));
      return acc + converted;
    }, 0);

    return {
      totalCount,
      totalAmount,
      apAmount,
      arAmount
    };
  }, [selectedInvoices]);

  // VALIDATION of Batch Mappings (Flag missing Vendor and Entity codes)
  const batchValidation = useMemo(() => {
    return validateBatchMappings(selectedInvoices, vendorMappings, entityMappings);
  }, [selectedInvoices, vendorMappings, entityMappings]);

  // GENERATE GRANULAR ETL RECORDS (Explodes 4 entities x 4 lines into 16 distinct records with GL entries)
  const etlRecords = useMemo(() => {
    return generateInvoiceEtlRecords(
      selectedInvoices,
      batchId,
      vendorMappings,
      entityMappings,
      recordOverrides
    );
  }, [selectedInvoices, batchId, vendorMappings, entityMappings, recordOverrides]);

  // GENERATE FORMATTED FILE CONTENT
  const generatedEtlContent = useMemo(() => {
    return formatEtlContent(etlRecords, format, batchId);
  }, [etlRecords, format, batchId]);

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

  // Auto-generate missing codes for selected batch items
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
    setMappingNotification(`✓ Successfully auto-resolved and mapped all unmapped items!`);
    setTimeout(() => setMappingNotification(null), 4000);
  };

  // Open Quick Map Dialog for a specific unmapped Vendor or Entity
  const handleOpenQuickMap = (type: 'vendor' | 'entity', name: string, originalCode?: string) => {
    const defaultCode = type === 'vendor' 
      ? generateAutoYardiVendorCode(name)
      : generateAutoYardiEntityCode(name);

    setQuickMapTarget({
      type,
      name,
      originalCode
    });
    setQuickMapYardiCode(defaultCode);
    setQuickMapGlOrFund(type === 'vendor' ? 'GL-6000 OPEX' : 'FUND-01');
  };

  // Apply Quick Map changes
  const handleApplyQuickMap = () => {
    if (!quickMapTarget || !quickMapYardiCode.trim()) return;

    const trimmedCode = quickMapYardiCode.trim().toUpperCase();

    if (quickMapTarget.type === 'vendor') {
      const existingIdx = vendorMappings.findIndex(
        v => v.ourVendorName.toLowerCase() === quickMapTarget.name.toLowerCase()
      );
      let updated: YardiVendorMapping[];
      if (existingIdx >= 0) {
        updated = [...vendorMappings];
        updated[existingIdx] = {
          ...updated[existingIdx],
          yardiVendorCode: trimmedCode,
          yardiVendorName: `${quickMapTarget.name} (Mapped)`,
          defaultGlAccount: quickMapGlOrFund,
          status: 'Mapped'
        };
      } else {
        const newMap: YardiVendorMapping = {
          id: `v-map-${Date.now()}`,
          ourVendorName: quickMapTarget.name,
          ourVendorCode: quickMapTarget.originalCode || `VND-${quickMapTarget.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase()}`,
          yardiVendorCode: trimmedCode,
          yardiVendorName: `${quickMapTarget.name} (PayScan)`,
          defaultGlAccount: quickMapGlOrFund,
          status: 'Mapped'
        };
        updated = [newMap, ...vendorMappings];
      }
      setVendorMappings(updated);
      saveStoredVendorMappings(updated);
      setMappingNotification(`✓ Successfully mapped vendor "${quickMapTarget.name}" → Yardi Code: ${trimmedCode}`);
    } else {
      const existingIdx = entityMappings.findIndex(
        e => e.ourEntityName.toLowerCase() === quickMapTarget.name.toLowerCase()
      );
      let updated: YardiEntityMapping[];
      if (existingIdx >= 0) {
        updated = [...entityMappings];
        updated[existingIdx] = {
          ...updated[existingIdx],
          yardiEntityCode: trimmedCode,
          yardiEntityName: `${quickMapTarget.name} (Mapped)`,
          fundCode: quickMapGlOrFund,
          status: 'Mapped'
        };
      } else {
        const newMap: YardiEntityMapping = {
          id: `e-map-${Date.now()}`,
          ourEntityName: quickMapTarget.name,
          ourEntityCode: quickMapTarget.originalCode || `PROP-${quickMapTarget.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase()}`,
          yardiEntityCode: trimmedCode,
          yardiEntityName: `${quickMapTarget.name} (Property)`,
          fundCode: quickMapGlOrFund,
          status: 'Mapped'
        };
        updated = [newMap, ...entityMappings];
      }
      setEntityMappings(updated);
      saveStoredEntityMappings(updated);
      setMappingNotification(`✓ Successfully mapped property/entity "${quickMapTarget.name}" → Yardi Code: ${trimmedCode}`);
    }

    setQuickMapTarget(null);
    setTimeout(() => {
      setMappingNotification(null);
    }, 4500);
  };

  // Handle row expansion
  const toggleRowExpand = (key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Toggle single item selection
  const handleToggleInvoice = (key: string) => {
    setSelectedInvoiceKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Toggle select all visible
  const isAllSelected = filteredInvoices.length > 0 && filteredInvoices.every(inv => selectedInvoiceKeys.has(`${inv.sourceRunId}_${inv.id}`));
  const isSomeSelected = filteredInvoices.some(inv => selectedInvoiceKeys.has(`${inv.sourceRunId}_${inv.id}`)) && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedInvoiceKeys(prev => {
        const next = new Set(prev);
        filteredInvoices.forEach(inv => next.delete(`${inv.sourceRunId}_${inv.id}`));
        return next;
      });
    } else {
      setSelectedInvoiceKeys(prev => {
        const next = new Set(prev);
        filteredInvoices.forEach(inv => next.add(`${inv.sourceRunId}_${inv.id}`));
        return next;
      });
    }
  };

  // Open rich invoice inspection
  const handleInspectInvoice = (inv: InvoiceBatchItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const matched: MatchedInvoice = {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceIdDisplay: inv.invoiceIdDisplay || '#150',
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
      paymentTerms: inv.paymentTerms,
      entity: inv.entity,
      payingEntity: inv.payingEntity,
      bankName: inv.bankName || inv.matchedBankName,
      paymentCurrency: inv.paymentCurrency || inv.currency,
      totalIncVat: inv.totalIncVat,
      totalExVat: inv.totalExVat,
      isApproved: inv.isApproved,
      isReconciled: true,
      checklist: inv.checklist,
      apportionment: inv.apportionment,
      richLineItems: inv.richLineItems
    };
    setInspectingInvoice(matched);
  };

  // Copy Preview
  const handleCopyPreview = () => {
    navigator.clipboard.writeText(generatedEtlContent);
    setIsCopiedFile(true);
    setTimeout(() => setIsCopiedFile(false), 2000);
  };

  // Submit Handler
  const handleCreateSubmit = (statusToSave: 'Ready' | 'Draft') => {
    if (selectedInvoices.length === 0) {
      alert('Please select at least one reconciled invoice for this batch.');
      return;
    }

    if (batchValidation.errorRecordsCount > 0 && statusToSave === 'Ready') {
      const missingVendorsList = (batchValidation.missingVendors || []).join(', ') || 'None';
      const missingEntitiesList = (batchValidation.missingEntities || []).join(', ') || 'None';
      const confirmProceed = confirm(
        `Warning: There are ${batchValidation.errorRecordsCount} record(s) with missing Yardi Vendor or Property Codes.\n\n` +
        `• Missing Vendors: ${missingVendorsList}\n` +
        `• Missing Entities: ${missingEntitiesList}\n\n` +
        `Do you want to auto-map missing codes now and generate the batch? Click OK to Auto-Map & Create, or Cancel to review mappings.`
      );
      if (confirmProceed) {
        handleAutoMapBatchMissing();
      } else {
        setIsMappingModalOpen(true);
        return;
      }
    }

    const newBatch: InvoiceBatch = {
      id: batchId,
      name: batchName.trim() || `Invoice_Batch_${new Date().toISOString().slice(0, 10)}`,
      format,
      status: statusToSave,
      invoiceIds: selectedInvoices.map(i => i.id),
      invoices: selectedInvoices,
      totalInvoicesCount: batchTotals.totalCount,
      totalAmount: batchTotals.totalAmount,
      arAmount: batchTotals.arAmount,
      apAmount: batchTotals.apAmount,
      currency: 'USD',
      createdBy: 'Dharmendra Joshi',
      createdAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      lastModified: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      postingDate,
      exportDestination: format === 'YARDI_VOYAGER_LOADER' ? 'Yardi Voyager PayScan GL Engine' : format === 'NETSUITE_INVOICE_SYNC' ? 'Oracle NetSuite AP/AR Feed' : format === 'SAP_AR_AP_FEED' ? 'SAP Financials AP/AR Feed' : 'Accounting File Importer',
      fileSize: `${Math.max(10, Math.round(generatedEtlContent.length / 1024))} KB`,
      notes
    };

    onCreateBatch(newBatch);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 p-5 bg-black/60 backdrop-blur-xs flex items-center justify-center animate-in fade-in duration-150 font-sans">
        {/* Full Modal Container */}
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col w-full h-full overflow-hidden">
          
          {/* TOP MODAL HEADER */}
          <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-100 text-[#EA580C] rounded-xl border border-orange-200 shadow-2xs">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-gray-900 tracking-tight uppercase">
                    INVOICE BATCH BUILDER & YARDI ETL ENGINE
                  </h2>
                  <span className="bg-orange-50 text-[#EA580C] border border-orange-200 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full font-mono">
                    Multi-Entity & Line-Item Split Ready
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Compile reconciled invoices into Yardi Voyager / PayScan loader feeds with granular GL account allocations and entity mappings.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* TOP CONFIGURATION STRIP */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0 text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                Batch Reference ID
              </label>
              <input
                type="text"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-[#EA580C] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                Batch Name / Description
              </label>
              <input
                type="text"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="e.g. Yardi_Invoice_Consolidated_Batch"
                className="w-full px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-[#EA580C] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                Target ERP & GL Feed Schema
              </label>
              <select
                value={format}
                onChange={(e) => {
                  const fmt = e.target.value as InvoiceETLFormat;
                  setFormat(fmt);
                  if (fmt === 'YARDI_VOYAGER_LOADER') setExportDestination('Yardi Voyager PayScan GL Engine');
                  else if (fmt === 'NETSUITE_INVOICE_SYNC') setExportDestination('Oracle NetSuite AP/AR Feed');
                  else if (fmt === 'SAP_AR_AP_FEED') setExportDestination('SAP S/4HANA Feed');
                }}
                className="w-full px-3 py-1.5 text-xs font-bold text-[#EA580C] bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-[#EA580C] focus:outline-hidden cursor-pointer"
              >
                <option value="YARDI_VOYAGER_LOADER">Yardi Voyager / PayScan (Granular GL Line Items)</option>
                <option value="NETSUITE_INVOICE_SYNC">Oracle NetSuite Multi-Line Journal Sync</option>
                <option value="SAP_AR_AP_FEED">SAP Financials AP/AR Feed</option>
                <option value="JSON_INVOICE_STREAM">JSON Stream (Developer Payload)</option>
                <option value="XML_PEPPOL_UBL">PEPPOL UBL 2.1 (Standard XML)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                GL Posting Date
              </label>
              <input
                type="date"
                value={postingDate}
                onChange={(e) => setPostingDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-[#EA580C] focus:outline-hidden"
              />
            </div>
          </div>

          {/* MAPPING WARNING BANNER (IF UNMAPPED COUNTERPARTIES EXIST) */}
          {batchValidation.errorRecordsCount > 0 && (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between shrink-0 animate-in slide-in-from-top-1">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="text-xs text-amber-900">
                  <strong>Mapping Alert:</strong> {batchValidation.errorRecordsCount} selected item(s) reference unmapped counterparties or legal entities.
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
                  onClick={handleAutoMapBatchMissing}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Map All Missing</span>
                </button>
                <button
                  onClick={() => setIsMappingModalOpen(true)}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-xs font-bold cursor-pointer transition-colors"
                >
                  Configure Manually &rarr;
                </button>
              </div>
            </div>
          )}

          {/* WORKSPACE NAVIGATION TABS */}
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
                <span>1. Select Reconciled Invoices</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-gray-200 text-gray-800">
                  {selectedInvoices.length} of {allReconciledInvoices.length}
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
            </div>

            {/* BATCH VALUE INDICATOR */}
            <div className="flex items-center gap-3 text-xs">
              <span className="text-gray-500 font-medium">Batch Total:</span>
              <span className="font-mono font-extrabold text-gray-900 text-sm">
                ${batchTotals.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </span>
            </div>
          </div>

          {/* MAIN BODY WORKSPACE */}
          <div className="flex-1 overflow-y-auto p-6 bg-[#F6F8FA]">
            
            {/* TAB 1: INVOICES SELECTION */}
            {activeTab === 'invoices' && (
              <div className="space-y-4">
                {/* PREVIOUS BATCH TOGGLE SWITCH & ACTIONS BAR */}
                <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                  {/* Left: Interactive Switch Toggle between Only New vs Previous Batch Invoices */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                      <span className={`text-xs font-semibold ${selectedSourceFilter === 'Fresh' ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
                        Only New Invoices ({freshInvoicesCount})
                      </span>

                      {/* Switch Toggle */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={selectedSourceFilter === 'Removed'}
                        onClick={() => setSelectedSourceFilter(prev => prev === 'Removed' ? 'Fresh' : 'Removed')}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-[#EA580C] focus:ring-offset-1 ${
                          selectedSourceFilter === 'Removed' ? 'bg-[#EA580C]' : 'bg-gray-300'
                        }`}
                        title={selectedSourceFilter === 'Removed' ? 'Switch to display only new invoices' : 'Toggle switch to display previous batch invoices'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                            selectedSourceFilter === 'Removed' ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>

                      <span className={`text-xs font-semibold ${selectedSourceFilter === 'Removed' ? 'text-amber-900 font-bold' : 'text-gray-500'}`}>
                        Previous Batch Invoices ({removedInvoicesCount})
                      </span>
                    </div>

                    <span className="text-[11px] text-gray-500">
                      Showing <strong className="text-gray-800">{filteredInvoices.length}</strong> {selectedSourceFilter === 'Removed' ? 'previous batch' : 'new'} invoices
                    </span>
                  </div>

                  {/* Right: Select / Deselect All Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {isAllSelected ? <CheckSquare className="w-3.5 h-3.5 text-[#EA580C]" /> : <Square className="w-3.5 h-3.5 text-gray-400" />}
                      <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
                    </button>
                  </div>
                </div>

                {/* INVOICES SELECTION TABLE */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse font-sans text-xs">
                      <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                          {/* Checkbox column */}
                          <th className="py-2.5 px-3 w-10 text-center">
                            <button
                              type="button"
                              onClick={handleToggleSelectAll}
                              className="text-gray-500 hover:text-[#EA580C] cursor-pointer inline-flex items-center justify-center"
                              title="Select / Deselect All Filtered"
                            >
                              {isAllSelected ? (
                                <CheckSquare className="w-3.5 h-3.5 text-[#EA580C]" />
                              ) : isSomeSelected ? (
                                <div className="w-3.5 h-3.5 bg-orange-100 border border-[#EA580C] rounded-xs flex items-center justify-center">
                                  <div className="w-2 h-0.5 bg-[#EA580C]" />
                                </div>
                              ) : (
                                <Square className="w-3.5 h-3.5 text-gray-300" />
                              )}
                            </button>
                          </th>

                          {/* INVOICE NUMBER & ID */}
                          <th 
                            onClick={() => handleHeaderSort('invoiceNumber')}
                            className="py-2.5 px-3 min-w-[150px] cursor-pointer hover:bg-gray-100/80 select-none transition-colors"
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

                          {/* ENTITY & VENDOR WITH YARDI MAPPING BADGE */}
                          <th 
                            onClick={() => handleHeaderSort('entityName')}
                            className="py-2.5 px-3 min-w-[240px] cursor-pointer hover:bg-gray-100/80 select-none transition-colors"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Vendor & Target Property (Yardi Codes)</span>
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
                            className="py-2.5 px-3 min-w-[130px] cursor-pointer hover:bg-gray-100/80 select-none transition-colors"
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

                          {/* CURRENCY COLUMN */}
                          <th 
                            onClick={() => handleHeaderSort('currency')}
                            className="py-2.5 px-3 min-w-[80px] cursor-pointer hover:bg-gray-100/80 select-none transition-colors"
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

                          {/* GROSS AMOUNT */}
                          <th 
                            onClick={() => handleHeaderSort('amount')}
                            className="py-2.5 px-3 text-right min-w-[120px] cursor-pointer hover:bg-gray-100/80 select-none transition-colors"
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

                          {/* BATCH SOURCE COLUMN */}
                          <th 
                            onClick={() => handleHeaderSort('removedFromBatchId')}
                            className="py-2.5 px-3 min-w-[140px] cursor-pointer hover:bg-gray-100/80 select-none transition-colors"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Batch Source</span>
                              {sortField === 'removedFromBatchId' ? (
                                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />
                              )}
                            </div>
                          </th>

                          {/* STATUS & ACTIONS */}
                          <th className="py-2.5 px-3 text-center min-w-[100px]">
                            Actions & Details
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredInvoices.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-12 text-center text-gray-500">
                              <Receipt className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                              <div className="font-semibold text-gray-700">
                                {selectedSourceFilter === 'Removed'
                                  ? 'No previous batch invoices found for re-batching'
                                  : 'No new unbatched reconciled invoices found'}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {selectedSourceFilter === 'Removed'
                                  ? 'Invoices removed from previous batches will appear here'
                                  : 'Toggle the switch above to view previous batch invoices'}
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredInvoices.map((inv) => {
                            const key = `${inv.sourceRunId}_${inv.id}`;
                            const isSelected = selectedInvoiceKeys.has(key);
                            const isExpanded = expandedRows.has(key);
                            const isCrossCurrency = inv.currency && inv.currency !== 'USD';
                            const entitySplits = computeEntitySplits(inv);
                            const hasMultipleSplits = entitySplits.length > 1;
                            const richLinesCount = inv.richLineItems?.length || 0;

                            // Look up mappings
                            const vMap = findVendorMapping(inv.entityName, vendorMappings);
                            const primaryEntityName = inv.payingEntity || inv.entity || (inv.apportionment && inv.apportionment[0]?.entity) || 'Novus Property SPV';
                            const eMap = findEntityMapping(primaryEntityName, entityMappings);

                            const isVndMapped = !!(vMap && vMap.yardiVendorCode && vMap.status === 'Mapped');
                            const isEntMapped = !!(eMap && eMap.yardiEntityCode && eMap.status === 'Mapped');

                            return (
                              <React.Fragment key={key}>
                                <tr
                                  onClick={() => handleToggleInvoice(key)}
                                  className={`hover:bg-orange-50/40 cursor-pointer transition-colors ${
                                    isSelected ? 'bg-orange-50/25 font-medium' : ''
                                  } ${!isVndMapped || !isEntMapped ? 'bg-amber-50/20' : ''}`}
                                >
                                  {/* CHECKBOX */}
                                  <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleInvoice(key)}
                                      className="text-gray-500 hover:text-[#EA580C] cursor-pointer inline-flex items-center justify-center"
                                    >
                                      {isSelected ? (
                                        <CheckSquare className="w-4 h-4 text-[#EA580C]" />
                                      ) : (
                                        <Square className="w-4 h-4 text-gray-300" />
                                      )}
                                    </button>
                                  </td>

                                  {/* INVOICE NUMBER */}
                                  <td className="py-2.5 px-3 font-mono text-xs whitespace-nowrap">
                                    <div className="flex items-center gap-1.5 font-bold text-gray-900">
                                      <span>{inv.invoiceNumber}</span>
                                      {inv.invoiceIdDisplay && (
                                        <span className="px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded text-[9px]">
                                          {inv.invoiceIdDisplay}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-gray-500 font-sans mt-0.5">
                                      {inv.expensesType || inv.category || 'OPEX'}
                                    </div>
                                  </td>

                                  {/* VENDOR & ENTITY WITH YARDI MAPPING PILLS */}
                                  <td className="py-2.5 px-3 text-xs">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border shrink-0 ${
                                        inv.type === 'AP' 
                                          ? 'bg-amber-50 text-amber-800 border-amber-200' 
                                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      }`}>
                                        {inv.type}
                                      </span>
                                      <span className="font-bold text-gray-900 truncate max-w-[190px]">
                                        {inv.entityName}
                                      </span>
                                    </div>

                                    {/* MAPPING BADGES */}
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                      {/* Vendor Code */}
                                      {isVndMapped ? (
                                        <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded font-mono text-[9px] font-bold inline-flex items-center gap-1" title={`Yardi PayScan Vendor Code: ${vMap?.yardiVendorCode}`}>
                                          <span>Yd: {vMap?.yardiVendorCode}</span>
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenQuickMap('vendor', inv.entityName, inv.vendorCode);
                                          }}
                                          className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-900 border border-amber-300 rounded font-mono text-[9px] font-bold inline-flex items-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
                                          title="Vendor is not mapped to Yardi PayScan. Click to map this vendor."
                                        >
                                          <Plus className="w-2.5 h-2.5 text-amber-700 group-hover:scale-110 transition-transform" />
                                          <span>Map Vendor</span>
                                        </button>
                                      )}

                                      {/* Entity Code */}
                                      {hasMultipleSplits ? (
                                        <span className="bg-purple-50 text-purple-700 text-[9px] font-bold px-1.5 py-0.2 rounded border border-purple-200 inline-flex items-center gap-1">
                                          <Building2 className="w-2.5 h-2.5 text-purple-600" />
                                          <span>Split ({entitySplits.length} Properties)</span>
                                        </span>
                                      ) : isEntMapped ? (
                                        <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-mono text-[9px] font-bold inline-flex items-center gap-1" title={`Yardi Property Code: ${eMap?.yardiEntityCode}`}>
                                          <span>Prop: {eMap?.yardiEntityCode}</span>
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenQuickMap('entity', primaryEntityName, inv.propertyCode);
                                          }}
                                          className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-900 border border-amber-300 rounded font-mono text-[9px] font-bold inline-flex items-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
                                          title="Property/Entity is not mapped to Yardi Voyager. Click to map this entity."
                                        >
                                          <Plus className="w-2.5 h-2.5 text-amber-700 group-hover:scale-110 transition-transform" />
                                          <span>Map Entity</span>
                                        </button>
                                      )}

                                      {richLinesCount > 0 && (
                                        <span className="px-1.5 py-0.2 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[9px] font-mono">
                                          {richLinesCount} lines
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
                                  </td>

                                  {/* ORIGINAL AMOUNT */}
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900 whitespace-nowrap text-xs">
                                    <div>{formatCurrency(inv.amount, inv.currency)}</div>
                                    {isCrossCurrency && (
                                      <span className="text-[10px] text-orange-600 font-sans font-semibold">
                                        FX @ {inv.exchangeRate?.toFixed(4) || '1.0000'}
                                      </span>
                                    )}
                                  </td>

                                  {/* BATCH SOURCE COLUMN CELL */}
                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                    {inv.removedFromBatchId ? (
                                      <div 
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-300 rounded-md font-mono text-[11px] font-bold shadow-2xs" 
                                        title={`Removed from previous batch: ${inv.removedFromBatchId}`}
                                      >
                                        <RotateCcw className="w-3 h-3 text-amber-600 shrink-0" />
                                        <span>{inv.removedFromBatchId}</span>
                                      </div>
                                    ) : (
                                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-[11px] font-semibold shadow-2xs">
                                        <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                                        <span>New Invoice</span>
                                      </div>
                                    )}
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

                                      <button
                                        type="button"
                                        onClick={(e) => toggleRowExpand(key, e)}
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

                                {/* EXPANDED DETAILS */}
                                {isExpanded && (
                                  <tr className="bg-[#FFF8F3] border-b-2 border-orange-200/80">
                                    <td colSpan={9} className="p-4 pl-10">
                                      <div className="bg-white border border-orange-200/90 rounded-xl p-4 shadow-xs space-y-3.5 ring-1 ring-orange-100/80">
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 pb-2.5">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <Receipt className="w-4 h-4 text-[#EA580C]" />
                                            <span className="text-xs font-bold text-gray-900">
                                              {inv.invoiceIdDisplay ? `${inv.invoiceIdDisplay} | ` : ''}{inv.invoiceNumber}
                                            </span>
                                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                                              Reconciliation Approved ✓
                                            </span>
                                            {hasMultipleSplits && (
                                              <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-200">
                                                Apportioned to {entitySplits.length} Property Accounts
                                              </span>
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={(e) => handleInspectInvoice(inv, e)}
                                            className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1 cursor-pointer"
                                          >
                                            <span>Open Full Invoice Modal</span>
                                            <ExternalLink className="w-3 h-3" />
                                          </button>
                                        </div>

                                        {/* Multi-Entity Breakdown */}
                                        <div className="border border-purple-200 rounded-lg p-3 bg-purple-50/30">
                                          <div className="text-xs font-bold text-purple-950 mb-2 flex items-center gap-1.5">
                                            <Building2 className="w-3.5 h-3.5 text-purple-700" />
                                            Entity & Property Allocations
                                          </div>
                                          <div className="bg-white rounded border border-purple-100 overflow-hidden">
                                            <table className="w-full text-left text-xs border-collapse">
                                              <thead>
                                                <tr className="bg-purple-100/60 text-purple-950 font-bold text-[10px] uppercase">
                                                  <th className="py-1.5 px-3">Property / Entity</th>
                                                  <th className="py-1.5 px-3">Yardi Property Code</th>
                                                  <th className="py-1.5 px-3 text-right">Split %</th>
                                                  <th className="py-1.5 px-3 text-right">Allocated Amount</th>
                                                  <th className="py-1.5 px-3">GL Codes</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-purple-50">
                                                {entitySplits.map((sp, sIdx) => {
                                                  const mappedProperty = findEntityMapping(sp.entityName, entityMappings);
                                                  return (
                                                    <tr key={sIdx} className="hover:bg-purple-50/40">
                                                      <td className="py-1.5 px-3 font-semibold text-gray-900">
                                                        {sp.entityName}
                                                      </td>
                                                      <td className="py-1.5 px-3 font-mono text-gray-700">
                                                        {mappedProperty?.yardiEntityCode ? (
                                                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded font-bold text-[10px]">
                                                            {mappedProperty.yardiEntityCode}
                                                          </span>
                                                        ) : (
                                                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded font-bold text-[10px]">
                                                            Unmapped
                                                          </span>
                                                        )}
                                                      </td>
                                                      <td className="py-1.5 px-3 text-right font-mono font-bold text-purple-900">
                                                        {sp.percent.toFixed(2)}%
                                                      </td>
                                                      <td className="py-1.5 px-3 text-right font-mono font-bold text-gray-900">
                                                        {formatCurrency(sp.grossAmount, inv.currency)}
                                                      </td>
                                                      <td className="py-1.5 px-3">
                                                        <div className="flex flex-wrap gap-1 font-mono text-[10px] text-gray-700">
                                                          {sp.glCodes.join(', ') || 'GL-6000 OPEX'}
                                                        </div>
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                              </tbody>
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
                batchName={batchName}
                batchId={batchId}
              />
            )}
          </div>

          {/* BOTTOM ACTION FOOTER */}
          <div className="px-6 py-3.5 bg-white border-t border-gray-200 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-3">
              {activeTab === 'invoices' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('loader')}
                  className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>Preview & Edit Loader File</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('invoices')}
                  className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Invoices Selection</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleCreateSubmit('Draft')}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Save as Draft
              </button>

              <button
                type="button"
                disabled={selectedInvoices.length === 0}
                onClick={() => handleCreateSubmit('Ready')}
                className={`px-5 py-2 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-xs transition-colors cursor-pointer ${
                  selectedInvoices.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[#EA580C] hover:bg-[#D94E07] active:bg-[#C2410C]'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Create & Export Batch ({etlRecords.length} GL Rows)</span>
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

      {/* QUICK MAP VENDOR / ENTITY DIALOG MODAL */}
      {quickMapTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {quickMapTarget.type === 'vendor' ? (
                  <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                    <Users2 className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                    <Building2 className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {quickMapTarget.type === 'vendor' ? 'Map Vendor to Yardi PayScan' : 'Map Property / Entity to Yardi'}
                  </h3>
                  <p className="text-xs text-gray-500">Assign GL account & code mapping for export</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickMapTarget(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  {quickMapTarget.type === 'vendor' ? 'Source Vendor Name' : 'Source Property / Entity Name'}
                </label>
                <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg font-bold text-gray-900 flex items-center justify-between">
                  <span className="truncate">{quickMapTarget.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-900 font-mono rounded font-semibold">
                    Unmapped
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-gray-700">
                    {quickMapTarget.type === 'vendor' ? 'Target Yardi Vendor Code *' : 'Target Yardi Property Code *'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const auto = quickMapTarget.type === 'vendor'
                        ? generateAutoYardiVendorCode(quickMapTarget.name)
                        : generateAutoYardiEntityCode(quickMapTarget.name);
                      setQuickMapYardiCode(auto);
                    }}
                    className="text-[11px] text-[#EA580C] hover:text-[#D94E07] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-Suggest</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={quickMapYardiCode}
                  onChange={(e) => setQuickMapYardiCode(e.target.value.toUpperCase())}
                  placeholder={quickMapTarget.type === 'vendor' ? 'e.g. AWS_PAYSCAN' : 'e.g. PROP_101CAL'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono font-bold text-gray-900 focus:ring-2 focus:ring-[#EA580C] focus:border-transparent outline-none uppercase"
                  autoFocus
                />
              </div>

              {quickMapTarget.type === 'vendor' ? (
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Default GL Account / Ledger
                  </label>
                  <select
                    value={quickMapGlOrFund}
                    onChange={(e) => setQuickMapGlOrFund(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#EA580C] outline-none font-medium text-gray-800 cursor-pointer"
                  >
                    <option value="GL-6000 OPEX">GL-6000 - Operating Expenses (OPEX)</option>
                    <option value="GL-6100 IT & SaaS">GL-6100 - IT, Cloud Infrastructure & SaaS</option>
                    <option value="GL-6200 Utilities">GL-6200 - Utilities & Energy</option>
                    <option value="GL-6300 Facilities">GL-6300 - Facilities & Building Maintenance</option>
                    <option value="GL-6400 Legal & Professional">GL-6400 - Legal & Professional Advisory</option>
                    <option value="GL-1500 CAPEX Equipment">GL-1500 - Capital Expenditure (CAPEX)</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Fund Code / Division
                  </label>
                  <select
                    value={quickMapGlOrFund}
                    onChange={(e) => setQuickMapGlOrFund(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#EA580C] outline-none font-medium text-gray-800 cursor-pointer"
                  >
                    <option value="FUND-01">FUND-01 (Primary Real Estate Fund)</option>
                    <option value="FUND-02">FUND-02 (Opportunity Real Estate Fund)</option>
                    <option value="FUND-03">FUND-03 (Core Income Trust)</option>
                    <option value="GLOBAL-SPV">GLOBAL-SPV (Corporate Operating SPV)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setQuickMapTarget(null)}
                className="px-3.5 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!quickMapYardiCode.trim()}
                onClick={handleApplyQuickMap}
                className="px-4 py-2 bg-[#EA580C] hover:bg-[#D94E07] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Save & Apply Mapping</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {mappingNotification && (
        <div className="fixed bottom-6 right-6 z-70 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-gray-700 flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{mappingNotification}</span>
        </div>
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
