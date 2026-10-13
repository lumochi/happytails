-- =========================================================
-- Happy Tails · tabla privada de donantes (ejecutar una vez)
-- Cualquier visitante puede REGISTRARSE como donante,
-- pero solo la administradora puede VER, editar o borrar.
-- =========================================================
create table if not exists public.donantes (
  id     uuid primary key default gen_random_uuid(),
  datos  jsonb not null check (pg_column_size(datos) < 4000),
  creado timestamptz not null default now()
);
alter table public.donantes enable row level security;

drop policy if exists "registrar donante" on public.donantes;
create policy "registrar donante" on public.donantes for insert to anon, authenticated with check (true);
drop policy if exists "admin lee donantes" on public.donantes;
create policy "admin lee donantes" on public.donantes for select to authenticated using (public.es_admin());
drop policy if exists "admin edita donantes" on public.donantes;
create policy "admin edita donantes" on public.donantes for update to authenticated using (public.es_admin()) with check (public.es_admin());
drop policy if exists "admin borra donantes" on public.donantes;
create policy "admin borra donantes" on public.donantes for delete to authenticated using (public.es_admin());
