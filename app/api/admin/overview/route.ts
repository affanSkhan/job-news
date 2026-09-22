export const dynamic="force-dynamic";
export const revalidate=0;
import {NextResponse} from "next/server";
import {requireAdmin} from "../../../../lib/admin";
import {getDb} from "../../../../lib/db";
export async function GET(){
  const {user}=await requireAdmin();
  if(!user)return NextResponse.json({error:"forbidden"},{status:403});
  const sql=getDb();
  if(!sql)return NextResponse.json({error:"database not configured"},{status:503});
  const [[jobs],[companies],[sources],runs,sourceRows,recentJobs,[aiJobs],[analytics24],[analytics7],[sessions7],topPages,eventCounts,[funnel7],topQueries,trafficSources,devices,topJobsViews,topJobsApplies]=await Promise.all([
    sql.query("SELECT count(*)::int AS count FROM public.jobs WHERE status='active'",[]),
    sql.query("SELECT count(*)::int AS count FROM public.companies",[]),
    sql.query("SELECT count(*)::int AS count FROM public.sources WHERE enabled=true",[]),
    sql.query("SELECT * FROM public.ingest_runs ORDER BY started_at DESC LIMIT 10",[]),
    sql.query("SELECT * FROM public.sources ORDER BY last_success_at DESC NULLS LAST LIMIT 50",[]),
    sql.query("SELECT id,title,company_name,slug,source_name,published_at,status,ai_summary FROM public.jobs ORDER BY published_at DESC NULLS LAST LIMIT 25",[]),
    sql.query("SELECT count(*)::int AS count FROM public.jobs WHERE ai_summary IS NOT NULL",[]),
    sql.query("SELECT count(*)::int AS count FROM public.analytics_events WHERE created_at >= now()-interval '24 hours'",[]),
    sql.query("SELECT count(*)::int AS count FROM public.analytics_events WHERE created_at >= now()-interval '7 days'",[]),
    sql.query("SELECT count(DISTINCT NULLIF(metadata->>'session_id',''))::int AS count FROM public.analytics_events WHERE created_at >= now()-interval '7 days'",[]),
    sql.query("SELECT path,count(*)::int AS count FROM public.analytics_events WHERE event_name='page_view' AND created_at >= now()-interval '7 days' GROUP BY path ORDER BY count DESC,path LIMIT 10",[]),
    sql.query("SELECT event_name,count(*)::int AS count FROM public.analytics_events WHERE created_at >= now()-interval '7 days' GROUP BY event_name ORDER BY count DESC,event_name",[]),
    sql.query("SELECT count(*) FILTER (WHERE event_name='job_view')::int AS job_views,count(*) FILTER (WHERE event_name='apply_click')::int AS apply_clicks,count(*) FILTER (WHERE event_name='search')::int AS searches,count(*) FILTER (WHERE event_name='resume_upload')::int AS resume_uploads,count(*) FILTER (WHERE event_name='resume_match_view')::int AS resume_matches,count(*) FILTER (WHERE event_name='save_job')::int AS saves,count(*) FILTER (WHERE event_name='auth_start')::int AS auth_starts,count(*) FILTER (WHERE event_name='auth_success')::int AS auth_success,count(*) FILTER (WHERE event_name='application_marked')::int AS applications FROM public.analytics_events WHERE created_at >= now()-interval '7 days'",[]),
    sql.query("SELECT NULLIF(trim(metadata->>'query'),'') AS query,count(*)::int AS count FROM public.analytics_events WHERE event_name='search' AND created_at >= now()-interval '7 days' AND NULLIF(trim(metadata->>'query'),'') IS NOT NULL GROUP BY query ORDER BY count DESC,query LIMIT 12",[]),
    sql.query("SELECT coalesce(NULLIF(metadata->>'utm_source',''),NULLIF(metadata->>'referrer_domain',''),'direct') AS source,count(*)::int AS count FROM public.analytics_events WHERE event_name='page_view' AND created_at >= now()-interval '7 days' GROUP BY source ORDER BY count DESC,source LIMIT 12",[]),
    sql.query("SELECT coalesce(NULLIF(metadata->>'device_type',''),'unknown') AS device,count(*)::int AS count FROM public.analytics_events WHERE event_name='page_view' AND created_at >= now()-interval '7 days' GROUP BY device ORDER BY count DESC,device",[]),
    sql.query("SELECT e.job_id,j.title,j.company_name,count(*)::int AS count FROM public.analytics_events e JOIN public.jobs j ON j.id=e.job_id WHERE e.event_name='job_view' AND e.created_at >= now()-interval '7 days' GROUP BY e.job_id,j.title,j.company_name ORDER BY count DESC LIMIT 10",[]),
    sql.query("SELECT e.job_id,j.title,j.company_name,count(*)::int AS count FROM public.analytics_events e JOIN public.jobs j ON j.id=e.job_id WHERE e.event_name='apply_click' AND e.created_at >= now()-interval '7 days' GROUP BY e.job_id,j.title,j.company_name ORDER BY count DESC LIMIT 10",[])
  ]);
  const ga=process.env.NEXT_PUBLIC_GA_ID||"",ads=process.env.NEXT_PUBLIC_ADSENSE_ID||"";
  return NextResponse.json({jobs:jobs?.count||0,companies:companies?.count||0,sources:sources?.count||0,runs,sourceRows,recentJobs,aiJobs:aiJobs?.count||0,aiConfigured:Boolean(process.env.HF_TOKEN||process.env.OPENAI_API_KEY),embeddingConfigured:Boolean(process.env.OPENAI_API_KEY),analyticsConfigured:Boolean(ga),analyticsValid:/^G-[A-Z0-9]+$/i.test(ga),adsenseConfigured:Boolean(ads),adsenseValid:/^ca-pub-[0-9]+$/i.test(ads),analytics24:analytics24?.count||0,analytics7:analytics7?.count||0,sessions7:sessions7?.count||0,topPages,eventCounts,
    analytics:{
      jobViews7:Number(funnel7?.job_views||0),
      applyClicks7:Number(funnel7?.apply_clicks||0),
      searches7:Number(funnel7?.searches||0),
      resumeUploads7:Number(funnel7?.resume_uploads||0),
      resumeMatches7:Number(funnel7?.resume_matches||0),
      saves7:Number(funnel7?.saves||0),
      authStarts7:Number(funnel7?.auth_starts||0),
      authSuccess7:Number(funnel7?.auth_success||0),
      applications7:Number(funnel7?.applications||0),
      jobToApplyRate:funnel7?.job_views?Number(((Number(funnel7.apply_clicks||0)/Number(funnel7.job_views||1))*100).toFixed(1)):0,
      topQueries,trafficSources,devices,topJobsViews,topJobsApplies
    }
  },{headers:{"Cache-Control":"private, no-store, max-age=0"}});
}