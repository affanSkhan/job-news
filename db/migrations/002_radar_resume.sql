ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS resume_text text,
  ADD COLUMN IF NOT EXISTS resume_filename text,
  ADD COLUMN IF NOT EXISTS resume_skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS resume_roles text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS resume_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS resume_uploaded_at timestamptz;
CREATE INDEX IF NOT EXISTS profiles_resume_uploaded_idx ON public.profiles(resume_uploaded_at DESC);