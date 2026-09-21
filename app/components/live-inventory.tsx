"use client";
import {useCallback,useEffect,useState} from "react";

type Health={activeJobs:number;enabledSources:number;databaseReachable:boolean;lastRun?:{started_at?:string;status?:string;jobs_upserted?:number}|null};

export default function LiveInventory(){
  const [health,setHealth]=useState<Health|null>(null);

  const refresh=useCallback(async()=>{
    try{
      const r=await fetch("/api/health",{cache:"no-store",headers:{"cache-control":"no-cache"}});
      if(!r.ok)return;
      const x=await r.json();
      setHealth(x);
    }catch{}
  },[]);

  useEffect(()=>{
    let mounted=true;
    const run=async()=>{if(mounted)await refresh()};
    run();
    const timer=window.setInterval(run,60_000);
    return()=>{mounted=false;window.clearInterval(timer)};
  },[refresh]);

  if(!health)return <p>Loading current inventory…</p>;

  const lastRun=health.lastRun?.started_at?new Date(health.lastRun.started_at):null;
  const lastRunLabel=lastRun&&Number.isFinite(lastRun.getTime())
    ? `Last scan ${lastRun.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}`
    : "Live inventory";

  return <p>
    <strong>{health.activeJobs.toLocaleString()}</strong> active opportunities · {health.enabledSources} enabled sources · {health.databaseReachable?"database healthy":"database reconnecting"} · {lastRunLabel} · auto-refreshing
  </p>;
}
