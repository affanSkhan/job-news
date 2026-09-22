import type {Metadata} from "next";
import "./globals.css";
import {Analytics} from "./components/analytics";
import {AdSense} from "./components/adsense";
import {SITE_NAME,SITE_URL} from "../lib/site";

const adsenseId=process.env.NEXT_PUBLIC_ADSENSE_ID;

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),
  title:{
    default:"Fresh Jobs & Internships in India | RolePilot",
    template:"%s | RolePilot"
  },
  description:"Discover fresh jobs, internships, remote roles and direct employer opportunities across India with RolePilot.",
  applicationName:SITE_NAME,
  category:"jobs",
  robots:{
    index:true,
    follow:true,
    googleBot:{
      index:true,
      follow:true,
      "max-image-preview":"large",
      "max-snippet":-1,
      "max-video-preview":-1
    }
  },
  alternates:{canonical:SITE_URL},
  openGraph:{
    title:"Fresh Jobs & Internships in India | RolePilot",
    description:"Fresh jobs, internships and direct employer opportunities across India.",
    type:"website",
    url:SITE_URL,
    siteName:SITE_NAME
  },
  twitter:{
    card:"summary_large_image",
    title:"Fresh Jobs & Internships in India | RolePilot",
    description:"Fresh jobs, internships and direct employer opportunities across India."
  },
  ...(adsenseId?{other:{"google-adsense-account":adsenseId}}:{}),
  icons:{
    icon:"/icon.png",
    shortcut:"/icon.png",
    apple:"/apple-icon.png"
  }
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en">
    <body>
      <Analytics/>
      <AdSense/>
      {children}
    </body>
  </html>
}
