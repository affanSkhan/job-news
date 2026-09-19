import {createServiceSupabase} from "./supabase/service";
import {embedText} from "./embeddings";
import type {Job};

function map(r:any):Job{return{
  id:r.id,slug:r.slug,title:r.title,company:r.company_name,description:r.description||"",location:r.location,
  workMode:r.work_mode,type:r.employment_type,salary:r.salary_text,salaryMin:r.salary_min,salaryMax:r.salary_max,currency:r.currency,
  skills:r.skills||[],category:r.category||"Other",experience:r.experience||"Not specified",publishedAt:r.published_at||"",
  updatedAt:r.updated_at||"",sourceName:r.source_name||"",sourceUrl:r.source_url||"",applyUrl:r.apply_url||"",verified:Boolean(r.verified),
  freshness:r.freshness||"older",tags:r.tags||[],aiSummary:r.ai_summary||undefined,aiHighlights:r.ai_highlights||[],
  companyId:r.company_id||undefined,status:r.status||"active"
};}

export async function semanticSearch(q:string):Promise<{job:Job;score:number}[]>{
  const sb=createServiceSupabase();
  if(!sb)return[];
  const embedding=await embedText(q);
  if(embedding){
    const {data,error}=await sb.rpc("match_jobs_by_embedding",{p_embedding:embedding,p_match_count:100});
    if(!error&&data?.length){
      const ids=data.map((x:any)=>x.job_id);
      const {data:rows}=await sb.from("jobs").select("*").in("id",ids);
      const by=new Map((rows||[]).map((r:any)=>[r.id,map(r)]));
      return data.map((x:any)=>({job:by.get(x.job_id),score:Number(x.similarity||0)} as {job:Job;score:number}))
        .filter((x:{job:Job;score:number})=>Boolean(x.job));
    }
  }
  const {data}=await sb.from("jobs").select("*").eq("status","active").textSearch("search_document",q,{type:"websearch"}).order("published_at",{ascending:false}).limit(100);
  return(data||[]).map((r:any)=>({job:map(r),score:0}));
}