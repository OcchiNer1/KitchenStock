// Coincide con la vista `products_status` del schema.sql

export type StockStatus = "red" | "yellow" | "green";

export interface ProductStatus {
  id: string;
  name: string;
  category_id: string | null;
  purchase_unit: string; // "Bucket", "Pack", "Tupper", "Unidad"
  is_divisible: boolean; // true = slider %, false = stepper +/-
  unit_size: number; // cuánto es 1 unidad de compra, en unidad base
  base_unit: string; // "g", "ml", "unidad", "slice"
  current_stock: number; // siempre en unidad base
  min_stock: number;
  warning_stock: number | null;
  is_active: boolean;
  status: StockStatus;
  stock_in_purchase_units: number; // ej: 1.4 (buckets) o 3 (packs)
}
