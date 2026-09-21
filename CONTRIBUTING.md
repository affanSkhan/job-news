# Contributing to RolePilot

Thanks for contributing to RolePilot.

## Before you start

Please read the root README and understand whether your change affects:

- Job ingestion
- Public job discovery
- Search/matching
- Resume parsing
- Authentication/account features
- SEO/indexability
- Scheduled GitHub Actions
- Production deployment

## Development

Requirements:

- Node.js >=20.9.0 and <21
- npm

Setup:

1. Fork or clone the repository.
2. Install dependencies with npm install.
3. Copy .env.example to .env.local.
4. Add only the credentials needed for your local workflow.
5. Run npm run dev.

## Making changes

Prefer focused changes that solve one problem well.

For ingestion and AI changes:

- Preserve source URLs.
- Do not invent employer, salary, location or eligibility facts.
- Keep deduplication deterministic.
- Prefer graceful fallbacks over hard failures where practical.
- Avoid introducing scraper behavior that violates a source's terms or access controls.

For UI and SEO changes:

- Preserve semantic HTML and accessible labels.
- Keep canonical URLs stable.
- Do not create thin doorway pages solely for keyword targeting.
- Keep structured data consistent with visible page content.

## Validation

Before opening a pull request, run:

~~~bash
npm install
npm run build
~~~

Also exercise the specific workflow you changed when practical.

Examples:

~~~bash
npm run ingest
npm run web:discover
npm run ai:enrich
npm run jobs:embed
npm run alerts
~~~

These commands may require external credentials and production-like services.

## Pull requests

A useful PR description should contain:

- What changed
- Why it changed
- Which files/components are affected
- How it was tested
- Any new environment variables or migration requirements
- Any known limitations

Keep generated data changes intentional and explain them in the PR.

## Secrets and sensitive data

Never commit:

- API keys
- Database URLs
- Auth secrets
- Service-role keys
- Personal resumes
- Production exports
- Access tokens

Use environment variables or repository/deployment secrets.

## Commit messages

Use clear, action-oriented messages, for example:

- feat: add remote internship landing page
- fix: deduplicate ATS listings
- perf: optimize hero asset
- docs: improve contributor guide

## Scope and quality

Please avoid unrelated formatting churn. Small, reviewable changes are easier to validate and deploy safely.
