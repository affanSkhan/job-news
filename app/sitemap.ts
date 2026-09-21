import type {MetadataRoute} from "next";
import {getActiveJobsAsync,slugify,companySlug} from "../lib/jobs";
import {SITE_URL} from "../lib/site";

function safeDate(value:string|undefined){
  const date=new Date(value||"");
  return Number.isFinite(date.getTime())?date:undefined;
}

export const dynamic="force-dynamic";
export const revalidate=3600;

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const jobs=await getActiveJobsAsync();
  const companies=new Map<string,Date>();
  const skills=new Map<string,Date>();
  const locations=new Map<string,Date>();

  for(const j of jobs){
    const updated=safeDate(j.updatedAt||j.publishedAt);
    if(!updated)continue;
    if(j.company){
      const key=companySlug(j.company);
      const prev=companies.get(key);
      if(!prev||updated>prev)companies.set(key,updated);
    }
    for(const s of j.skills){
      const key=slugify(s);
      const prev=skills.get(key);
      if(!prev||updated>prev)skills.set(key,updated);
    }
    if(j.location){
      const key=slugify(j.location);
      const prev=locations.get(key);
      if(!prev||updated>prev)locations.set(key,updated);
    }
  }

  return [
    {url:SITE_URL},
    {url:SITE_URL+"/jobs"},
    {url:SITE_URL+"/india",lastModified:new Date()},
    {url:SITE_URL+"/internships"},
    {url:SITE_URL+"/remote-jobs"},
    {url:SITE_URL+"/companies"},
    {url:SITE_URL+"/skills"},
    {url:SITE_URL+"/locations"},
    {url:SITE_URL+"/about"},
    ...[...companies.entries()].map(([x,lastModified])=>({url:SITE_URL+"/companies/"+x,lastModified})),
    ...[...skills.entries()].map(([x,lastModified])=>({url:SITE_URL+"/skills/"+x,lastModified})),
    ...[...locations.entries()].map(([x,lastModified])=>({url:SITE_URL+"/locations/"+x,lastModified})),
    ...jobs.map(j=>({
      url:SITE_URL+"/jobs/"+j.slug,
      lastModified:safeDate(j.updatedAt||j.publishedAt)
    }))
  ];
}
