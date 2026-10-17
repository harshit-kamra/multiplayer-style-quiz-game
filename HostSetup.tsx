import { useState } from 'react';
import { ArrowLeft, Crown, Settings } from 'lucide-react';
import { api } from '@/lib/api';
import { CATEGORIES, QUESTION_COUNTS, QUESTION_TIMES } from '@/lib/supabase';
import type { Player, Room } from '@/lib/supabase';

interface Props {
  onBack: () => void;
  onCreated: (room: Room, player: Player) => void;
}

export default function HostSetup({ onBack, onCreated }: Props) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('Mixed');
  const [count, setCount] = useState<number>(10);
  const [time, setTime] = useState<number>(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    if (!name.trim()) {
      setError('Enter a host name');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { room, player } = await api.createRoom(name.trim(), category, count, time);
      onCreated(room, player);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pixel-bg scanlines flex flex-col items-center p-4 sm:p-6">
      <div className="w-full max-w-xl flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-pixel-cyan hover:text-pixel-pink transition-colors">
            <ArrowLeft size={28} />
          </button>
          <h1 className="font-pixel text-lg sm:text-2xl text-pixel-yellow flex items-center gap-2">
            <Crown size={22} className="text-pixel-yellow" /> HOST SETUP
          </h1>
        </div>

        <div className="bg-pixel-bg2 pixel-border p-5 flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className="font-pixel text-xs text-pixel-cyan">YOUR NAME</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              placeholder="HostPlayer..."
              className="font-vt text-xl bg-pixel-bg text-pixel-green px-3 py-2 outline-none border-2 border-pixel-purple focus:border-pixel-cyan"
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="font-pixel text-xs text-pixel-cyan flex items-center gap-2">
              <Settings size={14} /> CATEGORY
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`font-vt text-base px-2 py-2 border-2 transition-colors ${
                    category === c
                      ? 'border-pixel-yellow bg-pixel-yellow text-black'
                      : 'border-pixel-purple text-pixel-purple hover:text-pixel-yellow hover:border-pixel-yellow'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-pixel text-xs text-pixel-cyan">QUESTIONS</span>
            <div className="flex gap-2">
              {QUESTION_COUNTS.map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`font-pixel text-sm flex-1 py-2 border-2 transition-colors ${
                    count === n
                      ? 'border-pixel-green bg-pixel-green text-black'
                      : 'border-pixel-purple text-pixel-purple hover:text-pixel-green hover:border-pixel-green'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-pixel text-xs text-pixel-cyan">TIME / QUESTION</span>
            <div className="flex gap-2">
              {QUESTION_TIMES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTime(t)}
                  className={`font-pixel text-sm flex-1 py-2 border-2 transition-colors ${
                    time === t
                      ? 'border-pixel-pink bg-pixel-pink text-white'
                      : 'border-pixel-purple text-pixel-purple hover:text-pixel-pink hover:border-pixel-pink'
                  }`}
                >
                  {t}s
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="font-vt text-lg text-pixel-red bg-pixel-bg px-3 py-2 border-2 border-pixel-red">
              ! {error}
            </p>
          )}

          <button
            onClick={create}
            disabled={loading}
            className="pixel-btn bg-pixel-green text-black text-sm w-full pixel-border-green"
          >
            {loading ? 'CREATING...' : 'CREATE ROOM'}
          </button>
        </div>
      </div>
    </div>
  );
}
