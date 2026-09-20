"use client";

import {useRef,useState} from "react";
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
      if(r.status===401){router.push("/auth?next=/account");return}
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
    <p>Your resume is parsed into a private candidate profile. The original file is not stored; JobNews keeps only extracted text and matching fields needed for your radar. You can remove that data below.</p>
    <div className="file-drop">
      <input ref={inputRef} hidden type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={e=>{const f=e.target.files?.[0];if(f)upload(f)}}/>
      <button className="btn" type="button" disabled={busy} onClick={()=>inputRef.current?.click()}>{busy?"Working…":"Upload / replace resume"}</button>
      <div className="hint" style={{marginTop:10}}>Maximum 5 MB · text-based resumes work best</div>
    </div>
    {hasResume&&!deleted&&<button className="chip" type="button" disabled={busy} onClick={removeResume} style={{marginTop:10}}>Delete stored resume profile</button>}
    {error&&<p className="badge warn" style={{marginTop:12}}>{error}</p>}
    {deleted&&<div className="reason" style={{marginTop:14}}><b>Resume profile deleted.</b><br/>Upload another resume whenever you want Radar to rebuild it.</div>}
    {result&&<div className="reason" style={{marginTop:14}}><b>Radar profile created.</b><br/>{result.headline||"Role profile detected"} · {result.skills?.length||0} skills · {result.roles?.length||0} role signals. Matching has been queued for the next indexing pass.</div>}
  </div>
}