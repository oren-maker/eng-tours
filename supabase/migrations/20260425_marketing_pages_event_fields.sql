-- Event-specific fields per the NEWORLD-style spec.
-- Each marketing_page is a standalone landing page for one event.

alter table public.marketing_pages
  add column if not exists main_artist text,
  add column if not exists guest_artist text,
  add column if not exists event_date date,
  add column if not exists city text,
  add column if not exists country text,
  add column if not exists venue_name text,
  add column if not exists ticket_purchase_link text,
  add column if not exists intro_text text;

alter table public.marketing_leads
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists interest_type text,        -- 'package_inquiry' | 'ticket_purchase'
  add column if not exists whatsapp_status text,      -- 'pending' | 'sent' | 'failed' | 'not_required'
  add column if not exists whatsapp_sent_at timestamptz,
  add column if not exists whatsapp_error text;

create index if not exists idx_marketing_leads_interest on public.marketing_leads(page_id, interest_type);
