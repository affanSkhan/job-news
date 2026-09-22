-- Analytics query indexes. Safe to run after 001_jobnews_core.sql.
CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_event_created_idx ON public.analytics_events(event_name,created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_job_event_created_idx ON public.analytics_events(job_id,event_name,created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_session_created_idx ON public.analytics_events((metadata->>'session_id'),created_at DESC);
