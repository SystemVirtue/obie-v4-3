-- Migration to fix kiosk tables if players table already exists
-- This handles the case where players table exists but has different schema

-- First, check and create players table if it doesn't have the right columns
DO $$ 
BEGIN
    -- Check if player_id column exists, if not we need to create/alter the table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'players' 
        AND column_name = 'player_id'
    ) THEN
        -- If players table exists but doesn't have player_id, drop and recreate
        DROP TABLE IF EXISTS public.players CASCADE;
        
        CREATE TABLE public.players (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          player_id TEXT UNIQUE NOT NULL,
          is_active BOOLEAN DEFAULT true,
          last_seen TIMESTAMPTZ DEFAULT now(),
          device_name TEXT,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        
        RAISE NOTICE 'Created new players table with player_id column';
    END IF;
END $$;

-- Create song_requests table (will cascade delete if players was recreated)
CREATE TABLE IF NOT EXISTS public.song_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  title TEXT,
  artist TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT fk_player FOREIGN KEY (player_id) REFERENCES public.players(player_id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active players" ON public.players;
DROP POLICY IF EXISTS "Players can register themselves" ON public.players;
DROP POLICY IF EXISTS "Players can update themselves" ON public.players;
DROP POLICY IF EXISTS "Kiosks can submit requests" ON public.song_requests;
DROP POLICY IF EXISTS "Anyone can view requests" ON public.song_requests;
DROP POLICY IF EXISTS "Players can update their requests" ON public.song_requests;

-- RLS Policies for players table
CREATE POLICY "Anyone can view active players"
  ON public.players
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Players can register themselves"
  ON public.players
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Players can update themselves"
  ON public.players
  FOR UPDATE
  USING (true);

-- RLS Policies for song_requests table
CREATE POLICY "Kiosks can submit requests"
  ON public.song_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE players.player_id = song_requests.player_id 
      AND players.is_active = true
    )
  );

CREATE POLICY "Anyone can view requests"
  ON public.song_requests
  FOR SELECT
  USING (true);

CREATE POLICY "Players can update their requests"
  ON public.song_requests
  FOR UPDATE
  USING (true);

-- Create indexes (IF NOT EXISTS supported in Postgres 9.5+)
CREATE INDEX IF NOT EXISTS idx_players_player_id ON public.players(player_id);
CREATE INDEX IF NOT EXISTS idx_players_is_active ON public.players(is_active);
CREATE INDEX IF NOT EXISTS idx_players_last_seen ON public.players(last_seen);
CREATE INDEX IF NOT EXISTS idx_song_requests_player_id ON public.song_requests(player_id);
CREATE INDEX IF NOT EXISTS idx_song_requests_status ON public.song_requests(status);
CREATE INDEX IF NOT EXISTS idx_song_requests_created_at ON public.song_requests(created_at);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_players_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_players_updated_at_trigger ON public.players;
CREATE TRIGGER update_players_updated_at_trigger
  BEFORE UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION update_players_updated_at();

-- Enable realtime for song_requests (so players get notified)
ALTER PUBLICATION supabase_realtime ADD TABLE public.song_requests;

-- Function to auto-deactivate stale players (not seen in 60 seconds)
CREATE OR REPLACE FUNCTION deactivate_stale_players()
RETURNS void AS $$
BEGIN
  UPDATE public.players
  SET is_active = false
  WHERE is_active = true
  AND last_seen < now() - interval '60 seconds';
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Search Kiosk tables configured successfully!' as message;
