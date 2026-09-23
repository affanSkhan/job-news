import Link from "next/link";
import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {getActiveJobsAsync,slugify} from "../../../lib/jobs";
import {isDirectApplication} from "../../../lib/application";
import {SITE_URL} from "../../../lib/site";

export const dynamic="force-dynamic";
export const revalidate=1800;

function labelFor(slug:string){return slug.split("-").map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(" ");}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;
  const label=labelFor(slug);
  return{
    title:"Jobs in "+label,
    description:"Current direct-application jobs in "+label+" on RolePilot.",
    alternates:{canonical:SITE_URL+"/locations/"+slug}
  };
}

export default async function Location({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const jobs=(await getActiveJobsAsync()).filter(j=>slugify(j.location)===slug&&isDirectApplication(j.applyUrl,j.company));
  if(jobs.length<3)notFound();
  const label=labelFor(slug);
  return <main className="container section">
    <p className="eyebrow">Location jobs</p>
    <h1>Jobs in {label}</h1>
    <p>{jobs.length} active direct-application listings.</p>
    <div className="grid">
      {jobs.slice(0,120).map(j=><article className="card" key={j.id}>
        <h2 className="title"><Link href={"/jobs/"+j.slug}>{j.title}</Link></h2>
        <p>{j.company} · {j.workMode} · {j.salary}</p>
      </article>)}
    </div>
  </main>;
}
