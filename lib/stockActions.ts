import { supabase } from "./supabase";
import { ProductStatus } from "./types";

/**
 * Para productos DIVISIBLES (bucket, tupper): el usuario mueve un slider 0-100%.
 * El cálculo final lo hace la función SQL `set_stock_percentage` (atómica).
 */
export async function setStockByPercentage(
  product: ProductStatus,
  newPercentage: number,
  actor: string = "app"
) {
  const { error } = await supabase.rpc("set_stock_percentage", {
    p_product_id: product.id,
    p_percentage: newPercentage,
    p_actor: actor,
  });

  if (error) throw error;
}

/**
 * Para productos NO divisibles (pack, unidad): +1 / -1 sobre la cantidad de
 * unidades de compra (packs). El incremento lo hace la función SQL
 * `adjust_stock`, que bloquea la fila y evita perder movimientos cuando
 * se tocan los botones rápido (condición de carrera).
 */
export async function adjustStockByUnits(
  product: ProductStatus,
  deltaPurchaseUnits: number,
  movementType: "restock" | "usage" | "waste" | "adjustment" = "adjustment",
  actor: string = "app"
) {
  const { error } = await supabase.rpc("adjust_stock", {
    p_product_id: product.id,
    p_delta_purchase_units: deltaPurchaseUnits,
    p_movement_type: movementType,
    p_actor: actor,
  });

  if (error) throw error;
}

/**
 * Para productos con VARIOS buckets: la UI ya calculó el total en
 * unidad base (buckets cerrados * tamaño + % del abierto) y esta
 * función solo lo guarda de forma atómica.
 */
export async function setStockValue(
  product: ProductStatus,
  newValueBaseUnits: number,
  actor: string = "app"
) {
  const { error } = await supabase.rpc("set_stock_value", {
    p_product_id: product.id,
    p_new_value: newValueBaseUnits,
    p_actor: actor,
  });

  if (error) throw error;
}

export async function fetchProducts(): Promise<ProductStatus[]> {
  const { data, error } = await supabase
    .from("products_status")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data as ProductStatus[];
}

/**
 * Actualiza el mínimo (rojo) y aviso (amarillo) de un producto.
 * Recibe los valores en "unidades de compra" (packs/tuppers/% de bucket)
 * para que sea cómodo editarlos desde la UI, y los convierte a la
 * unidad base antes de guardar.
 */
export async function updateThresholds(
  product: ProductStatus,
  minInPurchaseUnits: number,
  warningInPurchaseUnits: number | null
) {
  const min_stock = minInPurchaseUnits * product.unit_size;
  const warning_stock =
    warningInPurchaseUnits === null ? null : warningInPurchaseUnits * product.unit_size;

  const { error } = await supabase
    .from("products")
    .update({ min_stock, warning_stock })
    .eq("id", product.id);

  if (error) throw error;
}
