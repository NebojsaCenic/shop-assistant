import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { CategoryService } from './category.service';
import { CategoriesPage } from './categories-page';

describe('CategoriesPage', () => {
  let categoryService: {
    createCategory: ReturnType<typeof vi.fn>;
    createSubcategory: ReturnType<typeof vi.fn>;
    getCategories: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    categoryService = {
      createCategory: vi.fn().mockResolvedValue({ success: true, data: { id: 'category-id' } }),
      createSubcategory: vi
        .fn()
        .mockResolvedValue({ success: true, data: { id: 'subcategory-id' } }),
      getCategories: vi.fn().mockResolvedValue({ success: true, data: [] }),
    };

    await TestBed.configureTestingModule({
      imports: [CategoriesPage],
      providers: [{ provide: CategoryService, useValue: categoryService }],
    }).compileComponents();
  });

  it('rejects whitespace-only category names without calling the service', async () => {
    const fixture = TestBed.createComponent(CategoriesPage);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.categoryForm.controls.name.setValue('   ');
    await fixture.componentInstance.createCategory();

    expect(categoryService.createCategory).not.toHaveBeenCalled();
    expect(fixture.componentInstance.categoryForm.controls.name.touched).toBe(true);
  });

  it('submits a trimmed name and announces success', async () => {
    const fixture = TestBed.createComponent(CategoriesPage);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.categoryForm.controls.name.setValue('  Hrana  ');
    await fixture.componentInstance.createCategory();

    expect(categoryService.createCategory).toHaveBeenCalledWith('Hrana');
    expect(fixture.componentInstance.successMessage()).toBe('Kategorija je uspešno dodata.');
  });

  it('opens and submits the subcategory form from the category card', async () => {
    categoryService.getCategories.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'category-id',
          name: 'Hrana',
          productCount: 0,
          subcategories: [],
        },
      ],
    });

    const fixture = TestBed.createComponent(CategoriesPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const addButton = fixture.nativeElement.querySelector(
      '.add-subcategory-button',
    ) as HTMLButtonElement;
    addButton.click();
    fixture.detectChanges();

    const form = fixture.debugElement.query(By.css('.subcategory-form'));
    expect(form).not.toBeNull();

    const input = form.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'Mlečni proizvodi';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.newSubcategoryName.value).toBe('Mlečni proizvodi');
    expect(fixture.componentInstance.newSubcategoryName.valid).toBe(true);
    form.triggerEventHandler('ngSubmit', null);
    await fixture.whenStable();

    expect(categoryService.createSubcategory).toHaveBeenCalledWith(
      'category-id',
      'Mlečni proizvodi',
    );
    expect(fixture.componentInstance.successMessage()).toBe('Potkategorija je uspešno dodata.');
  });

  it('shows a save failure beside the subcategory form', async () => {
    categoryService.getCategories.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'category-id',
          name: 'Hrana',
          productCount: 0,
          subcategories: [],
        },
      ],
    });
    categoryService.createSubcategory.mockResolvedValue({
      success: false,
      message: 'Potkategorija nije sačuvana. Proveri internet vezu i pokušaj ponovo.',
    });

    const fixture = TestBed.createComponent(CategoriesPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    fixture.componentInstance.startAddingSubcategory('category-id');
    fixture.componentInstance.newSubcategoryName.setValue('Mlečni proizvodi');

    await fixture.componentInstance.createSubcategory('category-id');
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.subcategory-feedback')?.textContent?.trim(),
    ).toContain('Potkategorija nije sačuvana.');
    expect(fixture.nativeElement.querySelector('.categories-page > .error-message')).toBeNull();
  });
});
