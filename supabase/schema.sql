create extension if not exists "pgcrypto";

create type lead_stage as enum (
  'lead_entrante',
  'conversacion_iniciada',
  'llamada_realizada',
  'reunion_encuentro',
  'presupuesto_enviado',
  'cerrado_ganado',
  'cerrado_perdido'
);

create type lead_temperature as enum ('frio', 'tibio', 'caliente');

create table leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null default '',
  email text not null default '',
  facebook_form_data jsonb default '{}'::jsonb,
  ad_name text default '',
  campaign_name text default '',
  source text default 'meta_ads',
  stage lead_stage not null default 'lead_entrante',
  temperature lead_temperature not null default 'tibio',
  notes jsonb default '[]'::jsonb,
  next_action_text text default '',
  next_action_date date,
  discard_reason text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  stage_changed_at timestamptz not null default now(),
  closed_at timestamptz
);

create index idx_leads_stage on leads(stage);
create index idx_leads_created on leads(created_at desc);

create table lead_activity_log (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  from_stage lead_stage,
  to_stage lead_stage not null,
  note text default '',
  created_at timestamptz not null default now()
);

create index idx_activity_lead on lead_activity_log(lead_id);
