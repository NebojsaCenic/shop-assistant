export interface Product {
  id: string;
  name: string;
  categoryId: string;
  subcategoryId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDraft {
  name: string;
  categoryId: string;
  subcategoryId: string | null;
}

export type ProductServiceResult<T> =
  { success: true; data: T } | { success: false; message: string };
