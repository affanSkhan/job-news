const DB_DIM=1536;
const LOCAL_MODEL=process.env.LOCAL_EMBEDDING_MODEL||"Xenova/all-MiniLM-L6-v2";
let extractorPromise:Promise<any>|null=null;

async function localEmbedMany(inputs:string[]):Promise<number[][]>{
  if(!extractorPromise){
    extractorPromise=(async()=>{
      const {pipeline}=await import("@huggingface/transformers");
      return pipeline("feature-extraction",LOCAL_MODEL);
    })();
  }
  const extractor:any=await extractorPromise;
  const output:any=await extractor(inputs.map(x=>String(x||"").slice(0,6000)),{pooling:"mean",normalize:true});
  const rows:any[]=output.tolist();
  return rows.map((row:any)=>{
    const v=Array.from(row as number[],Number).slice(0,DB_DIM);
    if(v.length!==DB_DIM) throw new Error(`Local embedding dimension ${v.length} does not match DB dimension ${DB_DIM}`);
    return v;
  });
}
async function openaiEmbedMany(inputs:string[]):Promise<number[][]|null>{
  const key=process.env.OPENAI_API_KEY;
  if(!key)return null;
  try{
    const r=await fetch("https://api.openai.com/v1/embeddings",{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_EMBEDDING_MODEL||"text-embedding-3-small",input:inputs.map(x=>x.slice(0,12000))})});
    if(!r.ok)return null;
    const j=await r.json();
    const items=[...(j.data||[])].sort((a:any,b:any)=>a.index-b.index);
    return items.map((x:any)=>Array.from(x.embedding||[],Number));
  }catch{return null}
}
export async function embedTexts(inputs:string[]):Promise<number[][]>{
  if(!inputs.length)return[];
  const remote=await openaiEmbedMany(inputs);
  if(remote&&remote.length===inputs.length)return remote;
  return localEmbedMany(inputs);
}
export async function embedText(input:string):Promise<number[]|null>{
  if(!String(input||"").trim())return null;
  try{return(await embedTexts([input]))[0]||null}catch{return null}
}
