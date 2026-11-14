import { Component, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { CategoryService } from './category.service';
import type { Category, CategoryServiceResult, Subcategory } from './category.model';

const nonWhitespace: ValidatorFn = (control: AbstractControl) =>
  typeof control.value === 'string' && control.value.trim().length > 0
    ? null
    : { whitespace: true };

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-categories-page',
  styleUrl: './categories-page.scss',
  templateUrl: './categories-page.html',
  standalone: true,
})
export class CategoriesPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly categoryService = inject(CategoryService);

  readonly categories = signal<Category[]>([]);
  readonly isLoading = signal(true);
  readonly isMutating = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly editingCategoryId = signal<string | null>(null);
  readonly editingSubcategoryId = signal<string | null>(null);
  readonly addingSubcategoryTo = signal<string | null>(null);
  readonly pendingCategoryDeleteId = signal<string | null>(null);
  readonly pendingSubcategoryDeleteId = signal<string | null>(null);

  readonly categoryForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, nonWhitespace]],
  });
  readonly categoryEditName = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, nonWhitespace],
  });
  readonly newSubcategoryName = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, nonWhitespace],
  });
  readonly subcategoryEditName = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, nonWhitespace],
  });

  ngOnInit(): void {
    void this.loadCategories();
  }

  async loadCategories(): Promise<void> {
    this.errorMessage.set(null);
    this.isLoading.set(true);

    try {
      const result = await this.categoryService.getCategories();
      if (!result.success) {
        this.errorMessage.set(result.message);
        return;
      }
      this.categories.set(result.data);
    } catch (error) {
      if (error instanceof Error) {
        this.errorMessage.set(
          'Kategorije trenutno nisu učitane. Proveri internet vezu i pokušaj ponovo.',
        );
        return;
      }
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  async createCategory(): Promise<void> {
    if (!this.validate(this.categoryForm.controls.name, 'Unesi naziv kategorije.')) {
      return;
    }

    const name = this.categoryForm.controls.name.value.trim();
    await this.runMutation(
      () => this.categoryService.createCategory(name),
      'Kategorija je uspešno dodata.',
      () => this.categoryForm.reset({ name: '' }),
    );
  }

  startEditingCategory(category: Category): void {
    if (this.isMutating()) {
      return;
    }

    this.clearPendingActions();
    this.editingCategoryId.set(category.id);
    this.categoryEditName.setValue(category.name);
  }

  cancelEditingCategory(): void {
    this.editingCategoryId.set(null);
    this.categoryEditName.reset('');
  }

  async saveCategory(category: Category): Promise<void> {
    if (!this.validate(this.categoryEditName, 'Unesi naziv kategorije.')) {
      return;
    }

    const name = this.categoryEditName.value.trim();
    await this.runMutation(
      () => this.categoryService.updateCategory(category.id, name),
      'Kategorija je uspešno izmenjena.',
      () => this.cancelEditingCategory(),
    );
  }

  requestCategoryDeletion(category: Category): void {
    if (this.isMutating()) {
      return;
    }
    if (category.productCount > 0) {
      this.errorMessage.set('Kategorija ne može da se obriše dok sadrži proizvode.');
      return;
    }

    this.clearPendingActions();
    this.pendingCategoryDeleteId.set(category.id);
  }

  cancelCategoryDeletion(): void {
    this.pendingCategoryDeleteId.set(null);
  }

  async deleteCategory(category: Category): Promise<void> {
    if (category.productCount > 0) {
      this.errorMessage.set('Kategorija ne može da se obriše dok sadrži proizvode.');
      return;
    }

    await this.runMutation(
      () => this.categoryService.deleteCategory(category.id),
      'Kategorija je uspešno obrisana.',
      () => this.pendingCategoryDeleteId.set(null),
    );
  }

  startAddingSubcategory(categoryId: string): void {
    if (this.isMutating()) {
      return;
    }

    this.clearPendingActions();
    this.addingSubcategoryTo.set(categoryId);
    this.newSubcategoryName.reset('');
  }

  cancelAddingSubcategory(): void {
    this.addingSubcategoryTo.set(null);
    this.newSubcategoryName.reset('');
  }

  async createSubcategory(categoryId: string): Promise<void> {
    if (!this.validate(this.newSubcategoryName, 'Unesi naziv potkategorije.')) {
      return;
    }

    const name = this.newSubcategoryName.value.trim();
    await this.runMutation(
      () => this.categoryService.createSubcategory(categoryId, name),
      'Potkategorija je uspešno dodata.',
      () => this.cancelAddingSubcategory(),
    );
  }

  startEditingSubcategory(subcategory: Subcategory): void {
    if (this.isMutating()) {
      return;
    }

    this.clearPendingActions();
    this.editingSubcategoryId.set(subcategory.id);
    this.subcategoryEditName.setValue(subcategory.name);
  }

  cancelEditingSubcategory(): void {
    this.editingSubcategoryId.set(null);
    this.subcategoryEditName.reset('');
  }

  async saveSubcategory(subcategory: Subcategory): Promise<void> {
    if (!this.validate(this.subcategoryEditName, 'Unesi naziv potkategorije.')) {
      return;
    }

    const name = this.subcategoryEditName.value.trim();
    await this.runMutation(
      () => this.categoryService.updateSubcategory(subcategory.id, name),
      'Potkategorija je uspešno izmenjena.',
      () => this.cancelEditingSubcategory(),
    );
  }

  requestSubcategoryDeletion(subcategory: Subcategory): void {
    if (this.isMutating()) {
      return;
    }

    this.clearPendingActions();
    this.pendingSubcategoryDeleteId.set(subcategory.id);
  }

  cancelSubcategoryDeletion(): void {
    this.pendingSubcategoryDeleteId.set(null);
  }

  async deleteSubcategory(subcategory: Subcategory): Promise<void> {
    await this.runMutation(
      () => this.categoryService.deleteSubcategory(subcategory.id),
      'Potkategorija je uspešno obrisana.',
      () => this.pendingSubcategoryDeleteId.set(null),
    );
  }

  productCountLabel(count: number): string {
    const lastTwoDigits = count % 100;
    const noun = lastTwoDigits % 10 === 1 && lastTwoDigits !== 11 ? 'proizvod' : 'proizvoda';
    return `${count} ${noun}`;
  }

  subcategoryCountLabel(count: number): string {
    const lastTwoDigits = count % 100;
    const lastDigit = count % 10;
    const noun =
      lastTwoDigits >= 11 && lastTwoDigits <= 14
        ? 'potkategorija'
        : lastDigit === 1
          ? 'potkategorija'
          : lastDigit >= 2 && lastDigit <= 4
            ? 'potkategorije'
            : 'potkategorija';
    return `${count} ${noun}`;
  }

  hasNameError(control: FormControl<string>): boolean {
    return control.invalid && control.touched;
  }

  private validate(control: FormControl<string>, message: string): boolean {
    if (control.invalid) {
      control.markAsTouched();
      return false;
    }
    if (!control.value.trim()) {
      control.setErrors({ whitespace: true });
      control.markAsTouched();
      return false;
    }
    return true;
  }

  private async runMutation(
    action: () => Promise<CategoryServiceResult<unknown>>,
    successMessage: string,
    onSuccess: () => void,
  ): Promise<void> {
    if (this.isMutating()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isMutating.set(true);

    try {
      const result = await action();
      if (!result.success) {
        this.errorMessage.set(result.message);
        return;
      }

      onSuccess();
      this.successMessage.set(successMessage);
      await this.loadCategories();
    } catch (error) {
      if (error instanceof Error) {
        this.errorMessage.set('Promena nije sačuvana. Proveri internet vezu i pokušaj ponovo.');
        return;
      }
      throw error;
    } finally {
      this.isMutating.set(false);
    }
  }

  private clearPendingActions(): void {
    this.editingCategoryId.set(null);
    this.editingSubcategoryId.set(null);
    this.addingSubcategoryTo.set(null);
    this.pendingCategoryDeleteId.set(null);
    this.pendingSubcategoryDeleteId.set(null);
  }
}
