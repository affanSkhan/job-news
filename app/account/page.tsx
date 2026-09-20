import {redirect} from "next/navigation";
import Link from "next/link";
import {getCurrentUser,ensureProfile} from "../../lib/current-user";
import {getDb} from "../../lib/db";
import ProfileForm from "../components/profile-form";
import Matches from "../components/matches";
import AlertForm from "../components/alert-form";
import SignOut from "../components/sign-out";
import StatusSelect from "../components/status-select";
import ResumeUpload from "../components/resume-upload";

export const dynamic="force-dynamic";

export default async function Account(){
  const user=await getCurrentUser();
  if(!user)redirect("/auth?next=/account");

  const profile=await ensureProfile(user);
  const sql=getDb();
  let saved:any[]=[];let apps:any[]=[];let alerts:any[]=[];

  if(sql){
    [saved,apps,alerts]=await Promise.all([
      sql.query("SELECT sj.job_id,sj.notes,sj.created_at,j.title,j.company_name,j.slug,j.location FROM public.saved_jobs sj JOIN public.jobs j ON j.id=sj.job_id WHERE sj.user_id=$1 ORDER BY sj.created_at DESC LIMIT 30",[user.id]),
      sql.query("SELECT a.job_id,a.status,a.updated_at,j.title,j.company_name,j.slug FROM public.applications a JOIN public.jobs j ON j.id=a.job_id WHERE a.user_id=$1 ORDER BY a.updated_at DESC LIMIT 30",[user.id]),
      sql.query("SELECT id,name,frequency,active FROM public.job_alerts WHERE user_id=$1 ORDER BY created_at DESC",[user.id])
    ]);
  }

  const hasResume=Boolean(profile?.resume_uploaded_at||profile?.resume_text);

  return (
    <main>
      <header className="nav">
        <div className="container navin">
          <Link className="brand" href="/">Job<span>News</span></Link>
          <div className="links"><Link href="/jobs">Explore</Link><Link href="/india">🇮🇳 India</Link><Link href="/internships">Internships</Link><Link href="/remote-jobs">Remote</Link><SignOut/></div>
        </div>
      </header>
      <div className="container section">
        <div className="eyebrow">Personal opportunity radar</div>
        <h1>Your Radar</h1>
        <p>Fresh matches for {user.email}. The goal is not more jobs. It is fewer, better decisions.</p>
        <div style={{margin:"24px 0"}}><ResumeUpload hasResume={hasResume}/></div>
        <section className="card soft">
          <div className="eyebrow">Top signals</div><h2>Opportunities worth your attention</h2><Matches/>
        </section>
        <div className="grid" style={{marginTop:18}}>
          <section className="card"><div className="eyebrow">Profile controls</div><h2>Tell Radar what matters</h2><ProfileForm profile={profile}/></section>
          <section className="card"><div className="eyebrow">Notifications</div><h2>Stay ahead of fresh roles</h2><AlertForm/><h3>Active alerts</h3><p>{alerts.length>0?alerts.map((a:any)=>a.name+" · "+a.frequency).join(" | "):"No alerts yet."}</p></section>
        </div>
        <div className="grid" style={{marginTop:18}}>
          <section className="card"><div className="eyebrow">Saved</div><h2>Saved jobs</h2>{saved.length>0?<ul>{saved.map((x:any)=><li key={x.job_id}><Link href={"/jobs/"+x.slug}>{x.title}</Link> — {x.company_name}</li>)}</ul>:<p>No saved jobs yet.</p>}</section>
          <section className="card"><div className="eyebrow">Applications</div><h2>Application tracker</h2>{apps.length>0?<ul>{apps.map((x:any)=><li key={x.job_id}><Link href={"/jobs/"+x.slug}>{x.title}</Link> — {x.company_name} · <StatusSelect jobId={x.job_id} status={x.status}/></li>)}</ul>:<p>Track roles from a job page with one click.</p>}</section>
        </div>
      </div>
    </main>
  );
}