-- =========================================================
-- Patas al Rescate · esquema para Supabase
-- Pega todo en SQL Editor → New query → Run (una sola vez).
-- Lectura pública; escritura solo para usuarios en "administradores".
-- =========================================================

create table if not exists public.perritos (
  id          text primary key,
  datos       jsonb not null,
  actualizado timestamptz not null default now()
);

create table if not exists public.sitio (
  id    text primary key,          -- se usa la fila id = 'config'
  datos jsonb not null
);

create table if not exists public.administradores (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.perritos        enable row level security;
alter table public.sitio           enable row level security;
alter table public.administradores enable row level security;

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.administradores where user_id = auth.uid());
$$;

-- Lectura pública del catálogo y la configuración
drop policy if exists "leer perritos" on public.perritos;
create policy "leer perritos" on public.perritos for select using (true);
drop policy if exists "leer sitio" on public.sitio;
create policy "leer sitio" on public.sitio for select using (true);

-- Escritura solo administradores
drop policy if exists "admin escribe perritos" on public.perritos;
create policy "admin escribe perritos" on public.perritos for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
drop policy if exists "admin escribe sitio" on public.sitio;
create policy "admin escribe sitio" on public.sitio for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
-- (la tabla administradores no tiene políticas: solo se edita desde el panel de Supabase)

-- Bucket público de fotos
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

drop policy if exists "leer fotos" on storage.objects;
create policy "leer fotos" on storage.objects for select using (bucket_id = 'fotos');
drop policy if exists "admin sube fotos" on storage.objects;
create policy "admin sube fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and public.es_admin());
drop policy if exists "admin borra fotos" on storage.objects;
create policy "admin borra fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and public.es_admin());

-- Después: crea tu usuario en Authentication → Users y ejecuta
-- insert into public.administradores (user_id) values ('TU-USER-UID');
