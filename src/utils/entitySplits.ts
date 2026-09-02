import { MatchedInvoice, InvoiceBatchItem } from '../types/reconciliation';

export interface EntitySplitSummary {
  entityName: string;
  role: string;
  percent: number;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  convertedAmount: number;
  glCodes: string[];
}

/**
 * Computes structured multi-entity split allocations for an invoice.
 * Supports:
 * 1. Line-item GL target splits (e.g. fund-level apportionments in richLineItems)
 * 2. Multi-entity apportionments (e.g. invoice.apportionment)
 * 3. Single entity default fallback
 */
export function computeEntitySplits(inv: InvoiceBatchItem | MatchedInvoice): EntitySplitSummary[] {
  const fxRate = inv.exchangeRate || 1;

  // 1. Check if richLineItems have target splits
  if (inv.richLineItems && inv.richLineItems.length > 0) {
    const targetMap = new Map<string, {
      entityName: string;
      netAmount: number;
      vatAmount: number;
      grossAmount: number;
      glCodes: Set<string>;
    }>();

    let hasAnySplit = false;

    inv.richLineItems.forEach(item => {
      if (item.splits && item.splits.length > 0) {
        hasAnySplit = true;
        item.splits.forEach(sp => {
          const key = sp.target;
          const existing = targetMap.get(key) || {
            entityName: key,
            netAmount: 0,
            vatAmount: 0,
            grossAmount: 0,
            glCodes: new Set<string>()
          };
          existing.netAmount += sp.amount;
          existing.vatAmount += sp.vat || 0;
          existing.grossAmount += sp.totalAmount || sp.amount;
          if (item.glCode) existing.glCodes.add(item.glCode);
          targetMap.set(key, existing);
        });
      }
    });

    if (hasAnySplit && targetMap.size > 0) {
      const totalGross = inv.amount || Array.from(targetMap.values()).reduce((acc, curr) => acc + curr.grossAmount, 0);

      return Array.from(targetMap.values()).map(item => {
        const percent = totalGross > 0 ? (item.grossAmount / totalGross) * 100 : 0;
        return {
          entityName: item.entityName,
          role: 'Fund / Subsidiary Allocation',
          percent: percent,
          netAmount: Number(item.netAmount.toFixed(2)),
          vatAmount: Number(item.vatAmount.toFixed(2)),
          grossAmount: Number(item.grossAmount.toFixed(2)),
          convertedAmount: Number((item.grossAmount * fxRate).toFixed(2)),
          glCodes: Array.from(item.glCodes)
        };
      });
    }
  }

  // 2. Check if apportionment has multiple items
  if (inv.apportionment && inv.apportionment.length > 1) {
    return inv.apportionment.map(ap => ({
      entityName: ap.payingEntity,
      role: ap.bank ? `Paying via ${ap.bank}` : 'Paying Co-Entity',
      percent: ap.percent,
      netAmount: ap.net,
      vatAmount: ap.vat,
      grossAmount: ap.gross,
      convertedAmount: Number((ap.gross * fxRate).toFixed(2)),
      glCodes: []
    }));
  }

  // 3. Fallback: single entity
  const singleName = inv.payingEntity || inv.entity || inv.entityName || 'Main Operating Entity';
  return [{
    entityName: singleName,
    role: 'Primary Operating Entity',
    percent: 100,
    netAmount: inv.amount,
    vatAmount: 0,
    grossAmount: inv.amount,
    convertedAmount: Number((inv.convertedAmount ?? (inv.currency === 'USD' ? inv.amount : inv.amount * fxRate)).toFixed(2)),
    glCodes: []
  }];
}
