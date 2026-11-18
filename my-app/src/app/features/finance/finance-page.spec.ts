import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { FinancePage } from './finance-page';
import { FinanceService } from './finance.service';

describe('FinancePage', () => {
  let financeService: {
    archiveCategory: ReturnType<typeof vi.fn>;
    createCategory: ReturnType<typeof vi.fn>;
    createDefaultCategories: ReturnType<typeof vi.fn>;
    createTransaction: ReturnType<typeof vi.fn>;
    deleteTransaction: ReturnType<typeof vi.fn>;
    getCategories: ReturnType<typeof vi.fn>;
    getTransactions: ReturnType<typeof vi.fn>;
    restoreCategory: ReturnType<typeof vi.fn>;
    updateTransaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    financeService = {
      archiveCategory: vi.fn().mockResolvedValue({ success: true, data: { id: 'food-id' } }),
      createCategory: vi.fn().mockResolvedValue({ success: true, data: { id: 'new-category' } }),
      createDefaultCategories: vi.fn().mockResolvedValue({ success: true, data: [] }),
      createTransaction: vi.fn().mockResolvedValue({ success: true, data: { id: 'new-entry' } }),
      deleteTransaction: vi.fn().mockResolvedValue({ success: true, data: { id: 'entry-id' } }),
      getCategories: vi.fn().mockResolvedValue({
        success: true,
        data: [{ id: 'food-id', name: 'Hrana', icon: '🍎', isActive: true, createdAt: '' }],
      }),
      getTransactions: vi.fn().mockResolvedValue({ success: true, data: [] }),
      restoreCategory: vi.fn().mockResolvedValue({ success: true, data: { id: 'food-id' } }),
      updateTransaction: vi.fn().mockResolvedValue({ success: true, data: { id: 'entry-id' } }),
    };

    await TestBed.configureTestingModule({
      imports: [FinancePage],
      providers: [{ provide: FinanceService, useValue: financeService }],
    }).compileComponents();
  });

  it('saves salary as uncategoryed income for the selected date', async () => {
    const fixture = TestBed.createComponent(FinancePage);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page.setTransactionType('salary');
    page.transactionForm.controls.amount.setValue(72000);
    page.transactionForm.controls.date.setValue('2026-11-18');

    await page.saveTransaction();

    expect(financeService.createTransaction).toHaveBeenCalledWith({
      type: 'salary',
      amount: 72000,
      categoryId: null,
      date: '2026-11-18',
    });
    expect(page.periodMode()).toBe('salary');
    expect(page.selectedCycleStart()).toBe('2026-11-18');
  });

  it('does not save an expense until a category is selected', async () => {
    const fixture = TestBed.createComponent(FinancePage);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page.transactionForm.controls.amount.setValue(500);
    page.transactionForm.controls.date.setValue('2026-11-18');

    await page.saveTransaction();

    expect(financeService.createTransaction).not.toHaveBeenCalled();
  });
});
