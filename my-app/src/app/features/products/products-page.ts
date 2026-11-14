import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CategoryService } from '../categories/category.service';
import type { Category } from '../categories/category.model';
import { ProductForm } from './product-form';
import { ProductService } from './product.service';
import type { Product, ProductServiceResult } from './product.model';

interface ProductGroup {
  category: Category;
  products: Product[];
}

@Component({
  imports: [ProductForm, RouterLink],
  selector: 'app-products-page',
  styleUrl: './products-page.scss',
  templateUrl: './products-page.html',
  standalone: true,
})
export class ProductsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly categoryService = inject(CategoryService);
  private readonly productService = inject(ProductService);
  private shouldOpenNewProductForm = this.route.snapshot.queryParamMap.get('novo') === '1';

  readonly categories = signal<Category[]>([]);
  readonly products = signal<Product[]>([]);
  readonly searchTerm = signal('');
  readonly isLoading = signal(true);
  readonly isMutating = signal(false);
  readonly isFormOpen = signal(false);
  readonly editingProduct = signal<Product | null>(null);
  readonly expandedProductId = signal<string | null>(null);
  readonly collapsedCategoryIds = signal<Set<string>>(new Set());
  readonly pendingDeleteId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly productGroups = computed<ProductGroup[]>(() => {
    const searchTerm = this.searchTerm().trim().toLocaleLowerCase('sr');
    const products = this.products();

    return this.categories()
      .map((category) => ({
        category,
        products: products.filter(
          (product) =>
            product.categoryId === category.id &&
            (!searchTerm || product.name.toLocaleLowerCase('sr').includes(searchTerm)),
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
      const [categoryResult, productResult] = await Promise.all([
        this.categoryService.getCategories(),
        this.productService.getProducts(),
      ]);

      if (!categoryResult.success) {
        this.errorMessage.set(categoryResult.message);
        return;
      }
      if (!productResult.success) {
        this.errorMessage.set(productResult.message);
        return;
      }

      this.categories.set(categoryResult.data);
      this.products.set(productResult.data);
      const expandedProductId = this.expandedProductId();
      if (
        expandedProductId &&
        !productResult.data.some((product) => product.id === expandedProductId)
      ) {
        this.expandedProductId.set(null);
      }
    } catch (error) {
      if (error instanceof Error) {
        this.errorMessage.set(
          'Katalog trenutno nije učitan. Proveri internet vezu i pokušaj ponovo.',
        );
        return;
      }
      throw error;
    } finally {
      this.isLoading.set(false);
      if (this.shouldOpenNewProductForm && this.categories().length > 0) {
        this.shouldOpenNewProductForm = false;
        this.openNewProductForm();
      }
    }
  }

  onSearchInput(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.searchTerm.set(target.value);
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

  toggleProductDetails(productId: string): void {
    this.expandedProductId.update((current) => (current === productId ? null : productId));
  }

  openNewProductForm(): void {
    if (this.isLoading() || this.isMutating() || this.categories().length === 0) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.pendingDeleteId.set(null);
    this.editingProduct.set(null);
    this.isFormOpen.set(true);
  }

  openEditProductForm(product: Product): void {
    if (this.isMutating()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.pendingDeleteId.set(null);
    this.editingProduct.set(product);
    this.isFormOpen.set(true);
  }

  closeProductForm(): void {
    this.isFormOpen.set(false);
    this.editingProduct.set(null);
  }

  async onProductSaved(action: 'created' | 'updated'): Promise<void> {
    this.closeProductForm();
    this.successMessage.set(
      action === 'created' ? 'Proizvod je uspešno dodat.' : 'Proizvod je uspešno izmenjen.',
    );
    await this.loadData();
  }

  requestProductDeletion(product: Product): void {
    if (this.isMutating()) {
      return;
    }

    this.errorMessage.set(null);
    this.pendingDeleteId.set(product.id);
  }

  cancelProductDeletion(): void {
    this.pendingDeleteId.set(null);
  }

  async deleteProduct(product: Product): Promise<void> {
    if (this.isMutating()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isMutating.set(true);

    try {
      const result: ProductServiceResult<{ id: string }> = await this.productService.deleteProduct(
        product.id,
      );
      if (!result.success) {
        this.errorMessage.set(result.message);
        return;
      }

      this.pendingDeleteId.set(null);
      this.expandedProductId.update((current) => (current === product.id ? null : current));
      this.successMessage.set('Proizvod je uspešno obrisan.');
      await this.loadData();
    } catch (error) {
      if (error instanceof Error) {
        this.errorMessage.set('Proizvod nije obrisan. Proveri internet vezu i pokušaj ponovo.');
        return;
      }
      throw error;
    } finally {
      this.isMutating.set(false);
    }
  }

  productCountLabel(count: number): string {
    const lastTwoDigits = count % 100;
    const noun = lastTwoDigits % 10 === 1 && lastTwoDigits !== 11 ? 'proizvod' : 'proizvoda';
    return `${count} ${noun}`;
  }

  formatDate(date: string): string {
    const timestamp = new Date(date);
    if (Number.isNaN(timestamp.getTime())) {
      return '';
    }
    return new Intl.DateTimeFormat('sr-RS', { dateStyle: 'medium' }).format(timestamp);
  }

  subcategoryName(category: Category, subcategoryId: string): string {
    return (
      category.subcategories.find((subcategory) => subcategory.id === subcategoryId)?.name ??
      'Nije dostupna'
    );
  }
}
