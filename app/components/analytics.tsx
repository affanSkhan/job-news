"use client";
import {useEffect} from "react";
import Script from "next/script";
import {usePathname} from "next/navigation";

const SESSION_KEY="rolepilot_analytics_session";
const EVENT_NAMES=["page_view","job_view","apply_click","search","resume_upload","resume_match_view","save_job","auth_start","auth_success","auth_error","application_marked"] as const;
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

function contextMetadata(){
  if(typeof window==="undefined")return {};
  const params=new URLSearchParams(window.location.search);
  const referrer=document.referrer||"";
  let referrerDomain="";
  try{referrerDomain=referrer?new URL(referrer).hostname.replace(/^www\./,""):""}catch{}
  return {
    session_id:getSessionId(),
    referrer:referrer.slice(0,500),
    referrer_domain:referrerDomain,
    utm_source:params.get("utm_source")||"",
    utm_medium:params.get("utm_medium")||"",
    utm_campaign:params.get("utm_campaign")||"",
    device_type:/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)?"mobile":"desktop",
    viewport_width:window.innerWidth||0,
    language:(navigator.language||"").slice(0,20)
  };
}

export function trackAnalytics(eventName:EventName, metadata:Record<string,string|number|boolean|undefined>={}, jobId?:string){
  if(typeof window==="undefined")return;
  const payload={eventName,path:window.location.pathname,jobId,metadata:{...contextMetadata(),...metadata}};
  void fetch("/api/events",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload),keepalive:true,credentials:"same-origin"}).catch(()=>{});
  const gtag=(window as typeof window & {gtag?: (...args:unknown[])=>void}).gtag;
  if(gtag)gtag("event",eventName,{...metadata,page_path:window.location.pathname,job_id:jobId||undefined});
}

export function JobViewAnalytics({jobId,company,location,workMode,employmentType,source}:{
  jobId:string;company:string;location:string;workMode:string;employmentType:string;source:string;
}){
  useEffect(()=>{trackAnalytics("job_view",{company,location,work_mode:workMode,employment_type:employmentType,source},jobId)},[jobId,company,location,workMode,employmentType,source]);
  return null;
}

export function Analytics(){
  const id=process.env.NEXT_PUBLIC_GA_ID;
  const pathname=usePathname();

  useEffect(()=>{if(pathname)trackAnalytics("page_view")},[pathname]);

  useEffect(()=>{
    const onSubmit=(event:Event)=>{
      const form=event.target instanceof HTMLFormElement?event.target:null;
      if(!form||!form.matches("[data-analytics-search]"))return;
      const data=new FormData(form);
      const get=(name:string)=>String(data.get(name)||"").trim();
      trackAnalytics("search",{
        surface:form.dataset.analyticsSearch||"jobs",
        query:get("q").slice(0,200),
        location:get("location").slice(0,120),
        type:get("type"),mode:get("mode"),experience:get("experience"),
        category:get("category"),freshness:get("fresh"),sort:get("sort"),
        india_only:get("india")==="1",
        result_count:Number(form.dataset.resultCount||0)
      });
    };
    document.addEventListener("submit",onSubmit,true);
    return()=>document.removeEventListener("submit",onSubmit,true);
  },[]);

  return <>
    {id&&/^G-[A-Z0-9]+$/i.test(id)&&<>
      <Script strategy="afterInteractive" src={"https://www.googletagmanager.com/gtag/js?id="+id}/>
      <Script id="ga">
        {"window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','"+id+"',{send_page_view:false});"}
      </Script>
    </>}
  </>;
}