create table if not exists waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'unknown',
  created_at timestamptz not null default now()
);

alter table waitlist_signups enable row level security;

create policy "anon can insert waitlist signups"
  on waitlist_signups
  for insert
  to anon
  with check (true);
