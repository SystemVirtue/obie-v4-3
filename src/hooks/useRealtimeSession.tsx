import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import type { RemoteJukeboxState, QueuedRequest } from '@/types/jukebox';

export interface JukeboxCommand {
  type: 'PLAY' | 'PAUSE' | 'NEXT' | 'SKIP' | 'ADD_SONG' | 'REMOVE_SONG' | 'SET_VOLUME' | 'SET_MODE' | 'ADD_CREDITS';
  payload?: any;
  timestamp: string;
  sender: string;
}

// Re-export RemoteJukeboxState for backward compatibility
export type JukeboxState = RemoteJukeboxState;

interface UseRealtimeSessionOptions {
  sessionCode?: string;
  onCommandReceived?: (command: JukeboxCommand) => void;
  onStateUpdate?: (state: JukeboxState) => void;
}

export const useRealtimeSession = ({
  sessionCode,
  onCommandReceived,
  onStateUpdate,
}: UseRealtimeSessionOptions = {}) => {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentSessionCode, setCurrentSessionCode] = useState<string | null>(sessionCode || null);
  const { toast } = useToast();

  // Create a new session
  const createSession = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('[RealtimeSession] No authenticated user');
        return null;
      }

      const code = await (supabase.rpc as any)('generate_session_code');
      
      const { data, error } = await (supabase as any)
        .from('jukebox_sessions')
        .insert({
          session_code: code,
          owner_id: user.id,
          is_active: true,
          current_state: {},
        })
        .select()
        .single();

      if (error) {
        console.error('[RealtimeSession] Error creating session:', error);
        toast({
          title: 'Error',
          description: 'Failed to create session',
          variant: 'destructive',
        });
        return null;
      }

      setSessionId(data.id);
      setCurrentSessionCode(data.session_code);
      
      toast({
        title: 'Session Created',
        description: `Session code: ${data.session_code}`,
      });

      return data;
    } catch (error) {
      console.error('[RealtimeSession] Error creating session:', error);
      return null;
    }
  }, [toast]);

  // Join an existing session
  const joinSession = useCallback(async (code: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('jukebox_sessions')
        .select('*')
        .eq('session_code', code)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        toast({
          title: 'Session Not Found',
          description: 'Invalid or inactive session code',
          variant: 'destructive',
        });
        return false;
      }

      setSessionId(data.id);
      setCurrentSessionCode(data.session_code);
      
      toast({
        title: 'Session Joined',
        description: `Connected to ${data.session_code}`,
      });

      return true;
    } catch (error) {
      console.error('[RealtimeSession] Error joining session:', error);
      return false;
    }
  }, [toast]);

  // Send command through realtime channel
  const sendCommand = useCallback(
    async (command: Omit<JukeboxCommand, 'timestamp' | 'sender'>) => {
      if (!channel || !currentSessionCode) {
        console.warn('[RealtimeSession] No active channel or session');
        return false;
      }

      const fullCommand: JukeboxCommand = {
        ...command,
        timestamp: new Date().toISOString(),
        sender: 'remote',
      };

      console.log('[RealtimeSession] Sending command:', fullCommand);

      await channel.send({
        type: 'broadcast',
        event: 'jukebox_command',
        payload: fullCommand,
      });

      return true;
    },
    [channel, currentSessionCode]
  );

  // Broadcast state update
  const broadcastState = useCallback(
    async (state: JukeboxState) => {
      if (!channel || !currentSessionCode || !sessionId) {
        return false;
      }

      // Update state in database
      await (supabase as any)
        .from('jukebox_sessions')
        .update({ current_state: state as any })
        .eq('id', sessionId);

      // Broadcast through channel
      await channel.send({
        type: 'broadcast',
        event: 'jukebox_state',
        payload: state,
      });

      return true;
    },
    [channel, currentSessionCode, sessionId]
  );

  // Set up realtime channel
  useEffect(() => {
    if (!currentSessionCode) return;

    console.log('[RealtimeSession] Setting up channel for:', currentSessionCode);

    const newChannel = supabase.channel(`jukebox:${currentSessionCode}`);

    newChannel
      .on('broadcast', { event: 'jukebox_command' }, (payload) => {
        console.log('[RealtimeSession] Command received:', payload.payload);
        if (onCommandReceived) {
          onCommandReceived(payload.payload);
        }
      })
      .on('broadcast', { event: 'jukebox_state' }, (payload) => {
        console.log('[RealtimeSession] State update received:', payload.payload);
        if (onStateUpdate) {
          onStateUpdate(payload.payload);
        }
      })
      .subscribe((status) => {
        console.log('[RealtimeSession] Channel status:', status);
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          toast({
            title: 'Connected',
            description: 'Real-time connection established',
          });
        }
      });

    setChannel(newChannel);

    return () => {
      console.log('[RealtimeSession] Cleaning up channel');
      newChannel.unsubscribe();
    };
  }, [currentSessionCode, onCommandReceived, onStateUpdate, toast]);

  // Close session
  const closeSession = useCallback(async () => {
    if (!sessionId) return;

    await (supabase as any)
      .from('jukebox_sessions')
      .update({ is_active: false })
      .eq('id', sessionId);

    if (channel) {
      await channel.unsubscribe();
    }

    setSessionId(null);
    setCurrentSessionCode(null);
    setChannel(null);
    setIsConnected(false);

    toast({
      title: 'Session Closed',
      description: 'Real-time session has been closed',
    });
  }, [sessionId, channel, toast]);

  return {
    createSession,
    joinSession,
    sendCommand,
    broadcastState,
    closeSession,
    isConnected,
    sessionCode: currentSessionCode,
    sessionId,
  };
};
