import {NextResponse} from "next/server";
import {getCurrentUser} from "../../../lib/current-user";
import {getDb} from "../../../lib/db";

const ALLOWED=new Set(["page_view","job_view","apply_click","search","resume_upload","resume_match_view","save_job","auth_start","auth_success","auth_error","application_marked"]);

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(req:Request){
  const sql=getDb();
  let b:any;
  try{b=await req.json()}catch{return NextResponse.json({ok:false,error:"invalid_json"},{status:400})}
  const eventName=String(b?.eventName||"");
  if(!ALLOWED.has(eventName))return NextResponse.json({ok:false,error:"invalid_event"},{status:400});
  const path=String(b?.path||"").slice(0,500);
  const jobId=b?.jobId?String(b.jobId).slice(0,200):null;
  if(!sql)return NextResponse.json({ok:true,stored:false},{status:202,headers:{"Cache-Control":"no-store"}});
  const inputMetadata=b?.metadata&&typeof b.metadata==="object"&&!Array.isArray(b.metadata)?b.metadata:{};
  const metadata=Object.fromEntries(
    Object.entries(inputMetadata).slice(0,40).map(([k,v])=>[
      String(k).slice(0,80),
      typeof v==="string"?v.slice(0,500):typeof v==="number"||typeof v==="boolean"?v:null
    ])
  );
  const user=await getCurrentUser().catch(()=>null);
  let stored=true;
  try{
    await sql.query(
      "INSERT INTO public.analytics_events(user_id,event_name,path,job_id,metadata) VALUES($1,$2,$3,$4,$5::jsonb)",
      [user?.id||null,eventName,path,jobId,JSON.stringify(metadata)]
    );
  }catch(error){
    if(error instanceof Error&&/foreign key|violates.*constraint/i.test(error.message)&&jobId){
      try{
        await sql.query(
          "INSERT INTO public.analytics_events(user_id,event_name,path,job_id,metadata) VALUES($1,$2,$3,NULL,$4::jsonb)",
          [user?.id||null,eventName,path,JSON.stringify(metadata)]
        );
      }catch{stored=false}
    }else{
      stored=false;
    }
  }
  return NextResponse.json({ok:true,stored},{status:stored?200:202,headers:{"Cache-Control":"no-store"}});
}
