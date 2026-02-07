import { ID, Money } from "./common";

export enum Category {
  ELECTRONICS = "ELECTRONICS",
  HOME = "HOME",
  FASHION = "FASHION",
  BOOKS = "BOOKS",
  BEAUTY = "BEAUTY",
  SPORTS = "SPORTS"
}

export enum InventoryStatus {
  IN_STOCK = "IN_STOCK",
  LOW_STOCK = "LOW_STOCK",
  OUT_OF_STOCK = "OUT_OF_STOCK",
  BACKORDER = "BACKORDER"
}

export interface Product {
  id: ID;
  sku: string;
  name: string;
  description: string;
  price: Money;
  categories: Category[];
  inventoryStatus: InventoryStatus;
  stock: number;
  active: boolean;
  weightGrams?: number;
}
