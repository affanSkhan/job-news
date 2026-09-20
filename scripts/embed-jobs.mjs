import {neon} from "@neondatabase/serverless";
import {pipeline} from "@huggingface/transformers";

const db=process.env.DATABASE_URL?neon(process.env.DATABASE_URL):null;
if(!db){console.log("Semantic embedding worker skipped: DATABASE_URL missing.");process.exit(0)}
const model=process.env.LOCAL_EMBEDDING_MODEL||"Xenova/all-MiniLM-L6-v2";
const batchSize=Math.max(50,Number(process.env.EMBED_BATCH||300));
const dim=1536;
const extractor=await pipeline("feature-extraction",model);
const rows=await db.query("SELECT id,title,company_name,description,skills,category,location,work_mode,experience FROM public.jobs WHERE embedding IS NULL AND status='active' ORDER BY published_at DESC NULLS LAST LIMIT $1",[batchSize]);
let embedded=0;
for(let start=0;start<rows.length;start+=80){
  const batch=rows.slice(start,start+80);
  const inputs=batch.map(j=>[j.title,j.company_name,j.category,j.location,j.work_mode,j.experience,(j.skills||[]).join(", "),String(j.description||"").slice(0,3500)].filter(Boolean).join("\n"));
  try{
    const output=await extractor(inputs,{pooling:"mean",normalize:true});
    const vectors=output.tolist();
    const updates=[];
    for(let i=0;i<batch.length;i++){
      const vector=Array.from(vectors[i]||[],Number).slice(0,dim);
      while(vector.length<dim)vector.push(0);
      updates.push({id:batch[i].id,embedding:"["+vector.join(",")+"]"});
      embedded++;
    }
    await db.query("UPDATE public.jobs AS j SET embedding=x.embedding::vector,updated_at=now() FROM jsonb_to_recordset($1::jsonb) AS x(id text,embedding text) WHERE j.id=x.id",[JSON.stringify(updates)]);
  }catch(e){console.error("embedding batch failed",e?.message||String(e))}
}
console.log("Embedded",embedded,"of",rows.length,"jobs using",model);
