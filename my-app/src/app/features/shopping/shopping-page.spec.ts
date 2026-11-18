import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { CategoryService } from '../categories/category.service';
import type { Category } from '../categories/category.model';
import { ProductService } from '../products/product.service';
import type { Product } from '../products/product.model';
import { ShoppingService } from './shopping.service';
import type { ShoppingListItem } from './shopping.model';
import { ShoppingPage } from './shopping-page';

describe('ShoppingPage', () => {
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
  const initialItems: ShoppingListItem[] = [
    {
      id: 'item-milk',
      productId: 'milk',
      isPurchased: false,
      createdAt: '2026-11-14T12:00:00Z',
    },
  ];

  let shoppingService: {
    addProduct: ReturnType<typeof vi.fn>;
    clearList: ReturnType<typeof vi.fn>;
    getItems: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
    setPurchased: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    shoppingService = {
      addProduct: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'item-new',
          productId: 'bread',
          isPurchased: false,
          createdAt: '2026-11-14T12:01:00Z',
        },
      }),
      clearList: vi.fn().mockResolvedValue({ success: true, data: [] }),
      getItems: vi.fn().mockResolvedValue({ success: true, data: initialItems }),
      removeItem: vi.fn().mockResolvedValue({ success: true, data: { id: 'item-milk' } }),
      setPurchased: vi.fn().mockResolvedValue({ success: true, data: { id: 'item-milk' } }),
    };

    await TestBed.configureTestingModule({
      imports: [ShoppingPage],
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
        { provide: ShoppingService, useValue: shoppingService },
      ],
    }).compileComponents();
  });

  async function createLoadedPage() {
    const fixture = TestBed.createComponent(ShoppingPage);
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.componentInstance.loadData();
    return fixture;
  }

  it('shows checklist items and only offers products not already selected', async () => {
    const fixture = await createLoadedPage();
    const page = fixture.componentInstance;

    expect(page.checklistEntries().map((entry) => entry.product.name)).toEqual(['Mleko']);
    expect(
      page
        .availableProductGroups()
        .map((group) => [group.category.name, group.products.map((product) => product.name)]),
    ).toEqual([
      ['Hrana', ['Hleb']],
      ['Kućna hemija', ['Deterdžent']],
    ]);

    await page.addProduct(products[1]);

    expect(shoppingService.addProduct).toHaveBeenCalledWith('bread');
    expect(page.items().map((item) => item.productId)).toEqual(['milk', 'bread']);
    expect(page.selectedProductIds().has('bread')).toBe(true);
  });

  it('persists purchased state and removes only the checklist item', async () => {
    const fixture = await createLoadedPage();
    const page = fixture.componentInstance;

    await page.setPurchased(initialItems[0], true);

    expect(shoppingService.setPurchased).toHaveBeenCalledWith('item-milk', true);
    expect(page.items()[0].isPurchased).toBe(true);
    expect(page.purchasedCount()).toBe(1);

    await page.removeItem(page.items()[0]);

    expect(shoppingService.removeItem).toHaveBeenCalledWith('item-milk');
    expect(page.items()).toEqual([]);
    expect(page.products()).toHaveLength(3);
  });

  it('requires confirmation before clearing and preserves the product collection', async () => {
    const fixture = await createLoadedPage();
    const page = fixture.componentInstance;

    await page.clearList();
    expect(shoppingService.clearList).not.toHaveBeenCalled();

    page.requestClearList();
    await page.clearList();

    expect(shoppingService.clearList).toHaveBeenCalledOnce();
    expect(page.items()).toEqual([]);
    expect(page.products()).toHaveLength(3);
    expect(page.successMessage()).toContain('Proizvodi ostaju sačuvani');
  });
});
