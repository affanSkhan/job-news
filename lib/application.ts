const BLOCKED_HOSTS=[
  "remoteok.com","remotive.com","arbeitnow.com","jobicy.com","himalayas.app",
  "weworkremotely.com","linkedin.com","indeed.com","glassdoor.com","ziprecruiter.com",
  "monster.com","dice.com","wellfound.com","jooble.org","talent.com","simplyhired.com",
  "adzuna.com","flexjobs.com","remote.co"
];

const ATS_HOSTS=[
  "greenhouse.io","lever.co","ashbyhq.com","myworkdayjobs.com","workdayjobs.com",
  "smartrecruiters.com","jobvite.com","icims.com","successfactors.com","taleo.net",
  "breezy.hr","workable.com","recruitee.com","personio.com","teamtailor.com",
  "rippling.com","pinpointhq.com","eightfold.ai"
];

function hostOf(url:string){
  try{return new URL(url).hostname.toLowerCase().replace(/^www\./,"")}catch{return ""}
}

function companyTokens(company:string){
  return String(company||"").toLowerCase()
    .replace(/\b(inc|inc\.|llc|ltd|limited|corp|corporation|co|company|plc)\b/g," ")
    .replace(/[^a-z0-9]+/g," ")
    .trim().split(/\s+/).filter(x=>x.length>=4);
}

export function applicationDestination(url:string,company=""){
  const host=hostOf(url);
  if(!host)return "unknown";
  if(BLOCKED_HOSTS.some(x=>host===x||host.endsWith("."+x)))return "aggregator";
  if(ATS_HOSTS.some(x=>host===x||host.endsWith("."+x)))return "employer_ats";
  const first=host.split(".")[0]||"";
  if(["careers","career","jobs","join","workwithus","work-with-us","opportunities"].includes(first))return "employer_site";
  const tokens=companyTokens(company);
  if(tokens.some(token=>host===token+".com"||host.endsWith("."+token+".com")||host.includes(token)))return "employer_site";
  return "external";
}

export function isDirectApplication(url:string,company=""){
  const kind=applicationDestination(url,company);
  return kind==="employer_ats"||kind==="employer_site";
}
