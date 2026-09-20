import {NextResponse} from "next/server";
import {getCurrentUser,ensureProfile} from "../../../lib/current-user";
import {getDb} from "../../../lib/db";
import {parseResume} from "../../../lib/resume-parser";

export const runtime="nodejs";
export const maxDuration=30;

export async function POST(req:Request){
  const user=await getCurrentUser();
  if(!user)return NextResponse.json({error:"Please sign in before uploading a resume."},{status:401});
  const form=await req.formData();
  const value=form.get("resume");
  if(!(value instanceof File))return NextResponse.json({error:"Choose a resume file."},{status:400});
  if(value.size>5*1024*1024)return NextResponse.json({error:"Resume must be 5 MB or smaller."},{status:413});
  const allowed=["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","text/plain"];
  if(!allowed.includes(value.type))return NextResponse.json({error:"Upload PDF, DOCX, or TXT."},{status:415});
  const sql=getDb();
  if(!sql)return NextResponse.json({error:"Resume matching is temporarily unavailable because the database is not configured."},{status:503});
  try{
    const parsed=await parseResume(Buffer.from(await value.arrayBuffer()),value.type);
    const profile=await ensureProfile(user);
    const existingSkills=Array.isArray(profile?.skills)?profile.skills.map(String):[];
    const existingRoles=Array.isArray(profile?.desired_titles)?profile.desired_titles.map(String):[];
    const skills=[...new Set([...existingSkills,...parsed.skills])].slice(0,60);
    const roles=[...new Set([...existingRoles,...parsed.roles])].slice(0,15);
    const profileText=[String(profile?.profile_text||""),parsed.summary,`Skills: ${skills.join(", ")}`,`Target roles: ${roles.join(", ")}`].filter(Boolean).join("\n").slice(0,14000);
    await sql.query(
      "UPDATE public.profiles SET headline=COALESCE(NULLIF(headline,''),$1),desired_titles=$2,skills=$3,profile_text=$4,resume_text=$5,resume_filename=$6,resume_skills=$7,resume_roles=$8,resume_profile=$9::jsonb,resume_uploaded_at=now(),updated_at=now(),embedding=NULL WHERE id=$10",
      [parsed.headline||"",roles,skills,profileText,parsed.text,value.name,parsed.skills,parsed.roles,JSON.stringify({headline:parsed.headline,summary:parsed.summary,skills:parsed.skills,roles:parsed.roles}),user.id]
    );
    return NextResponse.json({ok:true,filename:value.name,skills:parsed.skills,roles:parsed.roles,headline:parsed.headline,matching:"queued"});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Could not process this resume."},{status:422});
  }
}

export async function DELETE(){
  const user=await getCurrentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const sql=getDb();
  if(!sql)return NextResponse.json({error:"Database not configured"},{status:503});
  await sql.query("UPDATE public.profiles SET resume_text=NULL,resume_filename=NULL,resume_skills='{}',resume_roles='{}',resume_profile='{}'::jsonb,resume_uploaded_at=NULL,embedding=NULL,updated_at=now() WHERE id=$1",[user.id]);
  return NextResponse.json({ok:true});
}