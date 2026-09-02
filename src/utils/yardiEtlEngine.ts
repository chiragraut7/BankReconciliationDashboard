import { YardiEtlRecord, YardiVendorMapping, YardiEntityMapping, EtlRecordOverride } from '../types/yardiMapping';
import { InvoiceBatchItem, MatchedInvoice, InvoiceETLFormat } from '../types/reconciliation';
import { findVendorMapping, findEntityMapping } from './yardiMapping';

export const YARDI_VOYAGER_SCHEMA_COLUMNS = [
  'TRANNUM',
  'PERSON',
  'OFFSET',
  'ACCRUAL',
  'POSTMONTH',
  'DATE',
  'DUEDATE',
  'AMOUNT',
  'PROPERTY',
  'Ref_Property_Id',
  'ACCOUNT',
  'NOTES',
  'REF',
  'CHECKNUM',
  'SEGMENT1',
  'SEGMENT2',
  'SEGMENT3',
  'SEGMENT4',
  'SEGMENT5',
  'SEGMENT6',
  'SEGMENT7',
  'SEGMENT8',
  'SEGMENT9',
  'SEGMENT10',
  'SEGMENT11',
  'SEGMENT12',
  'DetailNotes',
  'EXPENSETYPE',
  'DETAILTAXAMOUNT',
  'DETAILTAXAMOUNT2',
  'DETAILTRANAMOUNT',
  'DETAILVATRANTYPEID',
  'DETAILVATRATEID',
  'TRANCURRENCY',
  'EXCHANGERATE',
  'EXCHANGERATEDATE',
  'EXCHANGEFACTOR',
  'EXCHANGEOVERRIDE',
  'AMOUNT2',
  'FROMDATE',
  'TODATE',
  'DOCUMENTSEQUENCENUMBER',
  'DISPLAYTYPE',
  'INTERNATIONALSEQUENCENO',
  'NOTES2',
  'DETAILVATRANTYPEID',
  'DETAILVATRATEID',
  'Labour',
  'Material',
  'CITBLevy',
  'Manufacturing',
  'Travel',
  'NonCisLabor',
  'FundingEntity',
  'JOB',
  'CATEGORY',
  'CONTRACT',
  'COSTCODE',
  'USERDEF1',
  'USERDEF2',
  'UserDefined3',
  'UserDefined4',
  'UserDefined5',
  'UserDefined6',
  'UserDefined7',
  'UserDefined8',
  'UserDefined9',
  'UserDefined10',
  'WORKFLOWSTATUS',
  'WORKFLOWUSER',
  'WORKFLOWDATE',
  'DETAILFIELD1',
  'DETAILFIELD2',
  'DETAILFIELD3',
  'DETAILFIELD4',
  'DETAILFIELD5',
  'DETAILFIELD6',
  'DETAILFIELD7',
  'DETAILFIELD8',
  'ISCONSOLIDATED',
  'CREDITMEMO',
  'ADJUSTMENT',
  'Material',
  'CITBLevy',
  'Manufacturing',
  'Travel',
  'NonCisLabor'
] as const;

/**
 * Generates granular, exploded ETL records for an array of invoices,
 * splitting each invoice by its constituent line items AND allocated entities.
 *
 * Example:
 * - 1 invoice split into 2 entities with 2 line items -> 4 distinct records (each entity gets its portion of each GL line item).
 * - 1 invoice split into 4 entities with 4 line items -> 16 distinct records (each entity × each GL code).
 */
export function generateInvoiceEtlRecords(
  invoices: (InvoiceBatchItem | MatchedInvoice)[],
  batchId: string,
  vendorMappings: YardiVendorMapping[],
  entityMappings: YardiEntityMapping[],
  recordOverrides: Record<string, EtlRecordOverride> = {}
): YardiEtlRecord[] {
  const records: YardiEtlRecord[] = [];

  invoices.forEach((inv, invIndex) => {
    const invoiceVendorName = inv.entityName || 'Unknown Vendor';
    const vMap = findVendorMapping(invoiceVendorName, vendorMappings);
    const defaultYardiVendorCode = vMap && vMap.status === 'Mapped' ? vMap.yardiVendorCode : '';
    const ourVendorCode = vMap?.ourVendorCode || `VND-${invoiceVendorName.slice(0, 4).toUpperCase()}`;

    const exchangeRate = inv.exchangeRate || 1.0;
    const invCurrency = inv.currency || 'USD';
    const invoiceDate = inv.date || '2026-08-31';
    const dueDate = inv.dueDate || '2026-09-30';
    const poNumber = inv.poNumber || '';
    const jobNumber = inv.jobNumber || '';
    const paymentTerms = inv.paymentTerms || 'Net 30 days';
    const postMonth = inv.postMonth || `${invoiceDate.slice(5, 7)}/${invoiceDate.slice(0, 4)}`;
    const expensesType = inv.expensesType || 'EXP';
    const category = inv.category || 'OPEX Services';
    const vendorVatNumber = inv.vendorVatNumber || '';
    const fromDate = inv.fromDate || invoiceDate;
    const toDate = inv.toDate || dueDate;

    // Case 1: Invoice has structured richLineItems
    if (inv.richLineItems && inv.richLineItems.length > 0) {
      inv.richLineItems.forEach((lineItem, lineIdx) => {
        const lineGlCode = lineItem.glCode || vMap?.defaultGlAccount || 'GL-6000 OPEX';
        const lineDesc = lineItem.description || `Line Item #${lineIdx + 1}`;
        const lineTotal = lineItem.totalAmount ?? lineItem.netAmount ?? (inv.amount / inv.richLineItems!.length);
        const lineNet = lineItem.netAmount ?? lineTotal;
        const lineTax = lineItem.taxAmount ?? 0;

        // Subcase 1A: The line item has explicit target entity splits
        if (lineItem.splits && lineItem.splits.length > 0) {
          lineItem.splits.forEach((split, splitIdx) => {
            const recordId = `${inv.id}_li${lineIdx}_sp${splitIdx}`;
            const targetEntityName = split.target;
            const eMap = findEntityMapping(targetEntityName, entityMappings);
            const defaultYardiEntityCode = eMap && eMap.status === 'Mapped' ? eMap.yardiEntityCode : '';
            const ourEntityCode = eMap?.ourEntityCode || `ENT-${targetEntityName.slice(0, 4).toUpperCase()}`;

            const override = recordOverrides[recordId] || {};
            const yardiVendorCode = override.yardiVendorCode ?? defaultYardiVendorCode;
            const yardiEntityCode = override.yardiEntityCode ?? defaultYardiEntityCode;
            const glCode = override.glCode ?? lineGlCode;
            const finalDesc = override.lineDescription ?? lineDesc;
            const defaultNote = `Inv ${inv.invoiceNumber} • ${finalDesc} • ${targetEntityName} (${split.percent.toFixed(1)}%)`;
            const notes = override.notes ?? defaultNote;

            const splitPct = split.percent;
            const apportionedGross = split.totalAmount ?? (lineTotal * splitPct) / 100;
            const apportionedNet = split.amount ?? (lineNet * splitPct) / 100;
            const apportionedTax = split.vat ?? (lineTax * splitPct) / 100;
            const apportionedUsd = invCurrency === 'USD' ? apportionedGross : apportionedGross * exchangeRate;

            const isVendorMapped = Boolean(yardiVendorCode.trim());
            const isEntityMapped = Boolean(yardiEntityCode.trim());
            const hasMappingError = !isVendorMapped || !isEntityMapped;
            let mappingErrorMessage = '';
            if (!isVendorMapped && !isEntityMapped) {
              mappingErrorMessage = `Missing Yardi mapping for Vendor (${invoiceVendorName}) and Entity (${targetEntityName})`;
            } else if (!isVendorMapped) {
              mappingErrorMessage = `Missing Yardi mapping for Vendor (${invoiceVendorName})`;
            } else if (!isEntityMapped) {
              mappingErrorMessage = `Missing Yardi mapping for Entity (${targetEntityName})`;
            }

            records.push({
              id: recordId,
              batchId,
              invoiceId: inv.id,
              invoiceNumber: inv.invoiceNumber,
              invoiceDisplayId: inv.invoiceIdDisplay || `#${invIndex + 1}`,
              invoiceDate,
              dueDate,
              ourVendorName: invoiceVendorName,
              ourVendorCode,
              yardiVendorCode,
              ourEntityName: targetEntityName,
              ourEntityCode,
              yardiEntityCode,
              glCode,
              lineDescription: finalDesc,
              splitPercent: splitPct,
              lineOriginalAmount: lineTotal,
              apportionedNetAmount: Number(apportionedNet.toFixed(2)),
              apportionedTaxAmount: Number(apportionedTax.toFixed(2)),
              apportionedGrossAmount: Number(apportionedGross.toFixed(2)),
              currency: invCurrency,
              exchangeRate,
              apportionedUsdAmount: Number(apportionedUsd.toFixed(2)),
              poNumber,
              jobNumber,
              paymentTerms,
              notes,
              status: inv.status || 'Verified',
              postMonth,
              expensesType,
              category,
              vendorVatNumber,
              fromDate,
              toDate,
              isVendorMapped,
              isEntityMapped,
              hasMappingError,
              mappingErrorMessage,
              lineItemId: lineItem.id || `LI-${lineIdx + 1}`,
              splitIndex: splitIdx + 1,
              totalSplitsForInvoice: lineItem.splits.length,
              removedFromBatchId: inv.removedFromBatchId,
              removedFromBatchName: inv.removedFromBatchName
            });
          });
        }
        // Subcase 1B: Line item has no internal splits, but top-level invoice has apportionment
        else if (inv.apportionment && inv.apportionment.length > 0) {
          inv.apportionment.forEach((app, appIdx) => {
            const recordId = `${inv.id}_li${lineIdx}_app${appIdx}`;
            const targetEntityName = app.payingEntity;
            const eMap = findEntityMapping(targetEntityName, entityMappings);
            const defaultYardiEntityCode = eMap && eMap.status === 'Mapped' ? eMap.yardiEntityCode : '';
            const ourEntityCode = eMap?.ourEntityCode || `ENT-${targetEntityName.slice(0, 4).toUpperCase()}`;

            const override = recordOverrides[recordId] || {};
            const yardiVendorCode = override.yardiVendorCode ?? defaultYardiVendorCode;
            const yardiEntityCode = override.yardiEntityCode ?? defaultYardiEntityCode;
            const glCode = override.glCode ?? lineGlCode;
            const finalDesc = override.lineDescription ?? lineDesc;
            const defaultNote = `Inv ${inv.invoiceNumber} • ${finalDesc} • ${targetEntityName} (${app.percent.toFixed(1)}%)`;
            const notes = override.notes ?? defaultNote;

            const splitPct = app.percent;
            const apportionedGross = (lineTotal * splitPct) / 100;
            const apportionedNet = (lineNet * splitPct) / 100;
            const apportionedTax = (lineTax * splitPct) / 100;
            const apportionedUsd = invCurrency === 'USD' ? apportionedGross : apportionedGross * exchangeRate;

            const isVendorMapped = Boolean(yardiVendorCode.trim());
            const isEntityMapped = Boolean(yardiEntityCode.trim());
            const hasMappingError = !isVendorMapped || !isEntityMapped;
            let mappingErrorMessage = '';
            if (!isVendorMapped && !isEntityMapped) {
              mappingErrorMessage = `Missing Yardi mapping for Vendor (${invoiceVendorName}) and Entity (${targetEntityName})`;
            } else if (!isVendorMapped) {
              mappingErrorMessage = `Missing Yardi mapping for Vendor (${invoiceVendorName})`;
            } else if (!isEntityMapped) {
              mappingErrorMessage = `Missing Yardi mapping for Entity (${targetEntityName})`;
            }

            records.push({
              id: recordId,
              batchId,
              invoiceId: inv.id,
              invoiceNumber: inv.invoiceNumber,
              invoiceDisplayId: inv.invoiceIdDisplay || `#${invIndex + 1}`,
              invoiceDate,
              dueDate,
              ourVendorName: invoiceVendorName,
              ourVendorCode,
              yardiVendorCode,
              ourEntityName: targetEntityName,
              ourEntityCode,
              yardiEntityCode,
              glCode,
              lineDescription: finalDesc,
              splitPercent: splitPct,
              lineOriginalAmount: lineTotal,
              apportionedNetAmount: Number(apportionedNet.toFixed(2)),
              apportionedTaxAmount: Number(apportionedTax.toFixed(2)),
              apportionedGrossAmount: Number(apportionedGross.toFixed(2)),
              currency: invCurrency,
              exchangeRate,
              apportionedUsdAmount: Number(apportionedUsd.toFixed(2)),
              poNumber,
              jobNumber,
              paymentTerms,
              notes,
              status: inv.status || 'Verified',
              postMonth,
              expensesType,
              category,
              vendorVatNumber,
              fromDate,
              toDate,
              isVendorMapped,
              isEntityMapped,
              hasMappingError,
              mappingErrorMessage,
              lineItemId: lineItem.id || `LI-${lineIdx + 1}`,
              splitIndex: appIdx + 1,
              totalSplitsForInvoice: inv.apportionment!.length,
              removedFromBatchId: inv.removedFromBatchId,
              removedFromBatchName: inv.removedFromBatchName
            });
          });
        }
        // Subcase 1C: Single entity invoice with rich line items
        else {
          const recordId = `${inv.id}_li${lineIdx}`;
          const targetEntityName = inv.payingEntity || inv.entity || inv.entityName || 'Default Operating Entity';
          const eMap = findEntityMapping(targetEntityName, entityMappings);
          const defaultYardiEntityCode = eMap && eMap.status === 'Mapped' ? eMap.yardiEntityCode : '';
          const ourEntityCode = eMap?.ourEntityCode || `ENT-${targetEntityName.slice(0, 4).toUpperCase()}`;

          const override = recordOverrides[recordId] || {};
          const yardiVendorCode = override.yardiVendorCode ?? defaultYardiVendorCode;
          const yardiEntityCode = override.yardiEntityCode ?? defaultYardiEntityCode;
          const glCode = override.glCode ?? lineGlCode;
          const finalDesc = override.lineDescription ?? lineDesc;
          const defaultNote = `Inv ${inv.invoiceNumber} • ${finalDesc} • ${targetEntityName}`;
          const notes = override.notes ?? defaultNote;

          const apportionedUsd = invCurrency === 'USD' ? lineTotal : lineTotal * exchangeRate;
          const isVendorMapped = Boolean(yardiVendorCode.trim());
          const isEntityMapped = Boolean(yardiEntityCode.trim());
          const hasMappingError = !isVendorMapped || !isEntityMapped;
          let mappingErrorMessage = '';
          if (!isVendorMapped && !isEntityMapped) {
            mappingErrorMessage = `Missing Yardi mapping for Vendor (${invoiceVendorName}) and Entity (${targetEntityName})`;
          } else if (!isVendorMapped) {
            mappingErrorMessage = `Missing Yardi mapping for Vendor (${invoiceVendorName})`;
          } else if (!isEntityMapped) {
            mappingErrorMessage = `Missing Yardi mapping for Entity (${targetEntityName})`;
          }

          records.push({
            id: recordId,
            batchId,
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            invoiceDisplayId: inv.invoiceIdDisplay || `#${invIndex + 1}`,
            invoiceDate,
            dueDate,
            ourVendorName: invoiceVendorName,
            ourVendorCode,
            yardiVendorCode,
            ourEntityName: targetEntityName,
            ourEntityCode,
            yardiEntityCode,
            glCode,
            lineDescription: finalDesc,
            splitPercent: 100,
            lineOriginalAmount: lineTotal,
            apportionedNetAmount: Number(lineNet.toFixed(2)),
            apportionedTaxAmount: Number(lineTax.toFixed(2)),
            apportionedGrossAmount: Number(lineTotal.toFixed(2)),
            currency: invCurrency,
            exchangeRate,
            apportionedUsdAmount: Number(apportionedUsd.toFixed(2)),
            poNumber,
            jobNumber,
            paymentTerms,
            notes,
            status: inv.status || 'Verified',
            postMonth,
            expensesType,
            category,
            vendorVatNumber,
            fromDate,
            toDate,
            isVendorMapped,
            isEntityMapped,
            hasMappingError,
            mappingErrorMessage,
            lineItemId: lineItem.id || `LI-${lineIdx + 1}`,
            splitIndex: 1,
            totalSplitsForInvoice: 1,
            removedFromBatchId: inv.removedFromBatchId,
            removedFromBatchName: inv.removedFromBatchName
          });
        }
      });
    }
    // Case 2: Invoice has apportionment splits but no richLineItems array
    else if (inv.apportionment && inv.apportionment.length > 0) {
      inv.apportionment.forEach((app, appIdx) => {
        const recordId = `${inv.id}_app${appIdx}`;
        const targetEntityName = app.payingEntity;
        const eMap = findEntityMapping(targetEntityName, entityMappings);
        const defaultYardiEntityCode = eMap && eMap.status === 'Mapped' ? eMap.yardiEntityCode : '';
        const ourEntityCode = eMap?.ourEntityCode || `ENT-${targetEntityName.slice(0, 4).toUpperCase()}`;

        const override = recordOverrides[recordId] || {};
        const yardiVendorCode = override.yardiVendorCode ?? defaultYardiVendorCode;
        const yardiEntityCode = override.yardiEntityCode ?? defaultYardiEntityCode;
        const glCode = override.glCode ?? vMap?.defaultGlAccount ?? 'GL-6000 OPEX';
        const lineDesc = inv.description || inv.expensesType || 'Invoice Allocation';
        const finalDesc = override.lineDescription ?? lineDesc;
        const defaultNote = `Inv ${inv.invoiceNumber} • ${finalDesc} • ${targetEntityName} (${app.percent.toFixed(1)}%)`;
        const notes = override.notes ?? defaultNote;

        const splitPct = app.percent;
        const apportionedGross = app.gross ?? (inv.amount * splitPct) / 100;
        const apportionedNet = app.net ?? apportionedGross;
        const apportionedTax = app.vat ?? 0;
        const apportionedUsd = invCurrency === 'USD' ? apportionedGross : apportionedGross * exchangeRate;

        const isVendorMapped = Boolean(yardiVendorCode.trim());
        const isEntityMapped = Boolean(yardiEntityCode.trim());
        const hasMappingError = !isVendorMapped || !isEntityMapped;
        let mappingErrorMessage = '';
        if (!isVendorMapped && !isEntityMapped) {
          mappingErrorMessage = `Missing Yardi mapping for Vendor (${invoiceVendorName}) and Entity (${targetEntityName})`;
        } else if (!isVendorMapped) {
          mappingErrorMessage = `Missing Yardi mapping for Vendor (${invoiceVendorName})`;
        } else if (!isEntityMapped) {
          mappingErrorMessage = `Missing Yardi mapping for Entity (${targetEntityName})`;
        }

        records.push({
          id: recordId,
          batchId,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          invoiceDisplayId: inv.invoiceIdDisplay || `#${invIndex + 1}`,
          invoiceDate,
          dueDate,
          ourVendorName: invoiceVendorName,
          ourVendorCode,
          yardiVendorCode,
          ourEntityName: targetEntityName,
          ourEntityCode,
          yardiEntityCode,
          glCode,
          lineDescription: finalDesc,
          splitPercent: splitPct,
          lineOriginalAmount: inv.amount,
          apportionedNetAmount: Number(apportionedNet.toFixed(2)),
          apportionedTaxAmount: Number(apportionedTax.toFixed(2)),
          apportionedGrossAmount: Number(apportionedGross.toFixed(2)),
          currency: invCurrency,
          exchangeRate,
          apportionedUsdAmount: Number(apportionedUsd.toFixed(2)),
          poNumber,
          jobNumber,
          paymentTerms,
          notes,
          status: inv.status || 'Verified',
          postMonth,
          expensesType,
          category,
          vendorVatNumber,
          fromDate,
          toDate,
          isVendorMapped,
          isEntityMapped,
          hasMappingError,
          mappingErrorMessage,
          lineItemId: `APPORTION-${appIdx + 1}`,
          splitIndex: appIdx + 1,
          totalSplitsForInvoice: inv.apportionment!.length,
          removedFromBatchId: inv.removedFromBatchId,
          removedFromBatchName: inv.removedFromBatchName
        });
      });
    }
    // Case 3: Simple 1-to-1 single invoice
    else {
      const recordId = `${inv.id}_row0`;
      const targetEntityName = inv.payingEntity || inv.entity || inv.entityName || 'Default Operating Entity';
      const eMap = findEntityMapping(targetEntityName, entityMappings);
      const defaultYardiEntityCode = eMap && eMap.status === 'Mapped' ? eMap.yardiEntityCode : '';
      const ourEntityCode = eMap?.ourEntityCode || `ENT-${targetEntityName.slice(0, 4).toUpperCase()}`;

      const override = recordOverrides[recordId] || {};
      const yardiVendorCode = override.yardiVendorCode ?? defaultYardiVendorCode;
      const yardiEntityCode = override.yardiEntityCode ?? defaultYardiEntityCode;
      const glCode = override.glCode ?? vMap?.defaultGlAccount ?? (inv.expensesType ? `GL-5000 ${inv.expensesType}` : 'GL-6000 OPEX');
      const lineDesc = inv.description || inv.expensesType || 'Invoice Service Charge';
      const finalDesc = override.lineDescription ?? lineDesc;
      const defaultNote = `Inv ${inv.invoiceNumber} • ${finalDesc}`;
      const notes = override.notes ?? defaultNote;

      const totalGross = inv.amount;
      const totalNet = (inv as any).totalExVat ?? totalGross;
      const totalTax = (inv as any).taxAmount ?? 0;
      const apportionedUsd = invCurrency === 'USD' ? totalGross : totalGross * exchangeRate;

      const isVendorMapped = Boolean(yardiVendorCode.trim());
      const isEntityMapped = Boolean(yardiEntityCode.trim());
      const hasMappingError = !isVendorMapped || !isEntityMapped;
      let mappingErrorMessage = '';
      if (!isVendorMapped && !isEntityMapped) {
        mappingErrorMessage = `Missing Yardi mapping for Vendor (${invoiceVendorName}) and Entity (${targetEntityName})`;
      } else if (!isVendorMapped) {
        mappingErrorMessage = `Missing Yardi mapping for Vendor (${invoiceVendorName})`;
      } else if (!isEntityMapped) {
        mappingErrorMessage = `Missing Yardi mapping for Entity (${targetEntityName})`;
      }

      records.push({
        id: recordId,
        batchId,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDisplayId: inv.invoiceIdDisplay || `#${invIndex + 1}`,
        invoiceDate,
        dueDate,
        ourVendorName: invoiceVendorName,
        ourVendorCode,
        yardiVendorCode,
        ourEntityName: targetEntityName,
        ourEntityCode,
        yardiEntityCode,
        glCode,
        lineDescription: finalDesc,
        splitPercent: 100,
        lineOriginalAmount: totalGross,
        apportionedNetAmount: Number(totalNet.toFixed(2)),
        apportionedTaxAmount: Number(totalTax.toFixed(2)),
        apportionedGrossAmount: Number(totalGross.toFixed(2)),
        currency: invCurrency,
        exchangeRate,
        apportionedUsdAmount: Number(apportionedUsd.toFixed(2)),
        poNumber,
        jobNumber,
        paymentTerms,
        notes,
        status: inv.status || 'Verified',
        postMonth,
        expensesType,
        category,
        vendorVatNumber,
        fromDate,
        toDate,
        isVendorMapped,
        isEntityMapped,
        hasMappingError,
        mappingErrorMessage,
        lineItemId: 'LI-SINGLE-1',
        splitIndex: 1,
        totalSplitsForInvoice: 1,
        removedFromBatchId: inv.removedFromBatchId,
        removedFromBatchName: inv.removedFromBatchName
      });
    }
  });

  return records;
}

/**
 * Exports records to standard Yardi Voyager / PayScan Loader CSV format matching the exact
 * 87 columns from the Yardi loader specification.
 */
export function exportToYardiVoyagerCsv(records: YardiEtlRecord[]): string {
  const header = YARDI_VOYAGER_SCHEMA_COLUMNS.join(',');

  const rows = records.map((r, rowIdx) => {
    const escapeCsv = (val: string | number | undefined | null) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    
    // Exact column values matching YARDI_VOYAGER_SCHEMA_COLUMNS:
    const colValues = [
      escapeCsv(r.invoiceNumber || `TRN-${rowIdx + 1}`), // TRANNUM
      escapeCsv(r.yardiVendorCode || 'UNMAPPED'), // PERSON (Yardi Vendor Code)
      escapeCsv('2000'), // OFFSET (Payable Offset Account)
      escapeCsv('0'), // ACCRUAL
      escapeCsv(r.postMonth || '08/2026'), // POSTMONTH
      escapeCsv(r.invoiceDate), // DATE
      escapeCsv(r.dueDate), // DUEDATE
      r.apportionedGrossAmount.toFixed(2), // AMOUNT
      escapeCsv(r.yardiEntityCode || 'UNMAPPED'), // PROPERTY (Yardi Property Code)
      escapeCsv(r.ourEntityCode || r.yardiEntityCode || 'PROP-01'), // Ref_Property_Id
      escapeCsv(r.glCode), // ACCOUNT (GL Account Code)
      escapeCsv(r.notes || r.lineDescription), // NOTES
      escapeCsv(r.invoiceNumber), // REF
      escapeCsv(r.poNumber || ''), // CHECKNUM
      escapeCsv(r.yardiEntityCode || ''), // SEGMENT1
      escapeCsv('FUND-01'), // SEGMENT2
      escapeCsv('DEPT-OPS'), // SEGMENT3
      escapeCsv(''), // SEGMENT4
      escapeCsv(''), // SEGMENT5
      escapeCsv(''), // SEGMENT6
      escapeCsv(''), // SEGMENT7
      escapeCsv(''), // SEGMENT8
      escapeCsv(''), // SEGMENT9
      escapeCsv(''), // SEGMENT10
      escapeCsv(''), // SEGMENT11
      escapeCsv(''), // SEGMENT12
      escapeCsv(r.lineDescription), // DetailNotes
      escapeCsv(r.expensesType || 'EXP'), // EXPENSETYPE
      r.apportionedTaxAmount.toFixed(2), // DETAILTAXAMOUNT
      '0.00', // DETAILTAXAMOUNT2
      r.apportionedGrossAmount.toFixed(2), // DETAILTRANAMOUNT
      escapeCsv('STANDARD'), // DETAILVATRANTYPEID
      escapeCsv(r.currency === 'GBP' ? 'UK_VAT_20' : 'US_SALES_TAX'), // DETAILVATRATEID
      escapeCsv(r.currency), // TRANCURRENCY
      r.exchangeRate.toFixed(4), // EXCHANGERATE
      escapeCsv(r.invoiceDate), // EXCHANGERATEDATE
      '1.0000', // EXCHANGEFACTOR
      'N', // EXCHANGEOVERRIDE
      r.apportionedUsdAmount.toFixed(2), // AMOUNT2 (USD Amount)
      escapeCsv(r.fromDate || r.invoiceDate), // FROMDATE
      escapeCsv(r.toDate || r.dueDate), // TODATE
      escapeCsv(r.invoiceDisplayId || r.invoiceNumber), // DOCUMENTSEQUENCENUMBER
      escapeCsv('INVOICE'), // DISPLAYTYPE
      escapeCsv(r.id), // INTERNATIONALSEQUENCENO
      escapeCsv(r.lineDescription), // NOTES2
      escapeCsv('STANDARD'), // DETAILVATRANTYPEID
      escapeCsv('TAX_STD'), // DETAILVATRATEID
      '0.00', // Labour
      r.apportionedGrossAmount.toFixed(2), // Material
      '0.00', // CITBLevy
      '0.00', // Manufacturing
      '0.00', // Travel
      '0.00', // NonCisLabor
      escapeCsv(r.ourEntityName), // FundingEntity
      escapeCsv(r.jobNumber || 'JOB-2026'), // JOB
      escapeCsv(r.category || 'OPEX Services'), // CATEGORY
      escapeCsv(r.poNumber || ''), // CONTRACT
      escapeCsv(r.glCode), // COSTCODE
      escapeCsv(r.ourVendorName), // USERDEF1
      escapeCsv(r.ourEntityName), // USERDEF2
      escapeCsv(''), // UserDefined3
      escapeCsv(''), // UserDefined4
      escapeCsv(''), // UserDefined5
      escapeCsv(''), // UserDefined6
      escapeCsv(''), // UserDefined7
      escapeCsv(''), // UserDefined8
      escapeCsv(''), // UserDefined9
      escapeCsv(''), // UserDefined10
      escapeCsv('APPROVED'), // WORKFLOWSTATUS
      escapeCsv('SYSTEM_RECON'), // WORKFLOWUSER
      escapeCsv(r.invoiceDate), // WORKFLOWDATE
      escapeCsv(''), // DETAILFIELD1
      escapeCsv(''), // DETAILFIELD2
      escapeCsv(''), // DETAILFIELD3
      escapeCsv(''), // DETAILFIELD4
      escapeCsv(''), // DETAILFIELD5
      escapeCsv(''), // DETAILFIELD6
      escapeCsv(''), // DETAILFIELD7
      escapeCsv(''), // DETAILFIELD8
      escapeCsv('N'), // ISCONSOLIDATED
      escapeCsv('N'), // CREDITMEMO
      escapeCsv('N'), // ADJUSTMENT
      r.apportionedGrossAmount.toFixed(2), // Material
      '0.00', // CITBLevy
      '0.00', // Manufacturing
      '0.00', // Travel
      '0.00' // NonCisLabor
    ];

    return colValues.join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Exports records to NetSuite Invoice Sync CSV format.
 */
export function exportToNetSuiteCsv(records: YardiEtlRecord[]): string {
  const header = [
    'TRANSACTION_ID',
    'SUBSIDIARY_CODE',
    'ENTITY_NAME',
    'TRANSACTION_DATE',
    'DUE_DATE',
    'ACCOUNT_NUMBER',
    'MEMO',
    'DEBIT_AMOUNT',
    'CREDIT_AMOUNT',
    'CURRENCY',
    'EXCHANGE_RATE',
    'PO_REF',
    'DEPARTMENT_CODE'
  ].join(',');

  const rows = records.map(r => {
    const escapeCsv = (val: string | number) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    return [
      escapeCsv(r.invoiceNumber),
      escapeCsv(r.yardiEntityCode || r.ourEntityCode),
      escapeCsv(r.yardiVendorCode || r.ourVendorCode),
      escapeCsv(r.invoiceDate),
      escapeCsv(r.dueDate),
      escapeCsv(r.glCode),
      escapeCsv(r.notes || r.lineDescription),
      r.apportionedGrossAmount.toFixed(2),
      '0.00',
      escapeCsv(r.currency),
      r.exchangeRate.toFixed(4),
      escapeCsv(r.poNumber),
      escapeCsv(r.jobNumber || 'CORP')
    ].join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Exports records to SAP AR/AP Feed CSV format.
 */
export function exportToSapCsv(records: YardiEtlRecord[]): string {
  const header = [
    'SAP_BATCH_REF',
    'DOC_TYPE',
    'COMPANY_CODE',
    'VENDOR_ACCOUNT',
    'DOC_DATE',
    'POSTING_DATE',
    'GL_CODE',
    'AMOUNT_DOC_CURR',
    'DOC_CURRENCY',
    'TAX_CODE',
    'ASSIGNMENT_REF',
    'ITEM_TEXT',
    'NOTES'
  ].join(';');

  const rows = records.map(r => {
    return [
      r.batchId,
      'KR',
      r.yardiEntityCode || '1000',
      r.yardiVendorCode || 'VND999',
      r.invoiceDate.replace(/[^0-9]/g, ''),
      new Date().toISOString().slice(0, 10).replace(/-/g, ''),
      r.glCode,
      r.apportionedGrossAmount.toFixed(2),
      r.currency,
      r.apportionedTaxAmount > 0 ? 'V1' : 'V0',
      r.poNumber || r.invoiceNumber,
      `"${r.lineDescription.replace(/"/g, '')}"`,
      `"${r.notes.replace(/"/g, '')}"`
    ].join(';');
  });

  return [header, ...rows].join('\n');
}

/**
 * Exports records to JSON Stream format.
 */
export function exportToJsonStream(records: YardiEtlRecord[], batchId: string): string {
  return JSON.stringify(
    {
      batchId,
      generatedAt: new Date().toISOString(),
      format: 'YARDI_VOYAGER_LOADER_EXPANDED',
      totalRecordsCount: records.length,
      records
    },
    null,
    2
  );
}

/**
 * Exports records to PEPPOL / UBL XML format.
 */
export function exportToPeppolXml(records: YardiEtlRecord[], batchId: string): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<YardiLoaderStream xmlns="urn:yardi:voyager:payscan:loader:v1">\n`;
  xml += `  <BatchHeader>\n    <BatchID>${batchId}</BatchID>\n    <TotalRecords>${records.length}</TotalRecords>\n    <GeneratedAt>${new Date().toISOString()}</GeneratedAt>\n  </BatchHeader>\n  <LoaderRecords>\n`;

  records.forEach(r => {
    xml += `    <Record id="${r.id}">\n`;
    xml += `      <PropertyCode>${r.yardiEntityCode}</PropertyCode>\n`;
    xml += `      <VendorCode>${r.yardiVendorCode}</VendorCode>\n`;
    xml += `      <InvoiceNumber>${r.invoiceNumber}</InvoiceNumber>\n`;
    xml += `      <InvoiceDate>${r.invoiceDate}</InvoiceDate>\n`;
    xml += `      <DueDate>${r.dueDate}</DueDate>\n`;
    xml += `      <GLAccount>${r.glCode}</GLAccount>\n`;
    xml += `      <Amount currency="${r.currency}">${r.apportionedGrossAmount.toFixed(2)}</Amount>\n`;
    xml += `      <TaxAmount>${r.apportionedTaxAmount.toFixed(2)}</TaxAmount>\n`;
    xml += `      <SplitPercent>${r.splitPercent.toFixed(2)}</SplitPercent>\n`;
    xml += `      <Description><![CDATA[${r.lineDescription}]]></Description>\n`;
    xml += `      <Notes><![CDATA[${r.notes}]]></Notes>\n`;
    xml += `      <PONumber>${r.poNumber}</PONumber>\n`;
    xml += `      <JobNumber>${r.jobNumber}</JobNumber>\n`;
    xml += `    </Record>\n`;
  });

  xml += `  </LoaderRecords>\n</YardiLoaderStream>`;
  return xml;
}

/**
 * Universal formatter dispatcher.
 */
export function formatEtlContent(
  records: YardiEtlRecord[],
  format: InvoiceETLFormat,
  batchId: string
): string {
  switch (format) {
    case 'YARDI_VOYAGER_LOADER':
      return exportToYardiVoyagerCsv(records);
    case 'NETSUITE_INVOICE_SYNC':
      return exportToNetSuiteCsv(records);
    case 'SAP_AR_AP_FEED':
      return exportToSapCsv(records);
    case 'JSON_INVOICE_STREAM':
      return exportToJsonStream(records, batchId);
    case 'XML_PEPPOL_UBL':
      return exportToPeppolXml(records, batchId);
    case 'CSV_INVOICE_RECON':
    case 'QUICKBOOKS_INVOICE_JOURNAL':
    default:
      return exportToYardiVoyagerCsv(records);
  }
}
