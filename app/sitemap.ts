import type {MetadataRoute} from "next";
import {getActiveJobsAsync,slugify,companySlug,type Job} from "../lib/jobs";
import {isDirectApplication} from "../lib/application";
import {SITE_URL} from "../lib/site";

const MIN_SKILL_OR_LOCATION_JOBS=3;
const MIN_COMPANY_JOBS=2;

function safeDate(value:string|undefined){
  const date=new Date(value||"");
  return Number.isFinite(date.getTime())?date:undefined;
}

function knownCompany(company:string){
  return Boolean(String(company||"").trim())&&!/^(unknown company|unknown|n\/a|not disclosed)$/i.test(String(company||"").trim());
}

function indexableJob(j:Job){
  return j.status==="active"&&
    knownCompany(j.company)&&
    Boolean(j.slug)&&
    /^https?:\/\//i.test(j.applyUrl||"")&&
    isDirectApplication(j.applyUrl,j.company);
}

export const dynamic="force-dynamic";
export const revalidate=1800;

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const allJobs=await getActiveJobsAsync(10000);
  const jobs=allJobs.filter(indexableJob);
  const companies=new Map<string,{count:number,lastModified?:Date}>();
  const skills=new Map<string,{count:number,lastModified?:Date}>();
  const locations=new Map<string,{count:number,lastModified?:Date}>();
  const categories=new Map<string,{count:number,lastModified?:Date}>();

  for(const j of jobs){
    const updated=safeDate(j.updatedAt||j.publishedAt);

    const companyKey=companySlug(j.company);
    const company=companies.get(companyKey)||{count:0};
    company.count++;
    if(updated&&(!company.lastModified||updated>company.lastModified))company.lastModified=updated;
    companies.set(companyKey,company);

    for(const s of j.skills){
      const key=slugify(s);
      if(!key)continue;
      const prev=skills.get(key)||{count:0};
      prev.count++;
      if(updated&&(!prev.lastModified||updated>prev.lastModified))prev.lastModified=updated;
      skills.set(key,prev);
    }

    const locationKey=slugify(j.location);
    if(locationKey){
      const prev=locations.get(locationKey)||{count:0};
      prev.count++;
      if(updated&&(!prev.lastModified||updated>prev.lastModified))prev.lastModified=updated;
      locations.set(locationKey,prev);
    }

    const categoryKey=slugify(j.category);
    if(categoryKey){
      const prev=categories.get(categoryKey)||{count:0};
      prev.count++;
      if(updated&&(!prev.lastModified||updated>prev.lastModified))prev.lastModified=updated;
      categories.set(categoryKey,prev);
    }
  }

  const staticRoutes=[
    {url:SITE_URL},
    {url:SITE_URL+"/jobs"},
    {url:SITE_URL+"/india"},
    {url:SITE_URL+"/internships"},
    {url:SITE_URL+"/remote-jobs"},
    {url:SITE_URL+"/companies"},
    {url:SITE_URL+"/skills"},
    {url:SITE_URL+"/locations"},
    {url:SITE_URL+"/about"}
  ];

  return[
    ...staticRoutes,
    ...[...companies.entries()]
      .filter(([,v])=>v.count>=MIN_COMPANY_JOBS)
      .map(([slug,v])=>({url:SITE_URL+"/companies/"+slug,lastModified:v.lastModified})),
    ...[...skills.entries()]
      .filter(([,v])=>v.count>=MIN_SKILL_OR_LOCATION_JOBS)
      .map(([slug,v])=>({url:SITE_URL+"/skills/"+slug,lastModified:v.lastModified})),
    ...[...locations.entries()]
      .filter(([,v])=>v.count>=MIN_SKILL_OR_LOCATION_JOBS)
      .map(([slug,v])=>({url:SITE_URL+"/locations/"+slug,lastModified:v.lastModified})),
    ...[...categories.entries()]
      .filter(([,v])=>v.count>=MIN_SKILL_OR_LOCATION_JOBS)
      .map(([slug,v])=>({url:SITE_URL+"/jobs/category/"+slug,lastModified:v.lastModified})),
    ...jobs.map(j=>({
      url:SITE_URL+"/jobs/"+j.slug,
      lastModified:safeDate(j.updatedAt||j.publishedAt)
    }))
  ];
}
