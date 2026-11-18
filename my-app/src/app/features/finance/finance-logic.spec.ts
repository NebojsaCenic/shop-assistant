import type { FinanceCategory, FinanceTransaction } from './finance.model';
import { getFinanceRangeSummary, getSalaryPeriods } from './finance-logic';

describe('finance logic', () => {
  const categories: FinanceCategory[] = [
    { id: 'food', name: 'Hrana', icon: '🍎', isActive: true, createdAt: '' },
    { id: 'bills', name: 'Računi', icon: '🧾', isActive: true, createdAt: '' },
  ];

  it('creates salary-to-salary periods with inclusive end dates', () => {
    const transactions: FinanceTransaction[] = [
      { id: 'salary-one', type: 'salary', amount: 100000, categoryId: null, date: '2026-10-05', createdAt: '' },
      { id: 'salary-two', type: 'salary', amount: 105000, categoryId: null, date: '2026-11-05', createdAt: '' },
    ];

    expect(getSalaryPeriods(transactions, '2026-11-18')).toEqual([
      { startDate: '2026-11-05', endDate: '2026-11-18' },
      { startDate: '2026-10-05', endDate: '2026-11-04' },
    ]);
  });

  it('carries prior balance forward and adds other income without opening a period', () => {
    const transactions: FinanceTransaction[] = [
      { id: 'salary-one', type: 'salary', amount: 100000, categoryId: null, date: '2026-10-05', createdAt: '' },
      { id: 'food-one', type: 'expense', amount: 30000, categoryId: 'food', date: '2026-10-10', createdAt: '' },
      { id: 'bonus', type: 'other_income', amount: 5000, categoryId: null, date: '2026-10-20', createdAt: '' },
      { id: 'salary-two', type: 'salary', amount: 100000, categoryId: null, date: '2026-11-05', createdAt: '' },
      { id: 'bills-one', type: 'expense', amount: 20000, categoryId: 'bills', date: '2026-11-06', createdAt: '' },
      { id: 'food-two', type: 'expense', amount: 10000, categoryId: 'food', date: '2026-11-07', createdAt: '' },
    ];

    expect(getFinanceRangeSummary(transactions, categories, '2026-11-05', '2026-11-18')).toMatchObject({
      openingBalance: 75000,
      income: 100000,
      expenses: 30000,
      balance: 145000,
      categoryExpenses: [
        { categoryId: 'bills', amount: 20000 },
        { categoryId: 'food', amount: 10000 },
      ],
    });
  });
});
