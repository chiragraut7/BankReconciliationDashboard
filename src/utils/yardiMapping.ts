import { YardiVendorMapping, YardiEntityMapping, BatchMappingValidationResult } from '../types/yardiMapping';
import { InvoiceBatchItem, MatchedInvoice } from '../types/reconciliation';
import { INITIAL_YARDI_VENDOR_MAPPINGS, INITIAL_YARDI_ENTITY_MAPPINGS } from '../data/yardiMappingData';

const VENDOR_STORAGE_KEY = 'RECON_YARDI_VENDOR_MAPPINGS_V1';
const ENTITY_STORAGE_KEY = 'RECON_YARDI_ENTITY_MAPPINGS_V1';

/**
 * Loads vendor mappings from LocalStorage with fallback to initial defaults.
 */
export function getStoredVendorMappings(): YardiVendorMapping[] {
  try {
    const raw = localStorage.getItem(VENDOR_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load vendor mappings from storage:', err);
  }
  return INITIAL_YARDI_VENDOR_MAPPINGS;
}

/**
 * Saves vendor mappings to LocalStorage.
 */
export function saveStoredVendorMappings(mappings: YardiVendorMapping[]): void {
  try {
    localStorage.setItem(VENDOR_STORAGE_KEY, JSON.stringify(mappings));
  } catch (err) {
    console.error('Failed to save vendor mappings to storage:', err);
  }
}

/**
 * Loads entity mappings from LocalStorage with fallback to initial defaults.
 */
export function getStoredEntityMappings(): YardiEntityMapping[] {
  try {
    const raw = localStorage.getItem(ENTITY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load entity mappings from storage:', err);
  }
  return INITIAL_YARDI_ENTITY_MAPPINGS;
}

/**
 * Saves entity mappings to LocalStorage.
 */
export function saveStoredEntityMappings(mappings: YardiEntityMapping[]): void {
  try {
    localStorage.setItem(ENTITY_STORAGE_KEY, JSON.stringify(mappings));
  } catch (err) {
    console.error('Failed to save entity mappings to storage:', err);
  }
}

/**
 * Normalizes strings for matching.
 */
function normalizeName(str: string): string {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Finds matching vendor mapping by name or code.
 */
export function findVendorMapping(
  vendorNameOrCode: string,
  mappings: YardiVendorMapping[] = getStoredVendorMappings()
): YardiVendorMapping | undefined {
  if (!vendorNameOrCode) return undefined;
  const norm = normalizeName(vendorNameOrCode);
  
  return mappings.find(m => {
    if (m.ourVendorCode && normalizeName(m.ourVendorCode) === norm) return true;
    if (m.ourVendorName && normalizeName(m.ourVendorName) === norm) return true;
    // Substring contains match
    if (m.ourVendorName && (norm.includes(normalizeName(m.ourVendorName)) || normalizeName(m.ourVendorName).includes(norm))) return true;
    return false;
  });
}

/**
 * Finds matching entity mapping by name or code.
 */
export function findEntityMapping(
  entityNameOrCode: string,
  mappings: YardiEntityMapping[] = getStoredEntityMappings()
): YardiEntityMapping | undefined {
  if (!entityNameOrCode) return undefined;
  const norm = normalizeName(entityNameOrCode);
  
  return mappings.find(m => {
    if (m.ourEntityCode && normalizeName(m.ourEntityCode) === norm) return true;
    if (m.ourEntityName && normalizeName(m.ourEntityName) === norm) return true;
    // Substring match
    if (m.ourEntityName && (norm.includes(normalizeName(m.ourEntityName)) || normalizeName(m.ourEntityName).includes(norm))) return true;
    return false;
  });
}

/**
 * Helper to auto-generate a Yardi vendor code from name.
 */
export function generateAutoYardiVendorCode(vendorName: string): string {
  const clean = vendorName
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join('_')
    .toLowerCase();
  return `yd_${clean || 'vendor'}_01`;
}

/**
 * Helper to auto-generate a Yardi property / entity code from name.
 */
export function generateAutoYardiEntityCode(entityName: string): string {
  const clean = entityName
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join('_')
    .toLowerCase();
  return `prop_${clean || 'entity'}_01`;
}

/**
 * Validates whether all selected invoices and their allocated split entities
 * have corresponding mapped Yardi codes.
 */
export function validateBatchMappings(
  invoices: (InvoiceBatchItem | MatchedInvoice)[],
  vendorMappings: YardiVendorMapping[] = getStoredVendorMappings(),
  entityMappings: YardiEntityMapping[] = getStoredEntityMappings()
): BatchMappingValidationResult {
  const unmappedVendorsMap = new Map<string, {
    ourVendorCode: string;
    ourVendorName: string;
    count: number;
    invoiceIds: string[];
    invoiceNumbers: string[];
  }>();

  const unmappedEntitiesMap = new Map<string, {
    ourEntityCode: string;
    ourEntityName: string;
    count: number;
    invoiceIds: string[];
    invoiceNumbers: string[];
  }>();

  let totalRecords = 0;
  let validRecordsCount = 0;
  let errorRecordsCount = 0;

  invoices.forEach(inv => {
    const vendorName = inv.entityName || 'Unknown Vendor';
    const vMapping = findVendorMapping(vendorName, vendorMappings);
    const hasValidVendor = Boolean(vMapping && vMapping.status === 'Mapped' && vMapping.yardiVendorCode.trim());

    if (!hasValidVendor) {
      const key = vendorName;
      const cur = unmappedVendorsMap.get(key) || {
        ourVendorCode: vMapping?.ourVendorCode || `VND-${vendorName.slice(0, 4).toUpperCase()}`,
        ourVendorName: vendorName,
        count: 0,
        invoiceIds: [],
        invoiceNumbers: []
      };
      cur.count += 1;
      cur.invoiceIds.push(inv.id);
      cur.invoiceNumbers.push(inv.invoiceNumber);
      unmappedVendorsMap.set(key, cur);
    }

    // Check entity splits
    const targetEntities: string[] = [];

    if (inv.richLineItems && inv.richLineItems.length > 0) {
      inv.richLineItems.forEach(item => {
        if (item.splits && item.splits.length > 0) {
          item.splits.forEach(s => targetEntities.push(s.target));
        }
      });
    }

    if (targetEntities.length === 0 && inv.apportionment && inv.apportionment.length > 0) {
      inv.apportionment.forEach(a => targetEntities.push(a.payingEntity));
    }

    if (targetEntities.length === 0) {
      targetEntities.push(inv.payingEntity || inv.entity || inv.entityName || 'Default Operating Entity');
    }

    // Deduplicate entities for this invoice check
    const uniqueEntities = Array.from(new Set(targetEntities));

    uniqueEntities.forEach(entName => {
      totalRecords += 1;
      const eMapping = findEntityMapping(entName, entityMappings);
      const hasValidEntity = Boolean(eMapping && eMapping.status === 'Mapped' && eMapping.yardiEntityCode.trim());

      if (!hasValidEntity) {
        const key = entName;
        const cur = unmappedEntitiesMap.get(key) || {
          ourEntityCode: eMapping?.ourEntityCode || `ENT-${entName.slice(0, 4).toUpperCase()}`,
          ourEntityName: entName,
          count: 0,
          invoiceIds: [],
          invoiceNumbers: []
        };
        cur.count += 1;
        if (!cur.invoiceIds.includes(inv.id)) {
          cur.invoiceIds.push(inv.id);
          cur.invoiceNumbers.push(inv.invoiceNumber);
        }
        unmappedEntitiesMap.set(key, cur);
      }

      if (hasValidVendor && hasValidEntity) {
        validRecordsCount += 1;
      } else {
        errorRecordsCount += 1;
      }
    });
  });

  const unmappedVendors = Array.from(unmappedVendorsMap.values());
  const unmappedEntities = Array.from(unmappedEntitiesMap.values());
  const missingVendors = unmappedVendors.map(v => v.ourVendorName);
  const missingEntities = unmappedEntities.map(e => e.ourEntityName);
  const isValid = unmappedVendors.length === 0 && unmappedEntities.length === 0;

  return {
    isValid,
    totalRecords,
    validRecordsCount,
    errorRecordsCount,
    missingVendors,
    missingEntities,
    unmappedVendors,
    unmappedEntities
  };
}
