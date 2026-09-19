import type {MetadataRoute} from "next";
import {getActiveJobs} from "../lib/jobs";
export default function sitemap():MetadataRoute.Sitemap{
  const base=process.env.NEXT_PUBLIC_SITE_URL||"https://job-news.onrender.com";
  const jobs=getActiveJobs();
  return [
    {url:base,lastModified:new Date(),priority:1},
    {url:base+"/jobs",lastModified:new Date(),priority:.95},
    {url:base+"/about",lastModified:new Date(),priority:.5},
    {url:base+"/privacy",lastModified:new Date(),priority:.2},
    {url:base+"/disclaimer",lastModified:new Date(),priority:.2},
    ...jobs.map(j=>({url:base+"/jobs/"+j.slug,lastModified:new Date(j.updatedAt),priority:.8}))
  ];
}