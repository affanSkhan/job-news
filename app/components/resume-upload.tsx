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
      <div className="reason"><b>Radar ready.</b> {result.skills?.length||0} skills · {result.roles?.length||0} role signals{result.profileStored?" · saved to your account":""}.</div>
      {!result.items?.length?<p>No close matches yet. Try again later or explore all roles.</p>:
      <div>
        <h4 className="resume-results-title">Good matches</h4>
        <div className="grid">{result.items.slice(0,6).map((j:any)=><article className="card job-card" key={j.job_id}>
          <div className="eyebrow">Match {(Number(j.score||0)*100).toFixed(0)}%</div>
          <h4 className="title"><Link href={"/jobs/"+j.slug}>{j.title}</Link></h4>
          <div className="company">{j.company_name}</div>
          <div className="meta"><span className="badge">{j.location}</span>{j.direct_application&&<span className="badge good">Employer application</span>}</div>
          <div className="reason"><b>Why:</b> {j.reason}</div>
          <div className="apply"><span className="direct">↗ Employer / ATS</span><a href={j.apply_url||"/jobs/"+j.slug} target="_blank" rel="noopener noreferrer">Apply →</a></div>
        </article>)}</div>
      </div>}
    </div>}
  </div>
}
