# JobNews Radar

AI-assisted job intelligence built around a simple idea: **stop searching, let your radar search for you.**

## Product
- Resume-first candidate profiling for PDF, DOCX and TXT resumes
- Personalized job matching with semantic, skill, keyword, preference and freshness signals
- Explainable matches showing matched skills and potential gaps
- Employer / employer-ATS application path detection
- Source verification, freshness and deduplication
- Natural-language semantic job search
- Live AI web discovery plus curated ATS/feed ingestion
- Application tracker, saved jobs and alerts
- SEO-first canonical job pages with JobPosting structured data
- Dark “signal/radar” brand designed around relevance instead of job volume

## Automation
The intelligence pipeline runs every 30 minutes:
1. AI web discovery searches the live web for current opportunities.
2. Employer/ATS URLs are validated before ingestion.
3. Public ATS/feed sources are ingested and normalized.
4. Duplicates and stale listings are retired.
5. AI enrichment summarizes and classifies new jobs.
6. Local semantic embeddings refresh job and candidate indexes.
7. Personalized alerts are evaluated.

The web-discovery step fails open: source ingestion continues if the AI search service is temporarily unavailable.

## Privacy
Uploaded resume binaries are not retained by the current application. Extracted resume text and matching profile fields are stored so Radar can personalize results, and the user can delete the stored resume profile from the account.

## Engineering principles
- AI must stay grounded in source data and never invent job facts.
- Direct application links remain visible.
- Matching scores are signals, not hiring guarantees.
- Production runtime stays database-backed and memory-bounded.
- SEO should add original job intelligence rather than mass-producing thin duplicate pages.
