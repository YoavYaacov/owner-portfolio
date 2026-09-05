-- bootstrap_first_user.sql
-- Run this ONCE, in the Supabase SQL Editor, AFTER creating the auth user
-- via Dashboard -> Authentication -> Add User (email + password).
--
-- This is the manual, dashboard-only user-creation path chosen for Phase 2
-- (ADR-017): there is no signup UI or edge function for this in V1.
--
-- Safe to re-run: profiles upsert on id, usernames insert is a no-op if the
-- username already exists.

do $$
declare
  v_user_id     uuid := '00000000-0000-0000-0000-000000000000'; -- <-- replace with the new user's auth.users.id (copy from the Dashboard)
  v_username    text := 'yoav';                                  -- <-- replace: lowercase only, 3-32 chars, letters/digits/._-
  v_display_name text := 'יואב יעקב';                            -- <-- replace
  v_role        text := 'owner';                                 -- 'owner' for the first/primary user
begin
  insert into public.profiles (id, display_name, role)
  values (v_user_id, v_display_name, v_role)
  on conflict (id) do update
    set display_name = excluded.display_name,
        role = excluded.role;

  insert into public.usernames (username, user_id)
  values (v_username, v_user_id)
  on conflict (username) do nothing;
end $$;

-- Verify the result:
-- select * from public.profiles;
-- select * from public.usernames;
