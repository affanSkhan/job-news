export default function About(){
  return (
    <main className="container section">
      <div className="card" style={{maxWidth:860,margin:"0 auto"}}>
        <div className="eyebrow">RolePilot</div>
        <h1>A signal layer for the job market.</h1>
        <p>RolePilot continuously discovers public opportunities, validates employer or ATS application paths, removes duplicates and stale listings, then uses AI to make the remaining market easier to search and match.</p>
        <h2>How Radar works</h2>
        <p>Every scheduled discovery cycle combines supported public ATS/feed sources with live AI web search. Web-discovered links are admitted only after URL validation and employer/ATS checks. Source-linked opportunities remain connected to their original application page.</p>
        <h2>How matching works</h2>
        <p>A candidate can upload a PDF, DOCX or TXT resume. Radar extracts role and skill signals, combines them with profile preferences and semantic job representations, and ranks relevant opportunities. Match explanations show the signals that led to a result instead of presenting the score as a guarantee.</p>
        <h2>What Radar does not claim</h2>
        <p>A match is not a promise of interview or hiring success. Job availability, salary, requirements and application status can change on the employer side. Users should review the employer page before applying.</p>
        <h2>SEO and content principle</h2>
        <p>Public job pages prioritize source attribution, freshness, canonical URLs and useful original RolePilot context instead of mass-producing thin duplicate pages.</p>
      </div>
    </main>
  );
}