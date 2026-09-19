import type {MetadataRoute} from "next";
import {getActiveJobs} from "../lib/jobs";
function slugify(v:string){return v.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
export default function sitemap():MetadataRoute.Sitemap{
  const base=process.env.NEXT_PUBLIC_SITE_URL||"https://job-news.onrender.com";const jobs=getActiveJobs();
  const typePages=new Set(jobs.filter(j=>j.type).map(j=>j.type));const locCounts=new Map<string,number>();const catCounts=new Map<string,number>();
  for(const j of jobs){locCounts.set(slugify(j.location),(locCounts.get(slugify(j.location))||0)+1);catCounts.set(slugify(j.category),(catCounts.get(slugify(j.category))||0)+1);}
  const locations=[...locCounts].filter(([,n])=>n>=3).map(([s])=>({url:base+"/jobs/location/"+s,lastModified:new Date(),priority:.65}));
  const categories=[...catCounts].filter(([,n])=>n>=3).map(([s])=>({url:base+"/jobs/category/"+s,lastModified:new Date(),priority:.65}));
  const types=[...typePages].map(s=>({url:base+"/jobs/type/"+s,lastModified:new Date(),priority:.7}));
  return [{url:base,lastModified:new Date(),priority:1},{url:base+"/jobs",lastModified:new Date(),priority:.95},{url:base+"/about",lastModified:new Date(),priority:.5},{url:base+"/privacy",lastModified:new Date(),priority:.2},{url:base+"/disclaimer",lastModified:new Date(),priority:.2},...types,...locations,...categories,...jobs.map(j=>({url:base+"/jobs/"+j.slug,lastModified:new Date(j.updatedAt),priority:.8}))];
}