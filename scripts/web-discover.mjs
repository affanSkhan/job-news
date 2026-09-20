import fs from "node:fs/promises";
import crypto from "node:crypto";
const key=process.env.OPENAI_API_KEY;
const out="data/web-discovered-jobs.json";
const model=process.env.WEB_DISCOVERY_MODEL||"gpt-5.6";
if(!key){console.log("Web discovery skipped: OPENAI_API_KEY missing.");await fs.writeFile(out,"[]\n");process.exit(0)}
const queries=[
  "new software engineer intern India last 48 hours direct employer greenhouse ashby lever workday",
  "new AI ML data internships India remote Pune Bengaluru Hyderabad last 48 hours direct company careers",
  "new graduate backend frontend full stack software jobs India last 48 hours direct employer",
  "remote software engineering internships worldwide last 48 hours direct employer ATS",
  "less visible software engineering internships startups direct employer ATS last 48 hours"
];
function clean(v){return String(v||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()}
function slug(v){return String(v||"").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,90)}
function idFor(a,b,c){return crypto.createHash("sha1").update([a,b,c].map(function(x){return String(x||"").toLowerCase()}).join("|")).digest("hex").slice(0,14)}
function validCandidate(x){const u=String(x&&x.url||"");const t=clean(x&&x.title);const c=clean(x&&x.company);if(!/^https?:\/\//i.test(u)||t.length<4||c.length<2)return false;const s=u.toLowerCase();const bad=["linkedin.com","indeed.com","glassdoor.com","wellfound.com","ziprecruiter.com","monster.com","dice.com","jooble.org","talent.com"];return !bad.some(function(v){return s.includes(v)})}
function employerLike(url,company){try{const h=new URL(url).hostname.toLowerCase();const s=h+" "+String(company||"").toLowerCase();const good=["greenhouse.io","ashbyhq.com","lever.co","myworkdayjobs.com","workdayjobs.com","smartrecruiters.com","jobvite.com","icims.com","successfactors","taleo.net","careers.","jobs.","join.","workwithus"];if(good.some(function(v){return h.includes(v)}))return true;const tokens=slug(company).split("-").filter(function(v){return v.length>3});return tokens.some(function(v){return h.includes(v)})}catch{return false}}
async function check(url){try{const ac=new AbortController();const timer=setTimeout(function(){ac.abort()},12000);const r=await fetch(url,{redirect:"follow",headers:{"user-agent":"JobNewsRadar/2.3","accept":"text/html,application/xhtml+xml"},signal:ac.signal});clearTimeout(timer);const text=clean((await r.text()).slice(0,60000));return {ok:r.ok,finalUrl:r.url||url,text:text}}catch{return {ok:false,finalUrl:url,text:""}}}
function parseArray(text){let t=String(text||"").trim();if(t.startsWith("```"))t=t.replace(/^```[a-zA-Z]*\s*/,"").replace(/```\s*$/,"");const a=t.indexOf("[");const b=t.lastIndexOf("]");if(a<0||b<a)throw new Error("no JSON array");return JSON.parse(t.slice(a,b+1))}
const found=[];
for(const query of queries){
  const request={model:model,tools:[{type:"web_search",search_context_size:"low"}],input:["Find current open jobs. Prefer postings discovered within 48 hours.","Only return exact direct employer or employer ATS application URLs.","Exclude job aggregators and social job boards.","Do not invent or rewrite URLs.","Return JSON only: [{title,company,url,location,workMode,type,publishedAt,summary}].","QUERY: "+query].join("\n")};
  try{
    const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify(request)});
    if(!r.ok){console.error("web discovery HTTP",r.status);continue}
    const data=await r.json();
    let rows=[];try{rows=parseArray(data.output_text)}catch(e){console.error("web discovery JSON parse",e&&e.message||String(e));continue}
    for(const x of rows){
      if(!validCandidate(x))continue;
      const checked=await check(String(x.url));
      if(!checked.ok||!employerLike(checked.finalUrl,x.company))continue;
      const title=clean(x.title),company=clean(x.company),location=clean(x.location||"Location not specified");
      const id=idFor(title,company,location);
      found.push({id:id,fingerprint:id,slug:slug(title+"-"+company)+"-"+id,title:title,company:company,description:clean(x.summary||checked.text.slice(0,500))||"Discovered through live employer web search.",location:location,workMode:String(x.workMode||"unknown"),type:String(x.type||(/intern/i.test(title)?"internship":"full-time")),salary:"Not disclosed",skills:[],category:"Other",experience:"Not specified",publishedAt:x.publishedAt||new Date().toISOString(),updatedAt:new Date().toISOString(),sourceName:"AI Web Discovery",sourceKind:"ai_web_discovery",sourceUrl:checked.finalUrl,applyUrl:checked.finalUrl,verified:true,freshness:"today",tags:["ai-discovered"],raw:{query:query,url:checked.finalUrl}});
    }
  }catch(e){console.error("web discovery query failed",e&&e.message||String(e))}
}
const dedup=new Map(found.map(function(j){return [j.id,j]}));
await fs.writeFile(out,JSON.stringify(Array.from(dedup.values()).slice(0,40),null,2)+"\n");
console.log("AI web discovery found "+dedup.size+" validated employer/ATS opportunities.");