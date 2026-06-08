-- Fix activity_logs.user_id foreign key to point to profiles instead of auth.users
-- This allows PostgREST to resolve the join to profiles.full_name

ALTER TABLE public.activity_logs
  DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey,
  ADD CONSTRAINT activity_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
