import fs from "node:fs/promises";
import crypto from "node:crypto";

const SOURCES=JSON.parse(await fs.readFile("data/sources.json","utf8"));
const OUT="data/jobs.json";
const now=new Date().toISOString();

const strip=(s="")=>s
  .replace(/<script[\s\S]*?<\/script>/gi," ")
  .replace(/<style[\s\S]*?<\/style>/gi," ")
  .replace(/<[^>]+>/g," ")
  .replace(/&nbsp;/gi," ")
  .replace(/&amp;/gi,"&")
  .replace(/&quot;/gi,'"')
  .replace(/&#39;/gi,"'")
  .replace(/\s+/g," ").trim();

const slug=s=>s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,70);
const hash=s=>crypto.createHash("sha1").update(s).digest("hex").slice(0,10);

function inferType(t){
  if(/intern|internship|graduate intern/i.test(t)) return "internship";
  if(/fellow|fellowship/i.test(t)) return "fellowship";
  if(/contract|contractor/i.test(t)) return "contract";
  if(/part[- ]time/i.test(t)) return "part-time";
  if(/full[- ]time/i.test(t)) return "full-time";
  return "other";
}
function inferMode(location,title,desc=""){
  const s=(location+" "+title+" "+desc).toLowerCase();
  if(/remote|work from home|distributed/.test(s)) return "remote";
  if(/hybrid/.test(s)) return "hybrid";
  if(/on[- ]site|onsite|in office/.test(s)) return "onsite";
  return "unknown";
}
function salary(s,min,max,currency){
  if(s) return s;
  if(min||max) return [min,max].filter(Boolean).map(v=>Number(v).toLocaleString("en-IN")).join("–")+(currency?" "+currency:"");
  return "Not disclosed";
}
function common(x,sourceName){
  const raw=x.description||x.jobDescription||"";
  const pub=x.publishedAt||x.pubDate||x.publication_date||x.created_at||now;
  let published=now;
  try{published=typeof pub==="number"?new Date(pub*1000).toISOString():new Date(pub).toISOString();}catch{}
  const title=x.title||x.jobTitle||"Opportunity";
  const company=x.company||x.company_name||x.companyName||"Unknown company";
  const location=x.location||x.jobGeo||x.candidate_required_location||"Remote";
  const min=Number(x.salaryMin||x.annualSalaryMin||x.salary_min||0)||undefined;
  const max=Number(x.salaryMax||x.annualSalaryMax||x.salary_max||0)||undefined;
  const currency=x.salaryCurrency||x.salaryCurrencyCode||"";
  const url=x.url||x.jobUrl||x.applyUrl;
  const id=hash((url||title+company+location).toLowerCase());
  const ts=Date.parse(published);
  return {
    id,title,slug:slug(title+"-"+company)+"-"+id,company,description:strip(raw).slice(0,14000),
    location:String(location),workMode:inferMode(String(location),title,strip(raw)),type:inferType(title),
    salary:salary(x.salary,min,max,currency),salaryMin:min,salaryMax:max,currency,
    skills:[...(x.tags||x.skills||[])].filter(Boolean).slice(0,20),
    category:x.category||x.jobIndustry||"Other",experience:x.jobLevel||x.experience||"Not specified",
    publishedAt:published,updatedAt:now,sourceName,sourceUrl:url,applyUrl:url,verified:true,
    freshness:Date.now()-ts<86400000?"today":Date.now()-ts<604800000?"this-week":"older",
    tags:[]
  };
}
async function getJson(url){
  const r=await fetch(url,{headers:{"user-agent":"JobNewsBot/1.0 (+https://job-news.onrender.com)"}});
  if(!r.ok) throw new Error(url+" "+r.status);
  return r.json();
}
async function collect(src){
  if(src.kind==="remotive"){
    const j=await getJson(src.url);
    return (j.jobs||[]).map(x=>common({
      title:x.title,company_name:x.company_name,description:x.description,publication_date:x.publication_date,
      candidate_required_location:x.candidate_required_location,url:x.url,tags:x.tags,salary:x.salary
    },src.name));
  }
  if(src.kind==="arbeitnow"){
    const j=await getJson(src.url);
    return (j.data||[]).map(x=>common({
      title:x.title,company_name:x.company_name,description:x.description,location:x.location,
      created_at:x.created_at,url:x.url,tags:x.tags
    },src.name));
  }
  if(src.kind==="jobicy"){
    const j=await getJson(src.url);
    return (j.jobs||[]).map(x=>common(x,src.name));
  }
  return [];
}

const previous=JSON.parse(await fs.readFile(OUT,"utf8").catch(()=>"[ ]"));
const byKey=new Map(previous.map(j=>[j.id,j]));
for(const src of SOURCES.filter(s=>s.enabled)){
  try{
    for(const j of await collect(src)){
      const old=byKey.get(j.id);
      byKey.set(j.id,{...(old||{}),...j,updatedAt:now});
    }
  }catch(e){console.error("source failed",src.id,e?.message||e);}
}
const cutoff=Date.now()-45*24*60*60*1000;
let jobs=[...byKey.values()].filter(j=>Date.parse(j.publishedAt||j.updatedAt)>=cutoff);
jobs.sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
jobs=jobs.slice(0,2500);
await fs.writeFile(OUT,JSON.stringify(jobs,null,2)+"\n");
console.log("JobNews ingestion:",jobs.length,"active jobs");
