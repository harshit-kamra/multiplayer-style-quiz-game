import { supabase } from './supabase';
import type { Player, Room } from './supabase';

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/game-engine`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function callFn(body: Record<string, unknown>): Promise<any> {
  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

function getSessionId(): string {
  let id = localStorage.getItem('quiz_session_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('quiz_session_id', id);
  }
  return id;
}

export const api = {
  createRoom: async (hostName: string, category: string, numQuestions: number, questionTime: number) => {
    const sessionId = getSessionId();
    const data = await callFn({ action: 'create-room', hostName, category, numQuestions, questionTime, sessionId });
    return { room: data.room as Room, player: data.player as Player, sessionId: data.sessionId as string };
  },
  join: async (code: string, nickname: string) => {
    const sessionId = getSessionId();
    const data = await callFn({ action: 'join', code, nickname, sessionId });
    return { room: data.room as Room, player: data.player as Player, sessionId: data.sessionId as string, reconnected: !!data.reconnected };
  },
  start: async (roomId: string) => {
    const sessionId = getSessionId();
    return callFn({ action: 'start', roomId, sessionId });
  },
  nextQuestion: async (roomId: string) => {
    const sessionId = getSessionId();
    return callFn({ action: 'next-question', roomId, sessionId });
  },
  endQuestion: async (roomId: string, position: number) => {
    const sessionId = getSessionId();
    return callFn({ action: 'end-question', roomId, sessionId, position });
  },
  submitAnswer: async (roomId: string, playerId: string, position: number, selectedIndex: number) => {
    const sessionId = getSessionId();
    return callFn({ action: 'submit-answer', roomId, playerId, sessionId, position, selectedIndex });
  },
  heartbeat: async (playerId: string) => {
    const sessionId = getSessionId();
    return callFn({ action: 'heartbeat', playerId, sessionId });
  },
  getRoom: async (code: string) => {
    const data = await callFn({ action: 'get-room', code });
    return data as { room: Room; players: Player[] };
  },
};

export { getSessionId };
