-- Create a table for jukebox sessions/rooms
CREATE TABLE IF NOT EXISTS public.jukebox_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  current_state JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jukebox_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active sessions (for local network access)
CREATE POLICY "Anyone can view active sessions"
  ON public.jukebox_sessions
  FOR SELECT
  USING (is_active = true);

-- Allow owners to manage their sessions
CREATE POLICY "Owners can manage their sessions"
  ON public.jukebox_sessions
  FOR ALL
  USING (auth.uid() = owner_id);

-- Create function to generate unique session codes
CREATE OR REPLACE FUNCTION generate_session_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a 6-character code
    code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    
    -- Check if it exists
    SELECT EXISTS(SELECT 1 FROM public.jukebox_sessions WHERE session_code = code) INTO exists;
    
    -- Exit loop if unique
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Enable realtime for jukebox_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.jukebox_sessions;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_jukebox_sessions_updated_at
  BEFORE UPDATE ON public.jukebox_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();