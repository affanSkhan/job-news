import type {Job} from "./jobs";
import {isDirectApplication} from "./application";

export type CandidateLevel = "student" | "entry" | "mid" | "senior" | "unknown";
export type JobSeniority = "intern" | "entry" | "mid" | "senior" | "staff" | "unknown";

export type CandidateProfile = {
  text?: string;
  skills: string[];
  roles: string[];
  roleFamilies: string[];
  level: CandidateLevel;
  yearsExperience: number | null;
  locations: string[];
  preferredWorkModes?: string[];
  graduationYear?: number | null;
};

export type JobMatch = {
  score: number;
  eligible: boolean;
  seniority: JobSeniority;
  roleFit: number;
  skillFit: number;
  seniorityFit: number;
  locationFit: number;
  typeFit: number;
  freshnessFit: number;
  directFit: number;
  matchedSkills: string[];
  missingSkills: string[];
  matchedFamilies: string[];
  reasons: string[];
};

const ROLE_FAMILIES: Record<string, string[]> = {
  software: ["software engineer", "software developer", "software development", "graduate software engineer", "graduate engineer trainee", "junior software developer", "application developer", "product engineer"],
  backend: ["backend", "back end", "server side", "api developer", "python developer", "node.js developer", "node developer", "fastapi developer", "java developer"],
  frontend: ["frontend", "front end", "web developer", "react developer", "ui engineer", "javascript developer", "typescript developer"],
  fullstack: ["full stack", "fullstack", "full-stack"],
  mobile: ["mobile developer", "mobile engineer", "android developer", "android engineer", "flutter developer", "flutter engineer", "ios developer", "ios engineer", "react native developer"],
  ai_ml: ["ai engineer", "artificial intelligence", "machine learning engineer", "ml engineer", "ml developer", "ai developer", "generative ai", "llm engineer", "applied ai", "applied research"],
  data: ["data engineer", "data scientist", "data analyst", "analytics engineer", "machine learning", "bi developer", "business intelligence"],
  devops_cloud: ["devops", "cloud engineer", "platform engineer", "site reliability", "sre", "infrastructure engineer", "cloud"],
  security: ["security engineer", "cybersecurity", "application security", "security analyst", "infosec"],
  qa: ["qa engineer", "quality engineer", "test engineer", "software tester", "automation tester"],
  product: ["product engineer", "product manager", "technical product"],
};

const SKILL_ALIASES: Record<string, string> = {
  "nextjs": "next.js",
  "next.js": "next.js",
  "nodejs": "node.js",
  "node.js": "node.js",
  "reactjs": "react",
  "react.js": "react",
  "postgres": "postgresql",
  "postgre sql": "postgresql",
  "ts": "typescript",
  "js": "javascript",
  "gcp": "gcp",
  "google cloud": "gcp",
  "aws": "aws",
  "azure": "azure",
  "github actions": "github actions",
  "ci cd": "ci/cd",
  "ci/cd": "ci/cd",
  "machine-learning": "machine learning",
  "ml": "machine learning",
  "artificial intelligence": "ai",
  "ai/ml": "ai",
  "llms": "llm",
  "large language models": "llm",
  "rag": "rag",
  "retrieval augmented generation": "rag",
};

const KNOWN_SKILLS = new Set([
  "python","java","javascript","typescript","c++","c#","go","rust","kotlin","swift","dart","sql","react","next.js","vue","angular","svelte",
  "html","css","tailwind","node.js","express","fastapi","django","flask","spring","graphql","rest api","websockets","postgresql","mysql",
  "mongodb","redis","sqlite","firebase","supabase","neon","docker","kubernetes","terraform","aws","azure","gcp","linux","git","github",
  "gitlab","ci/cd","github actions","vercel","netlify","render","railway","machine learning","deep learning","tensorflow","pytorch",
  "scikit-learn","pandas","numpy","nlp","natural language processing","computer vision","reinforcement learning","llm","langchain",
  "langgraph","rag","vector database","chromadb","faiss","openai","gemini","hugging face","transformers","crewai","agentic ai",
  "generative ai","flutter","android","android studio","react native","kafka","rabbitmq","celery","rest","oauth","jwt"
]);

const LOCATION_ALIASES: Record<string, string[]> = {
  pune: ["pune"],
  mumbai: ["mumbai", "bombay"],
  bengaluru: ["bengaluru", "bangalore"],
  hyderabad: ["hyderabad"],
  delhi: ["delhi", "new delhi", "gurgaon", "gurugram", "noida", "greater noida"],
  "delhi-ncr": ["delhi", "new delhi", "gurgaon", "gurugram", "noida", "greater noida"],
  chennai: ["chennai", "madras"],
  kolkata: ["kolkata", "calcutta"],
  ahmedabad: ["ahmedabad"],
  jaipur: ["jaipur"],
  kochi: ["kochi", "cochin"],
  indore: ["indore"],
  nagpur: ["nagpur"],
};

function norm(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[|/_,:+()[\]{}]/g, " ")
    .replace(/[.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeSkill(value: string): string {
  const n = norm(value);
  return SKILL_ALIASES[n] || n;
}

function contains(text: string, phrase: string): boolean {
  const a = " " + norm(text) + " ";
  const b = " " + norm(phrase) + " ";
  return a.includes(b);
}

export function inferRoleFamilies(values: string[]): string[] {
  const text = norm(values.join(" "));
  const found = new Set<string>();
  for (const [family, patterns] of Object.entries(ROLE_FAMILIES)) {
    if (patterns.some(pattern => contains(text, pattern))) found.add(family);
  }

  const skills = values.map(normalizeSkill);
  if (skills.some(x => ["react","next.js","html","css","tailwind","javascript","typescript"].includes(x))) {
    found.add("frontend");
  }
  if (skills.some(x => ["node.js","express","fastapi","django","flask","postgresql","sql"].includes(x))) {
    found.add("backend");
  }
  if (skills.some(x => ["rag","llm","langchain","crewai","machine learning","deep learning","tensorflow","pytorch","generative ai","agentic ai"].includes(x))) {
    found.add("ai_ml");
  }
  if (skills.some(x => ["docker","kubernetes","terraform","aws","azure","gcp","github actions","ci/cd"].includes(x))) {
    found.add("devops_cloud");
  }
  return [...found];
}

export function detectCandidateLevel(text: string, yearsExperience?: number | null): CandidateLevel {
  const t = norm(text);
  if (/final year|final-year|undergraduate|b\.?tech|student|graduat(?:e|ing)|college|university|internship|fresher|trainee/.test(t)) return "student";
  if (yearsExperience !== null && yearsExperience !== undefined) {
    if (yearsExperience >= 5) return "senior";
    if (yearsExperience >= 2) return "mid";
    return "entry";
  }
  return "unknown";
}

export function extractYearsExperience(text: string): number | null {
  const t = String(text || "").toLowerCase();
  const values: number[] = [];
  for (const m of t.matchAll(/(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:professional|industry|work)?\s*experience/g)) {
    const n = Number(m[1]);
    if (Number.isFinite(n)) values.push(n);
  }
  const range = t.match(/(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*years?/);
  if (range) {
    const high = Number(range[2]);
    if (Number.isFinite(high)) values.push(high);
  }
  return values.length ? Math.max(...values) : null;
}

export function extractResumeLocations(text: string): string[] {
  const t = norm(text);
  const found = Object.keys(LOCATION_ALIASES).filter(city => LOCATION_ALIASES[city].some(alias => contains(t, alias)));
  return found.slice(0, 8);
}

export function buildCandidateProfile(args: {
  text: string;
  skills: string[];
  roles: string[];
  graduationYear?: number | null;
}): CandidateProfile {
  const normalizedSkills = [...new Set(args.skills.map(normalizeSkill).filter(Boolean))];
  const roleFamilies = inferRoleFamilies([...args.roles, ...normalizedSkills]);
  const yearsExperience = extractYearsExperience(args.text);
  return {
    text: args.text,
    skills: normalizedSkills,
    roles: args.roles.map(norm).filter(Boolean),
    roleFamilies,
    level: detectCandidateLevel(args.text, yearsExperience),
    yearsExperience,
    locations: extractResumeLocations(args.text),
    graduationYear: args.graduationYear ?? null,
  };
}

export function detectJobSeniority(job: Pick<Job, "title"|"experience"|"type"|"description">): JobSeniority {
  const title = norm(job.title);
  const experience = norm(job.experience);
  const combined = title + " " + experience;

  if (job.type === "internship" || /\bintern\b|internship|student placement/.test(title)) return "intern";
  if (/staff|principal|director|vice president|vp\b|head of|engineering manager|software manager|people manager|architect/.test(title)) return "staff";
  if (/senior|sr\b|lead|tech lead|team lead/.test(title) || /5\s*\+|7\s*\+|8\s*\+|10\s*\+/.test(experience)) return "senior";
  if (/mid[- ]level|intermediate|3\s*[-–]\s*5|2\s*[-–]\s*5/.test(combined)) return "mid";
  if (/junior|jr\b|entry[- ]level|fresher|graduate|trainee|apprentice|new grad|0\s*[-–]\s*2|0\s*[-–]\s*1|1\s*[-–]\s*2/.test(combined)) return "entry";
  if (/\d+\s*\+?\s*years?|years? of experience/.test(experience)) {
    const n = Number((experience.match(/\d+/)||["0"])[0]);
    if (n >= 5) return "senior";
    if (n >= 2) return "mid";
    return "entry";
  }
  return "unknown";
}

function seniorityFit(candidate: CandidateProfile, seniority: JobSeniority): {fit:number;eligible:boolean} {
  if (candidate.level === "student" || candidate.level === "entry") {
    if (seniority === "staff" || seniority === "senior") return {fit:0,eligible:false};
    if (seniority === "intern" || seniority === "entry") return {fit:1,eligible:true};
    if (seniority === "mid") return {fit:.35,eligible:true};
    return {fit:.72,eligible:true};
  }
  if (candidate.level === "mid") {
    if (seniority === "staff") return {fit:.25,eligible:true};
    if (seniority === "senior") return {fit:.72,eligible:true};
    if (seniority === "mid" || seniority === "unknown") return {fit:1,eligible:true};
    return {fit:.75,eligible:true};
  }
  if (candidate.level === "senior") {
    if (seniority === "intern") return {fit:.1,eligible:false};
    if (seniority === "staff" || seniority === "senior" || seniority === "mid") return {fit:1,eligible:true};
    return {fit:.65,eligible:true};
  }
  return {fit: seniority === "staff" ? .25 : .75,eligible:true};
}

function roleFit(candidate: CandidateProfile, job: Job): {fit:number;matched:string[]} {
  const families = inferRoleFamilies([job.title, job.category, ...(job.tags || [])]);
  const matched = families.filter(f => candidate.roleFamilies.includes(f));
  if (matched.length) return {fit:Math.min(1,.55 + .15*matched.length),matched};
  const title = norm(job.title);
  const directRole = candidate.roles.some(role => title.includes(role) || role.includes(title));
  return {fit:directRole ? .5 : .1,matched:[]};
}

function skillFit(candidate: CandidateProfile, job: Job): {fit:number;matched:string[];missing:string[]} {
  const wanted = new Set(candidate.skills.map(normalizeSkill));
  const jobSkills = [...new Set((job.skills || []).map(normalizeSkill))];
  const matched = jobSkills.filter(skill => wanted.has(skill));
  const missing = jobSkills.filter(skill => !wanted.has(skill));
  if (!jobSkills.length) return {fit:.25,matched:[],missing:[]};
  const denominator = Math.max(3, Math.min(jobSkills.length, 10));
  return {fit:Math.min(1, matched.length / denominator),matched:matched.slice(0,8),missing:missing.slice(0,5)};
}

function locationFit(candidate: CandidateProfile, job: Job): number {
  const location = norm(job.location);
  if (!candidate.locations.length) return job.workMode === "remote" ? .9 : .6;
  if (candidate.locations.some(city => LOCATION_ALIASES[city]?.some(alias => location.includes(norm(alias))))) return 1;
  if (job.workMode === "remote") return .9;
  return .55;
}

function typeFit(candidate: CandidateProfile, job: Job): number {
  if (candidate.level !== "student") return job.type === "internship" ? .6 : 1;
  if (job.type === "internship" || job.type === "fellowship") return 1;
  if (detectJobSeniority(job) === "entry") return .95;
  if (job.type === "full-time") return .88;
  if (job.type === "contract") return .65;
  return .6;
}

function freshnessFit(job: Job): number {
  if (job.freshness === "today") return 1;
  if (job.freshness === "this-week") return .8;
  const published = Date.parse(job.publishedAt || job.updatedAt || "");
  if (!Number.isFinite(published)) return .35;
  const age = Math.max(0,(Date.now()-published)/86400000);
  return age <= 2 ? 1 : age <= 7 ? .8 : age <= 30 ? .5 : .25;
}


export function matchCandidateToJob(candidate: CandidateProfile, job: Job): JobMatch {
  const seniority = detectJobSeniority(job);
  const level = seniorityFit(candidate, seniority);
  const role = roleFit(candidate, job);
  const skills = skillFit(candidate, job);
  const location = locationFit(candidate, job);
  const type = typeFit(candidate, job);
  const freshness = freshnessFit(job);
  const direct = isDirectApplication(job.applyUrl, job.company) ? 1 : 0;

  const score = Math.max(0, Math.min(1,
    .28*skills.fit +
    .24*role.fit +
    .24*level.fit +
    .09*location +
    .07*type +
    .05*direct +
    .03*freshness
  ));

  const reasons: string[] = [];
  if (skills.matched.length) reasons.push(`Matches ${skills.matched.slice(0,4).join(", ")}.`);
  if (role.matched.length) reasons.push(`Role aligns with ${role.matched.join(", ")} work.`);
  if (seniority === "entry" || seniority === "intern") reasons.push("Role level is compatible with an entry-level candidate.");
  else if (seniority === "mid") reasons.push("Role appears to require some prior experience.");
  if (location === 1) reasons.push("Location matches the resume location.");
  else if (job.workMode === "remote") reasons.push("Remote work is compatible with the candidate profile.");
  if (direct) reasons.push("Application goes to the employer or its ATS.");
  if (skills.missing.length) reasons.push(`Potential gaps: ${skills.missing.slice(0,3).join(", ")}.`);

  return {
    score,
    eligible: level.eligible && skills.fit > 0,
    seniority,
    roleFit: role.fit,
    skillFit: skills.fit,
    seniorityFit: level.fit,
    locationFit: location,
    typeFit: type,
    freshnessFit: freshness,
    directFit: direct,
    matchedSkills: skills.matched,
    missingSkills: skills.missing,
    matchedFamilies: role.matched,
    reasons,
  };
}

export function rankJobsForCandidate(candidate: CandidateProfile, jobs: Job[], limit=24) {
  return jobs
    .map(job => ({job, match:matchCandidateToJob(candidate,job)}))
    .filter(item => item.match.eligible)
    .sort((a,b) =>
      b.match.score-a.match.score ||
      b.match.directFit-a.match.directFit ||
      Date.parse(b.job.publishedAt||"")-Date.parse(a.job.publishedAt||"")
    )
    .slice(0,limit);
}

export type SearchIntent = {
  raw: string;
  terms: string[];
  skills: string[];
  roleFamilies: string[];
  locations: string[];
  workMode: "remote"|"hybrid"|"onsite"|null;
  type: "internship"|"full-time"|"contract"|null;
  seniority: JobSeniority|null;
};

const STOP_WORDS = new Set(["a","an","the","and","or","for","in","on","at","to","with","of","from","jobs","job","roles","role","opportunities","opportunity","near","me"]);

export function parseSearchIntent(query: string): SearchIntent {
  const raw = String(query||"").trim();
  const n = norm(raw);
  const terms = n.split(/\s+/).filter(Boolean).filter(x => !STOP_WORDS.has(x));
  const locations = Object.keys(LOCATION_ALIASES).filter(city => LOCATION_ALIASES[city].some(alias => contains(n, alias)));
  let workMode: SearchIntent["workMode"] = null;
  if (/remote|work from home|wfh|work remotely/.test(n)) workMode = "remote";
  else if (/hybrid/.test(n)) workMode = "hybrid";
  else if (/on[- ]site|onsite|office/.test(n)) workMode = "onsite";

  let type: SearchIntent["type"] = null;
  if (/intern|internship/.test(n)) type = "internship";
  else if (/full[- ]time|permanent|graduate role/.test(n)) type = "full-time";
  else if (/contract|contractor/.test(n)) type = "contract";

  let seniority: SearchIntent["seniority"] = null;
  if (/staff|principal|lead|manager|director/.test(n)) seniority = "staff";
  else if (/senior|sr\b|experienced/.test(n)) seniority = "senior";
  else if (/mid[- ]level|intermediate|2\s*[-–]\s*5|3\s*[-–]\s*5/.test(n)) seniority = "mid";
  else if (/fresher|graduate|new grad|entry[- ]level|junior|jr\b|0\s*[-–]\s*2|0\s*[-–]\s*1/.test(n) || type === "internship") seniority = "entry";

  const mentionedSkills = [...KNOWN_SKILLS].filter(skill => contains(n, skill));
  const mentionedFamilies = inferRoleFamilies([n]);
  return {raw,terms,skills:mentionedSkills.map(normalizeSkill),roleFamilies:mentionedFamilies,locations,workMode,type,seniority};
}

function queryLocationMatch(intent: SearchIntent, job: Job): number {
  if (!intent.locations.length) return .6;
  const location = norm(job.location);
  const hit = intent.locations.some(city => LOCATION_ALIASES[city].some(alias => location.includes(norm(alias))));
  return hit ? 1 : 0;
}

function queryTypeMatch(intent: SearchIntent, job: Job): number {
  if (!intent.type) return .6;
  if (intent.type === "internship") return job.type === "internship" || job.type === "fellowship" ? 1 : 0;
  return job.type === intent.type ? 1 : job.type === "full-time" && intent.type === "full-time" ? 1 : 0;
}

function queryModeMatch(intent: SearchIntent, job: Job): number {
  if (!intent.workMode) return .6;
  return job.workMode === intent.workMode ? 1 : 0;
}

function querySeniorityMatch(intent: SearchIntent, job: Job): number {
  if (!intent.seniority) return .6;
  const actual = detectJobSeniority(job);
  if (intent.seniority === "entry") return actual==="entry"||actual==="intern" ? 1 : actual==="unknown" ? .55 : 0;
  if (intent.seniority === "staff") return actual==="staff" ? 1 : .15;
  return actual === intent.seniority ? 1 : actual === "unknown" ? .5 : .15;
}

export function scoreJobForSearch(intent: SearchIntent, job: Job): {score:number;eligible:boolean;reasons:string[]} {
  const text = norm([job.title,job.company,job.location,job.category,job.experience,job.type,job.workMode,(job.skills||[]).join(" "),job.description,job.aiSummary||""].join(" "));
  const title = norm(job.title);
  const phrase = norm(intent.raw);
  const termHits = intent.terms.filter(term => text.includes(term)).length / Math.max(1,intent.terms.length);
  const titleHits = intent.terms.filter(term => title.includes(term)).length / Math.max(1,intent.terms.length);
  const skills = intent.skills.filter(skill => (job.skills||[]).map(normalizeSkill).includes(normalizeSkill(skill)));
  const roleFamilies = inferRoleFamilies([job.title,job.category,...(job.tags||[])]);
  const familyHits = intent.roleFamilies.filter(f => roleFamilies.includes(f));
  const loc = queryLocationMatch(intent,job);
  const type = queryTypeMatch(intent,job);
  const mode = queryModeMatch(intent,job);
  const seniority = querySeniorityMatch(intent,job);
  const direct = isDirectApplication(job.applyUrl,job.company) ? 1 : 0;

  const eligible = loc > 0 && type > 0 && mode > 0 && seniority > 0;
  if (!eligible) return {score:0,eligible:false,reasons:[]};

  const score = Math.min(1,
    .27*titleHits +
    .18*termHits +
    .2*(skills.length?Math.min(1,skills.length/Math.max(2,intent.skills.length)):familyHits.length?Math.min(1,.55+.15*familyHits.length):0) +
    .12*(familyHits.length?Math.min(1,.55+.15*familyHits.length):0) +
    .08*loc +
    .06*type +
    .04*mode +
    .03*seniority +
    .02*direct +
    .1*(phrase && (title+" "+text).includes(phrase) ? 1 : 0)
  );

  const reasons:string[]=[];
  if (skills.length) reasons.push(`Skills: ${skills.slice(0,4).join(", ")}`);
  if (familyHits.length) reasons.push(`Area: ${familyHits.join(", ")}`);
  if (intent.locations.length) reasons.push(`Location: ${job.location}`);
  if (intent.type) reasons.push(`Type: ${job.type}`);
  if (intent.workMode) reasons.push(`Mode: ${job.workMode}`);
  return {score,reasons,eligible:true};
}

export function rankJobsForSearch(query: string, jobs: Job[], limit=100) {
  const intent = parseSearchIntent(query);
  return jobs
    .map(job => ({job, ...scoreJobForSearch(intent,job)}))
    .filter(x=>x.eligible && x.score>0 && isDirectApplication(x.job.applyUrl,x.job.company))
    .sort((a,b)=>b.score-a.score||Date.parse(b.job.publishedAt||"")-Date.parse(a.job.publishedAt||""))
    .slice(0,limit);
}
