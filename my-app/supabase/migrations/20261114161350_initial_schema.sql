create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default pg_catalog.now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(pg_catalog.btrim(name)) > 0),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint categories_user_id_id_key unique (user_id, id)
);

create table public.subcategories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null,
  name text not null check (length(pg_catalog.btrim(name)) > 0),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint subcategories_user_category_id_key unique (user_id, category_id, id),
  constraint subcategories_category_owner_fkey
    foreign key (user_id, category_id)
    references public.categories (user_id, id)
    on delete cascade
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(pg_catalog.btrim(name)) > 0),
  category_id uuid not null,
  subcategory_id uuid,
  brand text,
  notes text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint products_user_id_id_key unique (user_id, id),
  constraint products_category_owner_fkey
    foreign key (user_id, category_id)
    references public.categories (user_id, id)
    on delete restrict,
  constraint products_subcategory_owner_fkey
    foreign key (user_id, category_id, subcategory_id)
    references public.subcategories (user_id, category_id, id)
    on delete set null (subcategory_id)
);

create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null,
  is_purchased boolean not null default false,
  created_at timestamptz not null default pg_catalog.now(),
  constraint shopping_list_items_user_product_key unique (user_id, product_id),
  constraint shopping_list_items_product_owner_fkey
    foreign key (user_id, product_id)
    references public.products (user_id, id)
    on delete cascade
);

create index categories_user_created_at_idx
  on public.categories (user_id, created_at desc);
create index subcategories_user_category_name_idx
  on public.subcategories (user_id, category_id, name);
create index products_user_category_name_idx
  on public.products (user_id, category_id, name);
create index products_user_created_at_idx
  on public.products (user_id, created_at desc);
create index shopping_list_items_user_status_created_at_idx
  on public.shopping_list_items (user_id, is_purchased, created_at);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create trigger subcategories_set_updated_at
  before update on public.subcategories
  for each row execute function public.set_updated_at();

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_profile_created_or_email_updated
  after insert or update of email on auth.users
  for each row execute function public.handle_auth_user_profile();

insert into public.profiles (id, email)
select id, email
from auth.users
where email is not null
on conflict (id) do update set email = excluded.email;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.products enable row level security;
alter table public.shopping_list_items enable row level security;

create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can manage their own categories"
  on public.categories
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can manage their own subcategories"
  on public.subcategories
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can manage their own products"
  on public.products
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can manage their own shopping items"
  on public.shopping_list_items
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
revoke all on public.profiles, public.categories, public.subcategories,
  public.products, public.shopping_list_items from anon, public;

grant select on public.profiles to authenticated;
grant select, insert, update, delete
  on public.categories, public.subcategories, public.products, public.shopping_list_items
  to authenticated;

revoke all on function public.set_updated_at() from public, anon, authenticated;
grant execute on function public.set_updated_at() to authenticated;
revoke all on function public.handle_auth_user_profile() from public, anon, authenticated;