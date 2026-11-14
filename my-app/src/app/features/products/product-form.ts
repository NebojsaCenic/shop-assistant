import { Component, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { nonWhitespaceValidator } from '../../shared/validators/non-whitespace.validator';
import type { Category, Subcategory } from '../categories/category.model';
import { ProductService } from './product.service';
import type { Product, ProductDraft, ProductServiceResult } from './product.model';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-product-form',
  styleUrl: './product-form.scss',
  templateUrl: './product-form.html',
  standalone: true,
})
export class ProductForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly productService = inject(ProductService);

  readonly categories = input.required<Category[]>();
  readonly product = input<Product | null>(null);
  readonly saved = output<'created' | 'updated'>();
  readonly cancelled = output<void>();
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, nonWhitespaceValidator]],
    categoryId: ['', Validators.required],
    subcategoryId: [''],
    brand: [''],
    notes: [''],
  });

  constructor() {
    this.form.controls.categoryId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((categoryId) => {
        const subcategoryId = this.form.controls.subcategoryId.value;
        const category = this.categories().find((item) => item.id === categoryId);
        if (subcategoryId && !category?.subcategories.some((item) => item.id === subcategoryId)) {
          this.form.controls.subcategoryId.setValue('');
        }
      });
  }

  ngOnInit(): void {
    const product = this.product();
    if (!product) {
      return;
    }

    this.form.reset({
      name: product.name,
      categoryId: product.categoryId,
      subcategoryId: product.subcategoryId ?? '',
      brand: product.brand ?? '',
      notes: product.notes ?? '',
    });
  }

  get availableSubcategories(): Subcategory[] {
    const categoryId = this.form.controls.categoryId.value;
    return this.categories().find((category) => category.id === categoryId)?.subcategories ?? [];
  }

  hasError(control: FormControl<string>): boolean {
    return control.invalid && control.touched;
  }

  async submit(): Promise<void> {
    if (this.isSaving()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const product = this.product();
    const draft: ProductDraft = {
      name: this.form.controls.name.value.trim(),
      categoryId: this.form.controls.categoryId.value,
      subcategoryId: this.form.controls.subcategoryId.value || null,
      brand: this.form.controls.brand.value.trim() || null,
      notes: this.form.controls.notes.value.trim() || null,
    };

    this.errorMessage.set(null);
    this.isSaving.set(true);

    try {
      const result = product
        ? await this.productService.updateProduct(product.id, draft)
        : await this.productService.createProduct(draft);
      if (!result.success) {
        this.errorMessage.set(result.message);
        return;
      }

      this.saved.emit(product ? 'updated' : 'created');
    } catch (error) {
      if (error instanceof Error) {
        this.errorMessage.set('Proizvod nije sačuvan. Proveri internet vezu i pokušaj ponovo.');
        return;
      }
      throw error;
    } finally {
      this.isSaving.set(false);
    }
  }
}
