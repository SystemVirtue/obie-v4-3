-- Create missing tables that existing code expects

-- Playlists table
CREATE TABLE IF NOT EXISTS public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT DEFAULT '',
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  room_id UUID DEFAULT NULL
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own playlists"
  ON public.playlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own playlists"
  ON public.playlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists"
  ON public.playlists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists"
  ON public.playlists FOR DELETE
  USING (auth.uid() = user_id);

-- Approved devices table
CREATE TABLE IF NOT EXISTS public.approved_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  approved_at TIMESTAMPTZ DEFAULT now(),
  device_name TEXT DEFAULT NULL
);

ALTER TABLE public.approved_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own approved devices"
  ON public.approved_devices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own approved devices"
  ON public.approved_devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own approved devices"
  ON public.approved_devices FOR DELETE
  USING (auth.uid() = user_id);

-- Rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public rooms"
  ON public.rooms FOR SELECT
  USING (is_public = true OR auth.uid() = owner_id);

CREATE POLICY "Owners can manage their rooms"
  ON public.rooms FOR ALL
  USING (auth.uid() = owner_id);

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.playlists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.approved_devices;