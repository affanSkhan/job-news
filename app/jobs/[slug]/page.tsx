import {notFound} from "next/navigation";
import type {Metadata} from "next";
import Link from "next/link";
import {getActiveJobs,getJob,descFor,titleFor} from "../../../lib/jobs";

export const revalidate=3600;
export async function generateStaticParams(){return getActiveJobs().slice(0,2000).map(j=>({slug:j.slug}))}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;const j=getJob(slug);if(!j)return {};
  return {title:titleFor(j),description:descFor(j),alternates:{canonical:"/jobs/"+j.slug},robots:{index:true,follow:true}};
}
export default async function JobPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;const j=getJob(slug);if(!j)notFound();
  const base=process.env.NEXT_PUBLIC_SITE_URL||"https://job-news.onrender.com";
  const pageUrl=base+"/jobs/"+j!.slug;
  const schema={"@context":"https://schema.org","@type":"JobPosting","title":j!.title,"description":j!.description,"datePosted":j!.publishedAt,"hiringOrganization":{"@type":"Organization","name":j!.company},"jobLocation":{"@type":"Place","address":{"@type":"PostalAddress","addressLocality":j!.location}},"url":pageUrl};
  return <main><header className="nav"><div className="container navin"><Link href="/" className="brand">Job<span>News</span></Link><Link className="chip" href="/jobs">All jobs</Link></div></header>
  <div className="container section"><nav style={{fontSize:13,color:"var(--muted)",marginBottom:18}}><Link href="/">Home</Link> / <Link href="/jobs">Jobs</Link> / {j!.title}</nav>
  <article className="card" style={{maxWidth:880,margin:"0 auto"}}><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
  <div className="eyebrow">{j!.freshness==="today"?"Posted today":"Recently posted"} · {j!.sourceName}</div><h1>{j!.title}</h1><p className="company" style={{fontSize:18}}>{j!.company}</p>
  <div className="meta"><span className="badge">{j!.type}</span><span className="badge">{j!.workMode}</span><span className="badge">{j!.location}</span>{j!.verified&&<span className="badge good">Source verified</span>}</div>
  <div className="facts"><div className="fact"><b>Compensation</b>{j!.salary}</div><div className="fact"><b>Experience</b>{j!.experience}</div><div className="fact"><b>Category</b>{j!.category}</div><div className="fact"><b>Updated</b>{new Date(j!.updatedAt).toLocaleString("en-IN")}</div></div>
  {j!.aiSummary&&<div className="card" style={{boxShadow:"none",background:"#f7f7ff",margin:"18px 0"}}><div className="eyebrow">AI-normalized summary</div><p style={{marginBottom:0}}>{j!.aiSummary}</p></div>}
  <h2>Role details</h2><p style={{whiteSpace:"pre-line"}}>{j!.description}</p>
  {j!.skills.length>0&&<><h2>Skills & keywords</h2><div className="meta">{j!.skills.map(s=><span className="badge" key={s}>{s}</span>)}</div></>}
  <div className="apply"><span className="score">Source: {j!.sourceName}</span><a className="btn" href={j!.applyUrl} target="_blank" rel="nofollow noopener noreferrer">Apply on original source ↗</a></div>
  </article></div></main>;
}