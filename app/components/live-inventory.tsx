"use client";
import {useEffect,useState} from "react";
type Health={activeJobs:number;enabledSources:number;databaseReachable:boolean};
export default function LiveInventory(){
  const [health,setHealth]=useState<Health|null>(null);
  useEffect(()=>{let mounted=true;fetch("/api/health",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(x=>{if(mounted&&x)setHealth(x)}).catch(()=>{});return()=>{mounted=false}},[]);
  if(!health)return <p>Loading current inventory…</p>;
  return <p>{health.activeJobs.toLocaleString()} active opportunities · {health.enabledSources} enabled sources · {health.databaseReachable?"database healthy":"database reconnecting"}</p>;
}
