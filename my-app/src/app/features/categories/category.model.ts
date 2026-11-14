export interface Subcategory {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  productCount: number;
  subcategories: Subcategory[];
}

export type CategoryServiceResult<T> =
  { success: true; data: T } | { success: false; message: string };
