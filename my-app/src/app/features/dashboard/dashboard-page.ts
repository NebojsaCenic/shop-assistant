import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CategoryService } from '../categories/category.service';
import type { Category } from '../categories/category.model';
import { ProductService } from '../products/product.service';
import type { Product } from '../products/product.model';

interface RecentProduct {
  product: Product;
  categoryName: string;
}

@Component({
  imports: [RouterLink],
  selector: 'app-dashboard-page',
  styleUrl: './dashboard-page.scss',
  templateUrl: './dashboard-page.html',
  standalone: true,
})
export class DashboardPage implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly productService = inject(ProductService);

  readonly categories = signal<Category[]>([]);
  readonly products = signal<Product[]>([]);
  readonly isLoading = signal(true);
  readonly hasLoadedData = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly recentProducts = computed<RecentProduct[]>(() => {
    const categoriesById = new Map(this.categories().map((category) => [category.id, category]));

    return [...this.products()]
      .sort((first, second) => this.timestamp(second.createdAt) - this.timestamp(first.createdAt))
      .slice(0, 5)
      .map((product) => ({
        product,
        categoryName: categoriesById.get(product.categoryId)?.name ?? 'Kategorija nije dostupna',
      }));
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
      this.hasLoadedData.set(true);
    } catch (error) {
      if (error instanceof Error) {
        this.errorMessage.set(
          'Početna strana trenutno nije učitana. Proveri internet vezu i pokušaj ponovo.',
        );
        return;
      }
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  formatDate(date: string): string {
    const timestamp = new Date(date);
    if (Number.isNaN(timestamp.getTime())) {
      return '';
    }
    return new Intl.DateTimeFormat('sr-RS', { dateStyle: 'medium' }).format(timestamp);
  }

  private timestamp(date: string): number {
    const timestamp = Date.parse(date);
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }
}
