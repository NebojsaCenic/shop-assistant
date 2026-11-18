import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { CategoryService } from '../categories/category.service';
import type { Category } from '../categories/category.model';
import { ProductService } from './product.service';
import type { Product } from './product.model';
import { ProductsPage } from './products-page';

describe('ProductsPage', () => {
  let actionQuery: string | null;
  const categories: Category[] = [
    { id: 'food', name: 'Hrana', productCount: 2, subcategories: [] },
    { id: 'home', name: 'Kućna hemija', productCount: 1, subcategories: [] },
  ];
  const products: Product[] = [
    {
      id: 'milk',
      name: 'Mleko',
      categoryId: 'food',
      subcategoryId: null,
      createdAt: '2026-11-14T12:00:00Z',
      updatedAt: '2026-11-14T12:00:00Z',
    },
    {
      id: 'bread',
      name: 'Hleb',
      categoryId: 'food',
      subcategoryId: null,
      createdAt: '2026-11-14T12:00:00Z',
      updatedAt: '2026-11-14T12:00:00Z',
    },
    {
      id: 'detergent',
      name: 'Deterdžent',
      categoryId: 'home',
      subcategoryId: null,
      createdAt: '2026-11-14T12:00:00Z',
      updatedAt: '2026-11-14T12:00:00Z',
    },
  ];

  beforeEach(async () => {
    actionQuery = null;
    await TestBed.configureTestingModule({
      imports: [ProductsPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            get snapshot() {
              return {
                queryParamMap: convertToParamMap(actionQuery ? { novo: actionQuery } : {}),
              };
            },
          },
        },
        {
          provide: CategoryService,
          useValue: { getCategories: async () => ({ success: true, data: categories }) },
        },
        {
          provide: ProductService,
          useValue: { getProducts: async () => ({ success: true, data: products }) },
        },
      ],
    }).compileComponents();
  });

  it('groups products by category and filters groups by product name', async () => {
    const fixture = TestBed.createComponent(ProductsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.componentInstance.loadData();

    expect(
      fixture.componentInstance
        .productGroups()
        .map((group) => [group.category.name, group.products.length]),
    ).toEqual([
      ['Hrana', 2],
      ['Kućna hemija', 1],
    ]);

    fixture.componentInstance.searchTerm.set('mleko');

    expect(fixture.componentInstance.productGroups().map((group) => group.category.name)).toEqual([
      'Hrana',
    ]);
    expect(fixture.componentInstance.productGroups()[0].products[0].name).toBe('Mleko');
  });

  it('opens the add form for the dashboard quick action after categories load', async () => {
    actionQuery = '1';
    const fixture = TestBed.createComponent(ProductsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.componentInstance.loadData();

    expect(fixture.componentInstance.isFormOpen()).toBe(true);
  });
});
