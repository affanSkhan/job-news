import Link from "next/link";
import {getActiveJobsAsync,dedupeJobs} from "../../lib/jobs";
import {isDirectApplication} from "../../lib/application";
const CITY_TERMS={
  Pune:/pune/i,
  Bengaluru:/bengaluru|bangalore/i,
  Hyderabad:/hyderabad/i,
  "Delhi-NCR":/delhi|gurgaon|gurugram|noida/i,
  Mumbai:/mumbai/i,
  Chennai:/chennai/i,
  Ahmedabad:/ahmedabad/i,
  Kolkata:/kolkata/i,
  Jaipur:/jaipur/i,
  Kochi:/kochi/i,
  "Indore / Nagpur":/indore|nagpur/i
};
export const dynamic="force-dynamic";
export default async function India(){
 const jobs=dedupeJobs(await getActiveJobsAsync()).filter(j=>isDirectApplication(j.applyUrl,j.company)&&Object.values(CITY_TERMS).some(re=>re.test(j.location)||(/india/i.test(j.location)&&j.workMode==="remote")));
 const counts=Object.entries(CITY_TERMS).map(([name,re])=>({name,count:jobs.filter(j=>re.test(j.location)).length})).sort((a,b)=>b.count-a.count);
 const IndiaRemote=jobs.filter(j=>/india/i.test(j.location)&&j.workMode==="remote").length;
 const fresh=jobs.filter(j=>j.freshness==="today").length;\n const IndiaFreshers=jobs.filter(j=>/fresh|graduate|entry|intern|trainee|0[-– ]?2|0[-– ]?1/i.test((j.experience+" "+j.title).toLowerCase())).length;
 return <main>
  <header className="nav"><div className="container navin"><Link href="/" className="brand">Role<span>Pilot</span></Link><nav className="links"><Link href="/jobs">Explore</Link><Link className="active-nav" href="/india">🇮🇳 India</Link><Link href="/internships">Internships</Link><Link href="/remote-jobs">Remote</Link><Link href="/companies">Companies</Link><Link href="/skills">Skills</Link><Link href="/locations">Locations</Link><Link href="/account">Your Radar</Link></nav></div></header>
  <section className="india-hero"><div className="container"><div className="eyebrow">India opportunity radar</div><h1>Jobs for India, without the noise.</h1><p>Verified direct-employer and ATS opportunities across India — with extra focus on freshers, graduates, internships and early-career technology roles.</p><div className="india-stats"><div><b>{jobs.length}</b><span>India opportunities</span></div><div><b>{fresh}</b><span>found today</span></div><div><b>{IndiaRemote}</b><span>remote from India</span></div><div><b>{IndiaFreshers}</b><span>fresher & graduate roles</span></div></div></div></section>
  <main className="container section">
   <div className="india-city-grid">{counts.map(c=><Link href={"/jobs?india=1&location="+encodeURIComponent(c.name==="Delhi-NCR"?"Gurgaon":c.name.split(" / ")[0])} className="india-city-card" key={c.name}><span>{c.name}</span><strong>{c.count}</strong><small>direct opportunities</small></Link>)}</div>
   <section className="section-tight"><div className="jobs-heading"><div><div className="eyebrow">Quick routes</div><h2>Start with what you need</h2></div></div><div className="grid quick-route-grid">
    <Link className="card route-card" href="/jobs?india=1&experience=fresher"><span className="route-icon">🚀</span><h3>Freshers & Grads</h3><p>Graduate, trainee and early-career roles across India.</p></Link>
    <Link className="card route-card" href="/jobs?india=1&type=internship"><span className="route-icon">🎓</span><h3>Internships</h3><p>India internships, including early-career engineering roles.</p></Link>
    <Link className="card route-card" href="/jobs?india=1&experience=fresher"><span className="route-icon">🚀</span><h3>Freshers</h3><p>Graduate and entry-level opportunities across India.</p></Link>
    <Link className="card route-card" href="/jobs?india=1&mode=remote"><span className="route-icon">🌍</span><h3>Remote India</h3><p>Remote roles that explicitly support candidates in India.</p></Link>
   </div></section>
   <div className="india-cta card"><div><div className="eyebrow">Personal radar</div><h2>Let your resume do the filtering.</h2><p>Upload once and see the India opportunities that match your skills and target roles.</p></div><Link className="btn" href="/account">Build my Radar →</Link></div>
  </main>
 </main>;
}