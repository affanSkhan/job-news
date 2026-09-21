import {NextResponse} from "next/server";
import {getDb} from "../../../lib/db";

function smokePdf(){
  const objects=[
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
    "5 0 obj << /Length 221 >> stream\nBT /F1 12 Tf 72 720 Td (RolePilot Resume Parser Smoke Test) Tj 0 -24 Td (Python TypeScript React FastAPI PostgreSQL Machine Learning) Tj 0 -24 Td (Software Engineer Intern runtime validation text for the PDF parser.) Tj ET\nendstream endobj\n"
  ];
  const header="%PDF-1.4\n";
  let body=header;
  const offsets=[0];
  for(const object of objects){offsets.push(Buffer.byteLength(body,"binary"));body+=object}
  const xrefOffset=Buffer.byteLength(body,"binary");
  body+="xref\n0 "+(objects.length+1)+"\n0000000000 65535 f \n";
  for(let i=1;i<=objects.length;i++)body+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";
  body+="trailer << /Size "+(objects.length+1)+" /Root 1 0 R >>\nstartxref\n"+xrefOffset+"\n%%EOF\n";
  return Buffer.from(body,"binary");
}

export async function GET(req:Request){
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
    }catch{}
  }

  const result:any={ok:true,service:"job-news",activeJobs,databaseConfigured:Boolean(sql),databaseReachable,enabledSources,lastRun,time:new Date().toISOString()};
  if(new URL(req.url).searchParams.get("check")==="resume"){
    try{
      const {parseResume}=await import("../../../lib/resume-parser");
      const parsed=await parseResume(smokePdf(),"application/pdf");
      result.resumeParser={ok:true,textLength:parsed.text.length,skills:parsed.skills,roles:parsed.roles};
    }catch(error){
      result.ok=false;
      result.resumeParser={ok:false,error:error instanceof Error?error.message:String(error)};
    }
  }
  return NextResponse.json(result,{status:result.ok?200:503});
}