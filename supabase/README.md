# RolePilot database setup

Apply supabase/migrations/20260920000000_rolepilot_core.sql to a dedicated Supabase project.

Runtime: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
Workers: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
Admin: ADMIN_EMAILS as a comma-separated trusted email allow-list.
AI: HF_TOKEN/HF_MODEL or OPENAI_API_KEY/OPENAI_CHAT_MODEL plus OPENAI_EMBEDDING_MODEL.
Alerts: RESEND_API_KEY and ALERT_FROM_EMAIL.

The application keeps a JSON fallback so the public site remains buildable before production database credentials are present.