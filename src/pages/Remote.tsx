import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSession, JukeboxState } from '@/hooks/useRealtimeSession';
import { Play, Pause, SkipForward, Volume2, Plus, DollarSign, Wifi, WifiOff } from 'lucide-react';

export default function Remote() {
  const [sessionCode, setSessionCode] = useState('');
  const [joinedSession, setJoinedSession] = useState(false);
  const [currentState, setCurrentState] = useState<JukeboxState | null>(null);
  const [volume, setVolume] = useState([50]);
  const { toast } = useToast();

  const { joinSession, sendCommand, isConnected, sessionCode: activeSessionCode } = useRealtimeSession({
    onStateUpdate: (state) => {
      console.log('[Remote] State update:', state);
      setCurrentState(state);
      if (state.volume !== undefined) {
        setVolume([state.volume]);
      }
    },
  });

  const handleJoinSession = async () => {
    if (!sessionCode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a session code',
        variant: 'destructive',
      });
      return;
    }

    const success = await joinSession(sessionCode.toUpperCase());
    if (success) {
      setJoinedSession(true);
    }
  };

  const handleControl = async (type: 'PLAY' | 'PAUSE' | 'NEXT' | 'SKIP') => {
    await sendCommand({ type });
    toast({
      title: 'Command Sent',
      description: `${type} command sent to jukebox`,
    });
  };

  const handleVolumeChange = async (newVolume: number[]) => {
    setVolume(newVolume);
    await sendCommand({ type: 'SET_VOLUME', payload: { volume: newVolume[0] } });
  };

  const handleAddCredits = async () => {
    await sendCommand({ type: 'ADD_CREDITS', payload: { amount: 1 } });
    toast({
      title: 'Credits Added',
      description: 'Added 1 credit to jukebox',
    });
  };

  const handleModeToggle = async () => {
    const newMode = currentState?.mode === 'FREEPLAY' ? 'PAID' : 'FREEPLAY';
    await sendCommand({ type: 'SET_MODE', payload: { mode: newMode } });
    toast({
      title: 'Mode Changed',
      description: `Switched to ${newMode} mode`,
    });
  };

  if (!joinedSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Remote Control</CardTitle>
            <CardDescription>
              Enter the session code displayed on the jukebox to connect
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Enter session code (e.g., ABC123)"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="text-center text-2xl font-mono tracking-widest"
              />
            </div>
            <Button onClick={handleJoinSession} className="w-full" size="lg">
              Connect to Jukebox
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Remote Control</CardTitle>
              <CardDescription>Session: {activeSessionCode}</CardDescription>
            </div>
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? (
                <>
                  <Wifi className="mr-1 h-4 w-4" />
                  Connected
                </>
              ) : (
                <>
                  <WifiOff className="mr-1 h-4 w-4" />
                  Disconnected
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Current Status */}
      {currentState && (
        <Card>
          <CardHeader>
            <CardTitle>Now Playing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-lg font-semibold">{currentState.currentSong || 'No song playing'}</div>
            <div className="flex gap-2">
              <Badge variant="outline">Mode: {currentState.mode}</Badge>
              <Badge variant="outline">Credits: {currentState.credits}</Badge>
              <Badge variant="outline">Queue: {currentState.queue?.length || 0}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Playback Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Playback Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={() => handleControl('PLAY')} size="lg" className="flex-1">
              <Play className="mr-2 h-5 w-5" /> Play
            </Button>
            <Button onClick={() => handleControl('PAUSE')} size="lg" variant="outline" className="flex-1">
              <Pause className="mr-2 h-5 w-5" /> Pause
            </Button>
          </div>
          <Button onClick={() => handleControl('NEXT')} size="lg" variant="outline" className="w-full">
            <SkipForward className="mr-2 h-5 w-5" /> Next Song
          </Button>
        </CardContent>
      </Card>

      {/* Volume Control */}
      <Card>
        <CardHeader>
          <CardTitle>Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Volume2 className="h-5 w-5" />
            <Slider
              value={volume}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="w-12 text-right font-mono">{volume[0]}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Mode & Credits */}
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button onClick={handleModeToggle} variant="outline" className="w-full">
            Toggle Mode (Current: {currentState?.mode || 'Unknown'})
          </Button>
          <Button onClick={handleAddCredits} variant="outline" className="w-full">
            <DollarSign className="mr-2 h-4 w-4" />
            Add 1 Credit
          </Button>
        </CardContent>
      </Card>

      {/* Queue Display */}
      {currentState?.queue && currentState.queue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {currentState.queue.slice(0, 5).map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <Badge variant="outline">{index + 1}</Badge>
                  <span className="flex-1 truncate">{item.title || 'Unknown'}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
