import {NextResponse} from "next/server";
import fs from "node:fs/promises";
import {getCurrentUser,ensureProfile} from "../../../lib/current-user";
import {getDb} from "../../../lib/db";
import {parseResume} from "../../../lib/resume-parser";
import {isDirectApplication} from "../../../lib/application";
import {canonicalApplicationUrl} from "../../../lib/jobs";
import {buildCandidateProfile,rankJobsForCandidate} from "../../../lib/matching";
import type {Job} from "../../../lib/jobs";

export const runtime="nodejs";
export const maxDuration=30;

function normalizeDbJob(row:any):Job{
  return {
    id:String(row.id||""),
    slug:String(row.slug||""),
    title:String(row.title||"Untitled opportunity"),
    company:String(row.company_name||"Unknown company"),
    description:String(row.description||""),
    location:String(row.location||"Location not specified"),
    workMode:["remote","hybrid","onsite","unknown"].includes(String(row.work_mode))?row.work_mode:"unknown",
    type:["full-time","part-time","contract","internship","fellowship","other"].includes(String(row.employment_type))?row.employment_type:"other",
    salary:String(row.salary_text||"Not disclosed"),
    salaryMin:typeof row.salary_min==="number"?row.salary_min:undefined,
    salaryMax:typeof row.salary_max==="number"?row.salary_max:undefined,
    currency:typeof row.currency==="string"?row.currency:undefined,
    skills:Array.isArray(row.skills)?row.skills.map(String):[],
    category:String(row.category||"Other"),
    experience:String(row.experience||"Not specified"),
    publishedAt:String(row.published_at||""),
    updatedAt:String(row.updated_at||""),
    sourceName:String(row.source_name||""),
    sourceUrl:String(row.source_url||""),
    applyUrl:String(row.apply_url||""),
    verified:Boolean(row.verified),
    freshness:["today","this-week","older"].includes(String(row.freshness))?row.freshness:"older",
    tags:Array.isArray(row.tags)?row.tags.map(String):[],
    aiSummary:typeof row.ai_summary==="string"?row.ai_summary:undefined,
    aiHighlights:Array.isArray(row.ai_highlights)?row.ai_highlights.map(String):[],
    companyId:row.company_id?String(row.company_id):undefined,
    status:String(row.status||"active")
  };
}

function dedupeResumeRows(rows:Job[]){
  const map=new Map<string,Job>();
  for(const row of rows){
    const key=(canonicalApplicationUrl(String(row.applyUrl||""))||("fallback:"+String(row.title||"")+"|"+String(row.company||"")+"|"+String(row.location||""))).toLowerCase();
    const prev=map.get(key);
    if(!prev){map.set(key,row);continue}
    const prevUnknown=/^unknown company$/i.test(String(prev.company||""));
    const rowKnown=!/^unknown company$/i.test(String(row.company||""));
    if(rowKnown&&!prevUnknown)map.set(key,row);
  }
  return [...map.values()];
}

export async function POST(req:Request){
  const form=await req.formData();
  const value=form.get("resume");
  if(!(value instanceof File))return NextResponse.json({error:"Choose a resume file."},{status:400});
  if(value.size>5*1024*1024)return NextResponse.json({error:"Resume must be 5 MB or smaller."},{status:413});
  const allowed=["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","text/plain"];
  if(!allowed.includes(value.type))return NextResponse.json({error:"Upload PDF, DOCX or TXT."},{status:415});

  const sql=getDb();

  try{
    const parsed=await parseResume(Buffer.from(await value.arrayBuffer()),value.type);
    const candidate=buildCandidateProfile({text:parsed.text,skills:parsed.skills,roles:parsed.roles});

    const user=await getCurrentUser().catch(()=>null);
    let profileStored=false;
    if(user && sql){
      try{
        const profile=await ensureProfile(user);
        const existingSkills=Array.isArray(profile?.skills)?profile.skills.map(String):[];
        const existingRoles=Array.isArray(profile?.desired_titles)?profile.desired_titles.map(String):[];
        const skills=[...new Set([...existingSkills,...parsed.skills])].slice(0,60);
        const roles=[...new Set([...existingRoles,...parsed.roles])].slice(0,15);
        const profileText=[
          String(profile?.profile_text||""),
          parsed.summary,
          "Skills: "+skills.join(", "),
          "Target roles: "+roles.join(", ")
        ].filter(Boolean).join("\n").slice(0,14000);
        const resumeProfile=JSON.stringify({
          headline:parsed.headline,summary:parsed.summary,skills:parsed.skills,roles:parsed.roles,
          roleFamilies:candidate.roleFamilies,candidateLevel:candidate.level,
          yearsExperience:candidate.yearsExperience,locations:candidate.locations
        });
        await sql.query(
          "UPDATE public.profiles SET headline=COALESCE(NULLIF(headline,''),$1),desired_titles=$2,skills=$3,profile_text=$4,resume_text=$5,resume_filename=$6,resume_skills=$7,resume_roles=$8,resume_profile=$9::jsonb,resume_uploaded_at=now(),updated_at=now(),embedding=NULL WHERE id=$10",
          [parsed.headline||"",roles,skills,profileText,parsed.text,value.name,parsed.skills,parsed.roles,resumeProfile,user.id]
        );
        profileStored=true;
      }catch{
        // Resume matching remains available anonymously even when persistence fails.
      }
    }

    let rows:Job[]=[];
    if(sql){
      try{
        const dbRows=await sql.query(
          "SELECT id,slug,title,company_name,description,location,work_mode,employment_type,salary_text,salary_min,salary_max,currency,skills,category,experience,published_at,updated_at,source_name,source_url,apply_url,verified,freshness,tags,ai_summary,ai_highlights,company_id,status "+
          "FROM public.jobs WHERE status='active' AND coalesce(published_at,updated_at)>=now()-interval '90 days' "+
          "ORDER BY coalesce(published_at,updated_at) DESC NULLS LAST LIMIT 4000"
        );
        rows=dbRows.map(normalizeDbJob);
      }catch(error){
        console.warn("Resume matching database unavailable; using public job cache.",error instanceof Error?error.message:String(error));
      }
    }

    if(!rows.length){
      const cache=JSON.parse(await fs.readFile("data/public-jobs.json","utf8"));
      rows=Array.isArray(cache)?cache
        .filter((job:any)=>job?.status==="active" && job?.applyUrl)
        .slice(0,4000)
        .map((job:any)=>normalizeDbJob({
          id:job.id,slug:job.slug,title:job.title,company_name:job.company,description:job.description,
          location:job.location,work_mode:job.workMode,employment_type:job.type,salary_text:job.salary,
          salary_min:job.salaryMin,salary_max:job.salaryMax,currency:job.currency,skills:job.skills,
          category:job.category,experience:job.experience,published_at:job.publishedAt,updated_at:job.updatedAt,
          source_name:job.sourceName,source_url:job.sourceUrl,apply_url:job.applyUrl,verified:job.verified,
          freshness:job.freshness,tags:job.tags,ai_summary:job.aiSummary,ai_highlights:job.aiHighlights,
          company_id:job.companyId,status:job.status
        }))
        :[];
    }

    rows=dedupeResumeRows(rows).filter(job=>isDirectApplication(job.applyUrl,job.company));
    const ranked=rankJobsForCandidate(candidate,rows,24);
    const items=ranked.map(({job,match})=>({
      job_id:job.id,title:job.title,company_name:job.company,slug:job.slug,location:job.location,
      work_mode:job.workMode,employment_type:job.type,salary_text:job.salary,skills:job.skills,
      source_name:job.sourceName,apply_url:job.applyUrl,verified:job.verified,published_at:job.publishedAt,
      updated_at:job.updatedAt,score:match.score,application_type:"employer",direct_application:true,
      matched_skills:match.matchedSkills,missing_skills:match.missingSkills,role_families:match.matchedFamilies,
      seniority:match.seniority,seniority_fit:match.seniorityFit,reason:match.reasons.slice(0,3).join(" ")
    }));

    return NextResponse.json({
      ok:true,filename:value.name,headline:parsed.headline,skills:parsed.skills,roles:parsed.roles,
      roleFamilies:candidate.roleFamilies,candidateLevel:candidate.level,yearsExperience:candidate.yearsExperience,
      locations:candidate.locations,anonymous:true,profileStored,items
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
