import {getDb} from "./db";

type Value=string|number|boolean|null|undefined;
type EventInput={eventName:string;path?:string;jobId?:string;metadata?:Record<string,Value>};

function clean(input:Record<string,Value>={}){
  return Object.fromEntries(Object.entries(input).slice(0,40).map(([k,v])=>[
    String(k).slice(0,80),
    typeof v==="string"?v.slice(0,500):typeof v==="number"||typeof v==="boolean"?v:null
  ]));
}

export async function recordAnalyticsEvents(events:EventInput[],userId?:string|null){
  const sql=getDb();
  if(!sql||!events.length)return false;
  const rows=events.map(e=>[
    userId||null,
    e.eventName,
    String(e.path||"").slice(0,500),
    e.jobId?String(e.jobId).slice(0,200):null,
    JSON.stringify(clean(e.metadata||{}))
  ]);
  const params:any[]=[];
  const groups=rows.map(row=>{
    const p=row.map(value=>{params.push(value);return "$"+params.length});
    return "("+p.join(",")+")";
  });
  try{
    await sql.query(
      "INSERT INTO public.analytics_events(user_id,event_name,path,job_id,metadata) VALUES "+groups.join(","),
      params
    );
    return true;
  }catch(error){
    if(!(error instanceof Error)||!/foreign key|violates.*constraint/i.test(error.message))return false;
    const retryRows=rows.map(row=>[row[0],row[1],row[2],null,row[4]]);
    const retryParams:any[]=[];
    const retryGroups=retryRows.map(row=>{
      const p=row.map(value=>{retryParams.push(value);return "$"+retryParams.length});
      return "("+p.join(",")+")";
    });
    try{
      await sql.query(
        "INSERT INTO public.analytics_events(user_id,event_name,path,job_id,metadata) VALUES "+retryGroups.join(","),
        retryParams
      );
      return true;
    }catch{return false}
  }
}
