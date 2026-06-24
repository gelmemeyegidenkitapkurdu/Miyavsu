create extension if not exists pgcrypto;

create table if not exists public.admin_profile (
  id integer primary key,
  about text,
  email text,
  instagram text,
  image text,
  header_image text
);

create table if not exists public.writings (
  id text primary key,
  title text,
  author text,
  image text,
  content text,
  status text default 'published',
  date text
);

create table if not exists public.books (
  id text primary key,
  title text,
  cover text,
  description text,
  pdf text
);

create table if not exists public.suggestions (
  id text primary key,
  image text,
  title text,
  genre text,
  description text,
  link text
);

create table if not exists public.polls (
  id text primary key,
  question text,
  total_votes integer default 0
);

create table if not exists public.poll_options (
  id text primary key,
  poll_id text references public.polls(id) on delete cascade,
  text text,
  votes integer default 0
);

create table if not exists public.interviews (
  id text primary key,
  title text,
  description text,
  photo text,
  interviewer text,
  interviewee text
);

create table if not exists public.dialogues (
  id text primary key,
  interview_id text references public.interviews(id) on delete cascade,
  speaker text,
  text text
);

create table if not exists public.announcements (
  id text primary key,
  title text,
  author text,
  content text,
  image text,
  date text
);

create or replace function public.vote_poll_option(p_poll_id text, p_option_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.poll_options where id = p_option_id and poll_id = p_poll_id
  ) then
    raise exception 'Geçersiz anket seçeneği';
  end if;

  update public.poll_options
  set votes = coalesce(votes, 0) + 1
  where id = p_option_id and poll_id = p_poll_id;

  update public.polls
  set total_votes = coalesce(total_votes, 0) + 1
  where id = p_poll_id;
end;
$$;

grant execute on function public.vote_poll_option(text, text) to anon, authenticated;

alter table public.admin_profile enable row level security;
alter table public.writings enable row level security;
alter table public.books enable row level security;
alter table public.suggestions enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.interviews enable row level security;
alter table public.dialogues enable row level security;
alter table public.announcements enable row level security;

drop policy if exists profile_read on public.admin_profile;
drop policy if exists profile_admin_write on public.admin_profile;
create policy profile_read on public.admin_profile for select using (true);
create policy profile_admin_write on public.admin_profile
for all
using (auth.jwt() ->> 'email' = 'gelmemeyegidenkitapkurdu@gmail.com')
with check (auth.jwt() ->> 'email' = 'gelmemeyegidenkitapkurdu@gmail.com');

drop policy if exists writings_read on public.writings;
drop policy if exists writings_admin_write on public.writings;
create policy writings_read on public.writings for select using (true);
create policy writings_admin_write on public.writings
for all
using (auth.jwt() ->> 'email' = 'gelmemeyegidenkitapkurdu@gmail.com')
with check (auth.jwt() ->> 'email' = 'gelmemeyegidenkitapkurdu@gmail.com');

drop policy if exists books_read on public.books;
drop policy if exists books_admin_write on public.books;
create policy books_read on public.books for select using (true);
create policy books_admin_write on public.books
for all
using (auth.jwt() ->> 'email' = 'gelmemeyegidenkitapkurdu@gmail.com')
with check (auth.jwt() ->> 'email' = 'gelmemeyegidenkitapkurdu@gmail.com');

drop policy if exists suggestions_read on public.suggestions;
drop policy if exists suggestions_admin_write on public.suggestions;
create policy suggestions_read on public.suggestions for select using (true);
create policy suggestions_admin_write on public.suggestions
for all
using (auth.jwt() ->> 'email' = 'gelmemeyegidenkitapkurdu@gmail.com')
with check (auth.jwt() ->> 'email' = 'gelmemeyegidenkitapkurdu@gmail.com');

drop policy if exists polls_read on public.polls;
drop policy if exists polls_admin_write on public.polls;
create policy polls_read on public.polls for select using (true);
create policy polls_admin_write on public.polls
for all
using (auth.jwt() ->> 'email' = 'gelmemeyegidenkitapkurdu@gmail.com')
with check (auth.jwt() ->> 'email' = 'gelmemeyegidenkitapkurdu@gmail.com');

drop policy if exists poll_options_read on public.poll_options;
drop policy if exists poll_options_admin_write on public.poll_options;
create policy poll_options_read on public.poll_options for select using (true);
create policy poll_options_admin_write on public.poll_options
for all
using (auth.jwt() ->> 'email' = 'gelmemeyegidenkitapkurdu@gmail.com')
with check (auth.jwt() ->> 'email' = 'gelmemeyegidenkitapkurdu@gmail.com');

drop policy if exists interviews_read on public.interviews;
drop policy if exists interviews_admin_write on public.interviews;
create policy interviews_read on public.interviews for select using (true);
create policy interviews_admin_write on public.interviews
for all
using (auth.jwt() ->> 'email' = 'gelmemeyegidenkitapkurdu@gmail.com')
with check (auth.jwt() ->> 'email' = 'gelmemeyegidenkitapkurdu@gmail.com');

drop policy if exists dialogues_read on public.dialogues;
drop policy if exists dialogues_admin_write on public.dialogues;
create policy dialogues_read on public.dialogues for select using (true);
create policy dialogues_admin_write on public.dialogues
for all
using (auth.jwt() ->> 'email' = 'gelmemeyegidenkitapkurdu@gmail.com')
with check (auth.jwt() ->> 'email' = 'gelmemeyegidenkitapkurdu@gmail.com');

drop policy if exists announcements_read on public.announcements;
drop policy if exists announcements_admin_write on public.announcements;
create policy announcements_read on public.announcements for select using (true);
create policy announcements_admin_write on public.announcements
for all
using (auth.jwt() ->> 'email' = 'gelmemeyegidenkitapkurdu@gmail.com')
with check (auth.jwt() ->> 'email' = 'gelmemeyegidenkitapkurdu@gmail.com');
