-- Tome: run this once in your Supabase project (SQL Editor → New query → Run).

create table if not exists public.characters (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null,
  -- Client edit time in ms; the newest edit wins when two devices disagree.
  updated_at bigint not null,
  deleted boolean not null default false,
  -- Server clock, used by devices to fetch only what changed since their last sync.
  server_updated_at timestamptz not null default now()
);

create index if not exists characters_user_sync_idx on public.characters (user_id, server_updated_at);

alter table public.characters enable row level security;

drop policy if exists "Characters are private to their owner" on public.characters;
create policy "Characters are private to their owner" on public.characters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.characters_before_write() returns trigger
language plpgsql as $$
begin
  -- Never let an older edit overwrite a newer one.
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return old;
  end if;
  new.server_updated_at := clock_timestamp();
  return new;
end $$;

drop trigger if exists characters_before_write on public.characters;
create trigger characters_before_write
  before insert or update on public.characters
  for each row execute function public.characters_before_write();

-- Live updates between devices.
do $$
begin
  alter publication supabase_realtime add table public.characters;
exception when duplicate_object then null;
end $$;
