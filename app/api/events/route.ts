import {NextResponse} from "next/server";
import {getCurrentUser} from "../../../lib/current-user";
import {getDb} from "../../../lib/db";

const ALLOWED=new Set(["page_view","job_view","apply_click","search","resume_upload","save_job","auth_start"]);

export async function POST(req:Request){
  const sql=getDb();
  if(!sql)return NextResponse.json({ok:false},{status:503});
  let b:any;
  try{b=await req.json()}catch{return NextResponse.json({ok:false,error:"invalid_json"},{status:400})}
  const eventName=String(b?.eventName||"");
  if(!ALLOWED.has(eventName))return NextResponse.json({ok:false,error:"invalid_event"},{status:400});
  const path=String(b?.path||"").slice(0,500);
  const jobId=b?.jobId?String(b.jobId).slice(0,200):null;
  const inputMetadata=b?.metadata&&typeof b.metadata==="object"&&!Array.isArray(b.metadata)?b.metadata:{};
  const metadata=Object.fromEntries(Object.entries(inputMetadata).slice(0,20).map(([k,v])=>[String(k).slice(0,80),typeof v==="string"?v.slice(0,300):typeof v==="number"||typeof v==="boolean"?v:String(v).slice(0,300)]));
  const user=await getCurrentUser();
  await sql.query("INSERT INTO public.analytics_events(user_id,event_name,path,job_id,metadata) VALUES($1,$2,$3,$4,$5::jsonb)",[user?.id||null,eventName,path,jobId,JSON.stringify(metadata)]);
  return NextResponse.json({ok:true});
}