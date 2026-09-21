"use client";
import {useEffect} from "react";
import Script from "next/script";
import {usePathname} from "next/navigation";

const SESSION_KEY="rolepilot_analytics_session";
const EVENT_NAMES=["page_view","job_view","apply_click","search","resume_upload","save_job","auth_start"] as const;
type EventName=typeof EVENT_NAMES[number];

function getSessionId(){
  try{
    const existing=sessionStorage.getItem(SESSION_KEY);
    if(existing)return existing;
    const value=crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY,value);
    return value;
  }catch{return undefined}
}

export function trackAnalytics(eventName:EventName, metadata:Record<string,string|number|boolean|undefined>={}, jobId?:string){
  if(typeof window==="undefined")return;
  const payload={eventName,path:window.location.pathname,jobId,metadata:{...metadata,session_id:getSessionId()}};
  void fetch("/api/events",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload),keepalive:true}).catch(()=>{});
  const gtag=(window as typeof window & {gtag?: (...args:unknown[])=>void}).gtag;
  if(gtag)gtag("event",eventName,{...metadata,page_path:window.location.pathname});
}

export function Analytics(){
  const id=process.env.NEXT_PUBLIC_GA_ID;
  const pathname=usePathname();

  useEffect(()=>{if(pathname)trackAnalytics("page_view")},[pathname]);

  return <>
    {id&&/^G-[A-Z0-9]+$/i.test(id)&&<>
      <Script strategy="afterInteractive" src={"https://www.googletagmanager.com/gtag/js?id="+id}/>
      <Script id="ga">
        {"window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','"+id+"',{send_page_view:false});"}
      </Script>
    </>}
  </>;
}