"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {createBrowserSupabase} from "../../lib/supabase/client";

export default function AuthPage(){
  const router=useRouter();
  const [mode,setMode]=useState<"in"|"up">("in");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [name,setName]=useState("");
  const [msg,setMsg]=useState("");

  async function submit(e:React.FormEvent){
    e.preventDefault();
    setMsg("");
    const supabase=createBrowserSupabase();
    const next=typeof window!=="undefined"
      ? (new URLSearchParams(window.location.search).get("next")||"/account")
      : "/account";
    const result=mode==="in"
      ? await supabase.auth.signInWithPassword({email,password})
      : await supabase.auth.signUp({email,password,options:{data:{full_name:name}}});
    if(result.error){
      setMsg(result.error.message);
      return;
    }
    if(mode==="up"){
      setMsg("Account created. Check your email if confirmation is enabled.");
      return;
    }
    router.push(next);
  }

  return <main className="container section" style={{maxWidth:620}}>
    <div className="card">
      <div className="eyebrow">JobNews account</div>
      <h1>{mode==="in"?"Sign in":"Create your account"}</h1>
      <p>Save jobs, track applications, build a profile, and receive intelligent alerts.</p>
      <form onSubmit={submit} style={{display:"grid",gap:10}}>
        {mode==="up"&&<input className="input" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)}/>}
        <input className="input" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/>
        <input className="input" type="password" minLength={8} placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required/>
        <button className="btn">{mode==="in"?"Sign in":"Create account"}</button>
      </form>
      {msg&&<p>{msg}</p>}
      <button className="chip" style={{marginTop:12}} onClick={()=>setMode(mode==="in"?"up":"in")}>
        {mode==="in"?"Need an account? Create one":"Already have an account? Sign in"}
      </button>
    </div>
  </main>;
}
