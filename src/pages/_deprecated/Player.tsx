import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function Player() {
  const [deviceId, setDeviceId] = useState<string>('');
  const [isApproved, setIsApproved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Get or create device ID
    let storedDeviceId = localStorage.getItem('player_device_id');
    if (!storedDeviceId) {
      storedDeviceId = crypto.randomUUID();
      localStorage.setItem('player_device_id', storedDeviceId);
    }
    setDeviceId(storedDeviceId);
    
    // Bypass auth - set as approved immediately
    setIsApproved(true);
    setUserId('bypass-auth-user');
  }, []);

  const checkDeviceApproval = async (devId: string, uid: string) => {
    const { data, error } = await (supabase as any)
      .from('approved_devices')
      .select('*')
      .eq('device_id', devId)
      .eq('user_id', uid)
      .single();

    if (data && !error) {
      setIsApproved(true);
      subscribeToRealtime(uid);
    }
  };

  const subscribeToRealtime = (uid: string) => {
    const channel = supabase.channel(`user:${uid}`);
    
    channel
      .on('broadcast', { event: 'player_control' }, (payload) => {
        console.log('Received control:', payload);
        handlePlayerControl(payload.payload);
      })
      .subscribe();

    // Load playlist
    loadPlaylist(uid);
  };

  const loadPlaylist = async (uid: string) => {
    const { data } = await (supabase as any)
      .from('playlists')
      .select('*')
      .eq('user_id', uid)
      .order('position');

    if (data && data.length > 0) {
      playVideo((data as any)[0].video_id);
    }
  };

  const handlePlayerControl = (control: any) => {
    switch (control.action) {
      case 'play':
        playVideo(control.videoId);
        break;
      case 'pause':
        // Implement pause
        break;
      case 'next':
        // Implement next
        break;
      case 'volume':
        // Implement volume
        break;
    }
  };

  const playVideo = (videoId: string) => {
    setCurrentVideo(videoId);
    // YouTube IFrame API implementation here
  };

  // Auth bypassed - render player directly

  return (
    <div className="min-h-screen bg-background">
      <div id="youtube-player" className="w-full h-screen"></div>
    </div>
  );
}
