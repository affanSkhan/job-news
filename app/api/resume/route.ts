import {NextResponse} from "next/server";
import fs from "node:fs/promises";
import {getCurrentUser,ensureProfile} from "../../../lib/current-user";
import {getDb} from "../../../lib/db";
import {parseResume} from "../../../lib/resume-parser";
import {isDirectApplication,applicationDestination} from "../../../lib/application";import {canonicalApplicationUrl} from "../../../lib/jobs";

export const runtime="nodejs";
export const maxDuration=30;

function dedupeResumeRows(rows:any[]){const map=new Map<string,any>();for(const row of rows){const key=canonicalApplicationUrl(String(row.apply_url||""))||("fallback:"+String(row.title||"")+"|"+String(row.company_name||"")+"|"+String(row.location||"")).toLowerCase();const prev=map.get(key);if(!prev){map.set(key,row);continue}const prevUnknown=/^unknown company$/i.test(String(prev.company_name||""));const rowKnown=!/^unknown company$/i.test(String(row.company_name||""));if(rowKnown&&!prevUnknown)map.set(key,row)}return [...map.values()]}

function scoreJob(job:any,skills:string[],roles:string[]){
  const jobSkills=Array.isArray(job.skills)?job.skills.map((x:any)=>String(x).toLowerCase()):[];
  const wantedSkills=[...new Set(skills.map(x=>String(x).toLowerCase()))];
  const matched=wantedSkills.filter(x=>jobSkills.includes(x));
  const title=String(job.title||"").toLowerCase();
  const company=String(job.company_name||"").toLowerCase();
  const roleHits=roles.filter(r=>title.includes(String(r).toLowerCase())).length;
  const skill=jobSkills.length?Math.min(1,matched.length/Math.max(3,Math.min(jobSkills.length,10))):0;
  const role=roles.length?Math.min(1,roleHits/Math.min(2,roles.length)):0;
  const published=Date.parse(job.published_at||job.updated_at||"");
  const age=Number.isFinite(published)?Math.max(0,(Date.now()-published)/86400000):30;
  const freshness=age<=2?1:age<=7?.75:age<=30?.45:.2;
  const direct=isDirectApplication(String(job.apply_url||""),String(job.company_name||""));
  const app=direct?"employer":applicationDestination(String(job.apply_url||""),String(job.company_name||""));
  const score=.45*skill+.25*role+.1*freshness+.2*(direct?1:0);
  const reason=matched.length
    ? "Matches your "+matched.slice(0,4).join(", ")+" skills."+(roleHits?" The role title also aligns with your target roles.":"")
    : roleHits
      ? "The role title aligns with your target roles."
      : "Relevant fresh opportunity surfaced from the live job index.";
  return {
    ...job,
    score:Math.max(0,Math.min(1,score)),
    application_type:app,
    direct_application:direct,
    matched_skills:matched.slice(0,8),
    reason
  };
}

export async function POST(req:Request){
  const form=await req.formData();
  const value=form.get("resume");
  if(!(value instanceof File))return NextResponse.json({error:"Choose a resume file."},{status:400});
  if(value.size>5*1024*1024)return NextResponse.json({error:"Resume must be 5 MB or smaller."},{status:413});
  const allowed=["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","text/plain"];
  if(!allowed.includes(value.type))return NextResponse.json({error:"Upload PDF, DOCX, or TXT."},{status:415});

  const sql=getDb();

  try{
    const parsed=await parseResume(Buffer.from(await value.arrayBuffer()),value.type);

    // Authentication is optional here. Anonymous visitors get matches immediately;
    // signed-in users also keep the extracted profile for their private Radar.
    const user=await getCurrentUser().catch(()=>null);
    let profileStored=false;
    if(user && sql){
      try{
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
        profileStored=true;
      }catch{
        // Matching must remain available even when optional account persistence fails.
      }
    }

    let rows:any[]=[];
    if(sql){
      try{
        rows=await sql.query(
          `SELECT j.id AS job_id,j.title,j.company_name,j.slug,j.location,j.work_mode,j.employment_type,j.salary_text,j.skills,j.source_name,j.apply_url,j.verified,j.published_at,j.updated_at
           FROM public.jobs j
           WHERE j.status='active' AND coalesce(j.published_at,j.updated_at)>=now()-interval '90 days'
           ORDER BY coalesce(j.published_at,j.updated_at) DESC NULLS LAST
           LIMIT 1500`
        );
      }catch(error){
        console.warn("Resume matching database unavailable; using public job cache.",error instanceof Error?error.message:String(error));
      }
    }

    if(!rows.length){
      const cache=JSON.parse(await fs.readFile("data/public-jobs.json","utf8"));
      rows=cache
        .filter((job:any)=>job?.status==="active" && job?.applyUrl)
        .slice(0,1500)
        .map((job:any)=>({
          job_id:job.id,
          title:job.title,
          company_name:job.company,
          slug:job.slug,
          location:job.location,
          work_mode:job.workMode,
          employment_type:job.type,
          salary_text:job.salary,
          skills:job.skills,
          source_name:job.sourceName,
          apply_url:job.applyUrl,
          verified:job.verified,
          published_at:job.publishedAt,
          updated_at:job.updatedAt
        }));
    }

    const items=dedupeResumeRows(rows)
      .map((job:any)=>scoreJob(job,parsed.skills,parsed.roles))
      .filter((job:any)=>job.direct_application && job.score>0)
      .sort((a:any,b:any)=>b.score-a.score)
      .slice(0,24);

    return NextResponse.json({
      ok:true,
      filename:value.name,
      headline:parsed.headline,
      skills:parsed.skills,
      roles:parsed.roles,
      anonymous:true,
      profileStored,
      items
    });
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