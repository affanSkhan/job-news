import {NextResponse} from "next/server";
import {getCurrentUser,ensureProfile} from "../../../lib/current-user";
import {getDb} from "../../../lib/db";
import {canonicalApplicationUrl,type Job} from "../../../lib/jobs";
import {buildCandidateProfile,rankJobsForCandidate} from "../../../lib/matching";
import {isDirectApplication} from "../../../lib/application";

function mapRow(r:any):Job{
  return {
    id:String(r.id||""),slug:String(r.slug||""),title:String(r.title||"Untitled opportunity"),
    company:String(r.company_name||"Unknown company"),description:String(r.description||""),
    location:String(r.location||"Location not specified"),
    workMode:["remote","hybrid","onsite","unknown"].includes(String(r.work_mode))?r.work_mode:"unknown",
    type:["full-time","part-time","contract","internship","fellowship","other"].includes(String(r.employment_type))?r.employment_type:"other",
    salary:String(r.salary_text||"Not disclosed"),salaryMin:r.salary_min,salaryMax:r.salary_max,currency:r.currency,
    skills:Array.isArray(r.skills)?r.skills.map(String):[],category:String(r.category||"Other"),
    experience:String(r.experience||"Not specified"),publishedAt:String(r.published_at||""),updatedAt:String(r.updated_at||""),
    sourceName:String(r.source_name||""),sourceUrl:String(r.source_url||""),applyUrl:String(r.apply_url||""),
    verified:Boolean(r.verified),freshness:["today","this-week","older"].includes(String(r.freshness))?r.freshness:"older",
    tags:Array.isArray(r.tags)?r.tags.map(String):[],aiSummary:r.ai_summary||undefined,
    aiHighlights:Array.isArray(r.ai_highlights)?r.ai_highlights.map(String):[],
    companyId:r.company_id?String(r.company_id):undefined,status:String(r.status||"active")
  };
}

export async function GET(){
  const user=await getCurrentUser();
  if(!user)return NextResponse.json({items:[]},{status:401});
  const profile=await ensureProfile(user);
  const sql=getDb();
  if(!sql)return NextResponse.json({items:[],profileReady:false});

  const skills=Array.isArray(profile?.skills)?profile.skills.map(String):[];
  const roles=Array.isArray(profile?.desired_titles)?profile.desired_titles.map(String):[];
  const savedText=[
    String(profile?.profile_text||""),
    String(profile?.headline||""),
    "Preferred locations: "+(Array.isArray(profile?.preferred_locations)?profile.preferred_locations.join(", "):""),
    "Preferred work modes: "+(Array.isArray(profile?.preferred_work_modes)?profile.preferred_work_modes.join(", "):"")
  ].filter(Boolean).join("\n");
  const hasProfile=Boolean(savedText.trim()||skills.length||roles.length);
  if(!hasProfile)return NextResponse.json({items:[],profileReady:false});

  try{
    const rows=await sql.query(
      "SELECT id,slug,title,company_name,description,location,work_mode,employment_type,salary_text,salary_min,salary_max,currency,skills,category,experience,published_at,updated_at,source_name,source_url,apply_url,verified,freshness,tags,ai_summary,ai_highlights,company_id,status "+
      "FROM public.jobs WHERE status='active' AND coalesce(published_at,updated_at)>=now()-interval '60 days' "+
      "ORDER BY coalesce(published_at,updated_at) DESC NULLS LAST LIMIT 4000"
    );
    const jobs=rows.map(mapRow).filter((job:Job)=>isDirectApplication(job.applyUrl,job.company));
    const candidate=buildCandidateProfile({text:savedText,skills,roles});
    const ranked=rankJobsForCandidate(candidate,jobs,24);
    const items=ranked.map(({job,match})=>({
      ...job,
      job_id:job.id,company_name:job.company,work_mode:job.workMode,employment_type:job.type,
      salary_text:job.salary,source_name:job.sourceName,apply_url:job.applyUrl,published_at:job.publishedAt,
      updated_at:job.updatedAt,score:match.score,direct_application:true,
      matched_skills:match.matchedSkills,missing_skills:match.missingSkills,
      application_type:"employer",reason:match.reasons.slice(0,3).join(" ")
    }));
    return NextResponse.json({
      items,profileReady:true,
      candidate:{level:candidate.level,yearsExperience:candidate.yearsExperience,roleFamilies:candidate.roleFamilies,locations:candidate.locations}
    });
  }catch{
    return NextResponse.json({items:[],profileReady:true});
  }
}
