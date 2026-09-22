"use client";

import Script from "next/script";

function normalizeClientId(value:string){
  const id=value.trim();
  if(/^ca-pub-\\d{16}$/.test(id))return id;
  if(/^pub-\\d{16}$/.test(id))return `ca-${id}`;
  return "";
}

export function AdSense(){
  const client=normalizeClientId(process.env.NEXT_PUBLIC_ADSENSE_ID||"");
  if(!client)return null;
  return <Script
    id="adsense"
    async
    strategy="afterInteractive"
    src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
    crossOrigin="anonymous"
  />;
}
