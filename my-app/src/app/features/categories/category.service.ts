import { inject, Injectable } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { SUPABASE_CLIENT } from '../../core/supabase/supabase.provider';
import type { Category, CategoryServiceResult, Subcategory } from './category.model';

interface CategoryQueryRow {
  id: string;
  name: string;
  subcategories: Subcategory[];
  products: { count: number }[];
}

interface QueryError {
  code: string;
  message: string;
}

interface QueryResponse<T> {
  data: T | null;
  error: QueryError | null;
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly auth = inject(AuthService);

  async getCategories(): Promise<CategoryServiceResult<Category[]>> {
    const userId = this.getUserId();
    if (!userId) {
      return { success: false, message: 'Prijavi se da bi pregledala svoje kategorije.' };
    }

    const result = await this.execute<CategoryQueryRow[]>(
      () =>
        this.supabase
          .from('categories')
          .select('id, name, subcategories(id, name), products(count)')
          .eq('user_id', userId)
          .order('name', { ascending: true })
          .overrideTypes<CategoryQueryRow[], { merge: false }>(),
      'Kategorije trenutno nisu učitane. Proveri internet vezu i pokušaj ponovo.',
    );

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: result.data.map((category) => ({
        id: category.id,
        name: category.name,
        productCount: category.products.reduce((count, product) => count + product.count, 0),
        subcategories: [...category.subcategories].sort((first, second) =>
          first.name.localeCompare(second.name, 'sr'),
        ),
      })),
    };
  }

  async createCategory(name: string): Promise<CategoryServiceResult<{ id: string }>> {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return { success: false, message: 'Unesi naziv kategorije.' };
    }

    const userId = this.getUserId();
    if (!userId) {
      return { success: false, message: 'Prijavi se da bi dodala kategoriju.' };
    }

    return this.execute<{ id: string }>(
      () =>
        this.supabase
          .from('categories')
          .insert({ user_id: userId, name: normalizedName })
          .select('id')
          .single()
          .overrideTypes<{ id: string }, { merge: false }>(),
      'Kategorija nije sačuvana. Proveri internet vezu i pokušaj ponovo.',
    );
  }

  async updateCategory(
    categoryId: string,
    name: string,
  ): Promise<CategoryServiceResult<{ id: string }>> {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return { success: false, message: 'Unesi naziv kategorije.' };
    }

    const userId = this.getUserId();
    if (!userId) {
      return { success: false, message: 'Prijavi se da bi izmenila kategoriju.' };
    }

    return this.execute<{ id: string }>(
      () =>
        this.supabase
          .from('categories')
          .update({ name: normalizedName })
          .eq('user_id', userId)
          .eq('id', categoryId)
          .select('id')
          .maybeSingle()
          .overrideTypes<{ id: string } | null, { merge: false }>(),
      'Kategorija nije izmenjena. Proveri internet vezu i pokušaj ponovo.',
    );
  }

  async deleteCategory(categoryId: string): Promise<CategoryServiceResult<{ id: string }>> {
    const userId = this.getUserId();
    if (!userId) {
      return { success: false, message: 'Prijavi se da bi obrisala kategoriju.' };
    }

    return this.execute<{ id: string }>(
      () =>
        this.supabase
          .from('categories')
          .delete()
          .eq('user_id', userId)
          .eq('id', categoryId)
          .select('id')
          .maybeSingle()
          .overrideTypes<{ id: string } | null, { merge: false }>(),
      'Kategorija nije obrisana. Proveri internet vezu i pokušaj ponovo.',
      (error) =>
        error.code === '23503'
          ? 'Kategorija ne može da se obriše dok sadrži proizvode.'
          : 'Kategorija nije obrisana. Proveri internet vezu i pokušaj ponovo.',
    );
  }

  async createSubcategory(
    categoryId: string,
    name: string,
  ): Promise<CategoryServiceResult<{ id: string }>> {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return { success: false, message: 'Unesi naziv potkategorije.' };
    }

    const userId = this.getUserId();
    if (!userId) {
      return { success: false, message: 'Prijavi se da bi dodala potkategoriju.' };
    }

    return this.execute<{ id: string }>(
      () =>
        this.supabase
          .from('subcategories')
          .insert({ user_id: userId, category_id: categoryId, name: normalizedName })
          .select('id')
          .single()
          .overrideTypes<{ id: string }, { merge: false }>(),
      'Potkategorija nije sačuvana. Proveri internet vezu i pokušaj ponovo.',
    );
  }

  async updateSubcategory(
    subcategoryId: string,
    name: string,
  ): Promise<CategoryServiceResult<{ id: string }>> {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return { success: false, message: 'Unesi naziv potkategorije.' };
    }

    const userId = this.getUserId();
    if (!userId) {
      return { success: false, message: 'Prijavi se da bi izmenila potkategoriju.' };
    }

    return this.execute<{ id: string }>(
      () =>
        this.supabase
          .from('subcategories')
          .update({ name: normalizedName })
          .eq('user_id', userId)
          .eq('id', subcategoryId)
          .select('id')
          .maybeSingle()
          .overrideTypes<{ id: string } | null, { merge: false }>(),
      'Potkategorija nije izmenjena. Proveri internet vezu i pokušaj ponovo.',
    );
  }

  async deleteSubcategory(subcategoryId: string): Promise<CategoryServiceResult<{ id: string }>> {
    const userId = this.getUserId();
    if (!userId) {
      return { success: false, message: 'Prijavi se da bi obrisala potkategoriju.' };
    }

    return this.execute<{ id: string }>(
      () =>
        this.supabase
          .from('subcategories')
          .delete()
          .eq('user_id', userId)
          .eq('id', subcategoryId)
          .select('id')
          .maybeSingle()
          .overrideTypes<{ id: string } | null, { merge: false }>(),
      'Potkategorija nije obrisana. Proveri internet vezu i pokušaj ponovo.',
    );
  }

  private getUserId(): string | null {
    return this.auth.currentUser()?.id ?? null;
  }

  private async execute<T>(
    request: () => PromiseLike<QueryResponse<T>>,
    failureMessage: string,
    resolveError: (error: QueryError) => string = () => failureMessage,
  ): Promise<CategoryServiceResult<T>> {
    try {
      const { data, error } = await request();
      if (error) {
        return { success: false, message: resolveError(error) };
      }
      if (data === null) {
        return { success: false, message: failureMessage };
      }
      return { success: true, data };
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: failureMessage };
      }
      throw error;
    }
  }
}
