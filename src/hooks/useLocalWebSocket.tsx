import { useEffect, useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface JukeboxCommand {
  type: 'control' | 'queue_add' | 'queue_remove' | 'queue_reorder';
  action?: 'play' | 'pause' | 'next' | 'volume' | 'clear_queue';
  value?: any;
  payload?: any;
}

export interface JukeboxState {
  isPlaying: boolean;
  currentSong: string;
  currentVideoId: string;
  queue: any[];
  state: string;
  volume: number;
  currentTime: number;
  duration: number;
}

interface UseLocalWebSocketOptions {
  type: 'player' | 'admin';
  deviceId?: string;
  onCommandReceived?: (command: any) => void;
  onStateUpdate?: (state: JukeboxState) => void;
  onQueueUpdate?: (queue: any[]) => void;
}

export const useLocalWebSocket = ({
  type,
  deviceId,
  onCommandReceived,
  onStateUpdate,
  onQueueUpdate,
}: UseLocalWebSocketOptions) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [approvalCode, setApprovalCode] = useState<string | null>(null);
  const [currentState, setCurrentState] = useState<JukeboxState | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  const WS_URL = import.meta.env.VITE_WS_URL || `ws://localhost:3001`;

  // Load queue from localStorage on mount
  useEffect(() => {
    const savedQueue = localStorage.getItem('jukebox_queue');
    if (savedQueue) {
      try {
        const queue = JSON.parse(savedQueue);
        console.log('[LocalStorage] Loaded queue:', queue.length, 'items');
        onQueueUpdate?.(queue);
      } catch (e) {
        console.error('[LocalStorage] Failed to parse saved queue');
      }
    }
  }, [onQueueUpdate]);

  // Save queue to localStorage whenever it updates
  const saveQueueToStorage = useCallback((queue: any[]) => {
    try {
      localStorage.setItem('jukebox_queue', JSON.stringify(queue));
      console.log('[LocalStorage] Saved queue:', queue.length, 'items');
    } catch (e) {
      console.error('[LocalStorage] Failed to save queue:', e);
    }
  }, []);

  const connect = useCallback(() => {
    const params = new URLSearchParams({
      type,
      ...(deviceId && { deviceId }),
    });

    const wsUrl = `${WS_URL}?${params.toString()}`;
    console.log('[LocalWS] Connecting to:', wsUrl);

    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('[LocalWS] Connected');
      setIsConnected(true);
      toast({
        title: 'Connected',
        description: 'Connected to local jukebox server',
      });
    };

    websocket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log('[LocalWS] Message received:', msg);

        if (msg.type === 'show_code') {
          setApprovalCode(msg.code);
          toast({
            title: 'Approval Required',
            description: `Enter code: ${msg.code}`,
            duration: 10000,
          });
        }

        if (msg.type === 'approved') {
          setApprovalCode(null);
          toast({
            title: 'Device Approved',
            description: 'Connection authorized',
          });
        }

        if (msg.type === 'state_update') {
          const state: JukeboxState = {
            isPlaying: msg.state === 'playing',
            currentSong: msg.currentVideoId || '',
            currentVideoId: msg.currentVideoId || '',
            queue: msg.queue || [],
            state: msg.state || 'paused',
            volume: msg.volume || 50,
            currentTime: msg.currentTime || 0,
            duration: msg.duration || 0,
          };
          setCurrentState(state);
          onStateUpdate?.(state);
        }

        if (msg.type === 'queue_update') {
          const queue = msg.queue || [];
          saveQueueToStorage(queue);
          onQueueUpdate?.(queue);
        }

        if (msg.type === 'load_playlist') {
          const queue = msg.queue || [];
          saveQueueToStorage(queue);
          onQueueUpdate?.(queue);
        }

        if (msg.action && onCommandReceived) {
          onCommandReceived(msg);
        }
      } catch (error) {
        console.error('[LocalWS] Parse error:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('[LocalWS] Error:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to local server',
        variant: 'destructive',
      });
    };

    websocket.onclose = () => {
      console.log('[LocalWS] Disconnected');
      setIsConnected(false);
      
      // Auto-reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('[LocalWS] Attempting reconnect...');
        connect();
      }, 3000);
    };

    setWs(websocket);
  }, [type, deviceId, WS_URL, toast, onCommandReceived, onStateUpdate, onQueueUpdate]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [connect]);

  const sendCommand = useCallback(
    (command: JukeboxCommand) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn('[LocalWS] Cannot send, not connected');
        return false;
      }

      console.log('[LocalWS] Sending command:', command);
      ws.send(JSON.stringify(command));
      return true;
    },
    [ws]
  );

  const approveDevice = useCallback(
    (code: string) => {
      sendCommand({
        type: 'control',
        action: 'clear_queue',
        payload: { code },
      } as any);
      
      ws?.send(JSON.stringify({
        type: 'device_approve',
        code: code.toUpperCase(),
      }));
    },
    [ws, sendCommand]
  );

  const addToQueue = useCallback(
    (videoId: string, title: string) => {
      ws?.send(JSON.stringify({
        type: 'queue_add',
        videoId,
        title,
      }));
    },
    [ws]
  );

  const removeFromQueue = useCallback(
    (index: number) => {
      ws?.send(JSON.stringify({
        type: 'queue_remove',
        index,
      }));
    },
    [ws]
  );

  return {
    isConnected,
    approvalCode,
    currentState,
    sendCommand,
    approveDevice,
    addToQueue,
    removeFromQueue,
  };
};
