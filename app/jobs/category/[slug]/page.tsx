import type {Metadata} from "next";
import {SITE_URL} from "../../../../lib/site";
import Link from "next/link";
import {notFound} from "next/navigation";
import {getActiveJobsAsync,slugify} from "../../../../lib/jobs";
import {isDirectApplication} from "../../../../lib/application";

export const dynamic="force-dynamic";
export const revalidate=1800;

function labelFor(slug:string){return slug.split("-").map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(" ");}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;
  const label=labelFor(slug);
  return{
    title:label+" jobs",
    description:"Current "+label.toLowerCase()+" jobs and opportunities with direct application links on RolePilot.",
    alternates:{canonical:SITE_URL+"/jobs/category/"+slug}
  };
}

export default async function CategoryPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const jobs=(await getActiveJobsAsync()).filter(j=>slugify(j.category)===slug&&isDirectApplication(j.applyUrl,j.company));
  if(jobs.length<3)notFound();
  const label=labelFor(slug);
  return <main className="container section">
    <p className="eyebrow">Jobs by category</p>
    <h1>{label} jobs & opportunities</h1>
    <p>{jobs.length} current direct-application opportunities.</p>
    <div className="grid">
      {jobs.slice(0,120).map(j=><article className="card" key={j.id}>
        <div className="eyebrow">{j.freshness} · {j.sourceName}</div>
        <h2 className="title"><Link href={"/jobs/"+j.slug}>{j.title}</Link></h2>
        <div className="company">{j.company}</div>
        <p>{j.location} · {j.workMode} · {j.salary}</p>
      </article>)}
    </div>
  </main>;
}
