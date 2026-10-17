import { useEffect, useRef } from 'react';
import { api } from '@/lib/api';

/** Sends a heartbeat for the current player every 15s. */
export function useHeartbeat(playerId: string | null) {
  const idRef = useRef(playerId);
  idRef.current = playerId;

  useEffect(() => {
    if (!playerId) return;
    const interval = setInterval(() => {
      api.heartbeat(playerId).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [playerId]);
}
