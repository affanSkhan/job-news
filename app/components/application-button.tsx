"use client";

import {useState} from "react";
import AuthPrompt from "./auth-prompt";

export default function ApplicationButton({jobId}:{jobId:string}){
  const [msg,setMsg]=useState("");
  const [authOpen,setAuthOpen]=useState(false);

  async function requestTrack(){
    const r=await fetch("/api/applications",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({jobId,status:"applied"})
    });
    if(r.status===401)return false;
    setMsg(r.ok?"Tracked as applied":"Could not update");
    return r.ok;
  }

  async function apply(){
    setMsg("");
    const tracked=await requestTrack();
    if(!tracked)setAuthOpen(true);
  }

  async function afterAuth(){
    const tracked=await requestTrack();
    if(!tracked)setMsg("Please try again");
  }

  return <>
    <button className="chip" onClick={apply}>✓ Mark applied{msg&&" · "+msg}</button>
    <AuthPrompt
      open={authOpen}
      onClose={()=>setAuthOpen(false)}
      onAuthenticated={afterAuth}
      title="Track this application"
      description="Create a free account to keep your application status, notes and history in RolePilot."
    />
  </>;
}
