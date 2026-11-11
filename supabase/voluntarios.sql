-- =========================================================
-- Happy Tails · tabla privada de voluntarios (ejecutar una vez)
-- Supabase → SQL Editor → pegar todo → Run.
-- Cualquier visitante puede INSCRIBIRSE como voluntario,
-- pero solo la administradora puede VER o borrar la lista.
-- =========================================================
create table if not exists public.voluntarios (
  id     uuid primary key default gen_random_uuid(),
  datos  jsonb not null check (pg_column_size(datos) < 4000),
  creado timestamptz not null default now()
);
alter table public.voluntarios enable row level security;

drop policy if exists "inscribir voluntario" on public.voluntarios;
create policy "inscribir voluntario" on public.voluntarios for insert to anon, authenticated with check (true);
drop policy if exists "admin lee voluntarios" on public.voluntarios;
create policy "admin lee voluntarios" on public.voluntarios for select to authenticated using (public.es_admin());
drop policy if exists "admin borra voluntarios" on public.voluntarios;
create policy "admin borra voluntarios" on public.voluntarios for delete to authenticated using (public.es_admin());
