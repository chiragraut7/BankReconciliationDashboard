export interface YardiVendorMapping {
  id: string;
  ourVendorCode: string;
  ourVendorName: string;
  yardiVendorCode: string;
  yardiVendorName: string;
  taxId?: string;
  defaultGlAccount?: string;
  category?: string;
  status: 'Mapped' | 'Unmapped';
  isCustom?: boolean;
}

export interface YardiEntityMapping {
  id: string;
  ourEntityCode: string;
  ourEntityName: string;
  yardiEntityCode: string; // Property / Entity code e.g. 'prop_evr02', 'PROP-NX01'
  yardiEntityName: string;
  fundCode?: string;
  legalJurisdiction?: string;
  status: 'Mapped' | 'Unmapped';
  isCustom?: boolean;
}

export interface YardiEtlRecord {
  id: string;
  batchId: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceDisplayId?: string;
  invoiceDate: string;
  dueDate: string;
  
  // Vendor Fields
  ourVendorName: string;
  ourVendorCode: string;
  yardiVendorCode: string; // Editable selective field
  
  // Entity Fields
  ourEntityName: string;
  ourEntityCode: string;
  yardiEntityCode: string; // Editable selective field
  
  // Accounting & GL Fields
  glCode: string; // Editable selective field
  lineDescription: string; // Editable selective field
  splitPercent: number;
  lineOriginalAmount: number;
  apportionedNetAmount: number;
  apportionedTaxAmount: number;
  apportionedGrossAmount: number;
  currency: string;
  exchangeRate: number;
  apportionedUsdAmount: number;
  
  // Metadata & Tracking
  poNumber: string;
  jobNumber: string;
  paymentTerms: string;
  notes: string; // Editable selective field (e.g. customized posting memo)
  status: string;
  
  // Validation Flags
  isVendorMapped: boolean;
  isEntityMapped: boolean;
  hasMappingError: boolean;
  mappingErrorMessage?: string;
  
  // Source reference
  lineItemId?: string;
  splitIndex?: number;
  totalSplitsForInvoice?: number;
}

export interface BatchMappingValidationResult {
  isValid: boolean;
  totalRecords: number;
  validRecordsCount: number;
  errorRecordsCount: number;
  missingVendors: string[];
  missingEntities: string[];
  unmappedVendors: Array<{
    ourVendorCode: string;
    ourVendorName: string;
    count: number;
    invoiceIds: string[];
    invoiceNumbers: string[];
  }>;
  unmappedEntities: Array<{
    ourEntityCode: string;
    ourEntityName: string;
    count: number;
    invoiceIds: string[];
    invoiceNumbers: string[];
  }>;
}

export interface EtlRecordOverride {
  notes?: string;
  glCode?: string;
  lineDescription?: string;
  yardiVendorCode?: string;
  yardiEntityCode?: string;
}
