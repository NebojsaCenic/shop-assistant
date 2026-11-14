import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CategoryService } from '../categories/category.service';
import type { Category } from '../categories/category.model';
import { ProductService } from '../products/product.service';
import type { Product } from '../products/product.model';
import { ShoppingService } from './shopping.service';
import type { ShoppingListItem, ShoppingServiceResult } from './shopping.model';

interface ProductGroup {
  category: Category;
  products: Product[];
}

interface ChecklistEntry {
  item: ShoppingListItem;
  product: Product;
  category: Category;
}

@Component({
  imports: [RouterLink],
  selector: 'app-shopping-page',
  styleUrl: './shopping-page.scss',
  templateUrl: './shopping-page.html',
  standalone: true,
})
export class ShoppingPage implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly productService = inject(ProductService);
  private readonly shoppingService = inject(ShoppingService);

  readonly categories = signal<Category[]>([]);
  readonly products = signal<Product[]>([]);
  readonly items = signal<ShoppingListItem[]>([]);
  readonly isLoading = signal(true);
  readonly hasLoadedData = signal(false);
  readonly isMutating = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly isClearConfirmationOpen = signal(false);
  readonly collapsedCategoryIds = signal<Set<string>>(new Set());

  readonly selectedProductIds = computed(() => new Set(this.items().map((item) => item.productId)));
  readonly purchasedCount = computed(() => this.items().filter((item) => item.isPurchased).length);
  readonly checklistEntries = computed<ChecklistEntry[]>(() => {
    const productsById = new Map(this.products().map((product) => [product.id, product]));
    const categoriesById = new Map(this.categories().map((category) => [category.id, category]));

    return this.items().flatMap((item) => {
      const product = productsById.get(item.productId);
      const category = product ? categoriesById.get(product.categoryId) : undefined;
      return product && category ? [{ item, product, category }] : [];
    });
  });
  readonly availableProductGroups = computed<ProductGroup[]>(() => {
    const selectedProductIds = this.selectedProductIds();
    return this.categories()
      .map((category) => ({
        category,
        products: this.products().filter(
          (product) => product.categoryId === category.id && !selectedProductIds.has(product.id),
        ),
      }))
      .filter((group) => group.products.length > 0);
  });

  ngOnInit(): void {
    void this.loadData();
  }

  async loadData(): Promise<void> {
    this.errorMessage.set(null);
    this.isLoading.set(true);

    try {
      const [categoryResult, productResult, itemResult] = await Promise.all([
        this.categoryService.getCategories(),
        this.productService.getProducts(),
        this.shoppingService.getItems(),
      ]);

      if (!categoryResult.success) {
        this.errorMessage.set(categoryResult.message);
        return;
      }
      if (!productResult.success) {
        this.errorMessage.set(productResult.message);
        return;
      }
      if (!itemResult.success) {
        this.errorMessage.set(itemResult.message);
        return;
      }

      this.categories.set(categoryResult.data);
      this.products.set(productResult.data);
      this.items.set(itemResult.data);
      this.hasLoadedData.set(true);
    } catch (error) {
      if (error instanceof Error) {
        this.errorMessage.set(
          'Kupovina trenutno nije učitana. Proveri internet vezu i pokušaj ponovo.',
        );
        return;
      }
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  toggleCategory(categoryId: string): void {
    this.collapsedCategoryIds.update((collapsed) => {
      const next = new Set(collapsed);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }

  isCategoryCollapsed(categoryId: string): boolean {
    return this.collapsedCategoryIds().has(categoryId);
  }

  async addProduct(product: Product): Promise<void> {
    if (this.isLoading() || this.isMutating() || this.selectedProductIds().has(product.id)) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isMutating.set(true);

    try {
      const result = await this.shoppingService.addProduct(product.id);
      if (!result.success) {
        this.errorMessage.set(result.message);
        return;
      }

      this.items.update((items) => [...items, result.data]);
      this.successMessage.set('Proizvod je dodat na listu za kupovinu.');
    } catch (error) {
      if (error instanceof Error) {
        this.errorMessage.set(
          'Proizvod nije dodat na listu. Proveri internet vezu i pokušaj ponovo.',
        );
        return;
      }
      throw error;
    } finally {
      this.isMutating.set(false);
    }
  }

  onPurchasedChange(item: ShoppingListItem, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    void this.setPurchased(item, target.checked);
  }

  async setPurchased(item: ShoppingListItem, isPurchased: boolean): Promise<void> {
    if (this.isMutating() || item.isPurchased === isPurchased) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isMutating.set(true);

    try {
      const result: ShoppingServiceResult<{ id: string }> = await this.shoppingService.setPurchased(
        item.id,
        isPurchased,
      );
      if (!result.success) {
        this.errorMessage.set(result.message);
        return;
      }

      this.items.update((items) =>
        items.map((current) => (current.id === item.id ? { ...current, isPurchased } : current)),
      );
    } catch (error) {
      if (error instanceof Error) {
        this.errorMessage.set(
          'Status proizvoda nije sačuvan. Proveri internet vezu i pokušaj ponovo.',
        );
        return;
      }
      throw error;
    } finally {
      this.isMutating.set(false);
    }
  }

  async removeItem(item: ShoppingListItem): Promise<void> {
    if (this.isMutating()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isMutating.set(true);

    try {
      const result = await this.shoppingService.removeItem(item.id);
      if (!result.success) {
        this.errorMessage.set(result.message);
        return;
      }

      this.items.update((items) => items.filter((current) => current.id !== item.id));
      this.successMessage.set('Proizvod je uklonjen sa liste za kupovinu.');
    } catch (error) {
      if (error instanceof Error) {
        this.errorMessage.set(
          'Proizvod nije uklonjen sa liste. Proveri internet vezu i pokušaj ponovo.',
        );
        return;
      }
      throw error;
    } finally {
      this.isMutating.set(false);
    }
  }

  requestClearList(): void {
    if (this.isMutating() || this.items().length === 0) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isClearConfirmationOpen.set(true);
  }

  cancelClearList(): void {
    this.isClearConfirmationOpen.set(false);
  }

  async clearList(): Promise<void> {
    if (this.isMutating() || !this.isClearConfirmationOpen() || this.items().length === 0) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isMutating.set(true);

    try {
      const result = await this.shoppingService.clearList();
      if (!result.success) {
        this.errorMessage.set(result.message);
        return;
      }

      this.items.set([]);
      this.isClearConfirmationOpen.set(false);
      this.successMessage.set(
        'Lista za kupovinu je ispražnjena. Proizvodi ostaju sačuvani u tvojoj kolekciji.',
      );
    } catch (error) {
      if (error instanceof Error) {
        this.errorMessage.set('Lista nije ispražnjena. Proveri internet vezu i pokušaj ponovo.');
        return;
      }
      throw error;
    } finally {
      this.isMutating.set(false);
    }
  }

  productCountLabel(count: number): string {
    return count === 1 ? '1 proizvod' : `${count} proizvoda`;
  }
}
