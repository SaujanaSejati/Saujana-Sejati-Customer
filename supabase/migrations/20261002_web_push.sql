-- Saujana Sejati Ent: Web Push setup
-- Run this in Supabase SQL Editor as project owner.
-- Do NOT add public/anon/authenticated SELECT policies to this table.

create extension if not exists pg_net;
create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  subscription jsonb not null,
  recipient_label text not null check (recipient_label in ('Hairi','Amirul')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.web_push_subscriptions enable row level security;
revoke all on public.web_push_subscriptions from anon, authenticated;
-- The Edge Function uses the service-role key server-side to manage subscriptions.

create or replace function public.notify_booking_web_push()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  function_url text;
  webhook_secret text;
begin
  select decrypted_secret into function_url
    from vault.decrypted_secrets where name = 'saujana_push_function_url' limit 1;
  select decrypted_secret into webhook_secret
    from vault.decrypted_secrets where name = 'saujana_push_webhook_secret' limit 1;

  if function_url is null or webhook_secret is null then
    raise warning 'Saujana push is not configured: required Vault secrets are missing.';
    return new;
  end if;

  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-saujana-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'bookings',
      'record', jsonb_build_object(
        'id', new.id,
        'customer_name', new.customer_name,
        'cabinet_type', new.cabinet_type,
        'booking_date', new.booking_date,
        'booking_time', new.booking_time,
        'status', new.status
      )
    )
  );
  return new;
end;
$$;

drop trigger if exists saujana_booking_push_insert on public.bookings;
create trigger saujana_booking_push_insert
after insert on public.bookings
for each row execute function public.notify_booking_web_push();
