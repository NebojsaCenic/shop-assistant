export interface ShoppingListItem {
  id: string;
  productId: string;
  isPurchased: boolean;
  createdAt: string;
}

export type ShoppingServiceResult<T> =
  { success: true; data: T } | { success: false; message: string };
