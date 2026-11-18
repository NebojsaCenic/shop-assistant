create table public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(pg_catalog.btrim(name)) > 0),
  icon text not null check (length(pg_catalog.btrim(icon)) > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default pg_catalog.now(),
  constraint finance_categories_user_id_id_key unique (user_id, id)
);

create table public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('expense', 'salary', 'other_income')),
  amount numeric(12, 2) not null check (amount > 0),
  category_id uuid,
  transaction_date date not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint finance_transactions_user_id_id_key unique (user_id, id),
  constraint finance_transactions_category_type_check check (
    (type = 'expense' and category_id is not null)
    or (type in ('salary', 'other_income') and category_id is null)
  ),
  constraint finance_transactions_category_owner_fkey
    foreign key (user_id, category_id)
    references public.finance_categories (user_id, id)
    on delete restrict
);

create index finance_categories_user_active_name_idx
  on public.finance_categories (user_id, is_active, name);
create index finance_transactions_user_date_idx
  on public.finance_transactions (user_id, transaction_date desc, created_at desc);
create index finance_transactions_user_category_idx
  on public.finance_transactions (user_id, category_id, transaction_date desc)
  where type = 'expense';

alter table public.finance_categories enable row level security;
alter table public.finance_transactions enable row level security;

create policy "Users can manage their own finance categories"
  on public.finance_categories
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can manage their own finance transactions"
  on public.finance_transactions
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.finance_categories, public.finance_transactions from anon, public;
grant select, insert, update, delete
  on public.finance_categories, public.finance_transactions
  to authenticated;
