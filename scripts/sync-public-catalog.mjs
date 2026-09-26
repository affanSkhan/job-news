import fs from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required for catalog sync.");
  process.exit(1);
}

const db = neon(connectionString);
const raw = JSON.parse(await fs.readFile("data/public-jobs.json", "utf8"));
const sourceJobs = Array.isArray(raw) ? raw : [];
const jobs = sourceJobs
  .filter((j) => j?.id && j?.slug && j?.title && j?.company && j?.applyUrl)
  .slice(0, 5000);

if (jobs.length < 100) {
  throw new Error("Public catalog is unexpectedly small; refusing to overwrite the database.");
}

function chunked(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const rows = jobs.map((j) => ({
  id: String(j.id),
  fingerprint: String(j.id),
  slug: String(j.slug),
  title: String(j.title),
  company_name: String(j.company),
  description: String(j.description || ""),
  location: String(j.location || "Location not specified"),
  work_mode: String(j.workMode || "unknown"),
  employment_type: String(j.type || "other"),
  salary_text: String(j.salary || "Not disclosed"),
  salary_min: j.salaryMin ?? null,
  salary_max: j.salaryMax ?? null,
  currency: j.currency || null,
  skills: Array.isArray(j.skills) ? j.skills.map(String).slice(0, 25) : [],
  category: String(j.category || "Other"),
  experience: String(j.experience || "Not specified"),
  published_at: j.publishedAt || null,
  updated_at: j.updatedAt || new Date().toISOString(),
  source_name: String(j.sourceName || "Unknown source"),
  source_url: String(j.sourceUrl || ""),
  apply_url: String(j.applyUrl || ""),
  verified: Boolean(j.verified),
  freshness: String(j.freshness || "older"),
  tags: Array.isArray(j.tags) ? j.tags.map(String).slice(0, 25) : [],
  ai_summary: typeof j.aiSummary === "string" ? j.aiSummary : null,
  ai_highlights: Array.isArray(j.aiHighlights) ? j.aiHighlights.map(String).slice(0, 4) : [],
  status: "active"
}));

const columns = [
  "id","fingerprint","slug","title","company_name","description","location",
  "work_mode","employment_type","salary_text","salary_min","salary_max","currency",
  "skills","category","experience","published_at","updated_at","source_name",
  "source_url","apply_url","verified","freshness","tags","ai_summary","ai_highlights","status"
];

const defs = [
  "id text",
  "fingerprint text",
  "slug text",
  "title text",
  "company_name text",
  "description text",
  "location text",
  "work_mode text",
  "employment_type text",
  "salary_text text",
  "salary_min numeric",
  "salary_max numeric",
  "currency text",
  "skills text[]",
  "category text",
  "experience text",
  "published_at timestamptz",
  "updated_at timestamptz",
  "source_name text",
  "source_url text",
  "apply_url text",
  "verified boolean",
  "freshness text",
  "tags text[]",
  "ai_summary text",
  "ai_highlights text[]",
  "status text"
].join(",");

const changedText = [
  "j.title IS DISTINCT FROM EXCLUDED.title",
  "j.description IS DISTINCT FROM EXCLUDED.description",
  "j.location IS DISTINCT FROM EXCLUDED.location",
  "j.work_mode IS DISTINCT FROM EXCLUDED.work_mode",
  "j.employment_type IS DISTINCT FROM EXCLUDED.employment_type",
  "j.skills IS DISTINCT FROM EXCLUDED.skills",
  "j.category IS DISTINCT FROM EXCLUDED.category",
  "j.experience IS DISTINCT FROM EXCLUDED.experience"
].join(" OR ");

const mutableColumns = columns
  .filter((c) => !["id","fingerprint"].includes(c))
  .map((c) => c + "=EXCLUDED." + c)
  .join(",");

const upsertSql =
  "INSERT INTO public.jobs AS j (" + columns.join(",") + ") " +
  "SELECT " + columns.join(",") + " FROM jsonb_to_recordset($1::jsonb) AS x(" + defs + ") " +
  "ON CONFLICT (id) DO UPDATE SET " +
  mutableColumns + "," +
  "embedding=CASE WHEN " + changedText + " THEN NULL ELSE j.embedding END," +
  "last_seen_at=now()";

for (const batch of chunked(rows, 250)) {
  await db.query(upsertSql, [JSON.stringify(batch)]);
}

const ids = rows.map((j) => j.id);
await db.query(
  "UPDATE public.jobs SET status='inactive',updated_at=now() WHERE status='active' AND id <> ALL($1::text[])",
  [ids]
);

await db.query(
  "DELETE FROM public.analytics_events WHERE created_at < now()-interval '30 days'"
);
await db.query(
  "DELETE FROM public.ingest_runs WHERE started_at < now()-interval '14 days'"
);

console.log(JSON.stringify({
  ok: true,
  synced: jobs.length,
  storagePolicy: "analytics=30d, ingest_runs=14d",
  generatedAt: new Date().toISOString()
}));
