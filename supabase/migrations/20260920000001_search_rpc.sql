create or replace function public.match_jobs_by_embedding(p_embedding vector(1536),p_match_count integer default 50)
returns table(job_id text,title text,company_name text,slug text,location text,work_mode text,employment_type text,salary_text text,skills text[],similarity real)
language sql stable as $$
select id,title,company_name,slug,location,work_mode,employment_type,salary_text,skills,
greatest(0,1-(embedding <=> p_embedding))::real as similarity
from public.jobs
where status='active' and embedding is not null
order by embedding <=> p_embedding
limit greatest(1,least(p_match_count,100));
$$;