import {NextResponse} from "next/server";
import {requireAdmin} from "../../../../lib/admin";
import {getDb} from "../../../../lib/db";
export async function GET(){
  const {user}=await requireAdmin();
  if(!user)return NextResponse.json({error:"forbidden"},{status:403});
  const sql=getDb();
  if(!sql)return NextResponse.json({error:"database not configured"},{status:503});
  const [[jobs],[companies],[sources],runs,sourceRows,recentJobs,[aiJobs],[analytics24],[analytics7],[sessions7],topPages,eventCounts]=await Promise.all([
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
    sql.query("SELECT event_name,count(*)::int AS count FROM public.analytics_events WHERE created_at >= now()-interval '7 days' GROUP BY event_name ORDER BY count DESC,event_name",[])
  ]);
  const ga=process.env.NEXT_PUBLIC_GA_ID||"",ads=process.env.NEXT_PUBLIC_ADSENSE_ID||"";
  return NextResponse.json({jobs:jobs?.count||0,companies:companies?.count||0,sources:sources?.count||0,runs,sourceRows,recentJobs,aiJobs:aiJobs?.count||0,aiConfigured:Boolean(process.env.HF_TOKEN||process.env.OPENAI_API_KEY),embeddingConfigured:Boolean(process.env.OPENAI_API_KEY),analyticsConfigured:Boolean(ga),analyticsValid:/^G-[A-Z0-9]+$/i.test(ga),adsenseConfigured:Boolean(ads),adsenseValid:/^ca-pub-[0-9]+$/i.test(ads),analytics24:analytics24?.count||0,analytics7:analytics7?.count||0,sessions7:sessions7?.count||0,topPages,eventCounts});
}