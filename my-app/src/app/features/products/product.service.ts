import { inject, Injectable } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { SUPABASE_CLIENT } from '../../core/supabase/supabase.provider';
import type { Product, ProductDraft, ProductServiceResult } from './product.model';

interface ProductQueryRow {
  id: string;
  name: string;
  category_id: string;
  subcategory_id: string | null;
  created_at: string;
  updated_at: string;
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
export class ProductService {
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly auth = inject(AuthService);

  async getProducts(): Promise<ProductServiceResult<Product[]>> {
    const userId = this.getUserId();
    if (!userId) {
      return { success: false, message: 'Prijavi se da bi pregledala svoje proizvode.' };
    }

    const result = await this.execute<ProductQueryRow[]>(
      () =>
        this.supabase
          .from('products')
          .select('id, name, category_id, subcategory_id, created_at, updated_at')
          .eq('user_id', userId)
          .order('name', { ascending: true })
          .overrideTypes<ProductQueryRow[], { merge: false }>(),
      'Proizvodi trenutno nisu učitani. Proveri internet vezu i pokušaj ponovo.',
    );

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: result.data.map((product) => ({
        id: product.id,
        name: product.name,
        categoryId: product.category_id,
        subcategoryId: product.subcategory_id,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
      })),
    };
  }

  async createProduct(draft: ProductDraft): Promise<ProductServiceResult<{ id: string }>> {
    const normalized = this.normalizeDraft(draft);
    if (!normalized.name) {
      return { success: false, message: 'Unesi naziv proizvoda.' };
    }
    if (!normalized.categoryId) {
      return { success: false, message: 'Izaberi kategoriju.' };
    }

    const userId = this.getUserId();
    if (!userId) {
      return { success: false, message: 'Prijavi se da bi dodala proizvod.' };
    }

    return this.execute<{ id: string }>(
      () =>
        this.supabase
          .from('products')
          .insert({
            user_id: userId,
            name: normalized.name,
            category_id: normalized.categoryId,
            subcategory_id: normalized.subcategoryId,
          })
          .select('id')
          .single()
          .overrideTypes<{ id: string }, { merge: false }>(),
      'Proizvod nije sačuvan. Proveri internet vezu i pokušaj ponovo.',
      this.resolveForeignKeyError('Proizvod nije sačuvan. Proveri internet vezu i pokušaj ponovo.'),
    );
  }

  async updateProduct(
    productId: string,
    draft: ProductDraft,
  ): Promise<ProductServiceResult<{ id: string }>> {
    const normalized = this.normalizeDraft(draft);
    if (!normalized.name) {
      return { success: false, message: 'Unesi naziv proizvoda.' };
    }
    if (!normalized.categoryId) {
      return { success: false, message: 'Izaberi kategoriju.' };
    }

    const userId = this.getUserId();
    if (!userId) {
      return { success: false, message: 'Prijavi se da bi izmenila proizvod.' };
    }

    return this.execute<{ id: string }>(
      () =>
        this.supabase
          .from('products')
          .update({
            name: normalized.name,
            category_id: normalized.categoryId,
            subcategory_id: normalized.subcategoryId,
          })
          .eq('user_id', userId)
          .eq('id', productId)
          .select('id')
          .maybeSingle()
          .overrideTypes<{ id: string } | null, { merge: false }>(),
      'Proizvod nije izmenjen. Proveri internet vezu i pokušaj ponovo.',
      this.resolveForeignKeyError(
        'Proizvod nije izmenjen. Proveri internet vezu i pokušaj ponovo.',
      ),
    );
  }

  async deleteProduct(productId: string): Promise<ProductServiceResult<{ id: string }>> {
    const userId = this.getUserId();
    if (!userId) {
      return { success: false, message: 'Prijavi se da bi obrisala proizvod.' };
    }

    return this.execute<{ id: string }>(
      () =>
        this.supabase
          .from('products')
          .delete()
          .eq('user_id', userId)
          .eq('id', productId)
          .select('id')
          .maybeSingle()
          .overrideTypes<{ id: string } | null, { merge: false }>(),
      'Proizvod nije obrisan. Proveri internet vezu i pokušaj ponovo.',
    );
  }

  private getUserId(): string | null {
    return this.auth.currentUser()?.id ?? null;
  }

  private normalizeDraft(draft: ProductDraft): ProductDraft {
    return {
      name: draft.name.trim(),
      categoryId: draft.categoryId.trim(),
      subcategoryId: draft.subcategoryId?.trim() || null,
    };
  }

  private readonly resolveForeignKeyError =
    (failureMessage: string) =>
    (error: QueryError): string =>
      error.code === '23503'
        ? 'Izabrana kategorija ili potkategorija više nije dostupna. Osveži stranicu i pokušaj ponovo.'
        : failureMessage;

  private async execute<T>(
    request: () => PromiseLike<QueryResponse<T>>,
    failureMessage: string,
    resolveError: (error: QueryError) => string = () => failureMessage,
  ): Promise<ProductServiceResult<T>> {
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
