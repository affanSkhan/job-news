import Link from "next/link";
import type {Metadata} from "next";
import {getActiveJobsAsync,dedupeJobs} from "../../lib/jobs";
import {isDirectApplication} from "../../lib/application";

export const dynamic="force-dynamic";
export const revalidate=1800;

export const metadata:Metadata={
  title:"Remote Jobs for India & Global Candidates | RolePilot",
  description:"Find current remote software, AI, data and engineering jobs with source-backed application links.",
  alternates:{canonical:"/remote-jobs"}
};

export default async function RemoteJobs(){
  const jobs=dedupeJobs(await getActiveJobsAsync())
    .filter(j=>j.workMode==="remote"&&isDirectApplication(j.applyUrl,j.company));
  const india=jobs.filter(j=>/india|pune|mumbai|bengaluru|bangalore|hyderabad|delhi|gurgaon|gurugram|noida|chennai|kolkata/i.test(j.location)).length;

  return <>
    <header className="nav"><div className="container navin">
      <Link href="/" className="brand">Role<span>Pilot</span></Link>
      <nav className="links">
        <Link href="/jobs">Explore</Link><Link href="/india">🇮🇳 India</Link>
        <Link href="/internships">Internships</Link><Link className="active-nav" href="/remote-jobs">Remote</Link>
        <Link href="/companies">Companies</Link><Link href="/skills">Skills</Link><Link href="/locations">Locations</Link>
      </nav>
    </div></header>

    <main className="container section">
      <div className="india-hero" style={{margin:"0 calc((1180px - 100vw)/2)",paddingLeft:"max(20px,calc((100vw - 1180px)/2))",paddingRight:"max(20px,calc((100vw - 1180px)/2))"}}>
        <div className="eyebrow">Remote radar</div>
        <h1>Remote work, without the noise.</h1>
        <p>Browse current remote roles from source-backed employers, with a dedicated path for candidates applying from India.</p>
        <div className="india-stats">
          <div><b>{jobs.length}</b><span>active remote roles</span></div>
          <div><b>{india}</b><span>India-compatible locations</span></div>
          <div><b>{jobs.filter(j=>j.freshness==="today").length}</b><span>found today</span></div>
        </div>
      </div>

      <section className="section-tight">
        <div className="grid quick-route-grid">
          <Link className="card route-card" href="/jobs?mode=remote&category=software"><h2>Remote software jobs</h2><p>Frontend, backend, full-stack and platform roles.</p></Link>
          <Link className="card route-card" href="/jobs?mode=remote&category=ai"><h2>Remote AI / ML jobs</h2><p>AI engineering, machine learning and LLM roles.</p></Link>
          <Link className="card route-card" href="/jobs?mode=remote&india=1"><h2>Remote jobs from India</h2><p>Filter remote opportunities that explicitly mention India or Indian locations.</p></Link>
        </div>
      </section>

      <div className="jobs-heading" style={{marginTop:"34px"}}>
        <div><div className="eyebrow">Live openings</div><h2>Recent remote opportunities</h2></div>
        <Link className="btn" href="/jobs?mode=remote">See all remote jobs →</Link>
      </div>

      <div className="grid">
        {jobs.slice(0,24).map(j=><article className="card job-card" key={j.id}>
          <div className="eyebrow">{j.freshness==="today"?"Found today":"Recent"} · {j.sourceName}</div>
          <h3 className="title"><Link href={"/jobs/"+j.slug}>{j.title}</Link></h3>
          <div className="company">{j.company}</div>
          <div className="meta"><span className="badge">{j.location}</span><span className="badge">{j.type}</span><span className="badge good">Direct application</span></div>
          <p>{j.aiSummary||j.description.slice(0,180)}</p>
          <div className="apply"><span className="direct">{j.salary}</span><Link href={"/jobs/"+j.slug}>View role →</Link></div>
        </article>)}
      </div>
    </main>
  </>;
}
