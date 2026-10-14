-- Print Counter: shared store data for syncing several PCs.
-- Every order is one row holding the same JSON the app keeps locally. Deletes are soft (deleted = true)
-- so every PC hears about them. Only members (the store login) can read or write; the first account
-- to call claim_store() becomes the store's member, and nobody else can join after that.

create table public.members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);

create table public.orders (
  id text primary key,
  num integer,
  data jsonb,
  archived boolean not null default false,
  deleted boolean not null default false,
  client_updated_at timestamptz,
  server_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
create index orders_server_at_idx on public.orders (server_at);

create table public.store_settings (
  id text primary key default 'store',
  data jsonb not null,
  client_updated_at timestamptz,
  server_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

create table public.counters (
  id text primary key,
  value integer not null
);

-- server clock for "changed since" pulls (PC clocks can drift)
create function public.touch_server_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.server_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
create trigger orders_touch before insert or update on public.orders
  for each row execute function public.touch_server_at();
create trigger store_settings_touch before insert or update on public.store_settings
  for each row execute function public.touch_server_at();

create function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members where user_id = (select auth.uid()))
$$;

alter table public.members enable row level security;
alter table public.orders enable row level security;
alter table public.store_settings enable row level security;
alter table public.counters enable row level security;

create policy "members see themselves" on public.members
  for select to authenticated using (user_id = (select auth.uid()));
create policy "store members manage orders" on public.orders
  for all to authenticated using ((select public.is_member())) with check ((select public.is_member()));
create policy "store members manage settings" on public.store_settings
  for all to authenticated using ((select public.is_member())) with check ((select public.is_member()));
-- counters: no policies, reachable only through take_order_num()

-- The first signed-in account to call this becomes the store's login.
create function public.claim_store() returns text
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  lock table public.members in exclusive mode;
  if exists (select 1 from public.members where user_id = auth.uid()) then return 'member'; end if;
  if exists (select 1 from public.members) then return 'denied'; end if;
  insert into public.members (user_id) values (auth.uid());
  return 'claimed';
end $$;

-- Hands out order numbers so two PCs never create the same #. min_num lets the app
-- raise the counter (Settings > Next order number, or numbers already in use).
create function public.take_order_num(min_num integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not public.is_member() then raise exception 'Not allowed'; end if;
  insert into public.counters (id, value) values ('order_num', greatest(min_num, 1))
    on conflict (id) do nothing;
  update public.counters set value = greatest(value, min_num) + 1
    where id = 'order_num' returning value - 1 into n;
  return n;
end $$;

revoke execute on function public.is_member() from public, anon;
revoke execute on function public.claim_store() from public, anon;
revoke execute on function public.take_order_num(integer) from public, anon;
revoke execute on function public.touch_server_at() from public, anon, authenticated;
grant execute on function public.is_member() to authenticated;
grant execute on function public.claim_store() to authenticated;
grant execute on function public.take_order_num(integer) to authenticated;

alter publication supabase_realtime add table public.orders, public.store_settings;
