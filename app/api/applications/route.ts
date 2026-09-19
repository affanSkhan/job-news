import {NextResponse} from "next/server";
import {createServerSupabase} from "../../../lib/supabase/server";

async function getUserContext(){
  const sb=await createServerSupabase();
  const {data:{user}}=await sb.auth.getUser();
  return {sb,user};
}

export async function GET(){
  const {sb,user}=await getUserContext();
  if(!user)return NextResponse.json({error:"unauthorized"},{status:401});
  const {data,error}=await sb.from("applications").select("*").eq("user_id",user.id).order("updated_at",{ascending:false});
  return NextResponse.json({data,error:error?.message});
}

export async function POST(req:Request){
  const {sb,user}=await getUserContext();
  if(!user)return NextResponse.json({error:"unauthorized"},{status:401});
  const b=await req.json();
  const status=String(b.status||"applied");
  const {error}=await sb.from("applications").upsert({
    user_id:user.id,
    job_id:String(b.jobId),
    status,
    applied_at:status==="applied"?new Date().toISOString():null,
    notes:String(b.notes||"")
  },{onConflict:"user_id,job_id"});
  return NextResponse.json({ok:!error,error:error?.message});
}

export async function PATCH(req:Request){
  const {sb,user}=await getUserContext();
  if(!user)return NextResponse.json({error:"unauthorized"},{status:401});
  const b=await req.json();
  const {error}=await sb.from("applications").update({
    status:String(b.status||"saved"),
    notes:String(b.notes||""),
    updated_at:new Date().toISOString()
  }).eq("user_id",user.id).eq("job_id",String(b.jobId));
  return NextResponse.json({ok:!error,error:error?.message});
}