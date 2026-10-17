import { useState } from 'react';
import { ArrowLeft, LogIn } from 'lucide-react';
import { api } from '@/lib/api';
import type { Player, Room } from '@/lib/supabase';

interface Props {
  onBack: () => void;
  onJoined: (room: Room, player: Player) => void;
  initialCode?: string;
}

export default function JoinGame({ onBack, onJoined, initialCode }: Props) {
  const [code, setCode] = useState((initialCode || '').toUpperCase());
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    setError(null);
    if (code.length !== 6) {
      setError('Room code must be 6 characters');
      return;
    }
    if (!nickname.trim()) {
      setError('Enter a nickname');
      return;
    }
    setLoading(true);
    try {
      const { room, player } = await api.join(code, nickname.trim());
      onJoined(room, player);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pixel-bg scanlines flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-pixel-cyan hover:text-pixel-pink transition-colors">
            <ArrowLeft size={28} />
          </button>
          <h1 className="font-pixel text-lg sm:text-2xl text-pixel-cyan flex items-center gap-2">
            <LogIn size={22} /> JOIN GAME
          </h1>
        </div>

        <div className="bg-pixel-bg2 pixel-border p-5 flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className="font-pixel text-xs text-pixel-yellow">ROOM CODE</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="ABC123"
              className="font-pixel text-2xl tracking-[0.3em] bg-pixel-bg text-pixel-green px-3 py-3 outline-none border-2 border-pixel-purple focus:border-pixel-cyan text-center"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-pixel text-xs text-pixel-yellow">NICKNAME</span>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              placeholder="Player1..."
              onKeyDown={(e) => e.key === 'Enter' && join()}
              className="font-vt text-xl bg-pixel-bg text-pixel-green px-3 py-2 outline-none border-2 border-pixel-purple focus:border-pixel-cyan"
            />
          </label>

          {error && (
            <p className="font-vt text-lg text-pixel-red bg-pixel-bg px-3 py-2 border-2 border-pixel-red">
              ! {error}
            </p>
          )}

          <button
            onClick={join}
            disabled={loading}
            className="pixel-btn bg-pixel-cyan text-black text-sm w-full pixel-border"
          >
            {loading ? 'JOINING...' : 'JOIN!'}
          </button>
        </div>
      </div>
    </div>
  );
}
