import fs from "node:fs/promises";
import {neon} from "@neondatabase/serverless";

const url=process.env.DATABASE_URL_BACKUP;
if(!url)throw new Error("DATABASE_URL_BACKUP is required");

const db=neon(url);
const jobs=JSON.parse(await fs.readFile("data/public-jobs.json","utf8"));
const meta=JSON.parse(await fs.readFile("data/public-jobs-meta.json","utf8").catch(()=>"{\"generatedAt\":null,\"count\":"+jobs.length+"}"));
const now=new Date().toISOString();

async function setup(){
  await db.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  await db.query(`CREATE TABLE IF NOT EXISTS public.companies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),slug text UNIQUE NOT NULL,name text NOT NULL,
    source_names text[] NOT NULL DEFAULT '{}',last_seen_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS public.jobs (
    id text PRIMARY KEY,fingerprint text UNIQUE NOT NULL,slug text UNIQUE NOT NULL,title text NOT NULL,
    company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,company_name text NOT NULL,
    description text NOT NULL DEFAULT '',location text NOT NULL DEFAULT 'Location not specified',
    work_mode text NOT NULL DEFAULT 'unknown',employment_type text NOT NULL DEFAULT 'other',
    salary_text text NOT NULL DEFAULT 'Not disclosed',salary_min numeric,salary_max numeric,currency text,
    skills text[] NOT NULL DEFAULT '{}',category text NOT NULL DEFAULT 'Other',experience text NOT NULL DEFAULT 'Not specified',
    published_at timestamptz,updated_at timestamptz NOT NULL DEFAULT now(),source_name text NOT NULL,
    source_url text,apply_url text,verified boolean NOT NULL DEFAULT false,freshness text NOT NULL DEFAULT 'older',
    tags text[] NOT NULL DEFAULT '{}',ai_summary text,ai_highlights text[] NOT NULL DEFAULT '{}',
    status text NOT NULL DEFAULT 'active',first_seen_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),raw jsonb NOT NULL DEFAULT '{}'::jsonb
  )`);
  await db.query("CREATE INDEX IF NOT EXISTS jobs_status_published_idx ON public.jobs(status,published_at DESC)");
  await db.query("CREATE INDEX IF NOT EXISTS jobs_updated_idx ON public.jobs(updated_at DESC)");
  await db.query(`CREATE TABLE IF NOT EXISTS public.catalog_backup_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),generated_at timestamptz,finished_at timestamptz NOT NULL DEFAULT now(),
    jobs_count integer NOT NULL DEFAULT 0,status text NOT NULL DEFAULT 'success'
  )`);
}

const companyMap=new Map();
for(const j of jobs){
  const name=String(j.company||"Unknown company").trim();
  const slug=name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,90)||"unknown-company";
  if(!companyMap.has(slug))companyMap.set(slug,{slug,name,source_names:[String(j.sourceName||"").trim()].filter(Boolean),last_seen_at:now});
}
const companies=[...companyMap.values()];

await setup();
for(let i=0;i<companies.length;i+=250){
  const chunk=companies.slice(i,i+250);
  const defs="slug text,name text,source_names text[],last_seen_at timestamptz";
  await db.query(
    "INSERT INTO public.companies(slug,name,source_names,last_seen_at) SELECT slug,name,source_names,last_seen_at FROM jsonb_to_recordset($1::jsonb) AS x("+defs+") ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name,source_names=EXCLUDED.source_names,last_seen_at=EXCLUDED.last_seen_at",
    [JSON.stringify(chunk)]
  );
}

const companyRows=await db.query("SELECT id,slug FROM public.companies");
const companyIds=new Map(companyRows.map(r=>[r.slug,r.id]));
const rows=jobs.map(j=>{
  const name=String(j.company||"Unknown company").trim();
  const companySlug=name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,90)||"unknown-company";
  return {
    id:String(j.id),fingerprint:String(j.id),slug:String(j.slug),title:String(j.title||"Opportunity"),
    company_id:companyIds.get(companySlug)||null,company_name:name,
    description:String(j.description||"").slice(0,12000),location:String(j.location||"Location not specified"),
    work_mode:String(j.workMode||"unknown"),employment_type:String(j.type||"other"),salary_text:String(j.salary||"Not disclosed"),
    salary_min:j.salaryMin??null,salary_max:j.salaryMax??null,currency:j.currency??null,
    skills:Array.isArray(j.skills)?j.skills.map(String).slice(0,25):[],category:String(j.category||"Other"),experience:String(j.experience||"Not specified"),
    published_at:j.publishedAt||null,updated_at:j.updatedAt||j.publishedAt||now,source_name:String(j.sourceName||"Unknown source"),
    source_url:String(j.sourceUrl||""),apply_url:String(j.applyUrl||""),verified:Boolean(j.verified),freshness:String(j.freshness||"older"),
    tags:Array.isArray(j.tags)?j.tags.map(String).slice(0,25):[],ai_summary:j.aiSummary?String(j.aiSummary).slice(0,4000):null,
    ai_highlights:Array.isArray(j.aiHighlights)?j.aiHighlights.map(String).slice(0,10):[],status:"active",
    last_seen_at:now,raw:{}
  };
});

const defs="id text,fingerprint text,slug text,title text,company_id uuid,company_name text,description text,location text,work_mode text,employment_type text,salary_text text,salary_min numeric,salary_max numeric,currency text,skills text[],category text,experience text,published_at timestamptz,updated_at timestamptz,source_name text,source_url text,apply_url text,verified boolean,freshness text,tags text[],ai_summary text,ai_highlights text[],status text,last_seen_at timestamptz,raw jsonb";
const cols=["id","fingerprint","slug","title","company_id","company_name","description","location","work_mode","employment_type","salary_text","salary_min","salary_max","currency","skills","category","experience","published_at","updated_at","source_name","source_url","apply_url","verified","freshness","tags","ai_summary","ai_highlights","status","last_seen_at","raw"];
for(let i=0;i<rows.length;i+=250){
  const chunk=rows.slice(i,i+250);
  await db.query(
    "INSERT INTO public.jobs AS j ("+cols.join(",")+") SELECT "+cols.join(",")+" FROM jsonb_to_recordset($1::jsonb) AS x("+defs+") ON CONFLICT(id) DO UPDATE SET "+cols.filter(c=>!["id","fingerprint"].includes(c)).map(c=>c+"=EXCLUDED."+c).join(",") ,
    [JSON.stringify(chunk)]
  );
}
const ids=rows.map(r=>r.id);
await db.query("UPDATE public.jobs SET status='inactive',last_seen_at=$1 WHERE status='active' AND id <> ALL($2::text[])",[now,ids]);
await db.query("INSERT INTO public.catalog_backup_runs(generated_at,jobs_count,status) VALUES($1,$2,'success')",[meta.generatedAt||now,rows.length]);
console.log("RolePilot catalog backup:",rows.length,"jobs; generated",meta.generatedAt||"unknown");
