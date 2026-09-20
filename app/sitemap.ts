import type {MetadataRoute} from "next";
import {getActiveJobsAsync,slugify,companySlug} from "../lib/jobs";\n\nexport const dynamic="force-dynamic";\nexport const revalidate=3600;

function safeDate(value:string|undefined){
  const date=new Date(value||"");
  return Number.isFinite(date.getTime())?date:new Date();
}

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const base=process.env.NEXT_PUBLIC_SITE_URL||"https://job-news-prod.onrender.com";
  const jobs=await getActiveJobsAsync();
  const companies=new Set<string>(),skills=new Set<string>(),locations=new Set<string>();
  for(const j of jobs){
    if(j.company)companies.add(companySlug(j.company));
    for(const s of j.skills)skills.add(slugify(s));
    if(j.location)locations.add(slugify(j.location));
  }
  return [
    {url:base,lastModified:new Date(),priority:1},
    {url:base+"/jobs",lastModified:new Date(),priority:.95},
    {url:base+"/companies",lastModified:new Date(),priority:.85},
    {url:base+"/skills",lastModified:new Date(),priority:.8},
    {url:base+"/locations",lastModified:new Date(),priority:.8},
    {url:base+"/about",lastModified:new Date(),priority:.5},
    {url:base+"/privacy",lastModified:new Date(),priority:.2},
    {url:base+"/disclaimer",lastModified:new Date(),priority:.2},
    ...[...companies].map(x=>({url:base+"/companies/"+x,lastModified:new Date(),priority:.65})),
    ...[...skills].map(x=>({url:base+"/skills/"+x,lastModified:new Date(),priority:.6})),
    ...[...locations].map(x=>({url:base+"/locations/"+x,lastModified:new Date(),priority:.6})),
    ...jobs.map(j=>({url:base+"/jobs/"+j.slug,lastModified:safeDate(j.updatedAt||j.publishedAt),priority:.8}))
  ];
}
