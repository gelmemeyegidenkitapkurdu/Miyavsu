alter table public.books add column if not exists created_at timestamp with time zone default now();
alter table public.suggestions add column if not exists created_at timestamp with time zone default now();
alter table public.polls add column if not exists created_at timestamp with time zone default now();
alter table public.interviews add column if not exists created_at timestamp with time zone default now();
