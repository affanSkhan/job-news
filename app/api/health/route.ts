import {NextResponse} from "next/server";

export async function GET(req:Request){
  const params=new URL(req.url).searchParams;
  const wantsDb=params.get("check")==="db"||process.env.ROLEPILOT_HEALTH_DB==="1";
  const databaseConfigured=Boolean(process.env.DATABASE_URL);
  let databaseReachable:null|boolean=null;
  let activeJobs=0;
  let enabledSources=0;
  let lastRun=null;
  let catalogAvailable=false;
  let catalogError:string|null=null;

  try{
    const metaUrl=new URL(process.env.ROLEPILOT_PUBLIC_CACHE_META_URL||"https://raw.githubusercontent.com/affanSkhan/job-news/rolepilot-runtime-cache/data/public-jobs-meta.json");
    metaUrl.searchParams.set("probe",String(Math.floor(Date.now()/60000)));
    const response=await fetch(metaUrl.toString(),{cache:"no-store",headers:{"accept":"application/json","user-agent":"RolePilotHealth/1.1"}});
    if(!response.ok)throw new Error("Runtime catalog metadata fetch failed: "+response.status);
    const meta=await response.json();
    if(!Number.isFinite(Number(meta.count))||Number(meta.count)<100)throw new Error("Runtime catalog metadata is invalid.");
    activeJobs=Number(meta.count);
    lastRun={started_at:meta.generatedAt,status:"cache",jobs_upserted:meta.count};
    catalogAvailable=true;
  }catch(error){
    catalogError=error instanceof Error?error.message:String(error);
  }

  if(wantsDb){
    try{
      const {getDb}=await import("../../../lib/db");
      const sql=getDb();
      if(sql){
        await sql.query("SELECT 1");
        databaseReachable=true;
      }else databaseReachable=false;
    }catch{databaseReachable=false;}
  }

  if(!catalogAvailable&&!wantsDb){
    return NextResponse.json({ok:false,service:"rolepilot",activeJobs:0,databaseConfigured,databaseReachable,enabledSources:0,lastRun:null,catalogAvailable:false,error:catalogError,time:new Date().toISOString(),databaseCheck:"deferred"},{status:503,headers:{"Cache-Control":"no-store, max-age=0, must-revalidate"}});
  }

  const result={ok:catalogAvailable||databaseReachable===true,service:"rolepilot",activeJobs,databaseConfigured,databaseReachable,enabledSources,lastRun,catalogAvailable:catalogAvailable||databaseReachable===true,time:new Date().toISOString(),databaseCheck:wantsDb?"requested":"deferred",...(catalogError?{catalogError}: {})};
  return NextResponse.json(result,{status:result.ok?200:503,headers:{"Cache-Control":"no-store, max-age=0, must-revalidate"}});
}
