-- Migration to add kiosk settings table for credit and mode synchronization
-- This table stores the current credit balance and mode (FREEPLAY/PAID) for each player

-- Create kiosk_settings table
CREATE TABLE IF NOT EXISTS public.kiosk_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id TEXT UNIQUE NOT NULL,
  mode TEXT NOT NULL DEFAULT 'FREEPLAY' CHECK (mode IN ('FREEPLAY', 'PAID')),
  credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_kiosk_player FOREIGN KEY (player_id) REFERENCES public.players(player_id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.kiosk_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view kiosk settings" ON public.kiosk_settings;
DROP POLICY IF EXISTS "Anyone can insert kiosk settings" ON public.kiosk_settings;
DROP POLICY IF EXISTS "Anyone can update kiosk settings" ON public.kiosk_settings;

-- RLS Policies for kiosk_settings table
CREATE POLICY "Anyone can view kiosk settings"
  ON public.kiosk_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert kiosk settings"
  ON public.kiosk_settings
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update kiosk settings"
  ON public.kiosk_settings
  FOR UPDATE
  USING (true);

-- Create index for player_id lookups
CREATE INDEX IF NOT EXISTS idx_kiosk_settings_player_id ON public.kiosk_settings(player_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_kiosk_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_kiosk_settings_updated_at ON public.kiosk_settings;
CREATE TRIGGER trigger_update_kiosk_settings_updated_at
  BEFORE UPDATE ON public.kiosk_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_kiosk_settings_updated_at();

-- Enable Realtime for kiosk_settings
ALTER PUBLICATION supabase_realtime ADD TABLE public.kiosk_settings;

-- Create function to get or create kiosk settings
CREATE OR REPLACE FUNCTION get_or_create_kiosk_settings(p_player_id TEXT)
RETURNS public.kiosk_settings AS $$
DECLARE
  settings public.kiosk_settings;
BEGIN
  -- Try to get existing settings
  SELECT * INTO settings
  FROM public.kiosk_settings
  WHERE player_id = p_player_id;
  
  -- If not found, create default settings
  IF NOT FOUND THEN
    INSERT INTO public.kiosk_settings (player_id, mode, credits)
    VALUES (p_player_id, 'FREEPLAY', 0)
    RETURNING * INTO settings;
  END IF;
  
  RETURN settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
