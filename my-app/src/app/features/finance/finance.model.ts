export type FinanceTransactionType = 'expense' | 'salary' | 'other_income';

export interface FinanceCategory {
  id: string;
  name: string;
  icon: string;
  isActive: boolean;
  createdAt: string;
}

export interface FinanceTransaction {
  id: string;
  type: FinanceTransactionType;
  amount: number;
  categoryId: string | null;
  date: string;
  createdAt: string;
}

export interface FinanceCategoryDraft {
  name: string;
  icon: string;
}

export interface FinanceTransactionDraft {
  type: FinanceTransactionType;
  amount: number;
  categoryId: string | null;
  date: string;
}

export type FinanceServiceResult<T> =
  | { success: true; data: T }
  | { success: false; message: string };

export const DEFAULT_FINANCE_CATEGORIES: FinanceCategoryDraft[] = [
  { name: 'Hrana', icon: '🍎' },
  { name: 'Automobil', icon: '🚗' },
  { name: 'Računi', icon: '🧾' },
  { name: 'Zdravlje', icon: '✚' },
  { name: 'Kuća', icon: '⌂' },
];

export const FINANCE_CATEGORY_ICONS = [
  '🍎', '🥦', '🍞', '🥩', '🍕', '☕', '🍺', '🍷', '🍸', '🥂',
  '🧴', '🧼', '🪥', '🚽', '🛁', '🧹', '🧽', '🧻', '💄', '💇',
  '🚗', '🏍️', '⛽', '🚌', '🚲', '🅿', '🔧', '🧾', '💡', '💧', '📱',
  '✚', '💊', '🩺', '🏋', '⌂', '🏠', '🛋', '🌱', '🐾', '🎓', '📚',
  '🎁', '🎉', '✈', '🏖', '🎬', '🎮', '🎵', '👕', '👟', '🛒',
  '💰', '💳', '💼', '👶', '●',
];
