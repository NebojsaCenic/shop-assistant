import { inject, Injectable } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { SUPABASE_CLIENT } from '../../core/supabase/supabase.provider';
import type {
  FinanceCategory,
  FinanceCategoryDraft,
  FinanceServiceResult,
  FinanceTransaction,
  FinanceTransactionDraft,
  FinanceTransactionType,
} from './finance.model';

interface FinanceCategoryRow {
  id: string;
  name: string;
  icon: string;
  is_active: boolean;
  created_at: string;
}

interface FinanceTransactionRow {
  id: string;
  type: FinanceTransactionType;
  amount: number | string;
  category_id: string | null;
  transaction_date: string;
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
export class FinanceService {
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly auth = inject(AuthService);

  async getCategories(): Promise<FinanceServiceResult<FinanceCategory[]>> {
    const userId = this.getUserId();
    if (!userId) {
      return { success: false, message: 'Prijavi se da bi pregledala finansije.' };
    }

    const result = await this.execute<FinanceCategoryRow[]>(
      () =>
        this.supabase
          .from('finance_categories')
          .select('id, name, icon, is_active, created_at')
          .eq('user_id', userId)
          .order('name', { ascending: true })
          .overrideTypes<FinanceCategoryRow[], { merge: false }>(),
      'Kategorije troškova nisu učitane. Proveri internet vezu i pokušaj ponovo.',
    );

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: result.data.map((category) => ({
        id: category.id,
        name: category.name,
        icon: category.icon,
        isActive: category.is_active,
        createdAt: category.created_at,
      })),
    };
  }

  async createCategory(draft: FinanceCategoryDraft): Promise<FinanceServiceResult<{ id: string }>> {
    const name = draft.name.trim();
    const icon = draft.icon.trim();
    if (!name || !icon) {
      return { success: false, message: 'Unesi naziv i izaberi ikonicu kategorije.' };
    }

    const userId = this.getUserId();
    if (!userId) {
      return { success: false, message: 'Prijavi se da bi dodala kategoriju.' };
    }

    return this.execute<{ id: string }>(
      () =>
        this.supabase
          .from('finance_categories')
          .insert({ user_id: userId, name, icon })
          .select('id')
          .single()
          .overrideTypes<{ id: string }, { merge: false }>(),
      'Kategorija nije sačuvana. Proveri internet vezu i pokušaj ponovo.',
    );
  }

  async createDefaultCategories(
    defaults: FinanceCategoryDraft[],
  ): Promise<FinanceServiceResult<{ id: string }[]>> {
    const userId = this.getUserId();
    if (!userId) {
      return { success: false, message: 'Prijavi se da bi dodala kategorije.' };
    }

    return this.execute<{ id: string }[]>(
      () =>
        this.supabase
          .from('finance_categories')
          .insert(defaults.map((category) => ({ user_id: userId, ...category })))
          .select('id')
          .overrideTypes<{ id: string }[], { merge: false }>(),
      'Početne kategorije nisu sačuvane. Pokušaj ponovo.',
    );
  }

  async archiveCategory(categoryId: string): Promise<FinanceServiceResult<{ id: string } | null>> {
    const userId = this.getUserId();
    if (!userId) {
      return { success: false, message: 'Prijavi se da bi uklonila kategoriju.' };
    }

    return this.execute<{ id: string } | null>(
      () =>
        this.supabase
          .from('finance_categories')
          .update({ is_active: false })
          .eq('user_id', userId)
          .eq('id', categoryId)
          .select('id')
          .maybeSingle()
          .overrideTypes<{ id: string } | null, { merge: false }>(),
      'Kategorija nije uklonjena. Proveri internet vezu i pokušaj ponovo.',
    );
  }

  async restoreCategory(categoryId: string): Promise<FinanceServiceResult<{ id: string } | null>> {
    const userId = this.getUserId();
    if (!userId) {
      return { success: false, message: 'Prijavi se da bi vratila kategoriju.' };
    }

    return this.execute<{ id: string } | null>(
      () =>
        this.supabase
          .from('finance_categories')
          .update({ is_active: true })
          .eq('user_id', userId)
          .eq('id', categoryId)
          .select('id')
          .maybeSingle()
          .overrideTypes<{ id: string } | null, { merge: false }>(),
      'Kategorija nije vraćena. Proveri internet vezu i pokušaj ponovo.',
    );
  }

  async getTransactions(): Promise<FinanceServiceResult<FinanceTransaction[]>> {
    const userId = this.getUserId();
    if (!userId) {
      return { success: false, message: 'Prijavi se da bi pregledala transakcije.' };
    }

    const result = await this.execute<FinanceTransactionRow[]>(
      () =>
        this.supabase
          .from('finance_transactions')
          .select('id, type, amount, category_id, transaction_date, created_at')
          .eq('user_id', userId)
          .order('transaction_date', { ascending: false })
          .order('created_at', { ascending: false })
          .overrideTypes<FinanceTransactionRow[], { merge: false }>(),
      'Transakcije nisu učitane. Proveri internet vezu i pokušaj ponovo.',
    );

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: result.data.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: Number(transaction.amount),
        categoryId: transaction.category_id,
        date: transaction.transaction_date,
        createdAt: transaction.created_at,
      })),
    };
  }

  async createTransaction(
    draft: FinanceTransactionDraft,
  ): Promise<FinanceServiceResult<{ id: string } | null>> {
    return this.saveTransaction(draft, null);
  }

  async updateTransaction(
    transactionId: string,
    draft: FinanceTransactionDraft,
  ): Promise<FinanceServiceResult<{ id: string } | null>> {
    return this.saveTransaction(draft, transactionId);
  }

  async deleteTransaction(transactionId: string): Promise<FinanceServiceResult<{ id: string } | null>> {
    const userId = this.getUserId();
    if (!userId) {
      return { success: false, message: 'Prijavi se da bi obrisala transakciju.' };
    }

    return this.execute<{ id: string } | null>(
      () =>
        this.supabase
          .from('finance_transactions')
          .delete()
          .eq('user_id', userId)
          .eq('id', transactionId)
          .select('id')
          .maybeSingle()
          .overrideTypes<{ id: string } | null, { merge: false }>(),
      'Transakcija nije obrisana. Proveri internet vezu i pokušaj ponovo.',
    );
  }

  private async saveTransaction(
    draft: FinanceTransactionDraft,
    transactionId: string | null,
  ): Promise<FinanceServiceResult<{ id: string } | null>> {
    const amount = Math.round(draft.amount * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, message: 'Unesi iznos veći od nule.' };
    }
    if (!this.isValidDate(draft.date)) {
      return { success: false, message: 'Izaberi ispravan datum.' };
    }
    if (!['expense', 'salary', 'other_income'].includes(draft.type)) {
      return { success: false, message: 'Izaberi vrstu transakcije.' };
    }
    if (draft.type === 'expense' && !draft.categoryId) {
      return { success: false, message: 'Izaberi kategoriju troška.' };
    }

    const userId = this.getUserId();
    if (!userId) {
      return { success: false, message: 'Prijavi se da bi sačuvala transakciju.' };
    }

    const values = {
      user_id: userId,
      type: draft.type,
      amount,
      category_id: draft.type === 'expense' ? draft.categoryId : null,
      transaction_date: draft.date,
    };

    if (transactionId) {
      return this.execute<{ id: string } | null>(
        () =>
          this.supabase
            .from('finance_transactions')
            .update(values)
            .eq('user_id', userId)
            .eq('id', transactionId)
            .select('id')
            .maybeSingle()
            .overrideTypes<{ id: string } | null, { merge: false }>(),
        'Transakcija nije izmenjena. Proveri internet vezu i pokušaj ponovo.',
      );
    }

    return this.execute<{ id: string }>(
      () =>
        this.supabase
          .from('finance_transactions')
          .insert(values)
          .select('id')
          .single()
          .overrideTypes<{ id: string }, { merge: false }>(),
      'Transakcija nije sačuvana. Proveri internet vezu i pokušaj ponovo.',
    );
  }

  private isValidDate(value: string): boolean {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  private getUserId(): string | null {
    return this.auth.currentUser()?.id ?? null;
  }

  private async execute<T>(
    request: () => PromiseLike<QueryResponse<T>>,
    failureMessage: string,
  ): Promise<FinanceServiceResult<T>> {
    try {
      const { data, error } = await request();
      if (error) {
        return { success: false, message: failureMessage };
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
