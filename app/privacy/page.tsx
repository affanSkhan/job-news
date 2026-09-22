export default function Privacy(){
  return <main className="container section">
    <div className="card">
      <div className="eyebrow">Privacy</div>
      <h1>Privacy Policy</h1>
      <p>RolePilot uses account data, saved jobs, alerts and optional resume-derived information to provide personalized job matching.</p>
      <h2>Analytics</h2>
      <p>RolePilot records product events such as page views, job views, searches, application-link clicks, resume matching, saved jobs and authentication events. Anonymous analytics may include a short-lived session identifier, landing page, referring domain, campaign parameters, device class, viewport size and browser language. These signals are used to understand traffic, improve discovery and measure which jobs and features are useful.</p>
      <p>When a Google Analytics measurement ID is configured in production, the same product events may also be sent to Google Analytics. RolePilot does not intentionally send resume text, passwords or other sensitive form contents to analytics systems.</p>
      <h2>Resume information</h2>
      <p>When you upload a resume, RolePilot extracts text, skills, role signals and a structured candidate profile. The original uploaded file is not stored by the current application. Extracted resume text and profile fields are stored in the application database so Radar can match you to jobs.</p>
      <h2>Your control</h2>
      <p>You can delete the stored resume profile from Your Radar. Deleting it removes the stored resume text, filename, parsed skills, parsed roles, parsed profile and candidate embedding. Your saved jobs, applications and other account data remain unless separately removed.</p>
      <h2>Third parties and applications</h2>
      <p>RolePilot links to employer and third-party application pages. Opening an external application is governed by that site's own privacy practices. Analytics and advertising technologies may be enabled in production.</p>
      <h2>Data minimization</h2>
      <p>Do not upload sensitive information that is not needed for job matching. RolePilot should not be used to infer or store sensitive personal attributes for employment decisions.</p>
    </div>
  </main>
}
