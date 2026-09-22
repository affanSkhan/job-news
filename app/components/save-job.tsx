"use client";

import {useState} from "react";
import AuthPrompt from "./auth-prompt";
import {trackAnalytics} from "./analytics";

export default function SaveJob({jobId}:{jobId:string}){
  const [msg,setMsg]=useState("");
  const [authOpen,setAuthOpen]=useState(false);

  async function requestSave(){
    const r=await fetch("/api/saved-jobs",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({jobId})
    });
    if(r.status===401)return false;
    setMsg(r.ok?"Saved":"Could not save");
    if(r.ok)trackAnalytics("save_job",{result:"saved"},jobId);
    return r.ok;
  }

  async function click(){
    setMsg("");
    const saved=await requestSave();
    if(!saved){
      setAuthOpen(true);
    }
  }

  async function afterAuth(){
    const saved=await requestSave();
    if(!saved)setMsg("Please try again");
  }

  return <>
    <button className="chip" onClick={click}>☆ Save job{msg&&" · "+msg}</button>
    <AuthPrompt
      open={authOpen}
      onClose={()=>setAuthOpen(false)}
      onAuthenticated={afterAuth}
      title="Save this job to your Radar"
      description="Create a free account to keep this role in your personal Radar and access it later from any device."
    />
  </>;
}
