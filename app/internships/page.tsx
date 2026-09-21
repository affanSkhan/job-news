import Link from "next/link";
import type {Metadata} from "next";
import {getActiveJobsAsync,dedupeJobs} from "../../lib/jobs";
import {isDirectApplication} from "../../lib/application";

export const dynamic="force-dynamic";
export const revalidate=1800;

export const metadata:Metadata={
  title:"Software Internships in India | RolePilot",
  description:"Browse current software, AI, data and engineering internships in India with direct application links.",
  alternates:{canonical:"/internships"}
};

export default async function Internships(){
  const jobs=dedupeJobs(await getActiveJobsAsync())
    .filter(j=>j.type==="internship"&&isDirectApplication(j.applyUrl,j.company));
  const today=jobs.filter(j=>j.freshness==="today").length;
  const remote=jobs.filter(j=>j.workMode==="remote").length;

  return <>
    <header className="nav"><div className="container navin">
      <Link href="/" className="brand">Role<span>Pilot</span></Link>
      <nav className="links">
        <Link href="/jobs">Explore</Link><Link href="/india">🇮🇳 India</Link>
        <Link className="active-nav" href="/internships">Internships</Link>
        <Link href="/remote-jobs">Remote</Link><Link href="/companies">Companies</Link>
        <Link href="/skills">Skills</Link><Link href="/locations">Locations</Link>
      </nav>
    </div></header>

    <main className="container section">
      <div className="india-hero" style={{margin:"0 calc((1180px - 100vw)/2)",paddingLeft:"max(20px,calc((100vw - 1180px)/2))",paddingRight:"max(20px,calc((100vw - 1180px)/2))"}}>
        <div className="eyebrow">Internship radar</div>
        <h1>Internships that turn into experience.</h1>
        <p>Current software, AI/ML, data, cloud and engineering internships with source-backed application paths. Use the filters below to jump straight into live roles.</p>
        <div className="india-stats">
          <div><b>{jobs.length}</b><span>active internships</span></div>
          <div><b>{today}</b><span>found today</span></div>
          <div><b>{remote}</b><span>remote internships</span></div>
        </div>
      </div>

      <section className="section-tight">
        <div className="grid quick-route-grid">
          <Link className="card route-card" href="/jobs?type=internship&category=software"><h2>Software internships</h2><p>Frontend, backend, full-stack, mobile and platform roles.</p></Link>
          <Link className="card route-card" href="/jobs?type=internship&category=ai"><h2>AI / ML internships</h2><p>Machine learning, LLM, NLP and applied AI opportunities.</p></Link>
          <Link className="card route-card" href="/jobs?type=internship&india=1"><h2>India internships</h2><p>Internships across Pune, Bengaluru, Hyderabad, Mumbai and more.</p></Link>
        </div>
      </section>

      <div className="jobs-heading" style={{marginTop:"34px"}}>
        <div><div className="eyebrow">Live openings</div><h2>Recent internship opportunities</h2></div>
        <Link className="btn" href="/jobs?type=internship">See all internships →</Link>
      </div>

      <div className="grid">
        {jobs.slice(0,24).map(j=><article className="card job-card" key={j.id}>
          <div className="eyebrow">{j.freshness==="today"?"Found today":"Recent"} · {j.sourceName}</div>
          <h3 className="title"><Link href={"/jobs/"+j.slug}>{j.title}</Link></h3>
          <div className="company">{j.company}</div>
          <div className="meta"><span className="badge">{j.location}</span><span className="badge">{j.workMode}</span><span className="badge good">Direct application</span></div>
          <p>{j.aiSummary||j.description.slice(0,180)}</p>
          <div className="apply"><span className="direct">{j.salary}</span><Link href={"/jobs/"+j.slug}>View role →</Link></div>
        </article>)}
      </div>
    </main>
  </>;
}
