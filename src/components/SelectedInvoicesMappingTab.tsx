import React, { useState, useMemo } from 'react';
import {
  Building2,
  Users2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layers,
  Search,
  ArrowRight,
  ArrowLeft,
  Edit2,
  Check,
  X,
  RefreshCw,
  Info,
  ShieldCheck,
  FileSpreadsheet,
  DollarSign,
  Filter,
  ExternalLink,
  ChevronDown,
  RotateCcw,
  LayoutGrid,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit3,
  Calendar,
  Eye
} from 'lucide-react';
import { InvoiceBatchItem } from '../types/reconciliation';
import {
  YardiVendorMapping,
  YardiEntityMapping,
  BatchMappingValidationResult,
  YardiEtlRecord,
  EtlRecordOverride
} from '../types/yardiMapping';
import {
  findVendorMapping,
  findEntityMapping,
  generateAutoYardiVendorCode,
  generateAutoYardiEntityCode,
  saveStoredVendorMappings,
  saveStoredEntityMappings,
  resetToDefaultEntityMappings,
  resetToDefaultVendorMappings
} from '../utils/yardiMapping';
import { generateInvoiceEtlRecords } from '../utils/yardiEtlEngine';
import { formatCurrency } from '../utils/formatters';

interface UniqueEntitySummary {
  name: string;
  code: string;
  invoicesCount: number;
  totalAmount: number;
  currency: string;
  mappedPropertyCode?: string;
  isMapped: boolean;
  mappingId?: string;
}

interface UniqueVendorSummary {
  name: string;
  code: string;
  invoicesCount: number;
  totalAmount: number;
  currency: string;
  mappedVendorCode?: string;
  mappedGl?: string;
  isMapped: boolean;
  mappingId?: string;
}

const GL_ACCOUNTS_OPEX = [
  { code: 'GL-6000 OPEX', name: 'General Operating Expenses' },
  { code: 'GL-6100 ESG', name: 'ESG & Advisory Services' },
  { code: 'GL-6200 LEG', name: 'Legal & Compliance' },
  { code: 'GL-6300 AUD', name: 'Audit & Accounting' },
  { code: 'GL-6400 IT', name: 'IT & Software Licences' },
  { code: 'GL-6500 MKT', name: 'Marketing & PR' },
  { code: 'GL-6900 ADM', name: 'Corporate Administration' },
  { code: 'GL-7200 VAL', name: 'Property & Asset Valuation' },
  { code: 'GL-7400 TAX', name: 'Tax Advisory & Filing' },
  { code: 'GL-2000 AP', name: 'Accounts Payable Clearing' }
];

export type GlSortField =
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

interface SelectedInvoicesMappingTabProps {
  selectedInvoices: InvoiceBatchItem[];
  vendorMappings: YardiVendorMapping[];
  entityMappings: YardiEntityMapping[];
  onUpdateVendorMappings: (mappings: YardiVendorMapping[]) => void;
  onUpdateEntityMappings: (mappings: YardiEntityMapping[]) => void;
  onOpenQuickMap: (type: 'vendor' | 'entity', name: string, originalCode?: string) => void;
  onOpenMappingManager: (initialTab?: 'vendors' | 'entities') => void;
  onProceedToStep3: () => void;
  onBackToStep1: () => void;
  onInspectInvoice: (invoice: InvoiceBatchItem) => void;
  batchTotals: {
    count: number;
    totalAmount: number;
  };
  etlRecords?: YardiEtlRecord[];
  recordOverrides?: Record<string, Partial<EtlRecordOverride>>;
  onUpdateRecordOverride?: (recordId: string, override: Partial<EtlRecordOverride>) => void;
  onApplyNoteToInvoice?: (invoiceId: string, note: string) => void;
  onResetOverrides?: () => void;
  batchId?: string;
  batchName?: string;
}

export const SelectedInvoicesMappingTab: React.FC<SelectedInvoicesMappingTabProps> = ({
  selectedInvoices,
  vendorMappings,
  entityMappings,
  onUpdateVendorMappings,
  onUpdateEntityMappings,
  onOpenQuickMap,
  onOpenMappingManager,
  onProceedToStep3,
  onBackToStep1,
  onInspectInvoice,
  batchTotals,
  etlRecords: propEtlRecords,
  recordOverrides,
  onUpdateRecordOverride,
  onApplyNoteToInvoice,
  onResetOverrides,
  batchId,
  batchName
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'needs_mapping' | 'fully_mapped'>('all');
  const [activeSubView, setActiveSubView] = useState<'gl_view' | 'entity_summary' | 'vendor_summary'>('gl_view');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<'All' | 'Fresh' | 'Removed'>('All');
  const [hideMappedInvoices, setHideMappedInvoices] = useState<boolean>(false);

  // Sorting state for GL View table
  const [glSortField, setGlSortField] = useState<GlSortField>('invoiceNumber');
  const [glSortOrder, setGlSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleGlHeaderSort = (field: GlSortField) => {
    if (glSortField === field) {
      setGlSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setGlSortField(field);
      setGlSortOrder('asc');
    }
  };

  // Internal overrides fallback
  const [internalRecordOverrides, setInternalRecordOverrides] = useState<Record<string, Partial<EtlRecordOverride>>>({});
  const activeOverrides = recordOverrides || internalRecordOverrides;

  const handleUpdateOverride = onUpdateRecordOverride || ((recordId: string, override: Partial<EtlRecordOverride>) => {
    setInternalRecordOverrides(prev => ({
      ...prev,
      [recordId]: {
        ...(prev[recordId] || {}),
        ...override
      }
    }));
  });

  // Inline editing state for an entity or vendor code directly in this tab
  const [editingTarget, setEditingTarget] = useState<{
    type: 'entity' | 'vendor' | 'gl';
    id: string;
    originalName: string;
    currentCode: string;
  } | null>(null);
  const [tempEditCode, setTempEditCode] = useState('');
  const [autoMapFeedback, setAutoMapFeedback] = useState<string | null>(null);

  // Inline editing state for Client Reference and Due Date in GL table
  const [editingGlFieldId, setEditingGlFieldId] = useState<{
    id: string;
    field: 'clientReference' | 'dueDate';
  } | null>(null);
  const [tempGlFieldValue, setTempGlFieldValue] = useState('');

  const handleStartEditGlField = (record: YardiEtlRecord, field: 'clientReference' | 'dueDate') => {
    setEditingGlFieldId({ id: record.id, field });
    if (field === 'clientReference') setTempGlFieldValue(record.clientReference || '');
    if (field === 'dueDate') setTempGlFieldValue(record.dueDate || '');
  };

  const handleSaveGlField = (record: YardiEtlRecord) => {
    if (!editingGlFieldId) return;
    if (editingGlFieldId.field === 'clientReference') {
      handleUpdateOverride(record.id, { clientReference: tempGlFieldValue });
    } else if (editingGlFieldId.field === 'dueDate') {
      handleUpdateOverride(record.id, { dueDate: tempGlFieldValue });
    }
    setEditingGlFieldId(null);
  };

  // Inline editing state for Notes/Memo in GL table
  const [editingGlNoteId, setEditingGlNoteId] = useState<string | null>(null);
  const [tempGlNoteText, setTempGlNoteText] = useState('');

  const handleStartEditGlNote = (record: YardiEtlRecord) => {
    setEditingGlNoteId(record.id);
    setTempGlNoteText(record.notes || '');
  };

  const handleSaveGlNote = (record: YardiEtlRecord, applyToAll = false) => {
    if (applyToAll && onApplyNoteToInvoice) {
      onApplyNoteToInvoice(record.invoiceId, tempGlNoteText);
    } else {
      handleUpdateOverride(record.id, { notes: tempGlNoteText });
    }
    setEditingGlNoteId(null);
  };

  // Extract unique entities and vendors present in the selected invoices
  const uniqueEntities = useMemo(() => {
    const map = new Map<string, UniqueEntitySummary>();

    selectedInvoices.forEach(inv => {
      const entityName = inv.payingEntityName || inv.entityName || 'General Corporate Entity';
      const current: UniqueEntitySummary = map.get(entityName) || {
        name: entityName,
        code: inv.sourceEntityCode || 'ENT-01',
        invoicesCount: 0,
        totalAmount: 0,
        currency: inv.currency,
        isMapped: false
      };

      current.invoicesCount += 1;
      current.totalAmount += inv.amount;

      const mapping = findEntityMapping(entityName, entityMappings);
      if (mapping && mapping.status === 'Mapped' && mapping.yardiEntityCode.trim()) {
        current.mappedPropertyCode = mapping.yardiEntityCode;
        current.isMapped = true;
        current.mappingId = mapping.id;
      } else {
        current.mappedPropertyCode = undefined;
        current.isMapped = false;
        current.mappingId = mapping?.id;
      }

      map.set(entityName, current);
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedInvoices, entityMappings]);

  const uniqueVendors = useMemo(() => {
    const map = new Map<string, UniqueVendorSummary>();

    selectedInvoices.forEach(inv => {
      const vendorName = inv.vendorName || inv.entityName || 'Vendor Payee';
      const current: UniqueVendorSummary = map.get(vendorName) || {
        name: vendorName,
        code: inv.id,
        invoicesCount: 0,
        totalAmount: 0,
        currency: inv.currency,
        isMapped: false
      };

      current.invoicesCount += 1;
      current.totalAmount += inv.amount;

      const mapping = findVendorMapping(vendorName, vendorMappings);
      if (mapping && mapping.status === 'Mapped' && mapping.yardiVendorCode.trim()) {
        current.mappedVendorCode = mapping.yardiVendorCode;
        current.mappedGl = mapping.defaultGlAccount;
        current.isMapped = true;
        current.mappingId = mapping.id;
      } else {
        current.mappedVendorCode = undefined;
        current.mappedGl = undefined;
        current.isMapped = false;
        current.mappingId = mapping?.id;
      }

      map.set(vendorName, current);
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedInvoices, vendorMappings]);

  // Overall mapping counts
  const totalEntitiesCount = uniqueEntities.length;
  const mappedEntitiesCount = uniqueEntities.filter(e => e.isMapped).length;
  const unmappedEntitiesCount = totalEntitiesCount - mappedEntitiesCount;

  const totalVendorsCount = uniqueVendors.length;
  const mappedVendorsCount = uniqueVendors.filter(v => v.isMapped).length;
  const unmappedVendorsCount = totalVendorsCount - mappedVendorsCount;

  const allMapped = unmappedEntitiesCount === 0 && unmappedVendorsCount === 0;

  // Invoice-level mapping validation list
  const invoiceMappingRows = useMemo(() => {
    return selectedInvoices.map(inv => {
      const entityName = inv.payingEntityName || inv.entityName || 'General Corporate Entity';
      const vendorName = inv.vendorName || inv.entityName || 'Vendor Payee';
      
      const entityMap = findEntityMapping(entityName, entityMappings);
      const isEntityMapped = Boolean(entityMap && entityMap.status === 'Mapped' && entityMap.yardiEntityCode.trim());

      const vendorMap = findVendorMapping(vendorName, vendorMappings);
      const isVendorMapped = Boolean(vendorMap && vendorMap.status === 'Mapped' && vendorMap.yardiVendorCode.trim());

      const isFullyMapped = isEntityMapped && isVendorMapped;

      return {
        invoice: inv,
        entityName,
        vendorName,
        entityMap,
        vendorMap,
        isEntityMapped,
        isVendorMapped,
        isFullyMapped,
        yardiPropertyCode: entityMap?.yardiEntityCode || '',
        yardiVendorCode: vendorMap?.yardiVendorCode || '',
        defaultGlAccount: vendorMap?.defaultGlAccount || 'GL-6000 OPEX'
      };
    });
  }, [selectedInvoices, entityMappings, vendorMappings]);

  // Invoice-level mapping counts
  const mappedInvoicesCount = useMemo(() => {
    return invoiceMappingRows.filter(r => r.isFullyMapped).length;
  }, [invoiceMappingRows]);

  const freshInvoicesCount = useMemo(() => {
    return selectedInvoices.filter(i => !i.removedFromBatchId).length;
  }, [selectedInvoices]);

  const removedInvoicesCount = useMemo(() => {
    return selectedInvoices.filter(i => Boolean(i.removedFromBatchId)).length;
  }, [selectedInvoices]);

  // Derived ETL Records from props or generated on the fly
  const activeEtlRecords = useMemo(() => {
    if (propEtlRecords && propEtlRecords.length > 0) {
      return propEtlRecords;
    }
    return generateInvoiceEtlRecords(
      selectedInvoices,
      batchId || 'BATCH-001',
      vendorMappings,
      entityMappings,
      activeOverrides as any
    );
  }, [propEtlRecords, selectedInvoices, batchId, vendorMappings, entityMappings, activeOverrides]);

  // Filtered ETL Records for GL View
  const filteredEtlRecords = useMemo(() => {
    return activeEtlRecords.filter(r => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          r.invoiceNumber.toLowerCase().includes(q) ||
          (r.invoiceDisplayId && r.invoiceDisplayId.toLowerCase().includes(q)) ||
          (r.clientReference && r.clientReference.toLowerCase().includes(q)) ||
          (r.sourceEntityName && r.sourceEntityName.toLowerCase().includes(q)) ||
          (r.payingEntityName && r.payingEntityName.toLowerCase().includes(q)) ||
          (r.ourEntityName && r.ourEntityName.toLowerCase().includes(q)) ||
          (r.yardiEntityCode && r.yardiEntityCode.toLowerCase().includes(q)) ||
          (r.payingBankName && r.payingBankName.toLowerCase().includes(q)) ||
          (r.ourVendorName && r.ourVendorName.toLowerCase().includes(q)) ||
          (r.yardiVendorCode && r.yardiVendorCode.toLowerCase().includes(q)) ||
          (r.beneficiaryName && r.beneficiaryName.toLowerCase().includes(q)) ||
          (r.beneficiaryBankBic && r.beneficiaryBankBic.toLowerCase().includes(q)) ||
          (r.beneficiaryBankName && r.beneficiaryBankName.toLowerCase().includes(q)) ||
          r.glCode.toLowerCase().includes(q) ||
          r.notes.toLowerCase().includes(q) ||
          (r.removedFromBatchId && r.removedFromBatchId.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      // 2. Source Filter (Fresh vs Removed/Previous Batch)
      if (selectedSourceFilter === 'Fresh') {
        if (r.removedFromBatchId) return false;
      } else if (selectedSourceFilter === 'Removed') {
        if (!r.removedFromBatchId) return false;
      }

      // 3. Hide Mapped Invoices
      if (hideMappedInvoices) {
        if (r.isEntityMapped && r.isVendorMapped && !r.hasMappingError) {
          return false;
        }
      }

      // 4. Mapping Status Filter
      if (filterStatus === 'needs_mapping') {
        if (r.isEntityMapped && r.isVendorMapped && !r.hasMappingError) return false;
      } else if (filterStatus === 'fully_mapped') {
        if (!r.isEntityMapped || !r.isVendorMapped || r.hasMappingError) return false;
      }

      return true;
    });
  }, [activeEtlRecords, searchQuery, selectedSourceFilter, hideMappedInvoices, filterStatus]);

  // Sorted ETL Records for GL View
  const sortedEtlRecords = useMemo(() => {
    return [...filteredEtlRecords].sort((a, b) => {
      let comparison = 0;
      switch (glSortField) {
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
      return glSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredEtlRecords, glSortField, glSortOrder]);


  // Filtered rows for table view
  const filteredInvoiceRows = useMemo(() => {
    return invoiceMappingRows.filter(row => {
      // Source filter (Only New vs Previous Batch)
      if (selectedSourceFilter === 'Fresh' && row.invoice.removedFromBatchId) return false;
      if (selectedSourceFilter === 'Removed' && !row.invoice.removedFromBatchId) return false;

      // Hide mapped invoices switch
      if (hideMappedInvoices && row.isFullyMapped) return false;

      // Filter status
      if (filterStatus === 'needs_mapping' && row.isFullyMapped) return false;
      if (filterStatus === 'fully_mapped' && !row.isFullyMapped) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchInv = row.invoice.invoiceNumber?.toLowerCase().includes(q) ||
          row.invoice.displayId?.toLowerCase().includes(q) ||
          row.invoice.clientReference?.toLowerCase().includes(q);
        const matchEntity = row.entityName.toLowerCase().includes(q) ||
          row.yardiPropertyCode.toLowerCase().includes(q);
        const matchVendor = row.vendorName.toLowerCase().includes(q) ||
          row.yardiVendorCode.toLowerCase().includes(q);

        if (!matchInv && !matchEntity && !matchVendor) return false;
      }

      return true;
    });
  }, [invoiceMappingRows, selectedSourceFilter, hideMappedInvoices, filterStatus, searchQuery]);

  // Filtered entities and vendors for summary view
  const filteredUniqueEntities = useMemo(() => {
    return uniqueEntities.filter(ent => {
      if (hideMappedInvoices && ent.isMapped) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = ent.name.toLowerCase().includes(q);
        const matchCode = (ent.mappedPropertyCode || '').toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      return true;
    });
  }, [uniqueEntities, hideMappedInvoices, searchQuery]);

  const filteredUniqueVendors = useMemo(() => {
    return uniqueVendors.filter(vnd => {
      if (hideMappedInvoices && vnd.isMapped) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = vnd.name.toLowerCase().includes(q);
        const matchCode = (vnd.mappedVendorCode || '').toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      return true;
    });
  }, [uniqueVendors, hideMappedInvoices, searchQuery]);

  // Handle Auto-Suggest Mappings for all unmapped items in the selected batch
  const handleAutoSuggestAll = () => {
    let newEntities = [...entityMappings];
    let newVendors = [...vendorMappings];
    let entitiesAdded = 0;
    let vendorsAdded = 0;

    // Auto map unmapped entities
    uniqueEntities.forEach(ent => {
      if (!ent.isMapped) {
        const autoCode = generateAutoYardiEntityCode(ent.name);
        const existingIdx = newEntities.findIndex(e => e.ourEntityName.toLowerCase() === ent.name.toLowerCase());
        
        if (existingIdx >= 0) {
          newEntities[existingIdx] = {
            ...newEntities[existingIdx],
            yardiEntityCode: autoCode,
            status: 'Mapped'
          };
        } else {
          newEntities.push({
            id: 'ent_auto_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            ourEntityCode: ent.code || 'ENT',
            ourEntityName: ent.name,
            yardiEntityCode: autoCode,
            yardiEntityName: ent.name + ' Book',
            status: 'Mapped',
            isCustom: true
          });
        }
        entitiesAdded++;
      }
    });

    // Auto map unmapped vendors
    uniqueVendors.forEach(vnd => {
      if (!vnd.isMapped) {
        const autoCode = generateAutoYardiVendorCode(vnd.name);
        const existingIdx = newVendors.findIndex(v => v.ourVendorName.toLowerCase() === vnd.name.toLowerCase());
        
        if (existingIdx >= 0) {
          newVendors[existingIdx] = {
            ...newVendors[existingIdx],
            yardiVendorCode: autoCode,
            status: 'Mapped'
          };
        } else {
          newVendors.push({
            id: 'vnd_auto_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            ourVendorCode: 'VND',
            ourVendorName: vnd.name,
            yardiVendorCode: autoCode,
            yardiVendorName: vnd.name + ' PayScan',
            defaultGlAccount: 'GL-6000 OPEX',
            status: 'Mapped',
            isCustom: true
          });
        }
        vendorsAdded++;
      }
    });

    if (entitiesAdded > 0 || vendorsAdded > 0) {
      onUpdateEntityMappings(newEntities);
      onUpdateVendorMappings(newVendors);
      saveStoredEntityMappings(newEntities);
      saveStoredVendorMappings(newVendors);

      setAutoMapFeedback(`✨ Successfully auto-mapped ${entitiesAdded} property/entity codes and ${vendorsAdded} vendor PayScan codes!`);
      setTimeout(() => setAutoMapFeedback(null), 5000);
    } else {
      setAutoMapFeedback('All properties and vendors in this selected batch are already mapped!');
      setTimeout(() => setAutoMapFeedback(null), 4000);
    }
  };

  // Direct inline quick-save for an entity property code
  const handleSaveInlineEntity = (entityName: string, newCode: string) => {
    if (!newCode.trim()) return;
    const cleanCode = newCode.trim();
    const updated = [...entityMappings];
    const idx = updated.findIndex(e => e.ourEntityName.toLowerCase() === entityName.toLowerCase());

    if (idx >= 0) {
      updated[idx] = {
        ...updated[idx],
        yardiEntityCode: cleanCode,
        status: 'Mapped'
      };
    } else {
      updated.push({
        id: 'ent_manual_' + Date.now(),
        ourEntityCode: 'ENT',
        ourEntityName: entityName,
        yardiEntityCode: cleanCode,
        yardiEntityName: entityName + ' Property',
        status: 'Mapped',
        isCustom: true
      });
    }

    onUpdateEntityMappings(updated);
    saveStoredEntityMappings(updated);
    setEditingTarget(null);
  };

  // Direct inline quick-save for a vendor code
  const handleSaveInlineVendor = (vendorName: string, newCode: string) => {
    if (!newCode.trim()) return;
    const cleanCode = newCode.trim();
    const updated = [...vendorMappings];
    const idx = updated.findIndex(v => v.ourVendorName.toLowerCase() === vendorName.toLowerCase());

    if (idx >= 0) {
      updated[idx] = {
        ...updated[idx],
        yardiVendorCode: cleanCode,
        status: 'Mapped'
      };
    } else {
      updated.push({
        id: 'vnd_manual_' + Date.now(),
        ourVendorCode: 'VND',
        ourVendorName: vendorName,
        yardiVendorCode: cleanCode,
        yardiVendorName: vendorName + ' PayScan',
        defaultGlAccount: 'GL-6000 OPEX',
        status: 'Mapped',
        isCustom: true
      });
    }

    onUpdateVendorMappings(updated);
    saveStoredVendorMappings(updated);
    setEditingTarget(null);
  };

  // Quick-save for GL Account of a vendor
  const handleSaveInlineGl = (vendorName: string, glCode: string) => {
    const updated = [...vendorMappings];
    const idx = updated.findIndex(v => v.ourVendorName.toLowerCase() === vendorName.toLowerCase());

    if (idx >= 0) {
      updated[idx] = {
        ...updated[idx],
        defaultGlAccount: glCode
      };
      onUpdateVendorMappings(updated);
      saveStoredVendorMappings(updated);
    }
  };

  return (
    <div className="space-y-4">
      {/* Auto-map status alert banner if triggered */}
      {autoMapFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between gap-2 text-xs text-emerald-900 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{autoMapFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setAutoMapFeedback(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. SUB-VIEW TABS & CONTROLS WITH INTERACTIVE SWITCH TOGGLES */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Left: Interactive Switch Toggles (Matching Step 1 exactly) */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Fresh vs Previous Batch Switch (if previous batch invoices exist in batch) */}
          {removedInvoicesCount > 0 && (
            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
              <span className={`text-xs font-semibold ${selectedSourceFilter === 'Fresh' ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
                New Reconciled invoices ({freshInvoicesCount})
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
                title={selectedSourceFilter === 'Removed' ? 'Switch to display new reconciled invoices' : 'Toggle switch to display previous batch invoices'}
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
          )}

          {/* Hide Mapped / Show Only Unmapped Switch */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
            <span className={`text-xs font-semibold ${!hideMappedInvoices ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
              All Invoices
            </span>

            {/* Switch Toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={hideMappedInvoices}
              onClick={() => setHideMappedInvoices(prev => !prev)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-[#EA580C] focus:ring-offset-1 ${
                hideMappedInvoices ? 'bg-[#EA580C]' : 'bg-gray-300'
              }`}
              title={hideMappedInvoices ? 'Currently hiding mapped rows. Click to show all invoices' : 'Click to hide mapped rows and remove them once mapped'}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  hideMappedInvoices ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>

            <span className={`text-xs font-semibold ${hideMappedInvoices ? 'text-[#EA580C] font-bold' : 'text-gray-500'}`}>
              Hide Mapped ({mappedInvoicesCount})
            </span>
          </div>

          <span className="text-[11px] text-gray-500">
            Showing <strong className="text-gray-800">
              {activeSubView === 'gl_view' ? sortedEtlRecords.length : activeSubView === 'entity_summary' ? filteredUniqueEntities.length : filteredUniqueVendors.length}
            </strong> {selectedSourceFilter === 'Removed' ? 'previous batch' : ''} {hideMappedInvoices ? 'unmapped ' : ''}
            {activeSubView === 'gl_view' ? 'GL rows' : activeSubView === 'entity_summary' ? 'entities' : 'vendors'}
          </span>
        </div>

        {/* Right: Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search invoice, entity, vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#EA580C]"
            />
          </div>
        </div>
      </div>

      {/* 4. MAIN CONTENT VIEW */}
      {activeSubView === 'gl_view' ? (
        /* COMPREHENSIVE 16-COLUMN STANDARD GL VIEW TABLE */
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
          {/* Table Sub-Header with Live Synced indicator */}
          <div className="px-4 py-2.5 bg-gray-50/90 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-orange-100 text-[#EA580C] rounded-lg">
                <LayoutGrid className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-900">Standard GL View ({sortedEtlRecords.length} Lines)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-[#EA580C] border border-orange-200">
                    Live Synced with Batch
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Full 16-column accounting view with inline-editable client references, due dates, OPEX GL codes, and multi-split notes
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[560px]">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-gray-100/95 backdrop-blur-xs border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider text-[10.5px] select-none">
                <tr>
                  {/* # ROW */}
                  <th className="py-3 px-3 w-10 text-center bg-gray-100">#</th>

                  {/* 1. INVOICE NUMBER */}
                  <th
                    onClick={() => handleGlHeaderSort('invoiceNumber')}
                    className="py-3 px-3.5 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>1. Invoice Number</span>
                      {glSortField === 'invoiceNumber' ? (
                        glSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 2. CLIENT REFERENCE */}
                  <th
                    onClick={() => handleGlHeaderSort('clientReference')}
                    className="py-3 px-3.5 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>2. Client Reference</span>
                      {glSortField === 'clientReference' ? (
                        glSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 3. SOURCE ENTITY NAME */}
                  <th
                    onClick={() => handleGlHeaderSort('sourceEntityName')}
                    className="py-3 px-3.5 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>3. Source Entity Name</span>
                      {glSortField === 'sourceEntityName' ? (
                        glSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 4. PAYING ENTITY NAME (Property Code) */}
                  <th
                    onClick={() => handleGlHeaderSort('payingEntityName')}
                    className="py-3 px-3.5 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>4. Paying Entity Name & Property Code</span>
                      {glSortField === 'payingEntityName' ? (
                        glSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 5. PAYING BANK NAME */}
                  <th
                    onClick={() => handleGlHeaderSort('payingBankName')}
                    className="py-3 px-3.5 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>5. Paying Bank Name</span>
                      {glSortField === 'payingBankName' ? (
                        glSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 6. AMOUNT */}
                  <th
                    onClick={() => handleGlHeaderSort('amount')}
                    className="py-3 px-3.5 cursor-pointer hover:text-gray-900 transition-colors text-right"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>6. Amount</span>
                      {glSortField === 'amount' ? (
                        glSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 7. ALLOCATION */}
                  <th
                    onClick={() => handleGlHeaderSort('allocation')}
                    className="py-3 px-3.5 cursor-pointer hover:text-gray-900 transition-colors text-center"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>7. Allocation</span>
                      {glSortField === 'allocation' ? (
                        glSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 8. DUE DATE */}
                  <th
                    onClick={() => handleGlHeaderSort('dueDate')}
                    className="py-3 px-3.5 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>8. Due Date</span>
                      {glSortField === 'dueDate' ? (
                        glSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 9. CURRENCY */}
                  <th
                    onClick={() => handleGlHeaderSort('currency')}
                    className="py-3 px-3.5 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>9. Currency</span>
                      {glSortField === 'currency' ? (
                        glSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 10. VENDOR NAME (Vendor Code) */}
                  <th
                    onClick={() => handleGlHeaderSort('vendorName')}
                    className="py-3 px-3.5 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>10. Vendor Name & Vendor Code</span>
                      {glSortField === 'vendorName' ? (
                        glSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 11. BENEFICIARY NAME */}
                  <th
                    onClick={() => handleGlHeaderSort('beneficiaryName')}
                    className="py-3 px-3.5 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>11. Beneficiary Name</span>
                      {glSortField === 'beneficiaryName' ? (
                        glSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 12. BENEFICIARY BANK BIC */}
                  <th
                    onClick={() => handleGlHeaderSort('beneficiaryBankBic')}
                    className="py-3 px-3.5 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>12. Beneficiary Bank BIC</span>
                      {glSortField === 'beneficiaryBankBic' ? (
                        glSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 13. BENEFICIARY BANK NAME */}
                  <th
                    onClick={() => handleGlHeaderSort('beneficiaryBankName')}
                    className="py-3 px-3.5 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>13. Beneficiary Bank Name</span>
                      {glSortField === 'beneficiaryBankName' ? (
                        glSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 14. GL ACCOUNT (OPEX) */}
                  <th
                    onClick={() => handleGlHeaderSort('glCode')}
                    className="py-3 px-3.5 cursor-pointer hover:text-gray-900 transition-colors bg-amber-50/60 text-amber-950"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>14. GL Account Code (Editable)</span>
                      {glSortField === 'glCode' ? (
                        glSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 15. NOTES (Editable with apply-all) */}
                  <th
                    onClick={() => handleGlHeaderSort('notes')}
                    className="py-3 px-3.5 cursor-pointer hover:text-gray-900 transition-colors bg-blue-50/60 text-blue-950"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>15. Notes / Memo (Editable)</span>
                      {glSortField === 'notes' ? (
                        glSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* 16. COME FROM ID / BATCH TRACKING */}
                  <th
                    onClick={() => handleGlHeaderSort('comeFromId')}
                    className="py-3 px-3.5 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>16. Come From ID / Batch</span>
                      {glSortField === 'comeFromId' ? (
                        glSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#EA580C]" /> : <ArrowDown className="w-3 h-3 text-[#EA580C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>

                  {/* ACTIONS */}
                  <th className="py-3 px-3.5 text-right bg-gray-100">
                    <span>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedEtlRecords.length === 0 ? (
                  <tr>
                    <td colSpan={18} className="py-12 text-center text-gray-500">
                      <Info className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                      <div className="font-semibold">No records match the current filter criteria</div>
                      <p className="text-xs text-gray-400 mt-1">Try resetting your search query or mapping status filters.</p>
                    </td>
                  </tr>
                ) : (
                  sortedEtlRecords.map((r, idx) => {
                    const isMultiSplit = (r.totalSplitsForInvoice || 1) > 1;
                    const matchedInv = selectedInvoices.find(
                      i => i.id === r.invoiceId || i.invoiceNumber === r.invoiceNumber
                    );

                    return (
                      <tr 
                        key={r.id} 
                        className={`hover:bg-amber-50/40 transition-colors ${r.hasMappingError ? 'bg-amber-50/20' : ''}`}
                      >
                        {/* # ROW */}
                        <td className="py-3 px-3 text-center text-gray-400 font-mono text-[11px] bg-gray-50/30">
                          {idx + 1}
                        </td>

                        {/* 1. INVOICE NUMBER */}
                        <td className="py-3 px-3.5 font-bold font-mono text-gray-900">
                          <div className="flex items-center gap-1.5">
                            <span>{r.invoiceNumber}</span>
                            {r.invoiceDisplayId && (
                              <span className="text-[10px] font-mono font-normal text-gray-500 bg-gray-100 px-1 py-0.2 rounded">
                                {r.invoiceDisplayId}
                              </span>
                            )}
                          </div>
                          <div className="text-[10.5px] text-gray-500 font-sans font-normal mt-0.5">
                            {r.invoiceDate || '2026-08-15'}
                          </div>
                          {isMultiSplit && (
                            <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                              Split {r.splitIndex} of {r.totalSplitsForInvoice} ({r.splitPercent}%)
                            </div>
                          )}
                        </td>

                        {/* 2. CLIENT REFERENCE (Editable) */}
                        <td className="py-3 px-3.5 font-mono text-gray-700">
                          {editingGlFieldId?.id === r.id && editingGlFieldId?.field === 'clientReference' ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={tempGlFieldValue}
                                onChange={e => setTempGlFieldValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveGlField(r);
                                  if (e.key === 'Escape') setEditingGlFieldId(null);
                                }}
                                className="w-32 px-1.5 py-0.5 text-xs font-mono border border-[#EA580C] rounded bg-white focus:outline-hidden"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveGlField(r)}
                                className="p-1 text-emerald-700 hover:bg-emerald-100 rounded cursor-pointer"
                                title="Save"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingGlFieldId(null)}
                                className="p-1 text-gray-500 hover:bg-gray-100 rounded cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => handleStartEditGlField(r, 'clientReference')}
                              className="group flex items-center justify-between gap-1.5 p-1 -m-1 rounded hover:bg-amber-100/60 cursor-pointer"
                              title="Click to edit Client Reference"
                            >
                              <span className="font-semibold text-gray-900">{r.clientReference || '-'}</span>
                              <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </td>

                        {/* 3. SOURCE ENTITY NAME */}
                        <td className="py-3 px-3.5 font-medium text-gray-800">
                          <div>{r.sourceEntityName || '-'}</div>
                          <div className="text-[10px] font-mono text-gray-400">ENT-SRC</div>
                        </td>

                        {/* 4. PAYING ENTITY NAME & PROPERTY CODE */}
                        <td className="py-3 px-3.5 font-medium text-gray-900">
                          <div>{r.payingEntityName || r.ourEntityName || '-'}</div>
                          <div className="mt-1 flex items-center gap-1.5">
                            {r.isEntityMapped ? (
                              <div className="flex items-center gap-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-green-50 text-green-800 border border-green-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                                  {r.yardiEntityCode}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onOpenQuickMap('entity', r.payingEntityName || r.ourEntityName, r.yardiEntityCode)}
                                  className="p-0.5 text-gray-400 hover:text-gray-700 cursor-pointer"
                                  title="Edit Property Mapping"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onOpenQuickMap('entity', r.payingEntityName || r.ourEntityName, r.yardiEntityCode)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 cursor-pointer shadow-2xs"
                                title="Property code unmapped. Click to map."
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                <span>+ Map Property Code</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 5. PAYING BANK NAME */}
                        <td className="py-3 px-3.5 text-gray-700">
                          <div className="font-medium">{r.payingBankName || '-'}</div>
                          <div className="text-[10px] text-gray-400 font-mono">Main Op Acc</div>
                        </td>

                        {/* 6. AMOUNT */}
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-gray-900">
                          {formatCurrency(r.apportionedGrossAmount, r.currency)}
                        </td>

                        {/* 7. ALLOCATION */}
                        <td className="py-3 px-3.5 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold font-mono ${
                            r.splitPercent === 100 
                              ? 'bg-gray-100 text-gray-700' 
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}>
                            {r.splitPercent.toFixed(2)}%
                          </span>
                        </td>

                        {/* 8. DUE DATE (Editable) */}
                        <td className="py-3 px-3.5 font-mono text-gray-700">
                          {editingGlFieldId?.id === r.id && editingGlFieldId?.field === 'dueDate' ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="date"
                                value={tempGlFieldValue}
                                onChange={e => setTempGlFieldValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveGlField(r);
                                  if (e.key === 'Escape') setEditingGlFieldId(null);
                                }}
                                className="w-32 px-1.5 py-0.5 text-xs font-mono border border-[#EA580C] rounded bg-white focus:outline-hidden"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveGlField(r)}
                                className="p-1 text-emerald-700 hover:bg-emerald-100 rounded cursor-pointer"
                                title="Save"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingGlFieldId(null)}
                                className="p-1 text-gray-500 hover:bg-gray-100 rounded cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => handleStartEditGlField(r, 'dueDate')}
                              className="group flex items-center justify-between gap-1.5 p-1 -m-1 rounded hover:bg-amber-100/60 cursor-pointer"
                              title="Click to edit Due Date"
                            >
                              <span>{r.dueDate || '-'}</span>
                              <Calendar className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </td>

                        {/* 9. CURRENCY */}
                        <td className="py-3 px-3.5 font-mono font-bold text-gray-700">
                          <span className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 text-[11px]">
                            {r.currency}
                          </span>
                        </td>

                        {/* 10. VENDOR NAME & VENDOR CODE */}
                        <td className="py-3 px-3.5 font-medium text-gray-900">
                          <div>{r.ourVendorName || '-'}</div>
                          <div className="mt-1 flex items-center gap-1.5">
                            {r.isVendorMapped ? (
                              <div className="flex items-center gap-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                                  {r.yardiVendorCode}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onOpenQuickMap('vendor', r.ourVendorName, r.yardiVendorCode)}
                                  className="p-0.5 text-gray-400 hover:text-gray-700 cursor-pointer"
                                  title="Edit Vendor Mapping"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onOpenQuickMap('vendor', r.ourVendorName, r.yardiVendorCode)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 cursor-pointer shadow-2xs"
                                title="Vendor code unmapped. Click to map."
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                <span>+ Map Vendor Code</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 11. BENEFICIARY NAME */}
                        <td className="py-3 px-3.5 text-gray-800">
                          {r.beneficiaryName || r.ourVendorName || '-'}
                        </td>

                        {/* 12. BENEFICIARY BANK BIC */}
                        <td className="py-3 px-3.5 font-mono text-gray-600 text-[11px]">
                          {r.beneficiaryBankBic || '-'}
                        </td>

                        {/* 13. BENEFICIARY BANK NAME */}
                        <td className="py-3 px-3.5 text-gray-700">
                          {r.beneficiaryBankName || '-'}
                        </td>

                        {/* 14. GL ACCOUNT CODE (Editable) */}
                        <td className="py-3 px-3.5 bg-amber-50/20">
                          <div className="flex items-center gap-1">
                            <select
                              value={r.glCode}
                              onChange={e => handleUpdateOverride(r.id, { glCode: e.target.value })}
                              className="px-2 py-1 text-xs font-mono font-semibold bg-white border border-gray-300 rounded focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] outline-hidden cursor-pointer"
                            >
                              {GL_ACCOUNTS_OPEX.map(gl => (
                                <option key={gl.code} value={gl.code}>{gl.code} - {gl.name}</option>
                              ))}
                              {!GL_ACCOUNTS_OPEX.some(gl => gl.code === r.glCode) && (
                                <option value={r.glCode}>{r.glCode}</option>
                              )}
                            </select>
                          </div>
                        </td>

                        {/* 15. NOTES / MEMO (Editable + Broadcast to invoice) */}
                        <td className="py-3 px-3.5 bg-blue-50/20 max-w-xs">
                          {editingGlNoteId === r.id ? (
                            <div className="space-y-1.5 min-w-[260px] bg-white p-2 rounded-lg border border-blue-300 shadow-md">
                              <textarea
                                value={tempGlNoteText}
                                onChange={e => setTempGlNoteText(e.target.value)}
                                rows={2}
                                className="w-full p-1.5 text-xs border border-gray-300 rounded focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] outline-hidden resize-none"
                                placeholder="Enter memo or booking instruction..."
                                autoFocus
                              />
                              <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-gray-100">
                                {isMultiSplit && (
                                  <button
                                    type="button"
                                    onClick={() => handleSaveGlNote(r, true)}
                                    className="px-2 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 cursor-pointer transition-colors"
                                    title="Broadcast this note across all split lines for this invoice"
                                  >
                                    Apply to all {r.totalSplitsForInvoice} lines
                                  </button>
                                )}
                                <div className="flex items-center gap-1 ml-auto">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveGlNote(r, false)}
                                    className="px-2 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded cursor-pointer"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingGlNoteId(null)}
                                    className="px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-100 rounded cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => handleStartEditGlNote(r)}
                              className="group flex items-center justify-between gap-1.5 p-1.5 -m-1 rounded hover:bg-blue-100/60 cursor-pointer transition-colors"
                              title="Click to edit memo / booking instructions"
                            >
                              <span className="truncate text-xs text-gray-800 font-normal">
                                {r.notes || <span className="text-gray-400 italic">Add note...</span>}
                              </span>
                              <Edit3 className="w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </div>
                          )}
                        </td>

                        {/* 16. COME FROM ID / BATCH TRACKING */}
                        <td className="py-3 px-3.5">
                          {r.removedFromBatchId ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                              <RotateCcw className="w-2.5 h-2.5 text-amber-700" />
                              {r.removedFromBatchId}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                              {r.invoiceDisplayId || r.invoiceId || 'New'}
                            </span>
                          )}
                        </td>

                        {/* ACTIONS COLUMN */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!r.isEntityMapped && (
                              <button
                                type="button"
                                onClick={() => onOpenQuickMap('entity', r.payingEntityName || r.ourEntityName, r.yardiEntityCode)}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 rounded text-[10.5px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                title="Map Entity to Yardi Property Code"
                              >
                                <Building2 className="w-3 h-3 text-indigo-600" />
                                <span>Map Property</span>
                              </button>
                            )}
                            {!r.isVendorMapped && (
                              <button
                                type="button"
                                onClick={() => onOpenQuickMap('vendor', r.ourVendorName, r.yardiVendorCode)}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200 rounded text-[10.5px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                title="Map Vendor to Yardi PayScan Code"
                              >
                                <Users2 className="w-3 h-3 text-emerald-600" />
                                <span>Map Vendor</span>
                              </button>
                            )}
                            {matchedInv && (
                              <button
                                type="button"
                                onClick={() => onInspectInvoice(matchedInv)}
                                className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md cursor-pointer transition-colors"
                                title="Inspect Invoice Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      
      ) : activeSubView === 'entity_summary' ? (
        /* ENTITY & PROPERTY SUMMARY VIEW */
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-gray-200 pb-3.5 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-950">Unique Entities & Properties in Batch</h3>
                <p className="text-xs text-gray-500">Each entity maps to a Yardi Property / Book code for general ledger journal entries</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenMappingManager('entities')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Map Entity & Property</span>
              </button>
              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg">
                {filteredUniqueEntities.length} of {uniqueEntities.length} Entities
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
            {filteredUniqueEntities.length === 0 ? (
              <div className="col-span-full py-10 text-center text-xs text-gray-500">
                <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-500 mb-2" />
                <span className="font-semibold text-gray-700 text-sm">All entities in this batch are mapped!</span>
                {hideMappedInvoices && (
                  <p className="text-xs text-gray-400 mt-1">Toggle "All Invoices" in the toolbar above to view all mapped entities.</p>
                )}
              </div>
            ) : (
              filteredUniqueEntities.map(ent => (
                <div key={ent.name} className="p-3.5 rounded-lg border border-gray-200 hover:border-indigo-300 bg-gray-50/50 hover:bg-indigo-50/20 transition-all flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 text-xs truncate flex items-center gap-2">
                      <span>{ent.name}</span>
                      {ent.code && (
                        <span className="text-[10px] font-mono text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                          {ent.code}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 font-mono mt-1 flex items-center gap-2">
                      <span className="font-semibold text-gray-700">{ent.invoicesCount} Invoices</span>
                      <span>•</span>
                      <span>Total: ${ent.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {ent.currency}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {ent.isMapped ? (
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 font-mono font-bold rounded text-xs">
                          {ent.mappedPropertyCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => onOpenQuickMap('entity', ent.name, ent.code)}
                          className="p-1 text-gray-400 hover:text-indigo-600 rounded cursor-pointer"
                          title="Change Property Mapping"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onOpenQuickMap('entity', ent.name, ent.code)}
                        className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                        <span>Map Property</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* VENDOR & PAYSCAN SUMMARY VIEW */
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-gray-200 pb-3.5 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                <Users2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-950">Unique Vendors & PayScan Payees in Batch</h3>
                <p className="text-xs text-gray-500">Each vendor maps to a Yardi Vendor code and default General Ledger expense account</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenMappingManager('vendors')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Map Vendor & PayScan</span>
              </button>
              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">
                {filteredUniqueVendors.length} of {uniqueVendors.length} Vendors
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
            {filteredUniqueVendors.length === 0 ? (
              <div className="col-span-full py-10 text-center text-xs text-gray-500">
                <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-500 mb-2" />
                <span className="font-semibold text-gray-700 text-sm">All vendors in this batch are mapped!</span>
                {hideMappedInvoices && (
                  <p className="text-xs text-gray-400 mt-1">Toggle "All Invoices" in the toolbar above to view all mapped vendors.</p>
                )}
              </div>
            ) : (
              filteredUniqueVendors.map(vnd => (
                <div key={vnd.name} className="p-3.5 rounded-lg border border-gray-200 hover:border-emerald-300 bg-gray-50/50 hover:bg-emerald-50/20 transition-all flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 text-xs truncate">{vnd.name}</div>
                    <div className="text-[11px] text-gray-500 font-mono mt-1 flex items-center gap-2">
                      <span className="font-semibold text-gray-700">{vnd.invoicesCount} Invoices</span>
                      <span>•</span>
                      <span>Total: ${vnd.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {vnd.currency}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {vnd.isMapped ? (
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-900 font-mono font-bold rounded text-xs">
                          {vnd.mappedVendorCode}
                        </span>
                        <span className="text-[10.5px] font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                          {vnd.mappedGl || 'GL-6000'}
                        </span>
                        <button
                          type="button"
                          onClick={() => onOpenQuickMap('vendor', vnd.name)}
                          className="p-1 text-gray-400 hover:text-emerald-600 rounded cursor-pointer"
                          title="Change Vendor Mapping"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onOpenQuickMap('vendor', vnd.name)}
                        className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                        <span>Map PayScan Code</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
