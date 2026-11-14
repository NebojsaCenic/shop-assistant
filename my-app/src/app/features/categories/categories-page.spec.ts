import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { CategoryService } from './category.service';
import { CategoriesPage } from './categories-page';

describe('CategoriesPage', () => {
  let categoryService: {
    createCategory: ReturnType<typeof vi.fn>;
    getCategories: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    categoryService = {
      createCategory: vi.fn().mockResolvedValue({ success: true, data: { id: 'category-id' } }),
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
});
