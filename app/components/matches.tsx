"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {trackAnalytics} from "./analytics";

export default function Matches(){
  const [items,setItems]=useState<any[]>([]),[ready,setReady]=useState(true),[loading,setLoading]=useState(true);
  useEffect(()=>{let mounted=true;fetch("/api/matches",{cache:"no-store"}).then(r=>r.ok?r.json():{items:[],profileReady:false}).then(x=>{if(!mounted)return;setItems(x.items||[]);setReady(x.profileReady!==false);setLoading(false)}).catch(()=>setLoading(false));return()=>{mounted=false}},[]);
  if(loading)return <p>Scanning your profile against fresh opportunities…</p>;
  if(!ready)return <p>Upload your resume above to build the first radar. You can still browse the full opportunity index below.</p>;
  if(!items.length)return <p>Your radar is warming up. New and newly verified jobs are matched continuously.</p>;
  return <div className="grid">{items.slice(0,8).map((j,index)=><article className="card job-card" key={j.job_id}>
    <div className="eyebrow">Radar match {(Number(j.score||0)*100).toFixed(0)}%</div>
    <h3 className="title"><Link href={"/jobs/"+j.slug}>{j.title}</Link></h3>
    <div className="company">{j.company_name}</div>
    <div className="meta"><span className="badge">{j.location}</span><span className="badge">{j.work_mode}</span>{j.verified&&<span className="badge good">Source verified</span>}{j.direct_application&&<span className="badge good">Employer application</span>}</div>
    <div className="reason"><b>Why this appeared:</b> {j.reason}</div>
    {!!j.matched_skills?.length&&<p className="score">Matched: {j.matched_skills.slice(0,5).join(" · ")}</p>}
    {!!j.missing_skills?.length&&<p className="score">Potential gaps: {j.missing_skills.slice(0,4).join(" · ")}</p>}
    <p className="score">{j.salary_text} · {j.published_at?new Date(j.published_at).toLocaleDateString(): "recent"}</p>
    <div className="apply"><span className="direct">{j.direct_application?"↗ Employer / ATS":"↗ Source link"}</span><a href={"/api/apply/"+encodeURIComponent(j.slug)+"?placement=radar_match&position="+(index+1)} target="_blank" rel="nofollow noopener noreferrer">Apply →</a></div>
  </article>)}</div>
}