"use client";

import {useRef,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";

export default function ResumeUpload({hasResume=false}:{hasResume?:boolean}){
  const inputRef=useRef<HTMLInputElement|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[result,setResult]=useState<any>(null),[deleted,setDeleted]=useState(false);
  const router=useRouter();

  async function upload(file:File){
    setBusy(true);setError("");setResult(null);
    const body=new FormData();body.append("resume",file);
    try{
      const r=await fetch("/api/resume",{method:"POST",body});
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(data.error||"Resume upload failed.");
      setResult(data);setDeleted(false);router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Resume upload failed.")}
    finally{setBusy(false)}
  }

  async function removeResume(){
    setBusy(true);setError("");
    try{
      const r=await fetch("/api/resume",{method:"DELETE"});
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(data.error||"Could not remove your resume profile.");
      setDeleted(true);setResult(null);router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Could not remove your resume profile.")}
    finally{setBusy(false)}
  }

  return <div className="card soft">
    <div className="eyebrow">Build your radar</div>
    <h2>{hasResume&&!deleted?"Resume radar profile":"Upload your resume"}</h2>
    <p>Upload once and get matched opportunities immediately. No sign-in is required to scan your resume. For signed-in users, the extracted profile can also power the private Radar dashboard.</p>
    <div className="file-drop">
      <input ref={inputRef} hidden type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={e=>{const f=e.target.files?.[0];if(f)upload(f)}}/>
      <button className="btn" type="button" disabled={busy} onClick={()=>inputRef.current?.click()}>{busy?"Scanning resume…":"Upload resume"}</button>
      <div className="hint" style={{marginTop:10}}>Maximum 5 MB · PDF, DOCX or TXT · no account required</div>
    </div>
    {hasResume&&!deleted&&<button className="chip" type="button" disabled={busy} onClick={removeResume} style={{marginTop:10}}>Delete stored resume profile</button>}
    {error&&<p className="badge warn" style={{marginTop:12}}>{error}</p>}
    {deleted&&<div className="reason" style={{marginTop:14}}><b>Resume profile deleted.</b><br/>Upload another resume whenever you want Radar to rebuild it.</div>}
    {result&&<div style={{marginTop:20}}>
      <div className="reason"><b>Radar scan complete.</b><br/>{result.headline||"Candidate profile detected"} · {result.skills?.length||0} skills · {result.roles?.length||0} role signals{result.profileStored?" · saved to your Radar":""}.</div>
      <h3 style={{marginTop:20}}>Opportunities matched to this resume</h3>
      {!result.items?.length?<p>No close matches were found in the current live index. Try a broader resume or browse the full opportunity index.</p>:
      <div className="grid">{result.items.slice(0,8).map((j:any)=><article className="card job-card" key={j.job_id}>
        <div className="eyebrow">Resume match {(Number(j.score||0)*100).toFixed(0)}%</div>
        <h4 className="title"><Link href={"/jobs/"+j.slug}>{j.title}</Link></h4>
        <div className="company">{j.company_name}</div>
        <div className="meta"><span className="badge">{j.location}</span><span className="badge">{j.work_mode}</span>{j.verified&&<span className="badge good">Source verified</span>}{j.direct_application&&<span className="badge good">Employer application</span>}</div>
        <div className="reason"><b>Why it matched:</b> {j.reason}</div>
        {!!j.matched_skills?.length&&<p className="score">Matched: {j.matched_skills.join(" · ")}</p>}
        <div className="apply"><span className="direct">{j.direct_application?"↗ Employer / ATS":"↗ Source link"}</span><a href={j.apply_url||"/jobs/"+j.slug} target="_blank" rel="noopener noreferrer">Apply →</a></div>
      </article>)}</div>}
    </div>}
  </div>
}