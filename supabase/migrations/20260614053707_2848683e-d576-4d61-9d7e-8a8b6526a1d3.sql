CREATE TABLE public.pilot_progress (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  diamonds integer NOT NULL DEFAULT 0,
  coins integer NOT NULL DEFAULT 0,
  owned_ships text[] NOT NULL DEFAULT ARRAY['interceptor']::text[],
  active_ship text NOT NULL DEFAULT 'interceptor',
  upgrades jsonb NOT NULL DEFAULT '{}'::jsonb,
  max_region integer NOT NULL DEFAULT 1,
  max_level integer NOT NULL DEFAULT 1,
  best_score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pilot_progress TO authenticated;
GRANT ALL ON public.pilot_progress TO service_role;

ALTER TABLE public.pilot_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pilots read own progress" ON public.pilot_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Pilots insert own progress" ON public.pilot_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Pilots update own progress" ON public.pilot_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER pilot_progress_touch
  BEFORE UPDATE ON public.pilot_progress
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_pilot_progress()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.pilot_progress (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_progress ON auth.users;
CREATE TRIGGER on_auth_user_created_progress
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_pilot_progress();