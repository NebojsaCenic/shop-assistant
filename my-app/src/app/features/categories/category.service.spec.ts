import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { SUPABASE_CLIENT } from '../../core/supabase/supabase.provider';
import { CategoryService } from './category.service';

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

describe('CategoryService', () => {
  const currentUser = signal({ id: 'owner-id' });
  let from: ReturnType<typeof vi.fn>;
  let insertedRow: unknown;

  beforeEach(() => {
    currentUser.set({ id: 'owner-id' });
    insertedRow = null;
    from = vi.fn(() =>
      createQueryBuilder(
        {
          data: { id: 'category-id' },
          error: null,
        },
        (row) => {
          insertedRow = row;
        },
      ),
    );

    TestBed.configureTestingModule({
      providers: [
        CategoryService,
        { provide: AuthService, useValue: { currentUser } },
        { provide: SUPABASE_CLIENT, useValue: { from } },
      ],
    });
  });

  it('loads categories with subcategories and product counts', async () => {
    from.mockReturnValue(
      createQueryBuilder({
        data: [
          {
            id: 'category-id',
            name: 'Hrana',
            subcategories: [
              { id: 'sub-2', name: 'Voće' },
              { id: 'sub-1', name: 'Meso' },
            ],
            products: [{ count: 3 }],
          },
        ],
        error: null,
      }),
    );

    const result = await TestBed.inject(CategoryService).getCategories();

    expect(result).toEqual({
      success: true,
      data: [
        {
          id: 'category-id',
          name: 'Hrana',
          productCount: 3,
          subcategories: [
            { id: 'sub-1', name: 'Meso' },
            { id: 'sub-2', name: 'Voće' },
          ],
        },
      ],
    });
    expect(from).toHaveBeenCalledWith('categories');
  });

  it('trims category names and adds the authenticated owner id', async () => {
    const result = await TestBed.inject(CategoryService).createCategory('  Hrana  ');

    expect(result).toEqual({ success: true, data: { id: 'category-id' } });
    expect(insertedRow).toEqual({ user_id: 'owner-id', name: 'Hrana' });
  });

  it('rejects whitespace-only category names without making a request', async () => {
    const result = await TestBed.inject(CategoryService).createCategory('   ');

    expect(result).toEqual({ success: false, message: 'Unesi naziv kategorije.' });
    expect(from).not.toHaveBeenCalled();
  });

  it('explains why a category with products cannot be deleted', async () => {
    from.mockReturnValue(
      createQueryBuilder({
        data: null,
        error: { code: '23503', message: 'foreign key violation' },
      }),
    );

    const result = await TestBed.inject(CategoryService).deleteCategory('category-id');

    expect(result).toEqual({
      success: false,
      message: 'Kategorija ne može da se obriše dok sadrži proizvode.',
    });
  });
});
