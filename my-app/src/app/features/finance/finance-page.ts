import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { nonWhitespaceValidator } from '../../shared/validators/non-whitespace.validator';
import {
  DEFAULT_FINANCE_CATEGORIES,
  FINANCE_CATEGORY_ICONS,
  type FinanceCategory,
  type FinanceTransaction,
  type FinanceTransactionType,
} from './finance.model';
import {
  getCategoryColor,
  getFinanceRangeSummary,
  getSalaryPeriods,
  type SalaryPeriod,
} from './finance-logic';
import { FinanceService } from './finance.service';

type PeriodMode = 'salary' | 'month' | 'custom';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-finance-page',
  styleUrl: './finance-page.scss',
  templateUrl: './finance-page.html',
  standalone: true,
})
export class FinancePage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly financeService = inject(FinanceService);

  readonly today = localDate();
  readonly categories = signal<FinanceCategory[]>([]);
  readonly transactions = signal<FinanceTransaction[]>([]);
  readonly isLoading = signal(true);
  readonly isMutating = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly transactionType = signal<FinanceTransactionType>('expense');
  readonly periodMode = signal<PeriodMode>('salary');
  readonly selectedCycleStart = signal('');
  readonly selectedMonth = signal(this.today.slice(0, 7));
  readonly customStart = signal(firstOfMonth(this.today));
  readonly customEnd = signal(this.today);
  readonly editingTransaction = signal<FinanceTransaction | null>(null);
  readonly pendingDeleteId = signal<string | null>(null);
  readonly pendingArchiveId = signal<string | null>(null);
  readonly selectedIcon = signal(DEFAULT_FINANCE_CATEGORIES[0].icon);
  readonly categoryIcons = FINANCE_CATEGORY_ICONS;

  readonly categoryForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, nonWhitespaceValidator]],
  });
  readonly transactionForm = this.formBuilder.group({
    amount: this.formBuilder.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    categoryId: this.formBuilder.nonNullable.control('', Validators.required),
    date: this.formBuilder.nonNullable.control(this.today, Validators.required),
  });

  readonly activeCategories = computed(() => this.categories().filter((category) => category.isActive));
  readonly archivedCategories = computed(() => this.categories().filter((category) => !category.isActive));
  readonly transactionCategories = computed(() => {
    const active = this.activeCategories();
    const editingCategoryId = this.editingTransaction()?.categoryId;
    if (!editingCategoryId || active.some((category) => category.id === editingCategoryId)) {
      return active;
    }
    const archived = this.categories().find((category) => category.id === editingCategoryId);
    return archived ? [...active, archived] : active;
  });
  readonly salaryPeriods = computed<SalaryPeriod[]>(() =>
    getSalaryPeriods(this.transactions(), this.today),
  );
  readonly selectedRange = computed(() => {
    if (this.periodMode() === 'month') {
      const month = this.selectedMonth();
      return { startDate: `${month}-01`, endDate: lastOfMonth(month) };
    }
    if (this.periodMode() === 'custom') {
      return { startDate: this.customStart(), endDate: this.customEnd() };
    }

    const periods = this.salaryPeriods();
    const selected =
      periods.find((period) => period.startDate === this.selectedCycleStart()) ?? periods[0];
    return selected ?? { startDate: firstOfMonth(this.today), endDate: this.today };
  });
  readonly hasValidRange = computed(
    () => this.selectedRange().startDate <= this.selectedRange().endDate,
  );
  readonly rangeSummary = computed(() => {
    const range = this.selectedRange();
    return getFinanceRangeSummary(
      this.transactions(),
      this.categories(),
      range.startDate,
      range.endDate,
    );
  });
  readonly periodTransactions = computed(() => {
    const range = this.selectedRange();
    if (range.startDate > range.endDate) {
      return [];
    }
    return this.transactions().filter(
      (transaction) => transaction.date >= range.startDate && transaction.date <= range.endDate,
    );
  });
  readonly chartGradient = computed(() => {
    const summary = this.rangeSummary();
    if (summary.expenses === 0) {
      return 'conic-gradient(var(--color-border) 0deg 360deg)';
    }

    let angle = 0;
    const stops = summary.categoryExpenses.map((category) => {
      const start = angle;
      angle += (category.amount / summary.expenses) * 360;
      return `${category.color} ${start.toFixed(2)}deg ${angle.toFixed(2)}deg`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  });

  ngOnInit(): void {
    void this.loadData();
  }

  async loadData(): Promise<void> {
    this.isLoading.set(true);
    await this.refreshData(true);
    this.isLoading.set(false);
  }

  setTransactionType(type: FinanceTransactionType): void {
    this.transactionType.set(type);
    const categoryControl = this.transactionForm.controls.categoryId;
    if (type === 'expense') {
      categoryControl.setValidators(Validators.required);
    } else {
      categoryControl.clearValidators();
      categoryControl.setValue('');
    }
    categoryControl.updateValueAndValidity({ emitEvent: false });
  }

  setPeriodMode(mode: PeriodMode): void {
    this.periodMode.set(mode);
    if (mode === 'salary' && !this.selectedCycleStart()) {
      this.selectedCycleStart.set(this.salaryPeriods()[0]?.startDate ?? '');
    }
  }

  onCycleChange(event: Event): void {
    this.selectedCycleStart.set((event.target as HTMLSelectElement).value);
  }

  onMonthChange(event: Event): void {
    this.selectedMonth.set((event.target as HTMLInputElement).value);
  }

  onCustomStartChange(event: Event): void {
    this.customStart.set((event.target as HTMLInputElement).value);
  }

  onCustomEndChange(event: Event): void {
    this.customEnd.set((event.target as HTMLInputElement).value);
  }

  async saveTransaction(): Promise<void> {
    if (this.isMutating()) {
      return;
    }
    this.transactionForm.markAllAsTouched();
    if (this.transactionForm.invalid) {
      return;
    }

    const type = this.transactionType();
    const values = this.transactionForm.getRawValue();
    const transactionDate = values.date;
    if (!values.amount || !transactionDate) {
      return;
    }
    const draft = {
      type,
      amount: values.amount,
      categoryId: type === 'expense' ? values.categoryId || null : null,
      date: transactionDate,
    };

    this.isMutating.set(true);
    this.clearMessages();
    try {
      const editing = this.editingTransaction();
      const result = editing
        ? await this.financeService.updateTransaction(editing.id, draft)
        : await this.financeService.createTransaction(draft);
      if (!result.success) {
        this.errorMessage.set(result.message);
        return;
      }

      if (type === 'salary') {
        this.selectedCycleStart.set(transactionDate);
        this.periodMode.set('salary');
      }
      this.successMessage.set(editing ? 'Transakcija je izmenjena.' : 'Transakcija je sačuvana.');
      this.cancelTransactionEdit();
      await this.refreshData(false);
    } finally {
      this.isMutating.set(false);
    }
  }

  startTransactionEdit(transaction: FinanceTransaction): void {
    this.editingTransaction.set(transaction);
    this.setTransactionType(transaction.type);
    this.transactionForm.reset({
      amount: transaction.amount,
      categoryId: transaction.categoryId ?? '',
      date: transaction.date,
    });
    this.clearMessages();
  }

  cancelTransactionEdit(): void {
    this.editingTransaction.set(null);
    this.setTransactionType('expense');
    this.transactionForm.reset({ amount: null, categoryId: '', date: this.today });
  }

  async deleteTransaction(transaction: FinanceTransaction): Promise<void> {
    if (this.isMutating()) {
      return;
    }
    this.isMutating.set(true);
    this.clearMessages();
    try {
      const result = await this.financeService.deleteTransaction(transaction.id);
      if (!result.success) {
        this.errorMessage.set(result.message);
        return;
      }
      this.pendingDeleteId.set(null);
      if (this.editingTransaction()?.id === transaction.id) {
        this.cancelTransactionEdit();
      }
      this.successMessage.set('Transakcija je obrisana.');
      await this.refreshData(false);
    } finally {
      this.isMutating.set(false);
    }
  }

  async createCategory(): Promise<void> {
    if (this.isMutating()) {
      return;
    }
    this.categoryForm.markAllAsTouched();
    if (this.categoryForm.invalid) {
      return;
    }

    this.isMutating.set(true);
    this.clearMessages();
    try {
      const result = await this.financeService.createCategory({
        name: this.categoryForm.controls.name.value.trim(),
        icon: this.selectedIcon(),
      });
      if (!result.success) {
        this.errorMessage.set(result.message);
        return;
      }
      this.categoryForm.reset({ name: '' });
      this.successMessage.set('Kategorija je dodata.');
      await this.refreshData(false);
    } finally {
      this.isMutating.set(false);
    }
  }

  async archiveCategory(category: FinanceCategory): Promise<void> {
    if (this.isMutating()) {
      return;
    }
    this.isMutating.set(true);
    this.clearMessages();
    try {
      const result = await this.financeService.archiveCategory(category.id);
      if (!result.success) {
        this.errorMessage.set(result.message);
        return;
      }
      this.pendingArchiveId.set(null);
      this.successMessage.set('Kategorija je uklonjena. Postojeći troškovi su sačuvani.');
      await this.refreshData(false);
    } finally {
      this.isMutating.set(false);
    }
  }

  async restoreCategory(category: FinanceCategory): Promise<void> {
    if (this.isMutating()) {
      return;
    }
    this.isMutating.set(true);
    this.clearMessages();
    try {
      const result = await this.financeService.restoreCategory(category.id);
      if (!result.success) {
        this.errorMessage.set(result.message);
        return;
      }
      this.successMessage.set('Kategorija je vraćena.');
      await this.refreshData(false);
    } finally {
      this.isMutating.set(false);
    }
  }

  categoryName(categoryId: string | null): string {
    return this.categories().find((category) => category.id === categoryId)?.name ?? 'Kategorija';
  }

  categoryIcon(categoryId: string | null): string {
    return this.categories().find((category) => category.id === categoryId)?.icon ?? '●';
  }

  categoryColor(categoryId: string): string {
    return getCategoryColor(categoryId);
  }

  entryLabel(transaction: FinanceTransaction): string {
    if (transaction.type === 'salary') return 'Plata';
    if (transaction.type === 'other_income') return 'Ostali prihod';
    return this.categoryName(transaction.categoryId);
  }

  transactionCountLabel(count: number): string {
    const lastTwoDigits = count % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return 'stavki';
    }
    if (count % 10 === 1) {
      return 'stavka';
    }
    return count % 10 >= 2 && count % 10 <= 4 ? 'stavke' : 'stavki';
  }

  formatMoney(amount: number): string {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      maximumFractionDigits: 2,
    }).format(amount);
  }

  formatDate(date: string): string {
    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      return date;
    }
    return new Intl.DateTimeFormat('sr-RS', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(parsed);
  }

  private async refreshData(initialLoad: boolean): Promise<void> {
    if (initialLoad) {
      this.errorMessage.set(null);
    }

    try {
      const [categoryResult, transactionResult] = await Promise.all([
        this.financeService.getCategories(),
        this.financeService.getTransactions(),
      ]);
      if (!categoryResult.success) {
        this.errorMessage.set(categoryResult.message);
        return;
      }
      if (!transactionResult.success) {
        this.errorMessage.set(transactionResult.message);
        return;
      }

      let categories = categoryResult.data;
      if (initialLoad && categories.length === 0) {
        const seedResult = await this.financeService.createDefaultCategories(DEFAULT_FINANCE_CATEGORIES);
        if (!seedResult.success) {
          this.errorMessage.set(seedResult.message);
          return;
        }
        const refreshedCategories = await this.financeService.getCategories();
        if (!refreshedCategories.success) {
          this.errorMessage.set(refreshedCategories.message);
          return;
        }
        categories = refreshedCategories.data;
      }

      this.categories.set(categories);
      this.transactions.set(transactionResult.data);
      if (!this.selectedCycleStart()) {
        this.selectedCycleStart.set(getSalaryPeriods(transactionResult.data, this.today)[0]?.startDate ?? '');
      }
    } catch (error) {
      if (error instanceof Error) {
        this.errorMessage.set('Finansije nisu učitane. Proveri internet vezu i pokušaj ponovo.');
        return;
      }
      throw error;
    }
  }

  private clearMessages(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }
}

function localDate(): string {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function firstOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

function lastOfMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
}
