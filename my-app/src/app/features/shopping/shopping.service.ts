import { inject, Injectable } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { SUPABASE_CLIENT } from '../../core/supabase/supabase.provider';
import type { ShoppingListItem, ShoppingServiceResult } from './shopping.model';

interface ShoppingItemQueryRow {
  id: string;
  product_id: string;
  is_purchased: boolean;
  created_at: string;
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
export class ShoppingService {
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly auth = inject(AuthService);

  async getItems(): Promise<ShoppingServiceResult<ShoppingListItem[]>> {
    const userId = this.getUserId();
    if (!userId) {
      return { success: false, message: 'Prijavi se da bi pregledala listu za kupovinu.' };
    }

    const result = await this.execute<ShoppingItemQueryRow[]>(
      () =>
        this.supabase
          .from('shopping_list_items')
          .select('id, product_id, is_purchased, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .overrideTypes<ShoppingItemQueryRow[], { merge: false }>(),
      'Lista za kupovinu trenutno nije učitana. Proveri internet vezu i pokušaj ponovo.',
    );

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: result.data.map((item) => ({
        id: item.id,
        productId: item.product_id,
        isPurchased: item.is_purchased,
        createdAt: item.created_at,
      })),
    };
  }

  async addProduct(productId: string): Promise<ShoppingServiceResult<ShoppingListItem>> {
    const normalizedProductId = productId.trim();
    if (!normalizedProductId) {
      return { success: false, message: 'Izaberi proizvod koji želiš da dodaš.' };
    }

    const userId = this.getUserId();
    if (!userId) {
      return { success: false, message: 'Prijavi se da bi dodala proizvod na listu.' };
    }

    const result = await this.execute<ShoppingItemQueryRow>(
      () =>
        this.supabase
          .from('shopping_list_items')
          .insert({ user_id: userId, product_id: normalizedProductId })
          .select('id, product_id, is_purchased, created_at')
          .single()
          .overrideTypes<ShoppingItemQueryRow, { merge: false }>(),
      'Proizvod nije dodat na listu. Proveri internet vezu i pokušaj ponovo.',
      (error) => {
        if (error.code === '23505') {
          return 'Ovaj proizvod se već nalazi na listi za kupovinu.';
        }
        if (error.code === '23503') {
          return 'Proizvod više nije dostupan. Osveži stranicu i pokušaj ponovo.';
        }
        return 'Proizvod nije dodat na listu. Proveri internet vezu i pokušaj ponovo.';
      },
    );

    if (!result.success) {
      return result;
    }

    return { success: true, data: this.mapItem(result.data) };
  }

  async setPurchased(
    itemId: string,
    isPurchased: boolean,
  ): Promise<ShoppingServiceResult<{ id: string }>> {
    const userId = this.getUserId();
    if (!userId) {
      return { success: false, message: 'Prijavi se da bi izmenila listu za kupovinu.' };
    }

    return this.execute<{ id: string }>(
      () =>
        this.supabase
          .from('shopping_list_items')
          .update({ is_purchased: isPurchased })
          .eq('user_id', userId)
          .eq('id', itemId)
          .select('id')
          .maybeSingle()
          .overrideTypes<{ id: string } | null, { merge: false }>(),
      'Status proizvoda nije sačuvan. Proveri internet vezu i pokušaj ponovo.',
    );
  }

  async removeItem(itemId: string): Promise<ShoppingServiceResult<{ id: string }>> {
    const userId = this.getUserId();
    if (!userId) {
      return { success: false, message: 'Prijavi se da bi izmenila listu za kupovinu.' };
    }

    return this.execute<{ id: string }>(
      () =>
        this.supabase
          .from('shopping_list_items')
          .delete()
          .eq('user_id', userId)
          .eq('id', itemId)
          .select('id')
          .maybeSingle()
          .overrideTypes<{ id: string } | null, { merge: false }>(),
      'Proizvod nije uklonjen sa liste. Proveri internet vezu i pokušaj ponovo.',
    );
  }

  async clearList(): Promise<ShoppingServiceResult<{ id: string }[]>> {
    const userId = this.getUserId();
    if (!userId) {
      return { success: false, message: 'Prijavi se da bi ispraznila listu za kupovinu.' };
    }

    return this.execute<{ id: string }[]>(
      () =>
        this.supabase
          .from('shopping_list_items')
          .delete()
          .eq('user_id', userId)
          .select('id')
          .overrideTypes<{ id: string }[], { merge: false }>(),
      'Lista nije ispražnjena. Proveri internet vezu i pokušaj ponovo.',
    );
  }

  private getUserId(): string | null {
    return this.auth.currentUser()?.id ?? null;
  }

  private mapItem(item: ShoppingItemQueryRow): ShoppingListItem {
    return {
      id: item.id,
      productId: item.product_id,
      isPurchased: item.is_purchased,
      createdAt: item.created_at,
    };
  }

  private async execute<T>(
    request: () => PromiseLike<QueryResponse<T>>,
    failureMessage: string,
    resolveError: (error: QueryError) => string = () => failureMessage,
  ): Promise<ShoppingServiceResult<T>> {
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
