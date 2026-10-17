import { useEffect, useState } from 'react';
import { Copy, Check, Users, Play, DoorOpen, Home as HomeIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { Player, Room } from '@/lib/supabase';
import QrCode from '@/components/QrCode';

interface Props {
  room: Room;
  player: Player;
  onGameStart: () => void;
  onLeave: () => void;
}

export default function Lobby({ room, player, onGameStart, onLeave }: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isHost = player.is_host;

  const loadPlayers = async () => {
    const { data } = await supabase.from('players').select().eq('room_id', room.id).order('joined_at');
    if (data) setPlayers(data);
  };

  useEffect(() => {
    loadPlayers();
    const channel = supabase
      .channel(`lobby-${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` }, () => loadPlayers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` }, (payload) => {
        const r = payload.new as Room;
        if (r.status === 'playing') onGameStart();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  const start = async () => {
    setStarting(true);
    setError(null);
    try {
      await api.start(room.id);
      // realtime will trigger onGameStart via room update
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  };

  const joinUrl = `${window.location.origin}/#join=${room.code}`;

  return (
    <div className="min-h-screen pixel-bg scanlines flex flex-col items-center p-4 sm:p-6">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="font-pixel text-lg sm:text-2xl text-pixel-yellow">LOBBY</h1>
          <button onClick={onLeave} className="text-pixel-purple hover:text-pixel-pink transition-colors flex items-center gap-1 font-vt text-lg">
            <DoorOpen size={20} /> LEAVE
          </button>
        </div>

        {/* Room code + QR */}
        <div className="bg-pixel-bg2 pixel-border-pink p-5 flex flex-col sm:flex-row gap-5 items-center">
          <div className="flex-1 flex flex-col items-center sm:items-start gap-3">
            <span className="font-pixel text-xs text-pixel-cyan">ROOM CODE</span>
            <button
              onClick={copyCode}
              className="font-pixel text-3xl sm:text-5xl text-pixel-pink hover:text-pixel-yellow transition-colors flex items-center gap-3 pulse-glow"
              title="Click to copy"
            >
              {room.code}
              {copied ? <Check size={24} className="text-pixel-green" /> : <Copy size={24} />}
            </button>
            <span className="font-vt text-base text-pixel-purple">
              {copied ? '> COPIED!' : '> click code to copy'}
            </span>
            <div className="font-vt text-sm text-pixel-green mt-2 break-all">
              {joinUrl}
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="bg-white p-2 pixel-border-green">
              <QrCode value={joinUrl} size={160} />
            </div>
            <span className="font-vt text-sm text-pixel-green">SCAN TO JOIN</span>
          </div>
        </div>

        {/* Settings summary */}
        <div className="bg-pixel-bg2 border-2 border-pixel-purple p-3 flex flex-wrap gap-3 justify-center font-vt text-base text-pixel-cyan">
          <span>&gt; CATEGORY: <span className="text-pixel-yellow">{room.category}</span></span>
          <span>&gt; Qs: <span className="text-pixel-yellow">{room.num_questions}</span></span>
          <span>&gt; TIME: <span className="text-pixel-yellow">{room.question_time}s</span></span>
        </div>

        {/* Players */}
        <div className="bg-pixel-bg2 pixel-border p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-pixel-green" />
            <span className="font-pixel text-sm text-pixel-green">PLAYERS [{players.length}]</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {players.map((p) => (
              <div
                key={p.id}
                className="bg-pixel-bg border-2 border-pixel-purple px-3 py-2 font-vt text-lg text-pixel-green flex items-center gap-2 slide-in"
              >
                {p.is_host && <span className="text-pixel-yellow">[H]</span>}
                <span className="truncate">{p.nickname}</span>
              </div>
            ))}
            {players.length === 0 && (
              <p className="font-vt text-lg text-pixel-purple col-span-full">Waiting for players...</p>
            )}
          </div>
        </div>

        {error && (
          <p className="font-vt text-lg text-pixel-red bg-pixel-bg px-3 py-2 border-2 border-pixel-red">
            ! {error}
          </p>
        )}

        {isHost ? (
          <button
            onClick={start}
            disabled={starting || players.length < 1}
            className="pixel-btn bg-pixel-green text-black text-sm w-full pixel-border-green"
          >
            <span className="flex items-center justify-center gap-2">
              <Play size={20} /> {starting ? 'STARTING...' : 'START GAME'}
            </span>
          </button>
        ) : (
          <div className="bg-pixel-bg2 border-2 border-pixel-purple p-3 text-center">
            <p className="font-vt text-lg text-pixel-cyan blink">&gt; WAITING FOR HOST TO START... &lt;</p>
          </div>
        )}

        <button onClick={onLeave} className="font-vt text-base text-pixel-purple hover:text-pixel-pink flex items-center justify-center gap-1 mx-auto">
          <HomeIcon size={16} /> BACK TO HOME
        </button>
      </div>
    </div>
  );
}
