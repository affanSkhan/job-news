import {NextResponse} from "next/server";
import {getDb} from "../../../lib/db";

export async function GET(){
  const sql=getDb();
  let databaseReachable=false;
  let activeJobs=0;
  let enabledSources=0;
  let lastRun=null;

  if(sql){
    try{
      const rows=await sql.query(`SELECT
        (SELECT count(*)::int FROM public.jobs WHERE status='active') AS active_jobs,
        (SELECT count(*)::int FROM public.sources WHERE enabled=true) AS enabled_sources,
        (SELECT json_build_object(
          'started_at',r.started_at,
          'status',r.status,
          'jobs_upserted',r.jobs_upserted
        ) FROM public.ingest_runs r ORDER BY r.started_at DESC LIMIT 1) AS last_run`,[]);
      databaseReachable=true;
      activeJobs=Number(rows[0]?.active_jobs||0);
      enabledSources=Number(rows[0]?.enabled_sources||0);
      lastRun=rows[0]?.last_run||null;
    }catch{
      databaseReachable=false;
    }
  }

  return NextResponse.json({
    ok:true,
    service:"job-news",
    activeJobs,
    databaseConfigured:Boolean(sql),
    databaseReachable,
    enabledSources,
    lastRun,
    time:new Date().toISOString()
  });
}