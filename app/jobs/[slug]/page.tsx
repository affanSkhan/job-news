import {notFound} from "next/navigation";
import type {Metadata} from "next";
import Link from "next/link";
import {getJobAsync,titleFor,descFor} from "../../../lib/jobs";
import SaveJob from "../../components/save-job";
import ApplicationButton from "../../components/application-button";
import {isDirectApplication} from "../../../lib/application";
import Brand from "../../components/brand";
import {SITE_URL} from "../../../lib/site";

function escapeHtml(value:string){
  return value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

function schemaDescription(value:string){
  return "<p>"+escapeHtml(value).replace(/\n\n/g,"</p><p>").replace(/\n/g,"<br>")+"</p>";
}

function countryFor(location:string){
  const s=location.toLowerCase();
  if(/\bindia\b|pune|mumbai|bengaluru|bangalore|hyderabad|delhi|gurgaon|gurugram|noida|chennai|kolkata|ahmedabad|jaipur|kochi|indore|nagpur/.test(s))return"IN";
  if(/\b(united states|usa|u\.s\.)\b|new york|california|texas|seattle|boston/.test(s))return"US";
  if(/\b(united kingdom|uk|u\.k\.)\b|london|manchester/.test(s))return"GB";
  if(/\bcanada\b|toronto|vancouver|montreal/.test(s))return"CA";
  if(/\bgermany\b|berlin|munich/.test(s))return"DE";
  if(/\baustralia\b|sydney|melbourne/.test(s))return"AU";
  return undefined;
}

export const dynamic="force-dynamic";
export const revalidate=0;

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params,j=await getJobAsync(slug);
  if(!j)return{};
  return{
    title:titleFor(j),
    description:descFor(j),
    alternates:{canonical:SITE_URL+"/jobs/"+j.slug},
    robots:{index:true,follow:true}
  };
}

export default async function JobPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params,j=await getJobAsync(slug);
  if(!j)notFound();

  const pageUrl=SITE_URL+"/jobs/"+j.slug;
  const direct=isDirectApplication(j.applyUrl,j.company);
  const updatedLabel=j.updatedAt?new Date(j.updatedAt).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"}):"Not available";
  const country=countryFor(j.location);
  const locationBlock=country
    ? j.workMode==="remote"
      ? {
          "jobLocationType":"TELECOMMUTE",
          "applicantLocationRequirements":{"@type":"Country","name":country}
        }
      : {
          "jobLocation":{
            "@type":"Place",
            "address":{
              "@type":"PostalAddress",
              "addressLocality":j.location,
              "addressCountry":country
            }
          }
        }
    : null;

  const jobSchema:any=locationBlock?{
    "@context":"https://schema.org",
    "@type":"JobPosting",
    "title":j.title,
    "description":schemaDescription(j.description),
    "datePosted":j.publishedAt||undefined,
    "dateModified":j.updatedAt||undefined,
    "identifier":{
      "@type":"PropertyValue",
      "name":j.company,
      "value":j.id
    },
    "employmentType":j.type==="full-time"?"FULL_TIME":j.type==="part-time"?"PART_TIME":j.type==="contract"?"CONTRACTOR":j.type==="internship"?"INTERN":j.type==="fellowship"?"FELLOWSHIP":"OTHER",
    "hiringOrganization":{
      "@type":"Organization",
      "name":j.company
    },
    "url":pageUrl,
    ...locationBlock
  }:null;

  const breadcrumbSchema={
    "@context":"https://schema.org",
    "@type":"BreadcrumbList",
    "itemListElement":[
      {"@type":"ListItem","position":1,"name":"Home","item":SITE_URL},
      {"@type":"ListItem","position":2,"name":"Jobs","item":SITE_URL+"/jobs"},
      {"@type":"ListItem","position":3,"name":j.title,"item":pageUrl}
    ]
  };

  return <main>
    <header className="nav">
      <div className="container navin">
        <Brand/>
        <nav className="links">
          <Link href="/jobs">Explore</Link>
          <Link href="/india">🇮🇳 India</Link>
          <Link href="/internships">Internships</Link>
          <Link href="/remote-jobs">Remote</Link>
          <Link href="/companies">Companies</Link>
        </nav>
        <Link className="chip active" href="/jobs">All jobs</Link>
      </div>
    </header>

    <div className="container section job-detail">
      <nav className="breadcrumbs">
        <Link href="/">Home</Link><span>/</span><Link href="/jobs">Jobs</Link><span>/</span><span>{j.title}</span>
      </nav>

      <article className="job-shell">
        {jobSchema&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jobSchema)}}/>}
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(breadcrumbSchema)}}/>

        <div className="job-topline">
          <span className="eyebrow">{j.freshness==="today"?"Posted today":"Recently posted"} · {j.sourceName}</span>
          <span className={"status-pill"+(direct?" direct":"")}>{direct?"✓ Direct employer / ATS application":"Source discovery listing"}</span>
        </div>

        <div className="job-heading">
          <div>
            <h1>{j.title}</h1>
            <p className="job-company">{j.company}</p>
            <div className="meta job-meta">
              <span className="badge">{j.type}</span>
              <span className="badge">{j.workMode}</span>
              <span className="badge">{j.location}</span>
              {j.verified&&<span className="badge good">Source verified</span>}
            </div>
          </div>
        </div>

        <div className="job-layout">
          <div className="job-main">
            {j.aiSummary&&<section className="ai-summary">
              <div className="eyebrow">AI-normalized summary</div>
              <p>{j.aiSummary}</p>
              {j.aiHighlights?.length&&<div className="highlight-list">{j.aiHighlights.map(h=><span key={h}>✓ {h}</span>)}</div>}
            </section>}

            <section className="job-section">
              <div className="section-kicker">Role details</div>
              <h2>What you’ll be doing</h2>
              <div className="job-description">{j.description||"The employer has not provided a full description for this opportunity."}</div>
            </section>

            {j.skills.length>0&&<section className="job-section">
              <div className="section-kicker">Skills & keywords</div>
              <div className="meta job-skills">
                {j.skills.map(s=><Link className="badge" href={"/skills/"+s.toLowerCase().replace(/[^a-z0-9]+/g,"-")} key={s}>{s}</Link>)}
              </div>
            </section>}
          </div>

          <aside className="job-sidebar">
            <div className="facts">
              <div className="fact"><b>Compensation</b><span>{j.salary}</span></div>
              <div className="fact"><b>Experience</b><span>{j.experience}</span></div>
              <div className="fact"><b>Category</b><span>{j.category}</span></div>
              <div className="fact"><b>Updated</b><span>{updatedLabel}</span></div>
            </div>

            <div className="action-panel">
              <a className="btn apply-cta" href={j.applyUrl} target="_blank" rel="nofollow noopener noreferrer">{direct?"Apply on employer / ATS ↗":"Open source listing ↗"}</a>
              <div className="secondary-actions"><SaveJob jobId={j.id}/><ApplicationButton jobId={j.id}/></div>
            </div>

            <p className="score">Source: {j.sourceName}. RolePilot prioritizes source-backed opportunities and direct employer / ATS application paths.</p>
          </aside>
        </div>
      </article>
    </div>
  </main>;
}
