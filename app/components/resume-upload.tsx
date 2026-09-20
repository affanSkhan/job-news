"use client";
import {useRef,useState} from "react";
import {useRouter} from "next/navigation";

export default function ResumeUpload(){
  const inputRef=useRef<HTMLInputElement|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[result,setResult]=useState<any>(null);
  const router=useRouter();
  async function upload(file:File){
    setBusy(true);setError("");setResult(null);
    const body=new FormData();body.append("resume",file);
    try{
      const r=await fetch("/api/resume",{method:"POST",body});
      const data=await r.json().catch(()=>({}));
      if(r.status===401){router.push("/auth?next=/account");return}
      if(!r.ok)throw new Error(data.error||"Resume upload failed.");
      setResult(data);router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Resume upload failed.")}
    finally{setBusy(false)}
  }
  return <div className="card soft">
    <div className="eyebrow">Build your radar</div>
    <h2>Upload your resume</h2>
    <p>Your resume is parsed into a private candidate profile. The original file is not stored; only the extracted profile text and matching fields are used for your radar.</p>
    <div className="file-drop">
      <input ref={inputRef} hidden type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={e=>{const f=e.target.files?.[0];if(f)upload(f)}}/>
      <button className="btn" type="button" disabled={busy} onClick={()=>inputRef.current?.click()}>{busy?"Reading your resume…":"Upload PDF / DOCX"}</button>
      <div className="hint" style={{marginTop:10}}>Maximum 5 MB · text-based resumes work best</div>
    </div>
    {error&&<p className="badge warn" style={{marginTop:12}}>{error}</p>}
    {result&&<div className="reason" style={{marginTop:14}}><b>Radar profile created.</b><br/>{result.headline||"Role profile detected"} · {result.skills?.length||0} skills · {result.roles?.length||0} role signals. Matching has been queued for the next indexing pass.</div>}
  </div>
}