import Link from "next/link";
import Brand from "./components/brand";
import LiveInventory from "./components/live-inventory";
import ResumeUpload from "./components/resume-upload";

export const dynamic="force-static";
export const revalidate=3600;

export default function Home(){
  return <>
    <header className="nav home-nav">
      <div className="container navin">
        <Brand/>
        <nav className="links home-links" aria-label="Primary navigation">
          <Link href="/jobs">Explore</Link>
          <Link href="/india">India</Link>
          <Link href="/internships">Internships</Link>
          <Link href="/remote-jobs">Remote</Link>
          <Link href="/account">Your Radar</Link>
        </nav>
        <a className="chip active nav-cta" href="#resume">Upload resume</a>
      </div>
    </header>

    <main>
      <section className="hero home-hero">
        <div className="home-hero-art" aria-hidden="true" />
        <div className="container home-hero-inner">
          <div className="home-copy">
            <div className="eyebrow"><span className="pulse"><i/> Radar live</span></div>
            <h1>Find the right role.<br className="desktop-break"/> Before the crowd.</h1>
            <p className="hero-copy">Fresh jobs. Better matches. Straight to the real application.</p>

            <form className="search home-search" action="/jobs">
              <input className="input" name="q" placeholder="Try “fresher software internship in Pune”" aria-label="Search jobs and internships"/>
              <button className="btn" type="submit">Find roles</button>
            </form>

            <div className="chips home-shortcuts" aria-label="Popular searches">
              <Link className="chip" href="/jobs?fresh=today">New today</Link>
              <Link className="chip" href="/jobs?mode=remote">Remote</Link>
              <Link className="chip" href="/jobs?type=internship">Internships</Link>
              <Link className="chip" href="/jobs?india=1&experience=fresher">🇮🇳 India freshers</Link>
            </div>
          </div>

          <aside className="radar-panel home-radar-panel" aria-label="Live opportunity count">
            <div className="eyebrow">Live radar</div>
            <LiveInventory/>
            <Link className="btn dark radar-action" href="/jobs">Explore all roles →</Link>
          </aside>
        </div>
      </section>

      <section id="resume" className="section resume-section">
        <div className="container resume-wrap">
          <div className="resume-heading">
            <div className="eyebrow">Want smarter matches?</div>
            <h2>Drop in your resume.</h2>
            <p>We’ll surface roles that fit your skills.</p>
          </div>
          <ResumeUpload/>
        </div>
      </section>

      <section className="home-mini">
        <div className="container home-mini-inner">
          <span><b>Fresh</b> every 30 min</span>
          <span><b>Direct</b> employer links</span>
          <span><b>No account</b> needed to browse</span>
        </div>
      </section>
    </main>

    <footer className="footer">
      <div className="container">© 2026 RolePilot · <Link href="/privacy">Privacy</Link> · <Link href="/disclaimer">Disclaimer</Link> · <Link href="/about">Methodology</Link></div>
    </footer>
  </>
}
