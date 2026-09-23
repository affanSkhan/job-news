const PRODUCTION_SITE_URL="https://jobs.affan.tech";

function normalizeSiteUrl(value:string){
  try{
    const url=new URL(value.trim());
    if(url.protocol!=="https:"||url.hostname.toLowerCase()!=="jobs.affan.tech")return PRODUCTION_SITE_URL;
    return url.origin;
  }catch{return PRODUCTION_SITE_URL;}
}

// SEO must always point at the public RolePilot production host. Misconfigured
// deployment variables must not create canonical/sitemap URLs on affan.tech,
// localhost, a Render preview, or another deployment hostname.
export const SITE_URL=normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL||PRODUCTION_SITE_URL);
export const SITE_NAME="RolePilot";
