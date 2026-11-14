import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ProductService } from './product.service';
import { ProductForm } from './product-form';
import type { Category } from '../categories/category.model';

describe('ProductForm', () => {
  let productService: {
    createProduct: ReturnType<typeof vi.fn>;
    updateProduct: ReturnType<typeof vi.fn>;
  };
  const categories: Category[] = [
    {
      id: 'food',
      name: 'Hrana',
      productCount: 0,
      subcategories: [{ id: 'meat', name: 'Meso' }],
    },
    {
      id: 'drinks',
      name: 'Piće',
      productCount: 0,
      subcategories: [{ id: 'juice', name: 'Sokovi' }],
    },
  ];

  beforeEach(async () => {
    productService = {
      createProduct: vi.fn().mockResolvedValue({ success: true, data: { id: 'product-id' } }),
      updateProduct: vi.fn().mockResolvedValue({ success: true, data: { id: 'product-id' } }),
    };

    await TestBed.configureTestingModule({
      imports: [ProductForm],
      providers: [{ provide: ProductService, useValue: productService }],
    }).compileComponents();
  });

  it('updates available subcategories and clears a selection from the previous category', () => {
    const fixture = TestBed.createComponent(ProductForm);
    fixture.componentRef.setInput('categories', categories);
    fixture.detectChanges();

    const form = fixture.componentInstance.form;
    form.controls.categoryId.setValue('food');
    form.controls.subcategoryId.setValue('meat');
    form.controls.categoryId.setValue('drinks');

    expect(fixture.componentInstance.availableSubcategories).toEqual([
      { id: 'juice', name: 'Sokovi' },
    ]);
    expect(form.controls.subcategoryId.value).toBe('');
  });

  it('requires a product name and submits normalized optional fields', async () => {
    const fixture = TestBed.createComponent(ProductForm);
    fixture.componentRef.setInput('categories', categories);
    fixture.detectChanges();

    const form = fixture.componentInstance.form;
    form.controls.name.setValue('   ');
    form.controls.categoryId.setValue('food');
    await fixture.componentInstance.submit();
    expect(productService.createProduct).not.toHaveBeenCalled();

    form.controls.name.setValue('  Mleko  ');
    await fixture.componentInstance.submit();

    expect(productService.createProduct).toHaveBeenCalledWith({
      name: 'Mleko',
      categoryId: 'food',
      subcategoryId: null,
      brand: null,
      notes: null,
    });
  });
});
