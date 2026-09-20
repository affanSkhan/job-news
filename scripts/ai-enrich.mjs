import fs from "node:fs/promises";
import {neon} from "@neondatabase/serverless";

const db=process.env.DATABASE_URL?neon(process.env.DATABASE_URL):null;
const jobs=JSON.parse(await fs.readFile("data/jobs.json","utf8"));
const batchSize=Number(process.env.AI_BATCH||200);
const targets=jobs.filter(j=>!j.aiSummary).slice(0,batchSize);
const hf=process.env.HF_TOKEN;
const openai=process.env.OPENAI_API_KEY;
const hfModel=process.env.HF_MODEL||"Qwen/Qwen3-0.6B:fastest";
const openaiModel=process.env.OPENAI_CHAT_MODEL||"gpt-4o-mini";
const localModel=process.env.LOCAL_AI_MODEL||"Xenova/flan-t5-small";
let localGenerator=null;

function fallbackSummary(job){
  const bits=[job.title,job.company,job.location,job.workMode,job.type,job.experience]
    .map(String).map(x=>x.trim()).filter(Boolean);
  const skills=Array.isArray(job.skills)?job.skills.slice(0,6).join(", "):"";
  return (bits.slice(0,4).join(" · ")+(skills?" · Skills: "+skills:"")).slice(0,350);
}
function fallbackHighlights(job){
  const out=[];
  if(job.location)out.push("Location: "+job.location);
  if(job.workMode&&job.workMode!=="unknown")out.push("Work mode: "+job.workMode);
  if(job.type)out.push("Type: "+job.type);
  if(Array.isArray(job.skills)&&job.skills.length)out.push("Skills: "+job.skills.slice(0,6).join(", "));
  if(job.salary&&job.salary!=="Not disclosed")out.push("Compensation: "+job.salary);
  return out.slice(0,4);
}
function clean(text){
  return String(text||"").replace(/^summary\s*:\s*/i,"").replace(/^["']|["']$/g,"").replace(/\s+/g," ").trim().slice(0,500);
}
function validResult(x){
  const summary=clean(x&&x.summary||x&&x.text||"");
  const highlights=Array.isArray(x&&x.highlights)?x.highlights.map(v=>String(v).trim()).filter(Boolean).slice(0,4):[];
  return summary.length>=20?{summary,highlights}:null;
}
async function remoteEnrich(job){
  const body=["TITLE: "+job.title,"COMPANY: "+job.company,"LOCATION: "+job.location,"DESCRIPTION: "+String(job.description||"").slice(0,6500)].join("\n");
  const prompt=[
    "Summarize this job listing using only supplied facts.",
    "Return JSON exactly: {\"summary\":\"...\",\"highlights\":[\"...\"]}.",
    "Summary <= 35 words. Highlights <= 4 factual short phrases. Never invent salary, location, requirements, visa status, or experience.",
    body
  ].join("\n");
  if(hf)try{
    const r=await fetch("https://router.huggingface.co/v1/chat/completions",{method:"POST",headers:{Authorization:"Bearer "+hf,"Content-Type":"application/json"},body:JSON.stringify({model:hfModel,messages:[{role:"user",content:prompt}],temperature:.1,max_tokens:180})});
    if(r.ok){
      const j=await r.json();
      const t=j.choices?.[0]?.message?.content||"";
      const m=t.match(/\{[\s\S]*\}/);
      if(m){const x=validResult(JSON.parse(m[0]));if(x)return x}
    }
  }catch{}
  if(openai)try{
    const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:"Bearer "+openai,"Content-Type":"application/json"},body:JSON.stringify({model:openaiModel,messages:[{role:"system",content:"Summarize job listings without inventing facts. Return JSON with summary and highlights."},{role:"user",content:prompt}],temperature:.1,response_format:{type:"json_object"}})});
    if(r.ok){const j=await r.json();const x=validResult(JSON.parse(j.choices?.[0]?.message?.content||"{}"));if(x)return x}
  }catch{}
  return null;
}
async function localEnrich(job){
  if(!localGenerator){
    const {pipeline}=await import("@huggingface/transformers");
    localGenerator=await pipeline("text2text-generation",localModel);
  }
  const source=[job.title,job.company,job.location,String(job.description||"").slice(0,2800)].join(" | ");
  try{
    const out=await localGenerator("Summarize factually in one short sentence without adding information: "+source,{max_new_tokens:70,do_sample:false});
    const text=Array.isArray(out)?out[0]?.generated_text||"":"";
    return validResult({summary:text,highlights:fallbackHighlights(job)});
  }catch{return null}
}
let enriched=0,localUsed=0,fallbackUsed=0;
for(const job of targets){
  let x=await remoteEnrich(job);
  if(!x){x=await localEnrich(job);if(x)localUsed++}
  if(!x){x={summary:fallbackSummary(job),highlights:fallbackHighlights(job)};fallbackUsed++}
  job.aiSummary=x.summary;
  job.aiHighlights=x.highlights||[];
  enriched++;
  if(db)await db.query("UPDATE public.jobs SET ai_summary=$1,ai_highlights=$2,updated_at=now() WHERE id=$3",[job.aiSummary,job.aiHighlights,job.id]);
}
await fs.writeFile("data/jobs.json",JSON.stringify(jobs,null,2)+"\n");
console.log("AI-enriched",enriched,"jobs; local-model",localUsed,"fallback",fallbackUsed,"batch",batchSize);
