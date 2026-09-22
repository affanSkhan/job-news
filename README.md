# RolePilot

**AI-powered job discovery for finding relevant opportunities before the crowd.**

[![Production](https://img.shields.io/badge/production-live-brightgreen)](https://jobs.affan.tech)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-00e599?logo=postgresql)](https://neon.tech/)
[![License](https://img.shields.io/badge/license-not%20declared-lightgrey)](#license)

<p align="center">
  <a href="https://jobs.affan.tech">
    <img src="https://raw.githubusercontent.com/affanSkhan/job-news/main/public/rolepilot-mark.png" alt="RolePilot" width="96">
  </a>
</p>

<p align="center">
  <strong>Fresh jobs. Direct application paths. AI-assisted discovery and matching.</strong><br>
  <a href="https://jobs.affan.tech">Live product</a> ·
  <a href="https://jobs.affan.tech/jobs">Explore jobs</a> ·
  <a href="https://jobs.affan.tech/internships">Internships</a> ·
  <a href="https://jobs.affan.tech/remote-jobs">Remote jobs</a>
</p>

![RolePilot hero](https://raw.githubusercontent.com/affanSkhan/job-news/main/public/rolepilot-hero.webp)

## What is RolePilot?

RolePilot is a job-discovery platform focused on **fresh, source-backed opportunities** rather than simply maximizing listing volume.

The product combines:

- AI-assisted web discovery for current employer/ATS opportunities
- Public ATS/feed ingestion and normalization
- Duplicate detection and source canonicalization
- Freshness and active-status handling
- AI-generated, source-grounded summaries
- Semantic job search and embedding-based matching
- Resume parsing for PDF, DOCX and TXT files
- Personalized candidate profiles and matching signals
- Saved jobs, application tracking and alerts
- Company, skill and location discovery pages
- SEO-ready canonical job pages with structured data
- A public job cache so discovery can remain available when database connectivity is unavailable

**Live:** <https://jobs.affan.tech>

## Core product surfaces

| Surface | Purpose |
| --- | --- |
| <code>/</code> | Product homepage and search entry point |
| <code>/jobs</code> | Main job discovery |
| <code>/jobs/[slug]</code> | Individual job details and application path |
| <code>/internships</code> | Internship discovery |
| <code>/remote-jobs</code> | Remote opportunity discovery |
| <code>/india</code> | India-focused job discovery |
| <code>/companies</code> | Company-level opportunity discovery |
| <code>/skills</code> | Skill-level opportunity discovery |
| <code>/locations</code> | Location-level opportunity discovery |
| <code>/account</code> | Candidate profile, saved jobs, applications and alerts |

## Why the pipeline is different

RolePilot is designed around a few engineering principles:

### Source first

Employer and ATS URLs remain visible. The system attempts to preserve the original application destination instead of hiding it behind an internal application wall.

### Freshness aware

Jobs are normalized with published/updated timestamps and freshness labels. Active discovery is filtered around recent opportunities while the public cache provides a resilient fallback.

### Deduplication

Listings are canonicalized around their application/source URLs where possible, with a content-based fallback identity when a stable URL is unavailable.

### Grounded AI

AI enrichment is instructed to summarize only supplied job facts. The enrichment pipeline validates output against source text and falls back to extractive/local processing when remote AI enrichment is unavailable.

### Graceful degradation

Public job discovery can fall back to <code>data/public-jobs.json</code> when the primary database is unavailable. Account-backed functionality still requires the corresponding database/auth services.

## System architecture

~~~text
                    ┌──────────────────────────┐
                    │  Employer / ATS sources  │
                    │ Greenhouse · Lever ·     │
                    │ Ashby · feeds · web      │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │      Ingestion layer     │
                    │ normalize · validate ·   │
                    │ canonicalize · dedupe    │
                    └────────────┬─────────────┘
                                 │
                 ┌───────────────┼───────────────┐
                 ▼               ▼               ▼
          ┌────────────┐  ┌────────────┐  ┌─────────────┐
          │ AI web     │  │ AI summary │  │ Embeddings  │
          │ discovery  │  │ enrichment │  │ / semantic  │
          │            │  │            │  │ search      │
          └─────┬──────┘  └─────┬──────┘  └──────┬──────┘
                └───────────────┬┴───────────────┘
                                ▼
                     ┌────────────────────┐
                     │ PostgreSQL / Neon  │
                     │ active job index   │
                     └──────────┬─────────┘
                                │
                 ┌──────────────┴──────────────┐
                 ▼                             ▼
        ┌─────────────────┐            ┌────────────────┐
        │ Next.js product │            │ Public JSON    │
        │ search/profile  │            │ fallback cache │
        └─────────────────┘            └────────────────┘
~~~

## Technology stack

### Application

- Next.js 16
- React 19
- TypeScript
- CSS-based responsive UI
- Lucide icons

### Data and search

- PostgreSQL / Neon
- <code>@neondatabase/serverless</code>
- Semantic embeddings
- PostgreSQL vector similarity where database search is available
- Full-text search fallback
- In-memory/public-cache fallback for anonymous discovery

### AI

- OpenAI-compatible chat/enrichment flow
- Hugging Face inference
- Local Hugging Face Transformers models for fallback enrichment/embeddings
- Source-grounded enrichment and validation

### Resume intelligence

Supported input formats:

- PDF
- DOCX
- TXT

The parser extracts candidate text, skills and role signals used by the matching workflow.

### Deployment and automation

- GitHub
- GitHub Actions
- Render
- Scheduled ingestion/intelligence pipeline
- Production keepalive and smoke checks

## Automation

The main intelligence workflow is scheduled every **30 minutes**.

A typical run:

1. Discover fresh employer/ATS opportunities from the live web.
2. Validate candidate application URLs.
3. Ingest configured ATS/feed sources.
4. Normalize job metadata.
5. Deduplicate listings.
6. Enrich new/weak listings with source-grounded summaries.
7. Refresh semantic embeddings.
8. Evaluate eligible alerts.
9. Publish the public job cache.

The AI discovery step is allowed to fail without stopping the rest of the ingestion pipeline.

## Repository structure

~~~text
.
├── app/
│   ├── api/                  # Application, search, profile, resume and admin APIs
│   ├── components/           # Shared UI components
│   ├── companies/            # Company discovery pages
│   ├── internships/          # Internship landing page
│   ├── jobs/                 # Job index, detail and taxonomy pages
│   ├── locations/            # Location discovery pages
│   ├── skills/               # Skill discovery pages
│   ├── remote-jobs/          # Remote jobs landing page
│   ├── india/                # India-focused discovery
│   ├── robots.ts             # robots.txt
│   └── sitemap.ts            # Dynamic XML sitemap
├── data/
│   ├── ats-sources.json      # ATS source configuration
│   ├── sources.json          # Feed/source configuration
│   └── public-jobs.json      # Public fallback job cache
├── db/
│   └── migrations/           # PostgreSQL schema migrations
├── lib/
│   ├── jobs.ts               # Job normalization/fallback data access
│   ├── search.ts             # Semantic/full-text/fallback search
│   ├── embeddings.ts         # Local embeddings
│   ├── resume-parser.ts      # Resume extraction
│   ├── auth/                 # Authentication helpers
│   └── site.ts               # Canonical production URL
├── scripts/
│   ├── ingest.mjs            # Feed/ATS ingestion
│   ├── web-discover.mjs      # AI-assisted employer web discovery
│   ├── ai-enrich.mjs         # Source-grounded enrichment
│   ├── embed-jobs.mjs        # Job embeddings
│   └── alerts.mjs            # Email alerts
└── public/
    └── rolepilot-hero.webp   # Optimized hero artwork
~~~

## Local development

### Requirements

- Node.js <code>&gt;=20.9.0 &lt;21</code>
- npm
- PostgreSQL/Neon credentials for database-backed features
- Optional AI/API credentials for enrichment and discovery

### Install

~~~bash
git clone https://github.com/affanSkhan/job-news.git
cd job-news
npm install
~~~

### Configure

Copy the example environment file:

~~~bash
cp .env.example .env.local
~~~

Then set only the credentials required for the functionality you want to run.

Never commit real secrets.

### Run locally

~~~bash
npm run dev
~~~

Open <http://localhost:3000>.

### Production build

~~~bash
npm run build
npm start
~~~

## Useful commands

| Command | Purpose |
| --- | --- |
| <code>npm run dev</code> | Start Next.js locally |
| <code>npm run build</code> | Production build |
| <code>npm start</code> | Start production server |
| <code>npm run ingest</code> | Ingest and normalize job sources |
| <code>npm run web:discover</code> | Run AI-assisted employer web discovery |
| <code>npm run ai:enrich</code> | Enrich new/weak job summaries |
| <code>npm run jobs:embed</code> | Refresh job embeddings |
| <code>npm run alerts</code> | Send eligible job alerts |

## Environment variables

| Variable | Required for | Notes |
| --- | --- | --- |
| <code>NEXT_PUBLIC_SITE_URL</code> | Production/SEO | Canonical public URL |
| <code>DATABASE_URL</code> | Database-backed features | Neon/PostgreSQL connection |
| <code>NEON_AUTH_BASE_URL</code> | Auth | Neon Auth |
| <code>NEON_AUTH_COOKIE_SECRET</code> | Auth | Session cookie signing |
| <code>ADMIN_EMAILS</code> | Admin | Comma-separated trusted emails |
| <code>OPENAI_API_KEY</code> | AI discovery/enrichment | Optional if alternative/local paths are available |
| <code>OPENAI_CHAT_MODEL</code> | AI enrichment | Chat model name |
| <code>OPENAI_EMBEDDING_MODEL</code> | Embedding integrations | Embedding model name |
| <code>HF_TOKEN</code> | Hugging Face | Optional remote/local AI acceleration |
| <code>HF_MODEL</code> | Hugging Face | Remote enrichment model |
| <code>RESEND_API_KEY</code> | Alerts | Email delivery |
| <code>ALERT_FROM_EMAIL</code> | Alerts | Sender address |
| <code>NEXT_PUBLIC_GA_ID</code> | Analytics | Optional |
| <code>NEXT_PUBLIC_ADSENSE_ID</code> | Ads | Optional | AdSense client ID, e.g. <code>ca-pub-...</code> |
| <code>NEXT_PUBLIC_ADSENSE_SLOT</code> | Ads | Optional | Responsive ad-unit slot ID for manual placements |

| <code>GREENHOUSE_BOARDS</code> | Ingestion | Optional board configuration |
| <code>LEVER_SITES</code> | Ingestion | Optional site configuration |
| <code>ASHBY_BOARDS</code> | Ingestion | Optional board configuration |

See <code>.env.example</code> for the complete list.

## AdSense monetization

RolePilot loads the AdSense client script globally when <code>NEXT_PUBLIC_ADSENSE_ID</code> is configured and exposes <code>/ads.txt</code> from the same configuration. Auto ads are controlled in the AdSense dashboard; manual responsive placements are enabled when <code>NEXT_PUBLIC_ADSENSE_SLOT</code> is also configured. Google notes that a site must be added to AdSense and reach a <code>Ready</code> status before ads can serve. citeturn491660search1turn491660search3

## SEO and discoverability

RolePilot includes:

- Canonical production URLs
- Dynamic <code>robots.txt</code>
- Dynamic XML sitemap
- JobPosting structured data
- Breadcrumb structured data
- Organization/WebSite metadata
- Company, skill and location taxonomy pages
- Freshness-aware job indexing
- Direct source/application links

The goal is **useful, indexable job intelligence**, not mass-generated doorway pages.

## Reliability

The repository contains automated production checks for:

- Homepage availability
- Branding consistency
- Icon assets
- Health endpoint
- Authentication boundaries
- Resume parser health
- Anonymous PDF resume parsing
- Production deployment rollout

The production environment also has a public cache fallback for anonymous job discovery.

## Privacy and data handling

The current application is designed so uploaded resume binaries are not retained by the main application flow. Extracted resume text and profile fields may be stored for personalization and matching.

Users should review the live product's privacy policy before uploading personal data.

See <code>app/privacy/page.tsx</code> for the current product privacy page.

## Security

Do not commit:

- API keys
- database URLs/passwords
- auth cookie secrets
- service-role keys
- SMTP/API credentials
- access tokens

Use Render/GitHub environment secrets for deployment credentials.

See <code>SECURITY.md</code> for reporting guidance.

## Contributing

Pull requests and focused improvements are welcome.

Before opening a PR:

1. Keep changes scoped and explain the user-facing or engineering reason.
2. Avoid introducing secrets or personal data.
3. Run <code>npm run build</code>.
4. Update documentation when behavior/configuration changes.
5. Prefer source-grounded AI behavior over speculative enrichment.

See <code>CONTRIBUTING.md</code>.

## Roadmap

Planned/ongoing areas include:

- Broader direct employer/ATS source coverage
- Stronger semantic candidate-job matching
- Better recruiter/company intelligence
- More hiring-market reports and original data products
- Search and discovery refinements
- Faster propagation of newly opened/closed jobs
- Continued performance and SEO improvements

## Production

**Website:** <https://jobs.affan.tech>  
**Repository:** <https://github.com/affanSkhan/job-news>

## Project status

RolePilot is actively deployed and evolving. Some account/database-backed features depend on external infrastructure, while public job discovery has a cache-backed degradation path.

## License

No license file is currently declared in this repository. Public visibility does **not** by itself grant permission to copy, modify or redistribute the source code. Add an explicit license before treating the repository as an open-source project.
