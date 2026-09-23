"use client";

import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {trackAnalytics} from "./analytics";

export default function ResumeUpload({hasResume=false}:{hasResume?:boolean}){
  const inputRef=useRef<HTMLInputElement|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[result,setResult]=useState<any>(null),[deleted,setDeleted]=useState(false);
  useEffect(()=>{
    if(result)trackAnalytics("resume_match_view",{match_count:Array.isArray(result.items)?result.items.length:0,skill_count:Array.isArray(result.skills)?result.skills.length:0,role_count:Array.isArray(result.roles)?result.roles.length:0});
  },[result]);

  async function upload(file:File){
    setBusy(true);setError("");setResult(null);
    const body=new FormData();body.append("resume",file);
    try{
      const r=await fetch("/api/resume",{method:"POST",body});
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(data.error||"Resume upload failed.");
      trackAnalytics("resume_upload",{file_type:file.type,file_size_kb:Math.round(file.size/1024)});setResult(data);setDeleted(false);
    }catch(e){setError(e instanceof Error?e.message:"Resume upload failed.")}
    finally{setBusy(false)}
  }

  async function removeResume(){
    setBusy(true);setError("");
    try{
      const r=await fetch("/api/resume",{method:"DELETE"});
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(data.error||"Could not remove your resume profile.");
      setDeleted(true);setResult(null);
    }catch(e){setError(e instanceof Error?e.message:"Could not remove your resume profile.")}
    finally{setBusy(false)}
  }

  return <div className="card soft resume-card">
    <div className="resume-card-copy">
      <div className="eyebrow">Resume match</div>
      <h3>{hasResume&&!deleted?"Your resume is ready":"Match me with better jobs"}</h3>
      <p>Upload once. Get relevant direct-employer roles without creating an account.</p>
    </div>

    <div className="file-drop resume-drop">
      <input ref={inputRef} hidden type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={e=>{const f=e.target.files?.[0];if(f)upload(f)}}/>
      <button className="btn" type="button" disabled={busy} onClick={()=>inputRef.current?.click()}>{busy?"Scanning…":"Upload resume"}</button>
      <div className="hint">PDF, DOCX or TXT · max 5 MB</div>
    </div>

    {hasResume&&!deleted&&<button className="chip" type="button" disabled={busy} onClick={removeResume}>Delete saved resume profile</button>}
    {error&&<p className="badge warn" style={{marginTop:12}}>{error}</p>}
    {deleted&&<div className="reason resume-result"><b>Done.</b> Your saved resume profile is gone.</div>}

    {result&&<div className="resume-result">
      <div className="reason"><b>Radar ready.</b> {result.skills?.length||0} skills · {result.roleFamilies?.length||result.roles?.length||0} role signals · {result.candidateLevel==="student"?"student / entry-level":result.candidateLevel||"profile detected"}{result.profileStored?" · saved to your account":""}.</div>
      {!result.items?.length?<p>No close matches yet. Try again later or explore all roles.</p>:
      <div>
        <h4 className="resume-results-title">Good matches</h4>
        <div className="grid">{result.items.slice(0,6).map((j:any,index:number)=><article className="card job-card" key={j.job_id}>
          <div className="eyebrow">Match {(Number(j.score||0)*100).toFixed(0)}%</div>
          <h4 className="title"><Link href={"/jobs/"+j.slug}>{j.title}</Link></h4>
          <div className="company">{j.company_name}</div>
          <div className="meta"><span className="badge">{j.location}</span>{j.seniority&&<span className="badge">{j.seniority}</span>}{j.direct_application&&<span className="badge good">Employer application</span>}</div>
          <div className="reason"><b>Why:</b> {j.reason}</div>{j.matched_skills?.length&&<p className="score">Matched: {j.matched_skills.slice(0,5).join(" · ")}</p>}
          <div className="apply"><span className="direct">↗ Employer / ATS</span><a href={"/api/apply/"+encodeURIComponent(j.slug)+"?placement=resume_match&position="+(index+1)} target="_blank" rel="nofollow noopener noreferrer">Apply →</a></div>
        </article>)}</div>
      </div>}
    </div>}
  </div>
}
