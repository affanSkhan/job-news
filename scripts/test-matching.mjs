import assert from "node:assert/strict";
import {
  buildCandidateProfile,
  detectJobSeniority,
  rankJobsForCandidate,
  rankJobsForSearch,
  parseSearchIntent,
} from "../lib/matching.ts";

const baseJob={
  id:"x",slug:"x",company:"Acme",description:"",salary:"Not disclosed",
  salaryMin:undefined,salaryMax:undefined,currency:undefined,
  sourceName:"test",sourceUrl:"https://acme.example/jobs",verified:true,freshness:"today",
  tags:[],aiHighlights:[],status:"active"
};

const makeJob=(overrides={})=>({
  ...baseJob,
  title:"Software Engineer",
  location:"Pune, India",
  workMode:"onsite",
  type:"full-time",
  skills:["Python","TypeScript","PostgreSQL","React"],
  category:"Software",
  experience:"0-2 years",
  publishedAt:new Date().toISOString(),
  updatedAt:new Date().toISOString(),
  applyUrl:"https://boards.greenhouse.io/acme/jobs/1",
  ...overrides
});

const resumeText=[
  "Final-year Computer Engineering student graduating in 2027.",
  "Pune, Maharashtra.",
  "Python JavaScript TypeScript SQL React Next.js Tailwind Node.js Express FastAPI PostgreSQL Docker GitHub Actions.",
  "Built an Enterprise Document Intelligence Agent using RAG and LLM workflows.",
  "Freelance Software Engineer 2026 - Present."
].join("\n");

const candidate=buildCandidateProfile({
  text:resumeText,
  skills:["Python","JavaScript","TypeScript","SQL","React","Next.js","Node.js","Express","FastAPI","PostgreSQL","Docker","GitHub Actions","RAG","LLM"],
  roles:["software engineer","software developer"]
});

assert.equal(candidate.level,"student","student/final-year resume must be classified as student");
assert(candidate.locations.includes("pune"),"Pune should be extracted as a candidate location");
assert(candidate.roleFamilies.includes("software"),"software family should be inferred");

const senior=makeJob({
  id:"senior",slug:"senior-software-engineer",title:"Senior Software Engineer",
  experience:"5+ years",skills:["Python","PostgreSQL","React"]
});
const seniorStaff=makeJob({
  id:"senior-staff",slug:"senior-staff-applied-research",title:"Senior/Staff Applied Research Software Engineer",
  experience:"5+ years",skills:["Python","RAG","LLM"]
});
const principal=makeJob({
  id:"principal",slug:"principal-software-engineer",title:"Principal Software Engineer",
  experience:"8+ years",skills:["Python","PostgreSQL"]
});
const junior=makeJob({
  id:"junior",slug:"junior-software-developer",title:"Junior Software Developer",
  experience:"0-1 years",skills:["Python","TypeScript","PostgreSQL","React"]
});
const intern=makeJob({
  id:"intern",slug:"software-engineering-intern",title:"Software Engineering Intern",
  type:"internship",experience:"Fresher",skills:["Python","TypeScript","React"],location:"Pune"
});
const remoteAi=makeJob({
  id:"ai",slug:"ai-engineer",title:"AI Engineer",
  workMode:"remote",location:"Remote - India",experience:"Entry level",
  skills:["Python","RAG","LLM","LangChain"]
});
const unrelated=makeJob({
  id:"designer",slug:"product-designer",title:"Product Designer",
  category:"Design",experience:"0-2 years",skills:["Figma","UX","UI"]
});

assert.equal(detectJobSeniority(senior),"senior");
assert.equal(detectJobSeniority(principal),"staff");
const ranked=rankJobsForCandidate(candidate,[senior,seniorStaff,principal,junior,intern,remoteAi,unrelated],10);
const ids=ranked.map(x=>x.job.id);
assert(!ids.includes("senior"),"senior jobs must be excluded for a student candidate");
assert(!ids.includes("senior-staff"),"senior/staff research roles must be excluded for a student candidate");
assert(!ids.includes("principal"),"principal jobs must be excluded for a student candidate");
assert(ids.includes("junior"),"junior software job should be eligible");
assert(ids.includes("intern"),"software internship should be eligible");
assert(ids.indexOf("intern") !== -1,"relevant internship should be retained");
assert(!ids.includes("designer"),"irrelevant zero-overlap roles should be excluded");

const q1=parseSearchIntent("fresher software internship in Pune");
assert.equal(q1.type,"internship");
assert.equal(q1.seniority,"entry");
assert(q1.locations.includes("pune"));

const search1=rankJobsForSearch("fresher software internship in Pune",[senior,principal,junior,intern,remoteAi],20);
const s1=search1.map(x=>x.job.id);
assert(s1.includes("intern"),"natural-language internship search must find the internship");
assert(!s1.includes("senior"),"fresher search must not return senior roles");
assert(!s1.includes("principal"),"fresher search must not return principal roles");

const search2=rankJobsForSearch("python developer Pune",[junior,makeJob({id:"mumbai",slug:"python-mumbai",title:"Python Developer",location:"Mumbai",skills:["Python","FastAPI"]})],20);
assert.equal(search2[0]?.job.id,"junior","Pune location should dominate a Python developer search");

const search3=rankJobsForSearch("remote AI engineer",[remoteAi,makeJob({id:"onsite-ai",slug:"onsite-ai",title:"AI Engineer",location:"Pune",skills:["Python","RAG"],workMode:"onsite"})],20);
assert.equal(search3[0]?.job.id,"ai","remote query must prioritize remote AI roles");

const search4=rankJobsForSearch("senior software engineer",[senior,junior,principal],20);
assert(search4.some(x=>x.job.id==="senior"),"explicit senior query must return senior roles");

console.log("matching regression suite passed");
console.log(JSON.stringify({
  candidate:{level:candidate.level,locations:candidate.locations,roleFamilies:candidate.roleFamilies},
  resumeRanking:ranked.map(x=>({id:x.job.id,score:Number(x.match.score.toFixed(3)),seniority:x.match.seniority})),
  search1:s1,
  search2:search2.map(x=>x.job.id),
  search3:search3.map(x=>x.job.id),
  search4:search4.map(x=>x.job.id)
},null,2));
