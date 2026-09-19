import fs from "node:fs";
import path from "node:path";

export type Job={
  id:string;slug:string;title:string;company:string;description:string;location:string;
  workMode:"remote"|"hybrid"|"onsite"|"unknown";
  type:"full-time"|"part-time"|"contract"|"internship"|"fellowship"|"other";
  salary:string;salaryMin?:number;salaryMax?:number;currency?:string;skills:string[];
  category:string;experience:string;publishedAt:string;updatedAt:string;sourceName:string;
  sourceUrl:string;applyUrl:string;verified:boolean;
  freshness:"today"|"this-week"|"older";tags:string[];aiSummary?:string;aiHighlights?:string[];
};

const file=path.join(process.cwd(),"data","jobs.json");

export function getJobs():Job[]{
  try{
    const parsed=JSON.parse(fs.readFileSync(file,"utf8"));
    if(!Array.isArray(parsed))return [];
    return parsed.map((j:any)=>({
      ...j,
      title:typeof j.title==="string"&&j.title.trim()?j.title:"Untitled opportunity",
      slug:typeof j.slug==="string"&&j.slug.trim()?j.slug:slugify(String(j.title||"opportunity")),
      company:typeof j.company==="string"&&j.company.trim()?j.company:"Unknown company",
      description:typeof j.description==="string"?j.description:"",
      location:typeof j.location==="string"&&j.location.trim()?j.location:"Location not specified",
      workMode:["remote","hybrid","onsite","unknown"].includes(j.workMode)?j.workMode:"unknown",
      type:["full-time","part-time","contract","internship","fellowship","other"].includes(j.type)?j.type:"other",
      salary:typeof j.salary==="string"?j.salary:"Not disclosed",
      skills:Array.isArray(j.skills)?j.skills.map(String).filter(Boolean):[],
      category:typeof j.category==="string"&&j.category.trim()?j.category:"Other",
      experience:typeof j.experience==="string"?j.experience:"Not specified",
      publishedAt:typeof j.publishedAt==="string"?j.publishedAt:"",
      updatedAt:typeof j.updatedAt==="string"?j.updatedAt:"",
      sourceName:typeof j.sourceName==="string"?j.sourceName:"Unknown source",
      sourceUrl:typeof j.sourceUrl==="string"?j.sourceUrl:"",
      applyUrl:typeof j.applyUrl==="string"?j.applyUrl:j.sourceUrl||"",
      verified:Boolean(j.verified),
      freshness:["today","this-week","older"].includes(j.freshness)?j.freshness:"older",
      tags:Array.isArray(j.tags)?j.tags.map(String).filter(Boolean):[],
      aiHighlights:Array.isArray(j.aiHighlights)?j.aiHighlights.map(String).filter(Boolean):[]
    })) as Job[];
  }catch{return [];}
}
export function getActiveJobs(){
  const cutoff=Date.now()-45*24*60*60*1000;
  return getJobs()
    .filter(j=>Date.parse(j.publishedAt||j.updatedAt)>=cutoff)
    .sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
}
export function getJob(slug:string){return getActiveJobs().find(j=>j.slug===slug);}
export function slugify(v:string){return v.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,82);}
export function titleFor(j:Job){return j.title+" at "+j.company+" — JobNews";}
export function descFor(j:Job){
  const bits=[j.title,"at "+j.company,j.location,j.type,j.salary,j.skills.slice(0,5).join(", ")].filter(Boolean);
  return "Find "+bits.join(" · ")+". View source details and apply directly through the original employer or job source.";
}
