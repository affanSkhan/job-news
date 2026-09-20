import fs from "node:fs/promises";
import {neon} from "@neondatabase/serverless";

const db=process.env.DATABASE_URL?neon(process.env.DATABASE_URL):null;
const jobs=JSON.parse(await fs.readFile("data/jobs.json","utf8"));
const batchSize=Number(process.env.AI_BATCH||200);
const rewrite=process.env.AI_REWRITE==="1";
const targets=jobs.filter(j=>!j.aiSummary||weakSummary(j)).sort((a,b)=>Number(!a.aiSummary)-Number(!b.aiSummary)).slice(0,batchSize);
const hf=process.env.HF_TOKEN;
const openai=process.env.OPENAI_API_KEY;
const hfModel=process.env.HF_MODEL||"Qwen/Qwen3-0.6B:fastest";
const openaiModel=process.env.OPENAI_CHAT_MODEL||"gpt-4o-mini";
const localModel=process.env.LOCAL_AI_MODEL||"Xenova/distilbart-cnn-6-6";
let localSummarizer=null;

function tokens(text){
  return new Set((String(text||"").toLowerCase().match(/[a-z0-9]{3,}/g)||[]));
}
function overlapScore(summary,source){
  const a=tokens(summary),b=tokens(source);
  if(!a.size)return 0;
  let hit=0;for(const t of a)if(b.has(t))hit++;
  return hit/a.size;
}
function repetitionScore(summary){
  const words=String(summary||"").toLowerCase().match(/[a-z0-9]{2,}/g)||[];
  return words.length?new Set(words).size/words.length:0;
}
function clean(text){
  return String(text||"").replace(/^summary\s*:\s*/i,"").replace(/^["']|["']$/g,"").replace(/\s+/g," ").trim().slice(0,420);
}
function validResult(x,job){
  const summary=clean(x&&x.summary||x&&x.text||"");
  const source=[job.title,job.company,job.location,job.description,Array.isArray(job.skills)?job.skills.join(" "):""].join(" ");
  const overlap=overlapScore(summary,source);
  const repetition=repetitionScore(summary);
  if(summary.length<60||summary.length>420||overlap<0.28||repetition<0.62)return null;
  const highlights=Array.isArray(x&&x.highlights)?x.highlights.map(v=>String(v).trim()).filter(Boolean).slice(0,4):[];
  return {summary,highlights};
}
function weakSummary(job){
  if(!job.aiSummary)return true;
  const s=String(job.aiSummary||"");
  const lower=s.toLowerCase();
return s.length<80||s.length>360||overlapScore(s,[job.title,job.company,job.location,job.description,Array.isArray(job.skills)?job.skills.join(" "):""].join(" "))<0.55||repetitionScore(s)<0.72||lower.includes("mention the word")||lower.includes("tag ")||lower.includes("follow us")||lower.includes("subscribe");
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
function extractiveSummary(job){
  const text=String(job.description||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
  const sentences=text.split(/(?<=[.!?])\s+/).filter(s=>s.length>=45&&s.length<=450);
  const query=[job.title,job.company,...(Array.isArray(job.skills)?job.skills.slice(0,8):[])].join(" ").toLowerCase().match(/[a-z0-9]{3,}/g)||[];
  const scored=sentences.map((s,i)=>({s,i,score:query.reduce((n,t)=>n+(s.toLowerCase().includes(t)?1:0),0)+(i<2?0.5:0)})).sort((a,b)=>b.score-a.score);
  let out="";
  for(const x of scored){const next=(out+" "+x.s).trim();if(next.length>280)break;out=next}
  if(out.length>=60)return out.slice(0,420);
  return [job.title,job.company,job.location,job.type,Array.isArray(job.skills)&&job.skills.length?"Skills: "+job.skills.slice(0,6).join(", "):""].filter(Boolean).join(" · ").slice(0,420);
}
async function remoteEnrich(job){
  const body=["TITLE: "+job.title,"COMPANY: "+job.company,"LOCATION: "+job.location,"DESCRIPTION: "+String(job.description||"").slice(0,6500)].join("\n");
  const prompt=["Summarize this job posting using only the supplied facts.","Return JSON exactly with summary and highlights.","Summary must be 1-2 factual sentences and 60-320 characters. Never add facts, employers, products, locations, salaries, or requirements not present in the text.",body].join("\n");
  if(hf)try{
    const r=await fetch("https://router.huggingface.co/v1/chat/completions",{method:"POST",headers:{Authorization:"Bearer "+hf,"Content-Type":"application/json"},body:JSON.stringify({model:hfModel,messages:[{role:"user",content:prompt}],temperature:.05,max_tokens:180})});
    if(r.ok){const j=await r.json(),t=j.choices?.[0]?.message?.content||"",m=t.match(/\{[\s\S]*\}/);if(m){const x=validResult(JSON.parse(m[0]),job);if(x)return x}}
  }catch{}
  if(openai)try{
    const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:"Bearer "+openai,"Content-Type":"application/json"},body:JSON.stringify({model:openaiModel,messages:[{role:"system",content:"Summarize job listings without inventing facts. Return JSON with summary and highlights."},{role:"user",content:prompt}],temperature:.05,response_format:{type:"json_object"}})});
    if(r.ok){const j=await r.json(),x=validResult(JSON.parse(j.choices?.[0]?.message?.content||"{}"),job);if(x)return x}
  }catch{}
  return null;
}
async function localEnrich(job){
  if(!localSummarizer){
    const {pipeline}=await import("@huggingface/transformers");
    localSummarizer=await pipeline("summarization",localModel);
  }
  const source=[job.title+" at "+job.company,"Location: "+job.location,String(job.description||"").slice(0,4200)].join(". ");
  try{
    const out=await localSummarizer(source,{max_new_tokens:75,min_new_tokens:25,no_repeat_ngram_size:3});
    const text=Array.isArray(out)?out[0]?.summary_text||out[0]?.generated_text||"":"";
    return validResult({summary:text,highlights:fallbackHighlights(job)},job);
  }catch{return null}
}
let enriched=0,localUsed=0,fallbackUsed=0,localAttempts=0;
const localMax=Number(process.env.LOCAL_AI_MAX||120);
for(const job of targets){
  let x=await remoteEnrich(job);
  if(!x&&localAttempts<localMax){localAttempts++;x=await localEnrich(job);if(x)localUsed++}
  if(!x){x={summary:extractiveSummary(job),highlights:fallbackHighlights(job)};fallbackUsed++}
  job.aiSummary=x.summary;
  job.aiHighlights=x.highlights||[];
  enriched++;
  if(db)await db.query("UPDATE public.jobs SET ai_summary=$1,ai_highlights=$2,updated_at=now() WHERE id=$3",[job.aiSummary,job.aiHighlights,job.id]);
}
await fs.writeFile("data/jobs.json",JSON.stringify(jobs,null,2)+"\n");
console.log("AI-enriched",enriched,"jobs; local-model",localUsed,"fallback",fallbackUsed,"batch",batchSize,"rewrite",rewrite);
