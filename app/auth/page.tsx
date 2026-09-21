"use client";

import Link from "next/link";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {authClient} from "../../lib/auth/client";

export default function AuthPage(){
  const router=useRouter();
  const [mode,setMode]=useState<"in"|"up">("in");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [name,setName]=useState("");
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    setMsg("");
    setBusy(true);
    const next=typeof window!=="undefined"
      ?(new URLSearchParams(window.location.search).get("next")||"/account")
      :"/account";

    try{
      const result=mode==="in"
        ?await authClient.signIn.email({email,password})
        :await authClient.signUp.email({email,password,name:name||email.split("@")[0]});

      if(result.error){
        setMsg(result.error.message??"Authentication failed. Please try again.");
        return;
      }

      router.refresh();
      router.push(next);
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

        {msg&&<p className="auth-message" role="alert">{msg}</p>}

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