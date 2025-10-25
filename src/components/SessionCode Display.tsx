import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Wifi, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSession } from '@/hooks/useRealtimeSession';

interface SessionCodeDisplayProps {
  onCommandReceived?: (command: any) => void;
  currentState?: any;
}

export const SessionCodeDisplay = ({ onCommandReceived, currentState }: SessionCodeDisplayProps) => {
  const { toast } = useToast();
  const { createSession, isConnected, sessionCode, broadcastState } = useRealtimeSession({
    onCommandReceived,
  });

  useEffect(() => {
    // Create session on mount
    createSession();
  }, []);

  // Broadcast state updates
  useEffect(() => {
    if (currentState && isConnected && sessionCode) {
      broadcastState(currentState);
    }
  }, [currentState, isConnected, sessionCode, broadcastState]);

  const copySessionCode = () => {
    if (sessionCode) {
      navigator.clipboard.writeText(sessionCode);
      toast({
        title: 'Copied!',
        description: 'Session code copied to clipboard',
      });
    }
  };

  const copyRemoteUrl = () => {
    const url = `${window.location.origin}/remote`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Copied!',
      description: 'Remote control URL copied to clipboard',
    });
  };

  if (!sessionCode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Remote Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Initializing...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Remote Control Access</CardTitle>
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            <Wifi className="mr-1 h-3 w-3" />
            {isConnected ? 'Live' : 'Offline'}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Other devices can control this jukebox
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="text-xs font-medium mb-2">Session Code:</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted px-4 py-3 rounded-lg">
              <div className="text-3xl font-bold font-mono tracking-[0.3em] text-center">
                {sessionCode}
              </div>
            </div>
            <Button onClick={copySessionCode} size="sm" variant="outline">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium">Instructions:</div>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>On another device, open: <code className="bg-muted px-1 py-0.5 rounded">/remote</code></li>
            <li>Enter the session code above</li>
            <li>Control the jukebox remotely</li>
          </ol>
          <Button onClick={copyRemoteUrl} size="sm" variant="outline" className="w-full mt-2">
            Copy Remote URL
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
