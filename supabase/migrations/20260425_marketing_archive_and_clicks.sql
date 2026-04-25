-- Archive support + click counter on affiliates.

alter table public.marketing_pages
  add column if not exists archived_at timestamptz;

alter table public.marketing_affiliates
  add column if not exists clicks integer not null default 0;

create index if not exists idx_marketing_pages_archived on public.marketing_pages(archived_at);
