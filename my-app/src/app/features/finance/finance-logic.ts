import type { FinanceCategory, FinanceTransaction } from './finance.model';

export interface SalaryPeriod {
  startDate: string;
  endDate: string;
}

export interface CategoryExpense {
  categoryId: string;
  name: string;
  icon: string;
  amount: number;
  color: string;
}

export interface FinanceRangeSummary {
  openingBalance: number;
  income: number;
  expenses: number;
  balance: number;
  categoryExpenses: CategoryExpense[];
}

const categoryColors = [
  '#39765a',
  '#cf7443',
  '#4b78a8',
  '#a4514c',
  '#9b7a32',
  '#6c638f',
  '#4c8387',
  '#aa6486',
  '#728146',
  '#69717b',
];

export function getSalaryPeriods(
  transactions: FinanceTransaction[],
  today: string,
): SalaryPeriod[] {
  const starts = [
    ...new Set(
      transactions
        .filter((transaction) => transaction.type === 'salary' && transaction.date <= today)
        .map((transaction) => transaction.date),
    ),
  ].sort();

  return starts
    .map((startDate, index) => ({
      startDate,
      endDate: starts[index + 1]
        ? shiftDate(starts[index + 1], -1)
        : today,
    }))
    .reverse();
}

export function getFinanceRangeSummary(
  transactions: FinanceTransaction[],
  categories: FinanceCategory[],
  startDate: string,
  endDate: string,
): FinanceRangeSummary {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const openingBalance = transactions
    .filter((transaction) => transaction.date < startDate)
    .reduce((balance, transaction) => balance + signedAmount(transaction), 0);
  const inRange = transactions.filter(
    (transaction) => transaction.date >= startDate && transaction.date <= endDate,
  );
  const income = inRange
    .filter((transaction) => transaction.type !== 'expense')
    .reduce((total, transaction) => total + transaction.amount, 0);
  const expenses = inRange
    .filter((transaction) => transaction.type === 'expense')
    .reduce((total, transaction) => total + transaction.amount, 0);
  const expenseByCategory = new Map<string, number>();

  for (const transaction of inRange) {
    if (transaction.type === 'expense' && transaction.categoryId) {
      expenseByCategory.set(
        transaction.categoryId,
        (expenseByCategory.get(transaction.categoryId) ?? 0) + transaction.amount,
      );
    }
  }

  const categoryExpenses = [...expenseByCategory.entries()]
    .map(([categoryId, amount]) => {
      const category = categoryById.get(categoryId);
      return {
        categoryId,
        name: category?.name ?? 'Uklonjena kategorija',
        icon: category?.icon ?? '●',
        amount,
        color: getCategoryColor(categoryId),
      };
    })
    .sort((first, second) => second.amount - first.amount);

  return {
    openingBalance,
    income,
    expenses,
    balance: openingBalance + income - expenses,
    categoryExpenses,
  };
}

export function getCategoryColor(categoryId: string): string {
  const hash = [...categoryId].reduce((value, character) => value + character.charCodeAt(0), 0);
  return categoryColors[hash % categoryColors.length];
}

function signedAmount(transaction: FinanceTransaction): number {
  return transaction.type === 'expense' ? -transaction.amount : transaction.amount;
}

function shiftDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
