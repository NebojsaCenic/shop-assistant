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
    updateCategory: ReturnType<typeof vi.fn>;
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
      updateCategory: vi.fn().mockResolvedValue({ success: true, data: { id: 'food-id' } }),
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

  it('matches each legend color dot to its category in the donut chart', async () => {
    financeService.getCategories.mockResolvedValue({
      success: true,
      data: [
        { id: 'food-id', name: 'Hrana', icon: '🍎', isActive: true, createdAt: '' },
        { id: 'bills-id', name: 'Računi', icon: '🧾', isActive: true, createdAt: '' },
      ],
    });
    const fixture = TestBed.createComponent(FinancePage);
    financeService.getTransactions.mockResolvedValue({
      success: true,
      data: [
        { id: 'food-expense', type: 'expense', amount: 100, categoryId: 'food-id', date: fixture.componentInstance.today, createdAt: '' },
        { id: 'bill-expense', type: 'expense', amount: 200, categoryId: 'bills-id', date: fixture.componentInstance.today, createdAt: '' },
      ],
    });
    fixture.detectChanges();
    await fixture.componentInstance.loadData();
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    const rows = root.querySelectorAll('.chart-legend li');
    const categories = fixture.componentInstance.rangeSummary().categoryExpenses;
    expect(rows.length).toBe(2);
    categories.forEach((category, index) => {
      expect(rows[index].querySelector('.legend-name')?.textContent).toContain(category.name);
      const expectedStyle = root.ownerDocument.createElement('span').style;
      expectedStyle.backgroundColor = category.color;
      expect(rows[index].querySelector<HTMLElement>('.legend-color-dot')?.style.backgroundColor)
        .toBe(expectedStyle.backgroundColor);
      expect(fixture.componentInstance.chartGradient()).toContain(category.color);
    });
  });

  it('lets an existing category save a new name and icon', async () => {
    const fixture = TestBed.createComponent(FinancePage);
    fixture.detectChanges();
    await fixture.componentInstance.loadData();
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    root.querySelector<HTMLButtonElement>('[aria-label="Izmeni kategoriju Hrana"]')!.click();
    fixture.detectChanges();
    const nameInput = root.querySelector<HTMLInputElement>('.category-editor input')!;
    expect(nameInput.value).toBe('Hrana');
    nameInput.value = ' Piće ';
    nameInput.dispatchEvent(new Event('input'));
    root.querySelector<HTMLButtonElement>('.category-editor [aria-label="Izaberi ikonicu 🍷"]')!.click();
    fixture.detectChanges();

    financeService.getCategories.mockResolvedValue({
      success: true,
      data: [{ id: 'food-id', name: 'Piće', icon: '🍷', isActive: true, createdAt: '' }],
    });
    root.querySelector<HTMLButtonElement>('.category-editor .primary-button')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(financeService.updateCategory).toHaveBeenCalledWith('food-id', { name: 'Piće', icon: '🍷' });
    expect(root.querySelector('.finance-category-row .category-icon')?.textContent?.trim()).toBe('🍷');
    expect(root.querySelector('.finance-category-row')?.textContent).toContain('Piće');
    expect(root.querySelector('.category-editor')).toBeNull();
  });

  it('keeps the icon editor open and shows an error when saving fails', async () => {
    financeService.updateCategory.mockResolvedValue({ success: false, message: 'Greška pri čuvanju.' });
    const fixture = TestBed.createComponent(FinancePage);
    fixture.detectChanges();
    await fixture.componentInstance.loadData();
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    root.querySelector<HTMLButtonElement>('[aria-label="Izmeni kategoriju Hrana"]')!.click();
    fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('.category-editor .primary-button')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Greška pri čuvanju.');
    expect(root.querySelector('.category-editor')).not.toBeNull();
  });

  it('rejects a whitespace-only category name and allows cancelling without saving', async () => {
    const fixture = TestBed.createComponent(FinancePage);
    fixture.detectChanges();
    await fixture.componentInstance.loadData();
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    root.querySelector<HTMLButtonElement>('[aria-label="Izmeni kategoriju Hrana"]')!.click();
    fixture.detectChanges();
    const nameInput = root.querySelector<HTMLInputElement>('.category-editor input')!;
    nameInput.value = '   ';
    nameInput.dispatchEvent(new Event('input'));
    root.querySelector<HTMLButtonElement>('.category-editor .primary-button')!.click();
    fixture.detectChanges();

    expect(financeService.updateCategory).not.toHaveBeenCalled();
    expect(root.querySelector('.category-editor [role="alert"]')?.textContent).toContain('Unesi naziv');
    root.querySelector<HTMLButtonElement>('.category-editor .secondary-button')!.click();
    fixture.detectChanges();
    expect(root.querySelector('.category-editor')).toBeNull();
    expect(root.querySelector('.finance-category-row')?.textContent).toContain('Hrana');
  });
});
