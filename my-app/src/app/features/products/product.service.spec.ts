import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { SUPABASE_CLIENT } from '../../core/supabase/supabase.provider';
import { ProductService } from './product.service';

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
    update: () => builder,
  };
  return builder;
}

describe('ProductService', () => {
  const currentUser = signal({ id: 'owner-id' });
  let from: ReturnType<typeof vi.fn>;
  let insertedRow: unknown;

  beforeEach(() => {
    currentUser.set({ id: 'owner-id' });
    insertedRow = null;
    from = vi.fn(() =>
      createQueryBuilder(
        {
          data: { id: 'product-id' },
          error: null,
        },
        (row) => {
          insertedRow = row;
        },
      ),
    );

    TestBed.configureTestingModule({
      providers: [
        ProductService,
        { provide: AuthService, useValue: { currentUser } },
        { provide: SUPABASE_CLIENT, useValue: { from } },
      ],
    });
  });

  it('maps database product fields to the application model', async () => {
    from.mockReturnValue(
      createQueryBuilder({
        data: [
          {
            id: 'product-id',
            name: 'Mleko',
            category_id: 'category-id',
            subcategory_id: null,
            brand: 'Mlekara',
            notes: null,
            created_at: '2026-11-14T12:00:00Z',
            updated_at: '2026-11-14T12:00:00Z',
          },
        ],
        error: null,
      }),
    );

    const result = await TestBed.inject(ProductService).getProducts();

    expect(result).toEqual({
      success: true,
      data: [
        {
          id: 'product-id',
          name: 'Mleko',
          categoryId: 'category-id',
          subcategoryId: null,
          brand: 'Mlekara',
          notes: null,
          createdAt: '2026-11-14T12:00:00Z',
          updatedAt: '2026-11-14T12:00:00Z',
        },
      ],
    });
    expect(from).toHaveBeenCalledWith('products');
  });

  it('trims product text and stores empty optional fields as null', async () => {
    const result = await TestBed.inject(ProductService).createProduct({
      name: '  Mleko  ',
      categoryId: 'category-id',
      subcategoryId: null,
      brand: '  ',
      notes: '',
    });

    expect(result).toEqual({ success: true, data: { id: 'product-id' } });
    expect(insertedRow).toEqual({
      user_id: 'owner-id',
      name: 'Mleko',
      category_id: 'category-id',
      subcategory_id: null,
      brand: null,
      notes: null,
    });
  });

  it('localizes a missing-category database constraint error', async () => {
    from.mockReturnValue(
      createQueryBuilder({
        data: null,
        error: { code: '23503', message: 'foreign key violation' },
      }),
    );

    const result = await TestBed.inject(ProductService).createProduct({
      name: 'Mleko',
      categoryId: 'missing-category',
      subcategoryId: null,
      brand: null,
      notes: null,
    });

    expect(result).toEqual({
      success: false,
      message:
        'Izabrana kategorija ili potkategorija više nije dostupna. Osveži stranicu i pokušaj ponovo.',
    });
  });
});
