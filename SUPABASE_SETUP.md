# Supabase Setup Guide for Roselle

Follow these steps to connect Roselle to your own Supabase project with PostgreSQL persistence, Email/Password authentication, and Family Space Row Level Security (RLS).

> **Note:** Until `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured, Roselle automatically runs in **Interactive Local Demo Mode** with pre-populated sample data persisted in your browser's `localStorage`.

---

## 1. Environment Variables

In your project environment (or AI Studio Secrets / `.env`), set:

```bash
VITE_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
```

---

## 2. Database Schema & Row Level Security (SQL Script)

Open your Supabase Dashboard -> **SQL Editor** -> **New Query**, paste the entire SQL script below, and click **Run**.

```sql
-- Enable UUID extension
create extension if not exists "pgcrypto";

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  avatar_initials text not null default 'U',
  created_at timestamptz not null default now()
);

-- 2. Family Groups Table
create table if not exists public.family_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 3. Family Members Table
create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.family_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('Admin', 'Member')) default 'Member',
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

-- 4. Accounts Table
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  family_group_id uuid references public.family_groups(id) on delete set null,
  name text not null,
  type text not null check (type in ('Checking', 'Savings', 'Cash', 'Credit Card', 'Investment')),
  balance numeric(14, 2) not null default 0,
  currency text not null default 'MMK',
  is_shared boolean not null default false,
  icon_name text not null default 'Landmark',
  created_at timestamptz not null default now()
);

-- 5. Categories Table
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  family_group_id uuid references public.family_groups(id) on delete set null,
  name text not null,
  type text not null check (type in ('expense', 'income')),
  icon_name text not null default 'Tag',
  color_hex text not null default '#E87A90',
  created_at timestamptz not null default now()
);

-- 6. Savings Goals Table
create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  family_group_id uuid references public.family_groups(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  target_amount numeric(14, 2) not null check (target_amount > 0),
  current_amount numeric(14, 2) not null default 0 check (current_amount >= 0),
  deadline date not null,
  icon_name text not null default 'PiggyBank',
  created_at timestamptz not null default now()
);

-- 7. Transactions Table
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  to_account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  goal_id uuid references public.savings_goals(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('expense', 'income', 'transfer', 'goal_contribution')),
  amount numeric(14, 2) not null check (amount > 0),
  note text not null default '',
  transaction_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- Helpful Indexes
create index if not exists idx_family_members_user on public.family_members(user_id);
create index if not exists idx_family_members_group on public.family_members(group_id);
create index if not exists idx_accounts_owner on public.accounts(owner_id);
create index if not exists idx_accounts_family on public.accounts(family_group_id);
create index if not exists idx_transactions_account on public.transactions(account_id);
create index if not exists idx_transactions_date on public.transactions(transaction_date desc);
create index if not exists idx_savings_goals_family on public.savings_goals(family_group_id);

-- Automatic Profile Creation on Sign Up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_name text;
  v_initials text;
begin
  v_name := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1));
  v_initials := upper(
    left(split_part(v_name, ' ', 1), 1) ||
    coalesce(nullif(left(split_part(v_name, ' ', 2), 1), ''), '')
  );

  insert into public.profiles (id, email, full_name, avatar_initials)
  values (new.id, new.email, v_name, v_initials)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Security Definer Helper to Check Family Membership Without RLS Recursion
create or replace function public.is_family_member(target_group_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.group_id = target_group_id
      and fm.user_id = auth.uid()
  );
$$;

create or replace function public.is_family_admin(target_group_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.group_id = target_group_id
      and fm.user_id = auth.uid()
      and fm.role = 'Admin'
  );
$$;

-- Enable Row Level Security on All Tables
alter table public.profiles enable row level security;
alter table public.family_groups enable row level security;
alter table public.family_members enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.savings_goals enable row level security;

-- RLS Policies: profiles
create policy "Users can view own profile and family co-member profiles"
  on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.family_members fm_self
      join public.family_members fm_other on fm_self.group_id = fm_other.group_id
      where fm_self.user_id = auth.uid()
        and fm_other.user_id = profiles.id
    )
  );

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- RLS Policies: family_groups
create policy "Members can view their family groups"
  on public.family_groups for select
  using (
    created_by = auth.uid()
    or public.is_family_member(id)
  );

create policy "Authenticated users can create family groups"
  on public.family_groups for insert
  with check (created_by = auth.uid());

create policy "Family admins can update their group"
  on public.family_groups for update
  using (public.is_family_admin(id))
  with check (public.is_family_admin(id));

-- RLS Policies: family_members
create policy "Members can view co-members in their family group"
  on public.family_members for select
  using (public.is_family_member(group_id) or user_id = auth.uid());

create policy "Users can join a family group or admins can add members"
  on public.family_members for insert
  with check (user_id = auth.uid() or public.is_family_admin(group_id));

create policy "Admins can update member roles"
  on public.family_members for update
  using (public.is_family_admin(group_id))
  with check (public.is_family_admin(group_id));

create policy "Users can leave or admins can remove members"
  on public.family_members for delete
  using (user_id = auth.uid() or public.is_family_admin(group_id));

-- RLS Policies: accounts
create policy "Users can read own accounts or shared family accounts"
  on public.accounts for select
  using (
    owner_id = auth.uid()
    or (is_shared = true and family_group_id is not null and public.is_family_member(family_group_id))
  );

create policy "Users can insert own accounts"
  on public.accounts for insert
  with check (
    owner_id = auth.uid()
    and (family_group_id is null or public.is_family_member(family_group_id))
  );

create policy "Owners or family members on shared accounts can update balances"
  on public.accounts for update
  using (
    owner_id = auth.uid()
    or (is_shared = true and family_group_id is not null and public.is_family_member(family_group_id))
  )
  with check (
    owner_id = auth.uid()
    or (is_shared = true and family_group_id is not null and public.is_family_member(family_group_id))
  );

create policy "Owners can delete their own accounts"
  on public.accounts for delete
  using (owner_id = auth.uid());

-- RLS Policies: categories
create policy "Users can read own or family categories"
  on public.categories for select
  using (
    user_id = auth.uid()
    or (family_group_id is not null and public.is_family_member(family_group_id))
  );

create policy "Users can create categories"
  on public.categories for insert
  with check (
    user_id = auth.uid()
    and (family_group_id is null or public.is_family_member(family_group_id))
  );

create policy "Users can update own categories"
  on public.categories for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete own categories"
  on public.categories for delete
  using (user_id = auth.uid());

-- RLS Policies: transactions
create policy "Users can read transactions on accessible accounts"
  on public.transactions for select
  using (
    exists (
      select 1 from public.accounts a
      where a.id = transactions.account_id
        and (
          a.owner_id = auth.uid()
          or (a.is_shared = true and a.family_group_id is not null and public.is_family_member(a.family_group_id))
        )
    )
  );

create policy "Users can insert transactions on accessible accounts"
  on public.transactions for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.accounts a
      where a.id = transactions.account_id
        and (
          a.owner_id = auth.uid()
          or (a.is_shared = true and a.family_group_id is not null and public.is_family_member(a.family_group_id))
        )
    )
  );

create policy "Creators or account owners can update transactions"
  on public.transactions for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "Creators or account owners can delete transactions"
  on public.transactions for delete
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.accounts a
      where a.id = transactions.account_id and a.owner_id = auth.uid()
    )
  );

-- RLS Policies: savings_goals
create policy "Users can read own or family savings goals"
  on public.savings_goals for select
  using (
    created_by = auth.uid()
    or (family_group_id is not null and public.is_family_member(family_group_id))
  );

create policy "Users can create savings goals"
  on public.savings_goals for insert
  with check (
    created_by = auth.uid()
    and (family_group_id is null or public.is_family_member(family_group_id))
  );

create policy "Creators or family members can update savings goals"
  on public.savings_goals for update
  using (
    created_by = auth.uid()
    or (family_group_id is not null and public.is_family_member(family_group_id))
  )
  with check (
    created_by = auth.uid()
    or (family_group_id is not null and public.is_family_member(family_group_id))
  );

create policy "Creators can delete savings goals"
  on public.savings_goals for delete
  using (created_by = auth.uid());

-- Helper RPC to Join a Family Group by Invite Code Safely
create or replace function public.join_family_by_code(p_invite_code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_group_id uuid;
begin
  select id into v_group_id
  from public.family_groups
  where upper(invite_code) = upper(trim(p_invite_code))
  limit 1;

  if v_group_id is null then
    raise exception 'Invalid family invite code';
  end if;

  insert into public.family_members (group_id, user_id, role)
  values (v_group_id, auth.uid(), 'Member')
  on conflict (group_id, user_id) do nothing;

  return v_group_id;
end;
$$;
```
