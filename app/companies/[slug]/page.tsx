import {notFound} from "next/navigation";
import Link from "next/link";
import type {Metadata} from "next";
import {getActiveJobsAsync,companySlug} from "../../../lib/jobs";
import {isDirectApplication} from "../../../lib/application";
import {SITE_URL} from "../../../lib/site";

export const dynamic="force-dynamic";
export const revalidate=1800;

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;
  const jobs=(await getActiveJobsAsync()).filter(j=>companySlug(j.company)===slug&&isDirectApplication(j.applyUrl,j.company));
  if(jobs.length<2)return{robots:{index:false,follow:true}};
  const name=jobs[0].company;
  return{
    title:name+" Jobs",
    description:"Current direct-employer and ATS opportunities from "+name+" on RolePilot.",
    alternates:{canonical:SITE_URL+"/companies/"+slug}
  };
}

export default async function Company({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const jobs=(await getActiveJobsAsync()).filter(j=>companySlug(j.company)===slug&&isDirectApplication(j.applyUrl,j.company));
  if(jobs.length<2)notFound();
  const company=jobs[0].company;
  const sources=[...new Set(jobs.map(j=>j.sourceName))];
  const locs=[...new Set(jobs.map(j=>j.location))];
  const schema={"@context":"https://schema.org","@type":"Organization","name":company,"url":SITE_URL+"/companies/"+slug};
  return <main className="container section">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    <p className="eyebrow">Company intelligence</p>
    <h1>{company} jobs</h1>
    <p>{jobs.length} active direct-application openings across {locs.length} location groups and {sources.length} public sources.</p>
    <div className="meta">{sources.map(s=><span className="badge" key={s}>{s}</span>)}</div>
    <div className="grid">
      {jobs.slice(0,120).map(j=><article className="card" key={j.id}>
        <div className="eyebrow">{j.freshness}</div>
        <h2 className="title"><Link href={"/jobs/"+j.slug}>{j.title}</Link></h2>
        <p>{j.location} · {j.workMode} · {j.salary}</p>
      </article>)}
    </div>
  </main>;
}
