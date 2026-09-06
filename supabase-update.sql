-- Add to existing Supabase SQL Editor and run

-- Captured requests from browser proxy
create table if not exists keen_captures (
  id uuid primary key default gen_random_uuid(),
  captured_at timestamptz default now(),
  url text not null,
  method text,
  request_headers jsonb,
  request_body text,
  response_status int,
  response_headers jsonb,
  response_body text,
  timing_ms int
);

-- Program change monitoring
create table if not exists keen_program_changes (
  id uuid primary key default gen_random_uuid(),
  detected_at timestamptz default now(),
  program text not null,
  platform text,
  change_type text,
  summary text,
  url text,
  raw_diff text
);

-- Enable RLS
alter table keen_captures enable row level security;
alter table keen_program_changes enable row level security;
create policy "service_only" on keen_captures using (true) with check (true);
create policy "service_only" on keen_program_changes using (true) with check (true);

-- Program snapshots for change detection
create table if not exists keen_program_snapshots (
  id uuid primary key default gen_random_uuid(),
  detected_at timestamptz default now(),
  program text not null,
  url text,
  content_hash text
);

alter table keen_program_snapshots enable row level security;
create policy "service_only" on keen_program_snapshots using (true) with check (true);

-- User-added monitored programs (no hardcoded targets)
create table if not exists keen_monitored_programs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  url text not null,
  platform text,
  target_types text[]
);

alter table keen_monitored_programs enable row level security;
create policy "service_only" on keen_monitored_programs using (true) with check (true);

-- Web3 scan jobs
create table if not exists keen_web3_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz,
  contract_address text,
  contract_name text,
  status text default 'pending',
  signals_count int default 0,
  results jsonb,
  error text
);

alter table keen_web3_jobs enable row level security;
create policy "service_only" on keen_web3_jobs using (true) with check (true);
