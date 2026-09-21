import fs from "node:fs/promises";
import crypto from "node:crypto";
const key=process.env.OPENAI_API_KEY;
const out="data/web-discovered-jobs.json";
const model=process.env.WEB_DISCOVERY_MODEL||"gpt-5.6";
if(!key){console.log("Web discovery skipped: OPENAI_API_KEY missing.");await fs.writeFile(out,"[]\n");process.exit(0)}
const queries=[
  "INDIA Pune software engineer jobs internships fresher 0-3 years last 48 hours direct employer careers ATS",
  "INDIA Pune AI ML data science jobs internships last 48 hours direct employer careers ATS",
  "INDIA Pune frontend backend full stack Node React Python Java jobs last 48 hours direct employer careers ATS",
  "INDIA Bengaluru Bangalore software engineer jobs internships fresher 0-3 years last 48 hours direct employer careers ATS",
  "INDIA Bengaluru Bangalore AI ML data engineering cloud cybersecurity jobs last 48 hours direct employer careers ATS",
  "INDIA Bengaluru Bangalore frontend backend full stack mobile Flutter Android jobs last 48 hours direct employer careers ATS",
  "INDIA Hyderabad software engineer jobs internships fresher 0-3 years last 48 hours direct employer careers ATS",
  "INDIA Hyderabad AI ML data cloud cybersecurity jobs last 48 hours direct employer careers ATS",
  "INDIA Hyderabad frontend backend full stack software jobs last 48 hours direct employer careers ATS",
  "INDIA Delhi NCR Gurgaon Gurugram Noida software engineer jobs internships fresher 0-3 years last 48 hours direct employer careers ATS",
  "INDIA Delhi NCR Gurgaon Gurugram Noida AI ML data engineering cloud cybersecurity jobs last 48 hours direct employer careers ATS",
  "INDIA Delhi NCR Gurgaon Gurugram Noida frontend backend full stack mobile jobs last 48 hours direct employer careers ATS",
  "INDIA Mumbai software engineer jobs internships fresher 0-3 years last 48 hours direct employer careers ATS",
  "INDIA Mumbai AI ML data engineering product technology jobs last 48 hours direct employer careers ATS",
  "INDIA Chennai software engineer jobs internships fresher 0-3 years last 48 hours direct employer careers ATS",
  "INDIA Ahmedabad software engineer jobs internships fresher 0-3 years last 48 hours direct employer careers ATS",
  "INDIA Kolkata software engineer jobs internships fresher 0-3 years last 48 hours direct employer careers ATS",
  "INDIA Jaipur software engineer jobs internships fresher 0-3 years last 48 hours direct employer careers ATS",
  "INDIA Kochi software engineer jobs internships fresher 0-3 years last 48 hours direct employer careers ATS",
  "INDIA Indore Nagpur software engineer jobs internships fresher 0-3 years last 48 hours direct employer careers ATS",
  "INDIA remote software engineer jobs internships India fresher graduate last 48 hours direct employer careers ATS",
  "INDIA remote AI ML data science internships jobs India last 48 hours direct employer careers ATS",
  "INDIA software engineering internships 2026 2027 students BTech BE direct employer ATS last 48 hours",
  "INDIA fresher graduate software developer jobs 0-1 years direct employer ATS last 48 hours",
  "INDIA new grad backend frontend full stack mobile jobs direct employer ATS last 48 hours",
  "INDIA startup software engineering jobs internships direct employer careers less visible last 48 hours",
  "INDIA data analyst data engineer business analyst jobs fresher direct employer ATS last 48 hours",
  "INDIA DevOps cloud platform SRE cybersecurity jobs fresher junior direct employer ATS last 48 hours",
  "INDIA product design UX UI technology jobs internships direct employer ATS last 48 hours",
  "GLOBAL remote software engineering internships worldwide last 48 hours direct employer ATS",
  "GLOBAL remote AI ML data internships worldwide last 48 hours direct employer ATS",
  "GLOBAL less visible software engineering startup jobs direct employer ATS last 48 hours",
  "GLOBAL new graduate software engineer jobs direct employer ATS last 48 hours",
  "INDIA official company careers PhonePe fresher graduate internship 0-2 years direct employer ATS last 48 hours",
  "INDIA official company careers Cialfo graduate intern entry level jobs direct employer ATS last 48 hours",
  "INDIA official company careers Berkadia India analyst graduate entry level jobs direct employer ATS last 48 hours",
  "INDIA official company careers Radical Technologies fresher software QA DevOps jobs direct employer last 48 hours",
  "INDIA official company careers Sandvik software engineer graduate early career jobs direct employer last 48 hours",
  "INDIA official company careers Miracle Software Systems graduates entry level IT jobs direct employer last 48 hours",
  "INDIA official company careers Vestval engineering AI software internships direct employer last 48 hours",
  "INDIA official company careers TCS fresher graduate software jobs 0-2 years direct employer last 48 hours",
  "INDIA official company careers Infosys fresher graduate software jobs 0-2 years direct employer last 48 hours",
  "INDIA official company careers Wipro fresher graduate software jobs 0-2 years direct employer last 48 hours",
  "INDIA official company careers HCLTech fresher graduate software jobs 0-2 years direct employer last 48 hours",
  "INDIA official company careers Cognizant fresher graduate technology jobs 0-2 years direct employer last 48 hours",
  "INDIA official company careers Capgemini fresher graduate technology jobs 0-2 years direct employer last 48 hours",
  "INDIA official company careers Persistent Systems fresher graduate software jobs 0-2 years direct employer last 48 hours",
  "INDIA official company careers Accenture India fresher graduate technology jobs 0-2 years direct employer last 48 hours",
  "INDIA official company careers Deloitte India fresher graduate technology analyst jobs 0-2 years direct employer last 48 hours",
  "INDIA official company careers SAP India graduate software jobs internships direct employer last 48 hours",
  "INDIA official company careers Oracle India graduate software jobs internships direct employer last 48 hours",
  "INDIA official company careers IBM India graduate software jobs internships direct employer last 48 hours",
  "INDIA official company careers Siemens India graduate engineering technology jobs direct employer last 48 hours",
  "INDIA official company careers Bosch India graduate software engineering jobs direct employer last 48 hours",
  "INDIA official company careers Schneider Electric India graduate software engineering jobs direct employer last 48 hours",
  "INDIA official company careers NTT DATA India fresher graduate technology jobs 0-2 years direct employer last 48 hours",
  "INDIA BTech BE BCA BSc MCA freshers software developer jobs official careers direct employer ATS last 48 hours",
  "INDIA graduate trainee software developer QA automation cloud DevOps official careers direct employer ATS last 48 hours",
  "INDIA entry level data analyst data engineer business analyst official careers 0-2 years direct employer ATS last 48 hours",
  "INDIA fresher customer success technical support implementation associate jobs official careers direct employer ATS last 48 hours",
  "INDIA fresher product design UX UI internships official careers direct employer ATS last 48 hours",
  "INDIA fresher cybersecurity SOC security analyst jobs official careers direct employer ATS last 48 hours",
  "INDIA fresher non-coding technology roles implementation support operations official careers direct employer ATS last 48 hours"
];
function clean(v){return String(v||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()}
function slug(v){return String(v||"").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,90)}
function idFor(a,b,c){return crypto.createHash("sha1").update([a,b,c].map(function(x){return String(x||"").toLowerCase()}).join("|")).digest("hex").slice(0,14)}
function validCandidate(x){const u=String(x&&x.url||"");const t=clean(x&&x.title);const c=clean(x&&x.company);if(!/^https?:\/\//i.test(u)||t.length<4||c.length<2)return false;const s=u.toLowerCase();const bad=["linkedin.com","indeed.com","glassdoor.com","wellfound.com","ziprecruiter.com","monster.com","dice.com","jooble.org","talent.com"];return !bad.some(function(v){return s.includes(v)})}
function employerLike(url,company){try{const h=new URL(url).hostname.toLowerCase();const s=h+" "+String(company||"").toLowerCase();const good=["greenhouse.io","ashbyhq.com","lever.co","myworkdayjobs.com","workdayjobs.com","smartrecruiters.com","jobvite.com","icims.com","successfactors","taleo.net","careers.","jobs.","join.","workwithus","gov.in","nic.in","recruitment."];if(good.some(function(v){return h.includes(v)}))return true;const tokens=slug(company).split("-").filter(function(v){return v.length>3});return tokens.some(function(v){return h.includes(v)})}catch{return false}}
async function check(url){try{const ac=new AbortController();const timer=setTimeout(function(){ac.abort()},12000);const r=await fetch(url,{redirect:"follow",headers:{"user-agent":"RolePilotRadar/2.3","accept":"text/html,application/xhtml+xml"},signal:ac.signal});clearTimeout(timer);const text=clean((await r.text()).slice(0,60000));return {ok:r.ok,finalUrl:r.url||url,text:text}}catch{return {ok:false,finalUrl:url,text:""}}}
function outputText(data){if(data&&typeof data.output_text==="string")return data.output_text;const out=Array.isArray(data&&data.output)?data.output:[];const texts=[];for(const item of out){const content=Array.isArray(item&&item.content)?item.content:[];for(const part of content){if(part&&typeof part.text==="string")texts.push(part.text)}}return texts.join("\n")}
function parseArray(text){let t=String(text||"").trim();if(t.startsWith("```"))t=t.replace(/^```[a-zA-Z]*\s*/,"").replace(/```\s*$/,"");const a=t.indexOf("[");const b=t.lastIndexOf("]");if(a<0||b<a)throw new Error("no JSON array");return JSON.parse(t.slice(a,b+1))}
function inferExperience(title,summary){const titleS=String(title||"");const detail=String(summary||"");if(/not (for|open to).{0,30}(fresh|graduate|entry)/i.test(titleS+" "+detail))return"Not specified";if(/\bintern(?:ship)?\b|\bgraduate (?:engineer|software|developer|trainee)\b|\btrainee\b|\bapprentice\b|\bnew grad(?:uate)?\b|\bfresher\b|\bentry[- ]level\b|\bcampus hiring\b|\bearly career\b/i.test(titleS)||/\b0\s*(?:-|–|to)\s*2\s*(?:years?|yrs?)?\b|\b0\s*[-–]\s*1\s*(?:years?|yrs?)?\b|\bno prior experience\b|\bno experience required\b|\brecent graduates?\b|\bfreshers?\b/i.test(detail))return"fresher";if(/\b1\s*(?:-|–|to)\s*2\s*(?:years?|yrs?)?\b|\b1\s*[-–]\s*3\s*(?:years?|yrs?)?\b/i.test(detail))return"0-3";if(/\b2\s*(?:-|–|to)\s*4\s*(?:years?|yrs?)?\b|\b3\s*(?:-|–|to)\s*5\s*(?:years?|yrs?)?\b/i.test(detail))return"3-5";return"Not specified"}
const found=[];
for(const query of queries){
  const request={model:model,tools:[{type:"web_search",search_context_size:"medium"}],input:["Find current open jobs. Prefer postings discovered within 48 hours.","Only return exact direct employer or employer ATS application URLs.","Exclude job aggregators and social job boards.","Do not invent or rewrite URLs.","Return JSON only: [{title,company,url,location,workMode,type,publishedAt,summary}].","QUERY: "+query].join("\n")};
  try{
    const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify(request)});
    if(!r.ok){console.error("web discovery HTTP",r.status);continue}
    const data=await r.json();
    let rows=[];try{rows=parseArray(outputText(data))}catch(e){console.error("web discovery JSON parse",e&&e.message||String(e));continue}
    for(const x of rows){
      if(!validCandidate(x))continue;
      const checked=await check(String(x.url));
      if(!checked.ok||!employerLike(checked.finalUrl,x.company))continue;
      const title=clean(x.title),company=clean(x.company),location=clean(x.location||"Location not specified");
      const id=idFor(title,company,location);
      found.push({id:id,fingerprint:id,slug:slug(title+"-"+company)+"-"+id,title:title,company:company,description:clean(x.summary||checked.text.slice(0,500))||"Discovered through live employer web search.",location:location,workMode:String(x.workMode||"unknown"),type:String(x.type||(/intern/i.test(title)?"internship":"full-time")),salary:"Not disclosed",skills:[],category:"Other",experience:inferExperience(title,clean(x.summary||checked.text.slice(0,500))),publishedAt:x.publishedAt||new Date().toISOString(),updatedAt:new Date().toISOString(),sourceName:/^INDIA\s/i.test(query)?"AI Web Discovery · India":"AI Web Discovery",sourceKind:"ai_web_discovery",sourceUrl:checked.finalUrl,applyUrl:checked.finalUrl,verified:true,freshness:"today",tags:["ai-discovered"],raw:{query:query,url:checked.finalUrl}});
    }
  }catch(e){console.error("web discovery query failed",e&&e.message||String(e))}
}
const dedup=new Map(found.map(function(j){return [j.id,j]}));
const india=Array.from(dedup.values()).filter(function(j){return /india|bengaluru|bangalore|hyderabad|pune|mumbai|delhi|gurgaon|gurugram|noida|chennai|kolkata|ahmedabad|jaipur|kochi|indore|nagpur/i.test(String(j.location||""))});
const global=Array.from(dedup.values()).filter(function(j){return !india.includes(j)});
await fs.writeFile(out,JSON.stringify(india.slice(0,240).concat(global.slice(0,60)),null,2)+"\n");
console.log("AI web discovery found "+dedup.size+" validated employer/ATS opportunities.");