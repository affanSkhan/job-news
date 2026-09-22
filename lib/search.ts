import {getDb} from "./db";import {embedText} from "./embeddings";import {getActiveJobsAsync} from "./jobs";import type {Job} from "./jobs";import {canonicalApplicationUrl} from "./jobs";
function map(r:any):Job{return{id:r.id,slug:r.slug,title:r.title,company:r.company_name,description:r.description||"",location:r.location,workMode:r.work_mode,type:r.employment_type,salary:r.salary_text,salaryMin:r.salary_min,salaryMax:r.salary_max,currency:r.currency,skills:r.skills||[],category:r.category||"Other",experience:r.experience||"Not specified",publishedAt:String(r.published_at||""),updatedAt:String(r.updated_at||""),sourceName:r.source_name||"",sourceUrl:r.source_url||"",applyUrl:r.apply_url||"",verified:Boolean(r.verified),freshness:r.freshness||"older",tags:r.tags||[],aiSummary:r.ai_summary||undefined,aiHighlights:r.ai_highlights||[],companyId:r.company_id||undefined,status:r.status||"active"}}
function dedupeResults(items:{job:Job;score:number}[]){const map=new Map<string,{job:Job;score:number}>();for(const item of items){const key=canonicalApplicationUrl(item.job.applyUrl)||("fallback:"+item.job.title+"|"+item.job.company+"|"+item.job.location).toLowerCase();const prev=map.get(key);if(!prev||item.score>prev.score||(!prev.job.company&&item.job.company))map.set(key,item)}return [...map.values()]}
const DB_SEMANTIC_SEARCH=process.env.ROLEPILOT_DB_SEMANTIC_SEARCH==="1";
export async function semanticSearch(q:string):Promise<{job:Job;score:number}[]>{
  const sql=DB_SEMANTIC_SEARCH?getDb():null;
  if(sql){
    try{
      const embedding=await embedText(q);
      if(embedding){
        const vector="["+embedding.join(",")+"]";
        const rows=await sql.query("SELECT id,title,company_name,slug,location,work_mode,employment_type,salary_text,salary_min,salary_max,currency,skills,category,experience,published_at,updated_at,source_name,source_url,apply_url,verified,freshness,tags,ai_summary,ai_highlights,company_id,status,GREATEST(0,1-(embedding <=> $1::vector))::real AS score FROM public.jobs WHERE status='active' AND embedding IS NOT NULL AND coalesce(published_at,updated_at)>=now()-interval '60 days' ORDER BY embedding <=> $1::vector LIMIT 100",[vector]);
        if(rows.length)return dedupeResults(rows.map((r:any)=>({job:map(r),score:Number(r.score||0)})));
      }
      const expr="to_tsvector('english',coalesce(title,'')||' '||coalesce(company_name,'')||' '||coalesce(description,'')||' '||coalesce(location,'')||' '||coalesce(category,'')||' '||coalesce(experience,'')||' '||coalesce(array_to_string(skills,' '),'')";
      const sqlText="SELECT *,ts_rank_cd("+expr+",websearch_to_tsquery('english',$1)) AS score FROM public.jobs WHERE status='active' AND "+expr+" @@ websearch_to_tsquery('english',$1) ORDER BY score DESC,published_at DESC LIMIT 100";
      const rows=await sql.query(sqlText,[q]);
      if(rows.length)return dedupeResults(rows.map((r:any)=>({job:map(r),score:Number(r.score||0)})));
    }catch{}
  }
  const needle=String(q||"").toLowerCase().trim();
  if(!needle)return [];
  const terms=needle.split(/\s+/).filter(Boolean);
  const jobs=await getActiveJobsAsync(5000);
  return jobs.map(job=>{
    const hay=[job.title,job.company,job.location,job.category,job.experience,job.type,(job.skills||[]).join(" "),job.description].join(" ").toLowerCase();
    const hits=terms.reduce((n,t)=>n+(hay.includes(t)?1:0),0);
    const titleHits=terms.reduce((n,t)=>n+(job.title.toLowerCase().includes(t)?1:0),0);
    return {job,score:(hits/Math.max(1,terms.length))+(titleHits*0.35)};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||Date.parse(b.job.publishedAt)-Date.parse(a.job.publishedAt)).slice(0,100);
}
