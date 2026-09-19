import Link from "next/link";
import {notFound} from "next/navigation";
import {getActiveJobs} from "../../../../lib/jobs";
export async function generateStaticParams(){
  const counts=new Map<string,number>();
  for(const j of getActiveJobs()){const s=j.category.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");counts.set(s,(counts.get(s)||0)+1);}
  return [...counts.entries()].filter(([,n])=>n>=3).map(([slug])=>({slug}));
}
export default async function CategoryPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const jobs=getActiveJobs().filter(j=>j.category.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")===slug);
 if(jobs.length<3)notFound();
 const label=slug.split("-").map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(" ");
 return <main className="container section"><p className="eyebrow">Jobs by category</p><h1>{label} jobs & opportunities</h1><p>{jobs.length} current source-backed opportunities in {label}.</p><div className="grid">{jobs.slice(0,90).map(j=><article className="card" key={j.id}><div className="eyebrow">{j.freshness} · {j.sourceName}</div><h2 className="title"><Link href={"/jobs/"+j.slug}>{j.title}</Link></h2><div className="company">{j.company}</div><div className="meta"><span className="badge">{j.type}</span><span className="badge">{j.location}</span></div><p>{j.salary}</p></article>)}</div></main>;
}