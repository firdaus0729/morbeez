create table if not exists public.admin_mutation_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid null,
  actor_email text null,
  action text not null,
  resource text not null,
  resource_id text null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_mutation_audit_created_at
  on public.admin_mutation_audit(created_at desc);

create index if not exists idx_admin_mutation_audit_resource
  on public.admin_mutation_audit(resource, resource_id);
