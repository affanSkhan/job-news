"use client";

import {useEffect} from "react";

function normalizeClientId(value:string){
  const id=value.trim();
  if(/^ca-pub-\\d{16}$/.test(id))return id;
  if(/^pub-\\d{16}$/.test(id))return `ca-${id}`;
  return "";
}

export default function AdSlot({className=""}:{className?:string}){
  const client=normalizeClientId(process.env.NEXT_PUBLIC_ADSENSE_ID||"");
  const slot=(process.env.NEXT_PUBLIC_ADSENSE_SLOT||"").trim();

  useEffect(()=>{
    if(!client||!slot)return;
    try{
      const ads=window as typeof window & {adsbygoogle?:unknown[]};
      (ads.adsbygoogle=ads.adsbygoogle||[]).push({});
    }catch{}
  },[client,slot]);

  if(!client||!slot)return null;
  return <div className={`ad-slot-wrap ${className}`.trim()} aria-label="Advertisement">
    <div className="ad-label">Advertisement</div>
    <ins
      className="adsbygoogle ad-slot"
      style={{display:"block"}}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  </div>;
}
