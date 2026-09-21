# Database integration notes

This directory contains Supabase client/service helpers retained for compatibility with parts of the project.

The current primary production data/auth path uses **PostgreSQL on Neon and Neon Auth**. See the root README and .env.example for the active runtime configuration.

## Current production data path

- Job data: PostgreSQL / Neon
- Authentication: Neon Auth
- Public discovery fallback: data/public-jobs.json
- Semantic search: database vector search with full-text/fallback paths

Do not treat this file as a substitute for the current production schema documentation.

## Secrets

Never commit:

- SUPABASE_SERVICE_ROLE_KEY
- DATABASE_URL
- Neon auth secrets
- other provider credentials

Use local .env.local values or deployment secrets instead.
