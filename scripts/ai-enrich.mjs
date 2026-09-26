import fs from "node:fs/promises";
import {neon} from "@neondatabase/serverless";

const db = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
const jobs = JSON.parse(await fs.readFile("data/jobs.json", "utf8"));
const batchSize = Math.max(1, Number(process.env.AI_BATCH || 20));
const rewrite = process.env.AI_REWRITE === "1";
const targets = jobs
  .filter((j) => !j.aiSummary || weakSummary(j))
  .sort((a, b) => Number(!a.aiSummary) - Number(!b.aiSummary))
  .slice(0, batchSize);

const allowExternalAI = process.env.ALLOW_EXTERNAL_AI === "1";
const hf = allowExternalAI ? process.env.HF_TOKEN : "";
const openai = allowExternalAI ? process.env.OPENAI_API_KEY : "";
const hfModel = process.env.HF_MODEL || "Qwen/Qwen3-0.6B:fastest";
const openaiModel = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
const localModel = process.env.LOCAL_AI_MODEL || "Xenova/distilbart-cnn-6-6";
let localSummarizer = null;

function tokens(text) {
  return new Set(String(text || "").toLowerCase().match(/[a-z0-9]{3,}/g) || []);
}

function overlapScore(summary, source) {
  const a = tokens(summary);
  const b = tokens(source);
  if (!a.size) return 0;
  let hit = 0;
  for (const token of a) if (b.has(token)) hit++;
  return hit / a.size;
}

function repetitionScore(summary) {
  const words = String(summary || "").toLowerCase().match(/[a-z0-9]{2,}/g) || [];
  return words.length ? new Set(words).size / words.length : 0;
}

function clean(text) {
  return String(text || "")
    .replace(/^summary\s*:\s*/i, "")
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 420);
}

function validResult(x, job) {
  const summary = clean(x?.summary || x?.text || "");
  const source = [
    job.title,
    job.company,
    job.location,
    job.description,
    Array.isArray(job.skills) ? job.skills.join(" ") : ""
  ].join(" ");
  const overlap = overlapScore(summary, source);
  const repetition = repetitionScore(summary);
  const lower = summary.toLowerCase();

  if (
    summary.length < 80 ||
    summary.length > 360 ||
    overlap < 0.55 ||
    repetition < 0.72 ||
    lower.includes("mention the word") ||
    lower.includes("tag ") ||
    lower.includes("follow us") ||
    lower.includes("subscribe")
  ) return null;

  const highlights = Array.isArray(x?.highlights)
    ? x.highlights.map((v) => String(v).trim()).filter(Boolean).slice(0, 4)
    : [];

  return { summary, highlights };
}

function weakSummary(job) {
  if (!job.aiSummary) return true;
  const summary = String(job.aiSummary || "");
  const lower = summary.toLowerCase();
  const source = [
    job.title,
    job.company,
    job.location,
    job.description,
    Array.isArray(job.skills) ? job.skills.join(" ") : ""
  ].join(" ");
  return (
    summary.length < 80 ||
    summary.length > 360 ||
    overlapScore(summary, source) < 0.55 ||
    repetitionScore(summary) < 0.72 ||
    lower.includes("mention the word") ||
    lower.includes("tag ") ||
    lower.includes("follow us") ||
    lower.includes("subscribe")
  );
}

function fallbackHighlights(job) {
  const out = [];
  if (job.location) out.push("Location: " + job.location);
  if (job.workMode && job.workMode !== "unknown") out.push("Work mode: " + job.workMode);
  if (job.type) out.push("Type: " + job.type);
  if (Array.isArray(job.skills) && job.skills.length) out.push("Skills: " + job.skills.slice(0, 6).join(", "));
  if (job.salary && job.salary !== "Not disclosed") out.push("Compensation: " + job.salary);
  return out.slice(0, 4);
}

function extractiveSummary(job) {
  const text = String(job.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length >= 45 && s.length <= 450);
  const query = [
    job.title,
    job.company,
    ...(Array.isArray(job.skills) ? job.skills.slice(0, 8) : [])
  ].join(" ").toLowerCase().match(/[a-z0-9]{3,}/g) || [];

  const scored = sentences
    .map((s, i) => ({
      s,
      i,
      score: query.reduce((n, token) => n + (s.toLowerCase().includes(token) ? 1 : 0), 0) + (i < 2 ? 0.5 : 0)
    }))
    .sort((a, b) => b.score - a.score);

  let out = "";
  for (const item of scored) {
    const next = (out + " " + item.s).trim();
    if (next.length > 280) break;
    out = next;
  }

  if (out.length >= 60) return out.slice(0, 420);
  return [
    job.title,
    job.company,
    job.location,
    job.type,
    Array.isArray(job.skills) && job.skills.length ? "Skills: " + job.skills.slice(0, 6).join(", ") : ""
  ].filter(Boolean).join(" · ").slice(0, 420);
}

async function remoteEnrich(job) {
  if (!allowExternalAI) return null;

  const body = [
    "TITLE: " + job.title,
    "COMPANY: " + job.company,
    "LOCATION: " + job.location,
    "DESCRIPTION: " + String(job.description || "").slice(0, 6500)
  ].join("\n");
  const prompt = [
    "Summarize this job posting using only the supplied facts.",
    "Return JSON exactly with summary and highlights.",
    "Summary must be 1-2 factual sentences and 60-320 characters.",
    "Never add facts, employers, products, locations, salaries, or requirements not present in the text.",
    body
  ].join("\n");

  if (hf) {
    try {
      const r = await fetch("https://router.huggingface.co/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + hf, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: hfModel,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.05,
          max_tokens: 180
        })
      });
      if (r.ok) {
        const data = await r.json();
        const raw = data.choices?.[0]?.message?.content || "";
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = validResult(JSON.parse(match[0]), job);
          if (parsed) return parsed;
        }
      }
    } catch {}
  }

  if (openai) {
    try {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + openai, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: openaiModel,
          messages: [
            { role: "system", content: "Summarize job listings without inventing facts. Return JSON with summary and highlights." },
            { role: "user", content: prompt }
          ],
          temperature: 0.05,
          response_format: { type: "json_object" }
        })
      });
      if (r.ok) {
        const data = await r.json();
        const parsed = validResult(JSON.parse(data.choices?.[0]?.message?.content || "{}"), job);
        if (parsed) return parsed;
      }
    } catch {}
  }

  return null;
}

async function localEnrich(job) {
  if (!localSummarizer) {
    const { pipeline, env } = await import("@huggingface/transformers");
    env.cacheDir = ".cache/transformers";
    localSummarizer = await pipeline("summarization", localModel);
  }

  const source = [
    job.title + " at " + job.company,
    "Location: " + job.location,
    String(job.description || "").slice(0, 4200)
  ].join(". ");

  try {
    const out = await localSummarizer(source, {
      max_new_tokens: 75,
      min_new_tokens: 25,
      no_repeat_ngram_size: 3
    });
    const summary = Array.isArray(out)
      ? out[0]?.summary_text || out[0]?.generated_text || ""
      : "";
    return validResult({ summary, highlights: fallbackHighlights(job) }, job);
  } catch {
    return null;
  }
}

function publicView(j) {
  return {
    id: j.id,
    slug: j.slug,
    title: j.title,
    company: j.company,
    description: String(j.description || "").slice(0, 4500),
    location: j.location,
    workMode: j.workMode,
    type: j.type,
    salary: j.salary,
    salaryMin: j.salaryMin,
    salaryMax: j.salaryMax,
    currency: j.currency,
    skills: j.skills,
    category: j.category,
    experience: j.experience,
    publishedAt: j.publishedAt,
    updatedAt: j.updatedAt,
    sourceName: j.sourceName,
    sourceUrl: j.sourceUrl,
    applyUrl: j.applyUrl,
    verified: j.verified,
    freshness: j.freshness,
    tags: j.tags,
    aiSummary: j.aiSummary,
    aiHighlights: j.aiHighlights,
    status: "active"
  };
}

let enriched = 0;
let localUsed = 0;
let fallbackUsed = 0;
let localAttempts = 0;
const localMax = Math.max(0, Number(process.env.LOCAL_AI_MAX || 20));

for (const job of targets) {
  let result = await remoteEnrich(job);

  if (!result && localAttempts < localMax) {
    localAttempts++;
    result = await localEnrich(job);
    if (result) localUsed++;
  }

  if (!result) {
    result = { summary: extractiveSummary(job), highlights: fallbackHighlights(job) };
    fallbackUsed++;
  }

  job.aiSummary = result.summary;
  job.aiHighlights = result.highlights || [];
  enriched++;
}

if (db && targets.length) {
  try {
    for (let i = 0; i < targets.length; i += 250) {
      const chunk = targets.slice(i, i + 250).map((j) => ({
        id: j.id,
        summary: j.aiSummary,
        highlights: j.aiHighlights || []
      }));
      await db.query(
        "UPDATE public.jobs AS j SET ai_summary=x.summary,ai_highlights=COALESCE((SELECT array_agg(v) FROM jsonb_array_elements_text(x.highlights) AS v),ARRAY[]::text[]),updated_at=now() FROM jsonb_to_recordset($1::jsonb) AS x(id text,summary text,highlights jsonb) WHERE j.id=x.id",
        [JSON.stringify(chunk)]
      );
    }
  } catch (error) {
    console.warn("AI DB write skipped:", error instanceof Error ? error.message : String(error));
  }
}

await fs.writeFile("data/jobs.json", JSON.stringify(jobs, null, 2) + "\n");
await fs.writeFile(
  "data/public-jobs.json",
  JSON.stringify(jobs.map(publicView)) + "\n"
);
await fs.writeFile(
  "data/public-jobs-meta.json",
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: jobs.length,
    ai: {
      enabled: true,
      external: allowExternalAI,
      enriched,
      localUsed,
      fallbackUsed
    }
  }) + "\n"
);

console.log(
  "AI enrichment:",
  JSON.stringify({
    targeted: targets.length,
    enriched,
    localUsed,
    fallbackUsed,
    batchSize,
    rewrite,
    externalAI: allowExternalAI
  })
);
