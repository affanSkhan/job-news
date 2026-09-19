import fs from "node:fs/promises";

const token=process.env.HF_TOKEN;
if(!token){
  console.log("HF_TOKEN not configured; deterministic ingestion remains enabled.");
  process.exit(0);
}

const model=process.env.HF_MODEL||"Qwen/Qwen3-0.6B:fastest";
const jobs=JSON.parse(await fs.readFile("data/jobs.json","utf8"));
const fresh=jobs.filter(j=>!j.aiSummary).slice(0,30);

async function enrich(job){
  const prompt=[
    "Return strict JSON only with keys summary and highlights.",
    "Do not invent facts. Use only the supplied source text.",
    "summary: <= 35 words. highlights: <= 4 short strings.",
    "TITLE: "+job.title,
    "COMPANY: "+job.company,
    "LOCATION: "+job.location,
    "DESCRIPTION: "+job.description.slice(0,6500)
  ].join("\n");
  const r=await fetch("https://router.huggingface.co/v1/chat/completions",{
    method:"POST",
    headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
    body:JSON.stringify({
      model,
      messages:[{role:"user",content:prompt}],
      temperature:0.1,
      max_tokens:220
    })
  });
  if(!r.ok) throw new Error("HF "+r.status);
  const j=await r.json();
  const text=j.choices?.[0]?.message?.content||"";
  const match=text.match(/\{[\s\S]*\}/);
  if(!match) return null;
  try{return JSON.parse(match[0]);}catch{return null;}
}

for(const job of fresh){
  try{
    const x=await enrich(job);
    if(x){
      job.aiSummary=String(x.summary||"").slice(0,500);
      job.aiHighlights=Array.isArray(x.highlights)?x.highlights.map(String).slice(0,4):[];
    }
  }catch(e){console.error("AI failed",job.id,e?.message||e);}
}
await fs.writeFile("data/jobs.json",JSON.stringify(jobs,null,2)+"\n");
console.log("AI-enriched",fresh.length,"new records");
