import {NextResponse} from "next/server";
import {getCurrentUser,ensureProfile} from "../../../lib/current-user";
import {getDb} from "../../../lib/db";

function applicationType(url:string,company:string){
  try{
    const host=new URL(url).hostname.toLowerCase();
    if(/greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com/.test(host))return "employer_ats";
    const token=company.toLowerCase().replace(/[^a-z0-9]/g," ").trim().split(/\s+/)[0];
    if(token&&host.replace(/^www\./,"").includes(token))return "employer_site";
    if(/linkedin\.com|indeed\.com|glassdoor\.|ziprecruiter\.|wellfound\.com|monster\.|dice\.com/.test(host))return "third_party";
    return "external";
  }catch{return "unknown"}
}

export async function GET(){
  const user=await getCurrentUser();
  if(!user)return NextResponse.json({items:[]},{status:401});
  const profile=await ensureProfile(user);
  const sql=getDb();
  if(!sql)return NextResponse.json({items:[],profileReady:false});
  const hasProfile=Boolean(profile&&(String(profile.profile_text||"").trim()||Array.isArray(profile.skills)&&profile.skills.length||Array.isArray(profile.desired_titles)&&profile.desired_titles.length));
  if(!hasProfile)return NextResponse.json({items:[],profileReady:false});
  const rows=await sql.query(
    `SELECT j.id AS job_id,j.title,j.company_name,j.slug,j.location,j.work_mode,j.employment_type,j.salary_text,j.skills,j.source_name,j.apply_url,j.verified,j.published_at,j.updated_at,
      CASE WHEN p.embedding IS NOT NULL AND j.embedding IS NOT NULL THEN GREATEST(0,1-(j.embedding <=> p.embedding)) ELSE 0 END::real AS similarity,
      CASE WHEN NULLIF(trim(COALESCE(p.profile_text,'')),'') IS NOT NULL THEN LEAST(ts_rank_cd(to_tsvector('english',coalesce(j.title,'')||' '||coalesce(j.company_name,'')||' '||coalesce(j.description,'')||' '||coalesce(j.location,'')||' '||coalesce(j.category,'')||' '||coalesce(j.experience,'')||' '||coalesce(array_to_string(j.skills,' '),'')),websearch_to_tsquery('english',p.profile_text)),1) ELSE 0 END::real AS keyword_score,
      CASE WHEN cardinality(COALESCE(j.skills,'{}'::text[]))>0 THEN
        (SELECT count(*)::real FROM unnest(COALESCE(j.skills,'{}'::text[])) js WHERE EXISTS (SELECT 1 FROM unnest(COALESCE(p.skills,'{}'::text[])) ps WHERE lower(ps)=lower(js)))/GREATEST(1,cardinality(j.skills))
      ELSE 0 END::real AS skill_overlap,
      CASE WHEN cardinality(COALESCE(p.preferred_work_modes,'{}'::text[]))>0 AND j.work_mode=ANY(p.preferred_work_modes) THEN 0.5 ELSE 0 END+
      CASE WHEN cardinality(COALESCE(p.preferred_locations,'{}'::text[]))>0 AND lower(j.location)=ANY(ARRAY(SELECT lower(x) FROM unnest(p.preferred_locations) x)) THEN 0.5 ELSE 0 END AS preference_score,
      ARRAY(SELECT js FROM unnest(COALESCE(j.skills,'{}'::text[])) js WHERE EXISTS (SELECT 1 FROM unnest(COALESCE(p.skills,'{}'::text[])) ps WHERE lower(ps)=lower(js)) LIMIT 8) AS matched_skills,
      ARRAY(SELECT js FROM unnest(COALESCE(j.skills,'{}'::text[])) js WHERE NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p.skills,'{}'::text[])) ps WHERE lower(ps)=lower(js)) LIMIT 5) AS missing_skills
    FROM public.jobs j CROSS JOIN public.profiles p
    WHERE p.id=$1 AND j.status='active' AND coalesce(j.published_at,j.updated_at)>=now()-interval '60 days'
    ORDER BY j.published_at DESC NULLS LAST LIMIT 80`,
    [user.id]
  );
  const now=Date.now();
  const items=rows.map((r:any)=>{
    const semantic=Number(r.similarity||0),skill=Number(r.skill_overlap||0),keyword=Number(r.keyword_score||0),preference=Math.min(1,Number(r.preference_score||0)),published=Date.parse(r.published_at||r.updated_at||"");
    const age=Number.isFinite(published)?(now-published)/86400000:30;
    const freshness=age<=2?1:age<=7?.65:.25;
    const app=applicationType(String(r.apply_url||""),String(r.company_name||""));
    const direct=app==="employer_site"||app==="employer_ats";
    const score=semantic>0
      ? .45*semantic+.2*skill+.1*keyword+.1*preference+.05*freshness+.1*(direct?1:0)
      : .4*skill+.2*keyword+.15*preference+.1*freshness+.15*(direct?1:0);
    const matched=Array.isArray(r.matched_skills)?r.matched_skills.map(String):[];
    const missing=Array.isArray(r.missing_skills)?r.missing_skills.map(String):[];
    let reason=matched.length?("Matches your "+matched.slice(0,4).join(", ")+" experience."): "Relevant to your stated profile and preferences.";
    if(direct)reason+=" Application link points to an employer or employer ATS.";
    return {...r,score:Math.max(0,Math.min(1,score)),application_type:app,direct_application:direct,matched_skills:matched,missing_skills:missing,reason};
  }).sort((a:any,b:any)=>b.score-a.score).slice(0,24);
  return NextResponse.json({items,profileReady:true});
}