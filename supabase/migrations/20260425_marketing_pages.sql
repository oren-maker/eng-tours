-- Marketing pages: lead-collection landing pages with admin-edited HTML content.
-- Each page has its own slug and accumulates leads (name/phone/email + arbitrary payload).

create table if not exists public.marketing_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  html text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketing_leads (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.marketing_pages(id) on delete cascade,
  name text,
  phone text,
  email text,
  payload jsonb not null default '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_marketing_pages_slug on public.marketing_pages(slug);
create index if not exists idx_marketing_leads_page_created on public.marketing_leads(page_id, created_at desc);

alter table public.marketing_pages enable row level security;
alter table public.marketing_leads enable row level security;
