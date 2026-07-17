import {
  CASH_DISCREPANCY_THRESHOLD_XOF,
  reconcile,
} from './cash-drawer.service';
import { CashDrawerStatus } from './entities/cash-drawer-session.entity';

describe('cash drawer reconcile()', () => {
  const base = {
    startingAmountXof: 20000,
    cashExpensesXof: 0,
    threshold: CASH_DISCREPANCY_THRESHOLD_XOF,
  };

  it('exact match -> closed, zero discrepancy', () => {
    const r = reconcile({ ...base, cashInXof: 15000, endingAmountXof: 35000 });
    expect(r.expectedAmountXof).toBe(35000);
    expect(r.discrepancyXof).toBe(0);
    expect(r.status).toBe(CashDrawerStatus.CLOSED);
  });

  it('overage beyond threshold -> flagged, positive discrepancy', () => {
    const r = reconcile({ ...base, cashInXof: 15000, endingAmountXof: 36000 });
    expect(r.expectedAmountXof).toBe(35000);
    expect(r.discrepancyXof).toBe(1000);
    expect(r.status).toBe(CashDrawerStatus.FLAGGED);
  });

  it('shortage beyond threshold -> flagged, negative discrepancy', () => {
    const r = reconcile({ ...base, cashInXof: 15000, endingAmountXof: 34000 });
    expect(r.expectedAmountXof).toBe(35000);
    expect(r.discrepancyXof).toBe(-1000);
    expect(r.status).toBe(CashDrawerStatus.FLAGGED);
  });

  it('within threshold (<=500) -> closed', () => {
    const r = reconcile({ ...base, cashInXof: 15000, endingAmountXof: 35500 });
    expect(r.discrepancyXof).toBe(500);
    expect(r.status).toBe(CashDrawerStatus.CLOSED);
  });

  it('subtracts cash expenses from the expected amount', () => {
    const r = reconcile({
      ...base,
      cashInXof: 15000,
      cashExpensesXof: 2000,
      endingAmountXof: 33000,
    });
    expect(r.expectedAmountXof).toBe(33000);
    expect(r.status).toBe(CashDrawerStatus.CLOSED);
  });
});
