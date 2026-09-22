"use client";

import {useEffect,useState} from "react";
import {authClient} from "../../lib/auth/client";
import {trackAnalytics} from "./analytics";

type AuthPromptProps={
  open:boolean;
  onClose:()=>void;
  onAuthenticated?:()=>void|Promise<void>;
  title?:string;
  description?:string;
};

export default function AuthPrompt({
  open,
  onClose,
  onAuthenticated,
  title="Save this to your Radar",
  description="Create a free RolePilot account to save this action and access it from any device."
}:AuthPromptProps){
  const [mode,setMode]=useState<"in"|"up">("in");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [name,setName]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  useEffect(()=>{
    if(!open)return;
    trackAnalytics("auth_start",{surface:"auth_prompt",intent:title});
    const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape"&&!busy)onClose()};
    document.addEventListener("keydown",onKey);
    return()=>document.removeEventListener("keydown",onKey);
  },[open,busy,onClose,title]);

  useEffect(()=>{
    if(!open){
      setMessage("");
      setBusy(false);
    }
  },[open]);

  if(!open)return null;

  async function submit(event:React.FormEvent){
    event.preventDefault();
    setMessage("");
    setBusy(true);
    try{
      const result=mode==="in"
        ?await authClient.signIn.email({email,password})
        :await authClient.signUp.email({email,password,name:name||email.split("@")[0]});

      if(result.error){
        trackAnalytics("auth_error",{surface:"auth_prompt",mode,error:String(result.error.message||"").slice(0,180)});
        setMessage(result.error.message||"Authentication failed. Please try again.");
        return;
      }

      trackAnalytics("auth_success",{surface:"auth_prompt",mode});
      await onAuthenticated?.();
      onClose();
    }catch(error){
      trackAnalytics("auth_error",{surface:"auth_prompt",mode,error:error instanceof Error?error.message:"unknown"});
      setMessage(error instanceof Error?error.message:"Authentication failed. Please try again.");
    }finally{
      setBusy(false);
    }
  }

  return <div className="auth-overlay" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)onClose()}}>
    <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-prompt-title">
      <button className="auth-close" type="button" aria-label="Close" disabled={busy} onClick={onClose}>×</button>
      <div className="eyebrow">One quick step</div>
      <h2 id="auth-prompt-title">{mode==="in"?"Sign in to continue":title}</h2>
      <p>{mode==="in"?"Welcome back. Your saved jobs, applications and Radar stay tied to this account.":description}</p>
      <form onSubmit={submit} className="auth-form">
        {mode==="up"&&<input className="input" autoComplete="name" placeholder="Your name" value={name} onChange={event=>setName(event.target.value)}/>}
        <input className="input" type="email" autoComplete="email" placeholder="Email address" value={email} onChange={event=>setEmail(event.target.value)} required/>
        <input className="input" type="password" autoComplete={mode==="in"?"current-password":"new-password"} minLength={8} placeholder="Password (8+ characters)" value={password} onChange={event=>setPassword(event.target.value)} required/>
        <button className="btn" type="submit" disabled={busy}>{busy?(mode==="in"?"Signing in…":"Creating account…"):(mode==="in"?"Sign in & continue":"Create account & continue")}</button>
      </form>
      {message&&<p className="auth-message" role="alert">{message}</p>}
      <div className="auth-switch">
        <span>{mode==="in"?"New to RolePilot?":"Already have an account?"}</span>
        <button className="chip" type="button" disabled={busy} onClick={()=>{setMode(mode==="in"?"up":"in");setMessage("")}}>
          {mode==="in"?"Create a free account":"Sign in instead"}
        </button>
      </div>
      <p className="auth-note">You can keep browsing jobs without an account. Sign in only when you want to save, track or personalize.</p>
    </section>
  </div>;
}
