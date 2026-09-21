import Link from "next/link";
import Brand from "../components/brand";
import type {Metadata} from "next";
import {getActiveJobsAsync,type Job,dedupeJobs} from "../../lib/jobs";
import {semanticSearch} from "../../lib/search";
import {isDirectApplication} from "../../lib/application";

const INDIA_TERMS=/india|bengaluru|bangalore|hyderabad|pune|mumbai|delhi|gurgaon|gurugram|noida|chennai|kolkata|ahmedabad|jaipur|kochi|indore|nagpur/i;

function match(j:Job,q:string){
  if(!q)return true;
  return[j.title,j.company,j.location,j.category,j.experience,j.skills.join(" "),j.description].join(" ").toLowerCase().includes(q.toLowerCase());
}
function categoryMatch(j:Job,value:string){
  if(!value)return true;
  const s=(j.category+" "+j.title+" "+j.skills.join(" ")).toLowerCase();
  const terms:Record<string,RegExp>={
    engineering:/engineer|engineering|software|developer|development|sre|platform/i,
    software:/software|developer|frontend|backend|full stack|mobile/i,
    ai:/ai|machine learning|ml|artificial intelligence|llm|nlp|computer vision/i,
    data:/data|analytics|analyst|scientist|bi|business intelligence/i,
    cloud:/cloud|devops|platform|site reliability|sre|kubernetes|aws|azure|gcp/i,
    security:/security|cyber|infosec|application security/i,
    product:/product|program manager|product manager/i,
    design:/design|designer|ux|ui/i
  };
  return terms[value]?terms[value].test(s):s.includes(value.toLowerCase());
}
function locationMatch(value:string,needle:string){
  if(!needle)return true;
  const v=value.toLowerCase(),n=needle.toLowerCase();
  const aliases:Record<string,string[]>={
    bengaluru:["bengaluru","bangalore"],bangalore:["bengaluru","bangalore"],
    "delhi-ncr":["delhi","gurgaon","gurugram","noida","new delhi"],
    pune:["pune"],hyderabad:["hyderabad"],mumbai:["mumbai"],chennai:["chennai"],ahmedabad:["ahmedabad"],kolkata:["kolkata"],jaipur:["jaipur"],kochi:["kochi"],indore:["indore"],nagpur:["nagpur"]
  };
  return (aliases[n]||[n]).some(x=>v.includes(x));
}
function experienceMatch(j:Job,value:string){
  if(!value)return true;
  const s=(j.experience+" "+j.title).toLowerCase();
  if(value==="fresher")return j.experience==="fresher"||j.type==="internship"||/\\bintern(?:ship)?\\b|\\btrainee\\b|\\bapprentice\\b|\\bnew grad(?:uate)?\\b|\\bfresher\\b|\\bentry[- ]level\\b/.test(s);
  if(value==="0-1")return j.experience==="fresher"||/\\b0[-– ]?1\\b|\\b0 to 1\\b/.test(s);
  if(value==="1-3")return j.experience==="0-3"||/\\b1[-– ]?3\\b|\\b1 to 3\\b|\\b2[-– ]?3\\b|\\b2 to 3\\b|\\bjunior\\b/.test(s);
  if(value==="3-5")return j.experience==="3-5"||/\\b3[-– ]?5\\b|\\b3 to 5\\b|\\b4[-– ]?5\\b|\\bmid\\b/.test(s);
  if(value==="5+")return /\\b5\+\\b|\\b5 or more\\b|\\bsenior\\b|\\blead\\b|\\bprincipal\\b|\\bstaff\\b|\\bmanager\\b|\\bdirector\\b/.test(s);
  return true;
}
export async function generateMetadata({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}):Promise<Metadata>{
  const p=await searchParams,filtered=Object.values(p).some(Boolean);
  return{title:"Fresh Jobs & Direct Employer Opportunities",description:"Find fresh jobs and internships with source-linked application paths, India-first discovery and semantic search.",robots:filtered?{index:false,follow:true}:{index:true,follow:true},alternates:{canonical:"/jobs"}};
}
export default async function JobsPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const p=await searchParams,q=p.q||"",type=p.type||"",mode=p.mode||"",loc=p.location||"",fresh=p.fresh||"",experience=p.experience||"",category=p.category||"",india=p.india==="1",sort=p.sort||"newest",page=Math.max(1,Number(p.page||1)||1),size=30;
  const ranked=q?(await semanticSearch(q)).map(x=>x.job):await getActiveJobsAsync();
  const all=dedupeJobs(ranked)
    .filter(j=>isDirectApplication(j.applyUrl,j.company))
    .filter(j=>match(j,q))
    .filter(j=>!type||j.type===type)
    .filter(j=>!mode||j.workMode===mode)
    .filter(j=>locationMatch(j.location,loc))
    .filter(j=>!fresh||j.freshness===fresh)
    .filter(j=>categoryMatch(j,category))
    .filter(j=>!experience||experienceMatch(j,experience))
    .filter(j=>!india||INDIA_TERMS.test(j.location));
  const sorted=[...all].sort((a,b)=>{
    if(sort==="company")return a.company.localeCompare(b.company)||a.title.localeCompare(b.title);
    if(sort==="title")return a.title.localeCompare(b.title);
    return String(b.publishedAt).localeCompare(String(a.publishedAt));
  });
  const jobs=sorted.slice((page-1)*size,page*size),pages=Math.max(1,Math.ceil(sorted.length/size));
  const params=(n:number)=>{
    const x=new URLSearchParams();
    for(const [k,v] of Object.entries({q,type,mode,location:loc,fresh,experience,category,india:india?"1":"",sort}))if(v)x.set(k,v);
    x.set("page",String(n));return"/jobs?"+x.toString();
  };
  return <>
    <header className="nav">
      <div className="container navin">
        <Brand/>
        <nav className="links">
          <Link href="/jobs">Explore</Link>
          <Link href="/india">🇮🇳 India</Link>
          <Link href="/internships">Internships</Link>
          <Link href="/remote-jobs">Remote</Link>
          <Link href="/companies">Companies</Link>
          <Link href="/skills">Skills</Link>
          <Link href="/locations">Locations</Link>
          <Link href="/account">Your Radar</Link>
        </nav>
      </div>
    </header>
    <main className="container section">
      <div className="jobs-heading">
        <div>
          <div className="eyebrow">{q?"Semantic discovery":india?"India opportunity radar":"Live opportunity index"}</div>
          <h1>{q?<>Opportunities related to “{q}”</>:india?"India jobs & internships":"Fresh opportunities"}</h1>
          <p>{sorted.length.toLocaleString()} active direct-employer matches · refreshed every 30 minutes</p>
        </div>
        <Link className="chip active" href="/jobs">Clear filters</Link>
      </div>
      <form className="filter-panel" method="get">
        <div className="filter-row">
          <label className="filter-field filter-wide"><span>Search</span><input className="input" name="q" defaultValue={q} placeholder="Python intern, AI engineer, Flutter, data analyst…"/></label>
          <label className="filter-field"><span>Location</span><input className="input" name="location" defaultValue={loc} placeholder="Pune, Bengaluru, Hyderabad…"/></label>
          <label className="filter-field"><span>Job type</span><select className="select" name="type" defaultValue={type}><option value="">All types</option><option value="full-time">Full-time</option><option value="internship">Internships</option><option value="contract">Contract</option><option value="part-time">Part-time</option></select></label>
          <label className="filter-field"><span>Work mode</span><select className="select" name="mode" defaultValue={mode}><option value="">Any mode</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">On-site</option></select></label>
        </div>
        <div className="filter-row">
          <label className="filter-field"><span>Experience</span><select className="select" name="experience" defaultValue={experience}><option value="">Any experience</option><option value="fresher">Fresher / Graduate</option><option value="0-1">0–1 years</option><option value="1-3">1–3 years</option><option value="3-5">3–5 years</option><option value="5+">5+ / Senior</option></select></label>
          <label className="filter-field"><span>Category</span><select className="select" name="category" defaultValue={category}><option value="">All categories</option><option value="engineering">Engineering</option><option value="software">Software</option><option value="ai">AI / ML</option><option value="data">Data</option><option value="cloud">Cloud / DevOps</option><option value="security">Security</option><option value="product">Product</option><option value="design">Design</option></select></label>
          <label className="filter-field"><span>Freshness</span><select className="select" name="fresh" defaultValue={fresh}><option value="">Any time</option><option value="today">Posted today</option><option value="this-week">This week</option></select></label>
          <label className="filter-field"><span>Sort</span><select className="select" name="sort" defaultValue={sort}><option value="newest">Newest first</option><option value="company">Company A–Z</option><option value="title">Role A–Z</option></select></label>
        </div>
        <div className="filter-actions">
          <label className="toggle-filter"><input type="checkbox" name="india" value="1" defaultChecked={india}/><span>🇮🇳 India only</span></label>
          <button className="btn" type="submit">Find opportunities →</button>
        </div>
      </form>
      <div className="chips quick-filters">
        <Link className={"chip"+(india?" active":"")} href="/jobs?india=1">🇮🇳 All India</Link>
        <Link className="chip" href="/jobs?india=1&location=Pune">Pune</Link>
        <Link className="chip" href="/jobs?india=1&location=Bengaluru">Bengaluru</Link>
        <Link className="chip" href="/jobs?india=1&location=Hyderabad">Hyderabad</Link>
        <Link className="chip" href="/jobs?india=1&location=Gurgaon">Delhi-NCR</Link>
        <Link className="chip" href="/jobs?india=1&location=Mumbai">Mumbai</Link>
        <Link className="chip" href="/jobs?india=1&type=internship">India Internships</Link>
        <Link className="chip" href="/jobs?india=1&fresh=today">India · New today</Link>
      </div>
      {jobs.length===0?<div className="card"><h2>No current matches</h2><p>Try a broader search, remove a filter, or let Radar search from your resume.</p><div className="chips"><Link className="chip" href="/jobs">View all jobs</Link><Link className="btn" href="/account">Build my Radar</Link></div></div>:<>
        <div className="grid">
          {jobs.map(j=>{
            const isDirect=isDirectApplication(j.applyUrl,j.company);
            return <article className="card job-card" key={j.id}>
              <div className="eyebrow">{j.freshness==="today"?"Found today":j.freshness==="this-week"?"Found this week":"Recent"} · {j.sourceName}</div>
              <h2 className="title"><Link href={"/jobs/"+j.slug}>{j.title}</Link></h2>
              <div className="company">{j.company}</div>
              <div className="meta"><span className="badge">{j.type}</span><span className="badge">{j.workMode}</span>{j.verified&&<span className="badge good">Verified</span>}{india&&INDIA_TERMS.test(j.location)&&<span className="badge india-badge">🇮🇳 India</span>}{isDirect&&<span className="badge good">Direct application</span>}</div>
              <div className="facts"><div className="fact"><b>Location</b>{j.location}</div><div className="fact"><b>Compensation</b>{j.salary}</div><div className="fact"><b>Category</b>{j.category}</div><div className="fact"><b>Experience</b>{j.experience}</div></div>
              <p>{j.aiSummary||"Direct employer / ATS opportunity."}</p>
              <div className="apply"><span className="direct">↗ Employer application</span><a href={j.applyUrl||"/jobs/"+j.slug} target="_blank" rel="noopener noreferrer">Apply →</a></div>
            </article>
          })}
        </div>
        <div className="chips" style={{justifyContent:"center"}}>{page>1&&<Link className="chip" href={params(page-1)}>← Previous</Link>}<span className="chip active">Page {page} / {pages}</span>{page<pages&&<Link className="chip" href={params(page+1)}>Next →</Link>}</div>
      </>}
    </main>
  </>;
}