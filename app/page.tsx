import Link from "next/link";
import Brand from "./components/brand";
import LiveInventory from "./components/live-inventory";
import ResumeUpload from "./components/resume-upload";

export const dynamic="force-static";
export const revalidate=3600;

export default function Home(){
  return <>
    <header className="nav">
      <div className="container navin">
        <Brand/>
        <nav className="links" aria-label="Primary navigation">
          <Link href="/jobs">Explore</Link>
          <Link href="/india">India</Link>
          <Link href="/internships">Internships</Link>
          <Link href="/remote-jobs">Remote</Link>
          <Link href="/companies">Companies</Link>
          <Link href="/skills">Skills</Link>
          <Link href="/locations">Locations</Link>
          <Link href="/account">Your Radar</Link>
        </nav>
        <a className="chip active nav-cta" href="#resume">Upload resume</a>
      </div>
    </header>

    <main>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow"><span className="pulse"><i/> Radar live</span></div>
            <h1>Find the right role. Before the crowd.</h1>
            <p className="hero-copy">RolePilot helps you find fresh jobs and internships, match roles to your skills, and apply through the original employer or ATS.</p>

            <form className="search" action="/jobs">
              <input className="input" name="q" placeholder="Search Python, AI, Flutter, internships…" aria-label="Search jobs and internships"/>
              <select className="select" name="mode" defaultValue="" aria-label="Work mode">
                <option value="">Any work mode</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>
              <button className="btn" type="submit">Search roles</button>
            </form>

            <div className="chips hero-chips" aria-label="Popular searches">
              <Link className="chip" href="/jobs?fresh=today">Fresh today</Link>
              <Link className="chip" href="/jobs?mode=remote">Remote</Link>
              <Link className="chip" href="/jobs?type=internship">Internships</Link>
              <Link className="chip" href="/jobs?india=1">India</Link>
            </div>

            <div className="trust-strip" aria-label="RolePilot highlights">
              <span><b>Fresh</b> scans every 30 min</span>
              <span><b>Direct</b> employer / ATS links</span>
              <span><b>Relevant</b> resume-aware matching</span>
            </div>
          </div>

          <aside className="radar-panel" aria-label="Live inventory">
            <div className="eyebrow">Live inventory</div>
            <div className="live-count"><LiveInventory/></div>
            <Link className="btn dark radar-action" href="/jobs">Explore opportunities →</Link>
          </aside>
        </div>
      </section>

      <section id="resume" className="section resume-section">
        <div className="container">
          <div className="section-intro">
            <div>
              <div className="eyebrow">Optional, but powerful</div>
              <h2>Upload your resume once.</h2>
              <p>RolePilot can use it to surface opportunities that fit your skills and experience.</p>
            </div>
          </div>
          <ResumeUpload/>
        </div>
      </section>

      <section className="section how-section">
        <div className="container">
          <div className="eyebrow">Simple by design</div>
          <div className="how-grid">
            <div><b>1</b><span>Search or upload your resume.</span></div>
            <div><b>2</b><span>Review relevant opportunities.</span></div>
            <div><b>3</b><span>Apply at the original source.</span></div>
          </div>
        </div>
      </section>
    </main>

    <footer className="footer">
      <div className="container">© 2026 RolePilot · <Link href="/privacy">Privacy</Link> · <Link href="/disclaimer">Disclaimer</Link> · <Link href="/about">Methodology</Link></div>
    </footer>
  </>
}
