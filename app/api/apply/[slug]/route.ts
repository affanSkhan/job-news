import {NextResponse} from "next/server";
import {getCurrentUser} from "../../../../lib/current-user";
import {getJobAsync} from "../../../../lib/jobs";
import {recordAnalyticsEvents} from "../../../../lib/analytics-server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(req:Request,{params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const job=await getJobAsync(slug);
  if(!job?.applyUrl)return NextResponse.json({error:"Application link not found."},{status:404});
  const url=new URL(req.url);
  const placement=(url.searchParams.get("placement")||"unknown").slice(0,80);
  const position=Number(url.searchParams.get("position")||0)||0;
  const user=await getCurrentUser().catch(()=>null);
  void recordAnalyticsEvents([{
    eventName:"apply_click",
    path:url.pathname,
    jobId:job.id,
    metadata:{
      placement,
      result_position:position,
      company:job.company,
      location:job.location,
      work_mode:job.workMode,
      employment_type:job.type,
      referrer:req.headers.get("referer")||""
    }
  }],user?.id||null);
  return NextResponse.redirect(job.applyUrl,302);
}
