-- Affiliate / referrer tracking. Each page can have multiple "people" with their own
-- short tracking_code; visiting /m/<slug>?ref=<code> attributes the lead to that affiliate.

create table if not exists public.marketing_affiliates (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.marketing_pages(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  tracking_code text not null unique,
  created_at timestamptz not null default now()
);

alter table public.marketing_leads
  add column if not exists affiliate_id uuid references public.marketing_affiliates(id) on delete set null;

create index if not exists idx_marketing_affiliates_page on public.marketing_affiliates(page_id);
create index if not exists idx_marketing_leads_affiliate on public.marketing_leads(affiliate_id);

alter table public.marketing_affiliates enable row level security;
