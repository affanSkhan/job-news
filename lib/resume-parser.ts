import {getData} from "pdf-parse/worker";
import {PDFParse} from "pdf-parse";
import mammoth from "mammoth";

// pdf-parse v2 uses a PDF.js worker. In Next.js server bundles, automatic
// worker discovery can resolve to a .next/server/chunks path that does not
// contain the worker. Configure the bundled worker only when a PDF is parsed,
 // so build-time route evaluation never tries to initialize PDF.js.
let pdfWorkerReady=false;
function ensurePdfWorker(){
  if(pdfWorkerReady)return;
  PDFParse.setWorker(getData());
  pdfWorkerReady=true;
}

const SKILLS=["python","java","javascript","typescript","c++","c#","go","rust","kotlin","swift","dart","sql","react","next.js","nextjs","vue","angular","svelte","html","css","tailwind","node.js","nodejs","express","fastapi","django","flask","spring","spring boot","graphql","rest api","websockets","postgresql","mysql","mongodb","redis","sqlite","firebase","supabase","neon","docker","kubernetes","terraform","aws","azure","gcp","linux","git","github","gitlab","ci/cd","github actions","vercel","netlify","render","railway","machine learning","deep learning","tensorflow","pytorch","scikit-learn","pandas","numpy","nlp","natural language processing","computer vision","reinforcement learning","llm","llms","langchain","langgraph","rag","retrieval augmented generation","vector database","chromadb","faiss","openai","gemini","hugging face","transformers","crewai","agentic ai","generative ai","flutter","android","android studio","firebase","react native","kafka","rabbitmq","celery","rest","oauth","jwt"];

const TITLES=["software engineer","software developer","full stack engineer","full stack developer","frontend engineer","frontend developer","backend engineer","backend developer","web developer","mobile developer","android developer","flutter developer","ai engineer","ml engineer","machine learning engineer","data scientist","data analyst","data engineer","devops engineer","cloud engineer","platform engineer","product engineer","python developer","java developer","react developer","intern","software engineering intern","ai intern","ml intern","data science intern","backend intern","full stack intern","frontend intern"];

function cleanText(value:string){return value.replace(/\u0000/g," ").replace(/\r/g," ").replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim().slice(0,50000)}

function containsTerm(text:string,term:string){
  const escaped=term.replace(/[.*+?^\[\]{}()|\\]/g,"\\$&");
  return new RegExp("(^|[^a-z0-9+#])"+escaped+"($|[^a-z0-9+#])","i").test(text);
}

export function extractSkills(text:string){return SKILLS.filter(skill=>containsTerm(text,skill)).slice(0,40)}
export function extractRoles(text:string){return TITLES.filter(title=>containsTerm(text,title)).slice(0,12)}

function inferProfile(text:string,skills:string[],roles:string[]){
  const lines=text.split(/\n+/).map(x=>x.trim()).filter(Boolean);
  const headline=roles[0]||lines.find(x=>x.length>=10&&x.length<=90&&!/[|@]/.test(x))||"";
  const summary=lines.slice(0,18).join(" ").slice(0,1200);
  return {headline,summary,skills,roles};
}

export async function parseResume(buffer:Buffer,mime:string){
  let text="";
  if(mime==="application/pdf"){
    ensurePdfWorker();
    const parser=new PDFParse({data:buffer});
    try{text=String((await parser.getText()).text||"")}finally{await parser.destroy()}
  }else if(mime==="application/vnd.openxmlformats-officedocument.wordprocessingml.document"){
    const result=await mammoth.extractRawText({buffer});
    text=String(result.value||"");
  }else if(mime==="text/plain"){
    text=buffer.toString("utf8");
  }else{
    throw new Error("Unsupported resume format. Upload a PDF, DOCX, or TXT file.");
  }
  text=cleanText(text);
  if(text.length<80)throw new Error("We could not extract enough text from this file. Try a text-based PDF or DOCX resume.");
  const skills=extractSkills(text),roles=extractRoles(text),profile=inferProfile(text,skills,roles);
  return {text,skills,roles,headline:profile.headline,summary:profile.summary};
}