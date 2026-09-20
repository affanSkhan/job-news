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
    const native=Array.from(row as number[],Number);
    if(!native.length||DB_DIM%native.length!==0) throw new Error(`Local embedding dimension ${native.length} cannot map to DB dimension ${DB_DIM}`);
    const repeats=DB_DIM/native.length;
    const v:number[]=[];
    for(let i=0;i<repeats;i++)v.push(...native);
    return v;
  });
}
export async function embedTexts(inputs:string[]):Promise<number[][]>{
  if(!inputs.length)return[];
  return localEmbedMany(inputs);
}
export async function embedText(input:string):Promise<number[]|null>{
  if(!String(input||"").trim())return null;
  try{return(await embedTexts([input]))[0]||null}catch{return null}
}
