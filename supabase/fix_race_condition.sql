-- ============================================
-- FIX: incremento atómico de stock
-- Correr esto en el SQL Editor de Supabase
-- ============================================

create or replace function adjust_stock(
  p_product_id uuid,
  p_delta_purchase_units numeric,
  p_movement_type text default 'adjustment',
  p_actor text default 'app'
) returns numeric as $$
declare
  v_unit_size numeric;
  v_current numeric;
  v_new numeric;
begin
  -- "for update" bloquea la fila hasta que termina esta función.
  -- Si llegan dos clicks casi al mismo tiempo, el segundo espera a que
  -- termine el primero y parte del valor YA actualizado, no del viejo.
  select unit_size, current_stock into v_unit_size, v_current
  from products
  where id = p_product_id
  for update;

  v_new := greatest(0, v_current + (p_delta_purchase_units * v_unit_size));

  update products set current_stock = v_new where id = p_product_id;

  insert into stock_movements (product_id, change_amount, movement_type, created_by)
  values (p_product_id, v_new - v_current, p_movement_type, p_actor);

  return v_new;
end;
$$ language plpgsql;

-- Misma idea pero para el slider de porcentaje simple (un solo bucket).
create or replace function set_stock_percentage(
  p_product_id uuid,
  p_percentage numeric,
  p_actor text default 'app'
) returns numeric as $$
declare
  v_unit_size numeric;
  v_current numeric;
  v_new numeric;
begin
  select unit_size, current_stock into v_unit_size, v_current
  from products
  where id = p_product_id
  for update;

  v_new := round((p_percentage / 100) * v_unit_size);

  update products set current_stock = v_new where id = p_product_id;

  insert into stock_movements (product_id, change_amount, movement_type, resulting_percentage, created_by)
  values (p_product_id, v_new - v_current, 'adjustment', p_percentage, p_actor);

  return v_new;
end;
$$ language plpgsql;

-- Para productos con VARIOS buckets: la UI calcula el total
-- (buckets cerrados * tamaño + % del bucket abierto) y esta función
-- simplemente lo guarda de forma atómica y deja registro del movimiento.
create or replace function set_stock_value(
  p_product_id uuid,
  p_new_value numeric,
  p_movement_type text default 'adjustment',
  p_actor text default 'app'
) returns numeric as $$
declare
  v_current numeric;
begin
  select current_stock into v_current
  from products
  where id = p_product_id
  for update;

  update products set current_stock = p_new_value where id = p_product_id;

  insert into stock_movements (product_id, change_amount, movement_type, created_by)
  values (p_product_id, p_new_value - v_current, p_movement_type, p_actor);

  return p_new_value;
end;
$$ language plpgsql;
