import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { SUPABASE_CLIENT } from '../../core/supabase/supabase.provider';
import { ShoppingService } from './shopping.service';

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
  onFilter?: (column: string, value: unknown) => void,
): QueryBuilder {
  let builder: QueryBuilder;
  builder = {
    delete: () => builder,
    eq: (column, value) => {
      onFilter?.(column, value);
      return builder;
    },
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
    update: () => builder,
  };
  return builder;
}

describe('ShoppingService', () => {
  const currentUser = signal({ id: 'owner-id' });
  let from: ReturnType<typeof vi.fn>;
  let insertedRow: unknown;
  let filters: [string, unknown][];

  beforeEach(() => {
    currentUser.set({ id: 'owner-id' });
    insertedRow = null;
    filters = [];
    from = vi.fn(() =>
      createQueryBuilder(
        {
          data: {
            id: 'item-id',
            product_id: 'product-id',
            is_purchased: false,
            created_at: '2026-11-14T12:00:00Z',
          },
          error: null,
        },
        (row) => {
          insertedRow = row;
        },
        (column, value) => filters.push([column, value]),
      ),
    );

    TestBed.configureTestingModule({
      providers: [
        ShoppingService,
        { provide: AuthService, useValue: { currentUser } },
        { provide: SUPABASE_CLIENT, useValue: { from } },
      ],
    });
  });

  it('maps saved checklist rows to the application model', async () => {
    from.mockReturnValue(
      createQueryBuilder({
        data: [
          {
            id: 'item-id',
            product_id: 'product-id',
            is_purchased: true,
            created_at: '2026-11-14T12:00:00Z',
          },
        ],
        error: null,
      }),
    );

    const result = await TestBed.inject(ShoppingService).getItems();

    expect(result).toEqual({
      success: true,
      data: [
        {
          id: 'item-id',
          productId: 'product-id',
          isPurchased: true,
          createdAt: '2026-11-14T12:00:00Z',
        },
      ],
    });
    expect(from).toHaveBeenCalledWith('shopping_list_items');
  });

  it('creates a user-owned checklist item without creating a product', async () => {
    const result = await TestBed.inject(ShoppingService).addProduct('  product-id  ');

    expect(result).toEqual({
      success: true,
      data: {
        id: 'item-id',
        productId: 'product-id',
        isPurchased: false,
        createdAt: '2026-11-14T12:00:00Z',
      },
    });
    expect(insertedRow).toEqual({ user_id: 'owner-id', product_id: 'product-id' });
    expect(from).toHaveBeenCalledWith('shopping_list_items');
  });

  it('localizes a duplicate product selection constraint', async () => {
    from.mockReturnValue(
      createQueryBuilder({
        data: null,
        error: { code: '23505', message: 'duplicate key' },
      }),
    );

    const result = await TestBed.inject(ShoppingService).addProduct('product-id');

    expect(result).toEqual({
      success: false,
      message: 'Ovaj proizvod se već nalazi na listi za kupovinu.',
    });
  });

  it('clears only the signed-in user’s checklist rows', async () => {
    from.mockReturnValue(
      createQueryBuilder({ data: [], error: null }, undefined, (column, value) =>
        filters.push([column, value]),
      ),
    );

    const result = await TestBed.inject(ShoppingService).clearList();

    expect(result).toEqual({ success: true, data: [] });
    expect(filters).toContainEqual(['user_id', 'owner-id']);
    expect(from).toHaveBeenCalledWith('shopping_list_items');
  });
});
