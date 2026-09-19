create extension if not exists vector;

create table if not exists public.sources (
  id text primary key,name text not null,kind text not null,url text not null,enabled boolean not null default true,
  attribution text,last_success_at timestamptz,last_error text,last_count integer not null default 0,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),slug text unique not null,name text not null,website text,logo_url text,
  description text,total_open_roles integer not null default 0,source_names text[] not null default '{}',last_seen_at timestamptz,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.jobs (
  id text primary key,fingerprint text unique not null,slug text unique not null,title text not null,company_id uuid references public.companies(id) on delete set null,
  company_name text not null,description text not null default '',location text not null default 'Location not specified',
  work_mode text not null default 'unknown' check(work_mode in ('remote','hybrid','onsite','unknown')),
  employment_type text not null default 'other',salary_text text not null default 'Not disclosed',salary_min numeric,salary_max numeric,currency text,
  skills text[] not null default '{}',category text not null default 'Other',experience text not null default 'Not specified',
  published_at timestamptz,updated_at timestamptz not null default now(),source_name text not null,source_url text,apply_url text,
  verified boolean not null default false,freshness text not null default 'older',tags text[] not null default '{}',ai_summary text,
  ai_highlights text[] not null default '{}',embedding vector(1536),status text not null default 'active' check(status in ('active','archived','rejected')),
  first_seen_at timestamptz not null default now(),last_seen_at timestamptz not null default now(),raw jsonb not null default '{}'::jsonb,
  search_document tsvector generated always as (
    to_tsvector('english',coalesce(title,'')||' '||coalesce(company_name,'')||' '||coalesce(description,'')||' '||
    coalesce(location,'')||' '||coalesce(category,'')||' '||coalesce(experience,'')||' '||coalesce(array_to_string(skills,' '),''))
  ) stored
);
create index if not exists jobs_status_published_idx on public.jobs(status,published_at desc);
create index if not exists jobs_company_idx on public.jobs(company_id);
create index if not exists jobs_search_idx on public.jobs using gin(search_document);
create index if not exists jobs_embedding_idx on public.jobs using hnsw(embedding vector_cosine_ops);
create table if not exists public.job_sources (
  job_id text not null references public.jobs(id) on delete cascade,source_id text not null references public.sources(id) on delete cascade,
  source_job_id text,source_url text,first_seen_at timestamptz not null default now(),last_seen_at timestamptz not null default now(),
  raw jsonb not null default '{}'::jsonb,primary key(job_id,source_id)
);
create table if not exists public.ingest_runs (
  id uuid primary key default gen_random_uuid(),started_at timestamptz not null default now(),finished_at timestamptz,status text not null default 'running',
  sources_total integer not null default 0,sources_succeeded integer not null default 0,jobs_seen integer not null default 0,
  jobs_upserted integer not null default 0,jobs_failed integer not null default 0,error text,metadata jsonb not null default '{}'::jsonb
);
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,email text,full_name text,headline text,desired_titles text[] not null default '{}',
  skills text[] not null default '{}',preferred_locations text[] not null default '{}',preferred_work_modes text[] not null default '{}',
  min_salary numeric,salary_currency text,experience_level text,profile_text text,embedding vector(1536),
  role text not null default 'user' check(role in ('user','admin')),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.saved_jobs (
  user_id uuid not null references auth.users(id) on delete cascade,job_id text not null references public.jobs(id) on delete cascade,
  notes text,created_at timestamptz not null default now(),primary key(user_id,job_id)
);
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,job_id text not null references public.jobs(id) on delete cascade,
  status text not null default 'saved' check(status in ('saved','applied','interview','offer','rejected','withdrawn')),
  applied_at timestamptz,notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,job_id)
);
create table if not exists public.job_alerts (
  id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,name text not null,criteria jsonb not null default '{}'::jsonb,
  frequency text not null default 'daily' check(frequency in ('instant','daily','weekly')),active boolean not null default true,last_sent_at timestamptz,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.analytics_events (
  id bigint generated by default as identity primary key,user_id uuid references auth.users(id) on delete set null,event_name text not null,
  path text,job_id text references public.jobs(id) on delete set null,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,email,full_name) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name','')) on conflict(id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.match_jobs_for_profile(p_profile_id uuid,p_match_count integer default 40)
returns table(job_id text,title text,company_name text,slug text,location text,work_mode text,employment_type text,salary_text text,skills text[],similarity real,keyword_score real,score real)
language sql stable as $$
with p as(select * from public.profiles where id=p_profile_id),
ranked as(
select j.id,j.title,j.company_name,j.slug,j.location,j.work_mode,j.employment_type,j.salary_text,j.skills,
case when p.embedding is not null and j.embedding is not null then greatest(0,1-(j.embedding <=> p.embedding)) else 0 end::real similarity,
case when nullif(trim(coalesce(p.profile_text,'')),'') is not null then ts_rank_cd(j.search_document,websearch_to_tsquery('english',p.profile_text)) else 0 end::real keyword_score
from public.jobs j cross join p where j.status='active' and coalesce(j.published_at,j.updated_at)>=now()-interval '60 days')
select id as job_id,title,company_name,slug,location,work_mode,employment_type,salary_text,skills,similarity,keyword_score,
(similarity*.72+least(keyword_score,1)*.18+
case when work_mode=any(coalesce((select preferred_work_modes from p),'{}')) then .05 else 0 end+
case when location=any(coalesce((select preferred_locations from p),'{}')) then .05 else 0 end)::real as score
from ranked order by score desc,similarity desc,keyword_score desc limit greatest(1,least(p_match_count,100));
$$;

alter table public.sources enable row level security;
alter table public.companies enable row level security;
alter table public.jobs enable row level security;
alter table public.job_sources enable row level security;
alter table public.ingest_runs enable row level security;
alter table public.profiles enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.applications enable row level security;
alter table public.job_alerts enable row level security;
alter table public.analytics_events enable row level security;

drop policy if exists sources_public_read on public.sources; create policy sources_public_read on public.sources for select using(enabled=true);
drop policy if exists companies_public_read on public.companies; create policy companies_public_read on public.companies for select using(true);
drop policy if exists jobs_public_read on public.jobs; create policy jobs_public_read on public.jobs for select using(status='active');
drop policy if exists job_sources_public_read on public.job_sources; create policy job_sources_public_read on public.job_sources for select using(true);
drop policy if exists profiles_self on public.profiles; create policy profiles_self on public.profiles for select using(auth.uid()=id);
drop policy if exists profiles_self_update on public.profiles; create policy profiles_self_update on public.profiles for update using(auth.uid()=id) with check(auth.uid()=id);
drop policy if exists profiles_self_insert on public.profiles; create policy profiles_self_insert on public.profiles for insert with check(auth.uid()=id);
drop policy if exists saved_jobs_self on public.saved_jobs; create policy saved_jobs_self on public.saved_jobs for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists applications_self on public.applications; create policy applications_self on public.applications for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists alerts_self on public.job_alerts; create policy alerts_self on public.job_alerts for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists analytics_insert on public.analytics_events; create policy analytics_insert on public.analytics_events for insert with check(user_id is null or auth.uid()=user_id);
drop policy if exists analytics_self_read on public.analytics_events; create policy analytics_self_read on public.analytics_events for select using(user_id is null or auth.uid()=user_id);
