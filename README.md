# Stock de la cocina

## Cómo correrlo

1. Instalar dependencias:
   ```
   npm install
   ```

2. Copiar el archivo de ejemplo y completar tus credenciales de Supabase:
   ```
   cp .env.local.example .env.local
   ```
   Las credenciales están en Supabase > Project Settings > API:
   - `NEXT_PUBLIC_SUPABASE_URL` = "Project URL"
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = "anon public" key

3. Levantar el servidor:
   ```
   npm run dev
   ```

4. Abrir http://localhost:3000

## Importante: seguridad (RLS)

Por defecto Supabase bloquea todo acceso a las tablas hasta que configures
Row Level Security (RLS). Para este proyecto, como es de uso interno con
la anon key, la forma más simple es:

1. Ir a Supabase > Authentication > Policies
2. Para las tablas `products`, `stock_movements` y la vista `products_status`,
   habilitar RLS y crear una policy que permita `select`, `insert`, `update`
   a todos (o restringilo más adelante si agregás login).

Ejemplo de policy abierta para arrancar rápido (podés ajustarla después):
```sql
alter table products enable row level security;
create policy "allow all" on products for all using (true) with check (true);

alter table stock_movements enable row level security;
create policy "allow all" on stock_movements for all using (true) with check (true);
```

## Deploy

Lo más simple: subir este proyecto a GitHub y conectarlo en vercel.com
(gratis). Ahí configurás las mismas dos variables de entorno del paso 2
y te da una URL pública para abrir desde el celular de la cocina.
# KitchenStock
