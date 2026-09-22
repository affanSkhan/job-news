"use client";

import Link from "next/link";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {authClient} from "../../lib/auth/client";
import {trackAnalytics} from "../components/analytics";

export default function AuthPage(){
  const router=useRouter();
  const [mode,setMode]=useState<"in"|"up">("in");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [name,setName]=useState("");
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);
  const [resetSent,setResetSent]=useState(false);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    setMsg("");
    setBusy(true);
    const next=typeof window!=="undefined"
      ?(new URLSearchParams(window.location.search).get("next")||"/account")
      :"/account";

    trackAnalytics("auth_start",{surface:"auth_page",mode});
    try{
      const result=mode==="in"
        ?await authClient.signIn.email({email,password})
        :await authClient.signUp.email({email,password,name:name||email.split("@")[0]});

      if(result.error){
        trackAnalytics("auth_error",{surface:"auth_page",mode,error:String(result.error.message||"").slice(0,180)});
        setMsg(result.error.message??"Authentication failed. Please try again.");
        return;
      }

      trackAnalytics("auth_success",{surface:"auth_page",mode});
      window.location.assign(next);
    }catch(error){
      setMsg(error instanceof Error?error.message:"Authentication failed. Please try again.");
    }finally{
      setBusy(false);
    }
  }

  return (
    <main className="container section auth-page" style={{maxWidth:620}}>
      <div className="card">
        <div className="eyebrow">RolePilot account</div>
        <h1>{mode==="in"?"Sign in":"Create your account"}</h1>
        <p>{mode==="in"
          ?"Access your saved jobs, application tracker and personal Radar."
          :"Create a free account when you are ready to save, track and personalize."
        }</p>

        <form onSubmit={submit} className="auth-form">
          {mode==="up"&&<input className="input" autoComplete="name" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)}/>}
          <input className="input" autoComplete="email" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/>
          <input className="input" autoComplete={mode==="in"?"current-password":"new-password"} type="password" minLength={8} placeholder="Password (8+ characters)" value={password} onChange={e=>setPassword(e.target.value)} required/>
          <button className="btn" disabled={busy}>{busy?(mode==="in"?"Signing in…":"Creating account…"):(mode==="in"?"Sign in":"Create account")}</button>
        </form>

        {mode==="in"&&<button className="chip" disabled={busy} style={{marginTop:12}} onClick={async()=>{
          setMsg("");
          setResetSent(false);
          if(!email){setMsg("Enter your email first.");return}
          setBusy(true);
          try{
            const result=await authClient.requestPasswordReset({email,redirectTo:window.location.origin+"/auth/reset-password"});
            if(result.error){setMsg(result.error.message??"Unable to send reset email.");return}
            setResetSent(true);
          }catch(error){setMsg(error instanceof Error?error.message:"Unable to send reset email.")}
          finally{setBusy(false)}
        }}>{resetSent?"Reset email sent":"Forgot password?"}</button>}

        {msg&&<p className="auth-message" role="alert">{msg}</p>}
        {resetSent&&<div className="auth-page-note"><b>Check your inbox.</b><span>We sent a password reset link to {email}.</span></div>}

        <button className="chip" style={{marginTop:12}} disabled={busy} onClick={()=>{setMode(mode==="in"?"up":"in");setMsg("")}}>
          {mode==="in"?"Need an account? Create one":"Already have an account? Sign in"}
        </button>

        <div className="auth-page-note">
          <b>No account required to browse.</b>
          <span>Search jobs, upload a resume and apply directly without signing in.</span>
        </div>

        <Link className="chip" href="/jobs" style={{marginTop:12,display:"inline-flex"}}>← Continue browsing jobs</Link>
      </div>
    </main>
  );
}