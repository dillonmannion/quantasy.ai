ALTER TABLE public.profiles
ADD COLUMN gamification_counters JSONB DEFAULT '{}'::jsonb NOT NULL;

CREATE OR REPLACE FUNCTION public.increment_gamification_counter(
  target_user_id uuid,
  counter_key text,
  increment_by int DEFAULT 1
)
RETURNS jsonb
LANGUAGE sql
AS $$
  UPDATE public.profiles
  SET gamification_counters = jsonb_set(
    gamification_counters,
    ARRAY[counter_key],
    to_jsonb(COALESCE((gamification_counters ->> counter_key)::int, 0) + increment_by),
    true
  )
  WHERE id = auth.uid() AND id = target_user_id
  RETURNING gamification_counters;
$$;
