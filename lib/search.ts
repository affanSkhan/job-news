import {getDb} from "./db";
import {embedText} from "./embeddings";
import {getActiveJobsAsync,type Job,canonicalApplicationUrl} from "./jobs";
import {rankJobsForSearch} from "./matching";

function map(r:any):Job{
  return {
    id:String(r.id||""),slug:String(r.slug||""),title:String(r.title||"Untitled opportunity"),
    company:String(r.company_name||"Unknown company"),description:String(r.description||""),
    location:String(r.location||"Location not specified"),
    workMode:["remote","hybrid","onsite","unknown"].includes(String(r.work_mode))?r.work_mode:"unknown",
    type:["full-time","part-time","contract","internship","fellowship","other"].includes(String(r.employment_type))?r.employment_type:"other",
    salary:String(r.salary_text||"Not disclosed"),
    salaryMin:typeof r.salary_min==="number"?r.salary_min:undefined,
    salaryMax:typeof r.salary_max==="number"?r.salary_max:undefined,
    currency:typeof r.currency==="string"?r.currency:undefined,
    skills:Array.isArray(r.skills)?r.skills.map(String):[],category:String(r.category||"Other"),
    experience:String(r.experience||"Not specified"),publishedAt:String(r.published_at||""),updatedAt:String(r.updated_at||""),
    sourceName:String(r.source_name||""),sourceUrl:String(r.source_url||""),applyUrl:String(r.apply_url||""),
    verified:Boolean(r.verified),freshness:["today","this-week","older"].includes(String(r.freshness))?r.freshness:"older",
    tags:Array.isArray(r.tags)?r.tags.map(String):[],aiSummary:typeof r.ai_summary==="string"?r.ai_summary:undefined,
    aiHighlights:Array.isArray(r.ai_highlights)?r.ai_highlights.map(String):[],
    companyId:r.company_id?String(r.company_id):undefined,status:String(r.status||"active")
  };
}

function dedupeResults(items:{job:Job;score:number;searchReasons?:string[]}[]){
  const map=new Map<string,{job:Job;score:number;searchReasons?:string[]}>();
  for(const item of items){
    const key=canonicalApplicationUrl(item.job.applyUrl)||("fallback:"+item.job.title+"|"+item.job.company+"|"+item.job.location).toLowerCase();
    const prev=map.get(key);
    if(!prev||item.score>prev.score)map.set(key,item);
  }
  return [...map.values()];
}

function rerankDirect(query:string,jobs:Job[]){
  return rankJobsForSearch(query,jobs,150).map(x=>({job:x.job,score:x.score,searchReasons:x.reasons}));
}

const DB_SEMANTIC_SEARCH=process.env.ROLEPILOT_DB_SEMANTIC_SEARCH==="1";

export async function semanticSearch(q:string):Promise<{job:Job;score:number;searchReasons?:string[]}[]>{
  const query=String(q||"").trim();
  if(!query)return[];

  const candidates=await getActiveJobsAsync(5000);
  const lexical=rerankDirect(query,candidates);

  if(!DB_SEMANTIC_SEARCH)return lexical.slice(0,100);

  const sql=getDb();
  if(!sql)return lexical.slice(0,100);

  try{
    const embedding=await embedText(query);
    if(!embedding)return lexical.slice(0,100);
    const vector="["+embedding.join(",")+"]";
    const rows=await sql.query(
      "SELECT id,title,company_name,description,slug,location,work_mode,employment_type,salary_text,salary_min,salary_max,currency,skills,category,experience,published_at,updated_at,source_name,source_url,apply_url,verified,freshness,tags,ai_summary,ai_highlights,company_id,status, GREATEST(0,1-(embedding <=> $1::vector))::real AS semantic_score "+
      "FROM public.jobs WHERE status='active' AND embedding IS NOT NULL AND coalesce(published_at,updated_at)>=now()-interval '90 days' "+
      "ORDER BY embedding <=> $1::vector LIMIT 300",[vector]
    );
    const semanticJobs=rows.map((r:any)=>map(r));
    const merged=[...lexical,...rerankDirect(query,semanticJobs)];
    const unique=dedupeResults(merged);
    return unique.sort((a,b)=>b.score-a.score||Date.parse(b.job.publishedAt)-Date.parse(a.job.publishedAt)).slice(0,100);
  }catch{
    return lexical.slice(0,100);
  }
}
