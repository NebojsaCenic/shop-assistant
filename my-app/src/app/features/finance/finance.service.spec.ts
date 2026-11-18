import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { SUPABASE_CLIENT } from '../../core/supabase/supabase.provider';
import { FinanceService } from './finance.service';

interface QueryResponse {
  data: unknown;
  error: { code: string; message: string } | null;
}

interface QueryBuilder {
  delete: () => QueryBuilder;
  eq: (column: string, value: unknown) => QueryBuilder;
  insert: (row: unknown) => QueryBuilder;
  maybeSingle: () => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  overrideTypes: <T>() => QueryBuilder;
  select: (columns?: string) => QueryBuilder;
  single: () => QueryBuilder;
  then: (resolve: (response: QueryResponse) => unknown) => Promise<unknown>;
  update: (values: unknown) => QueryBuilder;
}

function createQueryBuilder(
  response: QueryResponse,
  onInsert?: (row: unknown) => void,
  onUpdate?: (row: unknown) => void,
): QueryBuilder {
  let builder: QueryBuilder;
  builder = {
    delete: () => builder,
    eq: () => builder,
    insert: (row) => {
      onInsert?.(row);
      return builder;
    },
    maybeSingle: () => builder,
    order: () => builder,
    overrideTypes: () => builder,
    select: () => builder,
    single: () => builder,
    then: (resolve) => Promise.resolve(response).then(resolve),
    update: (row) => {
      onUpdate?.(row);
      return builder;
    },
  };
  return builder;
}

describe('FinanceService', () => {
  const currentUser = signal({ id: 'owner-id' });
  let from: ReturnType<typeof vi.fn>;
  let insertedRow: unknown;
  let updatedRow: unknown;

  beforeEach(() => {
    currentUser.set({ id: 'owner-id' });
    insertedRow = null;
    updatedRow = null;
    from = vi.fn(() =>
      createQueryBuilder(
        { data: { id: 'finance-id' }, error: null },
        (row) => (insertedRow = row),
        (row) => (updatedRow = row),
      ),
    );
    TestBed.configureTestingModule({
      providers: [
        FinanceService,
        { provide: AuthService, useValue: { currentUser } },
        { provide: SUPABASE_CLIENT, useValue: { from } },
      ],
    });
  });

  it('maps numeric amounts and category ids from transactions', async () => {
    from.mockReturnValue(
      createQueryBuilder({
        data: [
          {
            id: 'expense-id',
            type: 'expense',
            amount: '1250.50',
            category_id: 'food-id',
            transaction_date: '2026-11-18',
            created_at: '2026-11-18T10:00:00Z',
          },
        ],
        error: null,
      }),
    );

    const result = await TestBed.inject(FinanceService).getTransactions();

    expect(result).toEqual({
      success: true,
      data: [
        {
          id: 'expense-id',
          type: 'expense',
          amount: 1250.5,
          categoryId: 'food-id',
          date: '2026-11-18',
          createdAt: '2026-11-18T10:00:00Z',
        },
      ],
    });
  });

  it('stores salary income without a category and rounds to dinar subunits', async () => {
    const result = await TestBed.inject(FinanceService).createTransaction({
      type: 'salary',
      amount: 54321.237,
      categoryId: 'ignored-category',
      date: '2026-11-18',
    });

    expect(result).toEqual({ success: true, data: { id: 'finance-id' } });
    expect(insertedRow).toEqual({
      user_id: 'owner-id',
      type: 'salary',
      amount: 54321.24,
      category_id: null,
      transaction_date: '2026-11-18',
    });
  });

  it('requires an expense category and avoids a database request', async () => {
    const result = await TestBed.inject(FinanceService).createTransaction({
      type: 'expense',
      amount: 100,
      categoryId: null,
      date: '2026-11-18',
    });

    expect(result).toEqual({ success: false, message: 'Izaberi kategoriju troška.' });
    expect(from).not.toHaveBeenCalled();
  });

  it('archives a category instead of deleting its historical record', async () => {
    await TestBed.inject(FinanceService).archiveCategory('category-id');

    expect(from).toHaveBeenCalledWith('finance_categories');
    expect(updatedRow).toEqual({ is_active: false });
  });
});
