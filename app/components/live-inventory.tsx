"use client";
import {useCallback,useEffect,useState} from "react";

type Health={activeJobs:number;lastRun?:{started_at?:string}|null};

export default function LiveInventory(){
  const [health,setHealth]=useState<Health|null>(null);

  const refresh=useCallback(async()=>{
    try{
      const r=await fetch("/api/health",{cache:"no-store",headers:{"cache-control":"no-cache"}});
      if(!r.ok)return;
      setHealth(await r.json());
    }catch{}
  },[]);

  useEffect(()=>{
    let mounted=true;
    const run=async()=>{if(mounted)await refresh()};
    run();
    const timer=window.setInterval(run,60_000);
    return()=>{mounted=false;window.clearInterval(timer)};
  },[refresh]);

  if(!health)return <div className="live-inventory"><strong>Live</strong><span>Checking the radar…</span></div>;

  const lastRun=health.lastRun?.started_at?new Date(health.lastRun.started_at):null;
  const label=lastRun&&Number.isFinite(lastRun.getTime())
    ?"Updated "+lastRun.toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"})
    :"Updating live";

  return <div className="live-inventory">
    <strong>{health.activeJobs.toLocaleString()}</strong>
    <span>fresh opportunities</span>
    <small>{label} · refreshes automatically</small>
  </div>;
}
