import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CategoryService } from '../categories/category.service';
import type { Category } from '../categories/category.model';
import { ProductService } from '../products/product.service';
import type { Product } from '../products/product.model';
import { DashboardPage } from './dashboard-page';

describe('DashboardPage', () => {
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
      brand: null,
      notes: null,
      createdAt: '2026-11-14T12:00:00Z',
      updatedAt: '2026-11-14T12:00:00Z',
    },
    {
      id: 'bread',
      name: 'Hleb',
      categoryId: 'food',
      subcategoryId: null,
      brand: null,
      notes: null,
      createdAt: '2026-11-13T12:00:00Z',
      updatedAt: '2026-11-13T12:00:00Z',
    },
    {
      id: 'detergent',
      name: 'Deterdžent',
      categoryId: 'home',
      subcategoryId: null,
      brand: null,
      notes: null,
      createdAt: '2026-11-12T12:00:00Z',
      updatedAt: '2026-11-12T12:00:00Z',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideRouter([]),
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

  it('shows collection counts, newest products, and quick actions', async () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.componentInstance.loadData();
    fixture.detectChanges();

    expect(
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.stat-value'),
      ).map((value) => value.textContent?.trim()),
    ).toEqual(['3', '2']);
    expect(fixture.componentInstance.recentProducts().map((entry) => entry.product.name)).toEqual([
      'Mleko',
      'Hleb',
      'Deterdžent',
    ]);

    const addProductLink = fixture.nativeElement.querySelector(
      '[data-testid="add-product-link"]',
    ) as HTMLAnchorElement;
    expect(addProductLink.getAttribute('href')).toBe('/proizvodi?novo=1');
    expect(fixture.nativeElement.querySelector('a[href="/kupovina"]')?.textContent?.trim()).toBe(
      'Otvori kupovinu',
    );
  });

  it('guides a new collection owner to create a category first', async () => {
    const fixture = TestBed.createComponent(DashboardPage);
    TestBed.inject(CategoryService).getCategories = async () => ({ success: true, data: [] });
    TestBed.inject(ProductService).getProducts = async () => ({ success: true, data: [] });
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.componentInstance.loadData();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.empty-state h3')?.textContent?.trim()).toBe(
      'Prvo napravi svoju kategoriju.',
    );
    expect(fixture.nativeElement.querySelector('.empty-state a')?.getAttribute('href')).toBe(
      '/kategorije',
    );
  });

  it('shows a localized retry state when collection data cannot be loaded', async () => {
    TestBed.inject(ProductService).getProducts = async () => ({
      success: false,
      message: 'Proizvodi trenutno nisu učitani. Proveri internet vezu i pokušaj ponovo.',
    });
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.componentInstance.loadData();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent?.trim()).toContain(
      'Proizvodi trenutno nisu učitani.',
    );
    expect(fixture.nativeElement.querySelector('.retry-button')?.textContent?.trim()).toBe(
      'Pokušaj ponovo',
    );
  });
});
