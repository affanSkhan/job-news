"use client";
import Link from "next/link";
import {useState} from "react";
import {useRouter,useSearchParams} from "next/navigation";
import {authClient} from "../../../lib/auth/client";

export default function ResetPasswordPage(){
  const router=useRouter();
  const params=useSearchParams();
  const token=params.get("token")||"";
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    setMsg("");
    if(!token){setMsg("This reset link is missing or invalid.");return}
    if(password.length<8){setMsg("Use at least 8 characters.");return}
    if(password!==confirm){setMsg("Passwords do not match.");return}
    setBusy(true);
    try{
      const result=await authClient.resetPassword({newPassword:password,token});
      if(result.error){setMsg(result.error.message??"This reset link is invalid or expired.");return}
      router.push("/auth?next=/admin&reset=1");
    }catch(error){
      setMsg(error instanceof Error?error.message:"Unable to reset password.");
    }finally{setBusy(false)}
  }

  return <main className="container section" style={{maxWidth:620}}>
    <div className="card">
      <div className="eyebrow">RolePilot account</div>
      <h1>Set a new password</h1>
      <p>Create a new password for your RolePilot account.</p>
      <form onSubmit={submit} className="auth-form">
        <input className="input" type="password" autoComplete="new-password" minLength={8} placeholder="New password (8+ characters)" value={password} onChange={e=>setPassword(e.target.value)} required/>
        <input className="input" type="password" autoComplete="new-password" minLength={8} placeholder="Confirm new password" value={confirm} onChange={e=>setConfirm(e.target.value)} required/>
        <button className="btn" disabled={busy}>{busy?"Resetting…":"Reset password"}</button>
      </form>
      {msg&&<p className="auth-message" role="alert">{msg}</p>}
      <Link className="chip" href="/auth?next=/admin" style={{marginTop:12,display:"inline-flex"}}>← Back to sign in</Link>
    </div>
  </main>;
}