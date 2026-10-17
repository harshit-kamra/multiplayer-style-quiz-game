import { useEffect, useState } from 'react';
import { Trophy, RotateCcw, Home as HomeIcon, Medal, Crown, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Answer, Player, Room } from '@/lib/supabase';

interface Props {
  room: Room;
  playerId: string;
  onPlayAgain: () => void;
  onHome: () => void;
}

interface PlayerStats {
  player: Player;
  correct: number;
  wrong: number;
  total: number;
}

export default function Results({ room, playerId, onPlayAgain, onHome }: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<Record<string, PlayerStats>>({});

  useEffect(() => {
    const loadAll = async () => {
      const { data: pRows } = await supabase.from('players').select().eq('room_id', room.id).order('score', { ascending: false });
      if (pRows) setPlayers(pRows);

      const { data: aRows } = await supabase.from('answers').select().eq('room_id', room.id);
      const map: Record<string, PlayerStats> = {};
      (pRows || []).forEach((p) => {
        map[p.id] = { player: p, correct: 0, wrong: 0, total: 0 };
      });
      (aRows || []).forEach((a) => {
        const s = map[a.player_id];
        if (!s) return;
        s.total += 1;
        if (a.is_correct) s.correct += 1;
        else s.wrong += 1;
      });
      setStats(map);
    };
    loadAll();
    const ch = supabase.channel(`results-${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` }, loadAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [room.id]);

  const top3 = players.slice(0, 3);
  const rest = players.slice(3);
  const podColors = ['text-pixel-yellow', 'text-pixel-cyan', 'text-pixel-orange'];
  const podHeights = ['h-40', 'h-28', 'h-20'];
  const podOrder = [1, 0, 2]; // 2nd, 1st, 3rd

  const myStats = stats[playerId];

  return (
    <div className="min-h-screen pixel-bg scanlines flex flex-col items-center p-4 sm:p-6">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <div className="text-center float">
          <Trophy size={56} className="text-pixel-yellow mx-auto mb-3 drop-shadow-[4px_4px_0_#ff2e88]" />
          <h1 className="font-pixel text-2xl sm:text-3xl text-pixel-yellow leading-relaxed">
            GAME OVER
          </h1>
        </div>

        {/* Podium */}
        {top3.length >= 1 && (
          <div className="flex items-end justify-center gap-2 sm:gap-4 h-48">
            {podOrder.map((orderIdx) => {
              const p = top3[orderIdx];
              if (!p) return <div key={orderIdx} className="w-20 sm:w-28" />;
              const place = orderIdx + 1;
              const color = podColors[orderIdx];
              const height = podHeights[orderIdx];
              const isMe = p.id === playerId;
              return (
                <div key={p.id} className="flex flex-col items-center w-20 sm:w-28">
                  <div className="mb-2 text-center">
                    {place === 1 && <Crown size={24} className="text-pixel-yellow mx-auto pulse-glow" />}
                    <div className={`font-pixel text-xs ${color} truncate mt-1`}>{p.nickname}</div>
                    <div className="font-vt text-base text-pixel-green">{p.score}</div>
                  </div>
                  <div
                    className={`w-full ${height} flex items-start justify-center pt-2 font-pixel text-lg ${
                      place === 1 ? 'bg-pixel-yellow text-black' : place === 2 ? 'bg-pixel-cyan text-black' : 'bg-pixel-orange text-black'
                    } ${isMe ? 'pixel-border-pink' : 'border-2 border-pixel-bg'} slide-in`}
                  >
                    {place}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Your stats */}
        {myStats && (
          <div className="bg-pixel-bg2 pixel-border-green p-4 flex flex-col gap-2">
            <div className="font-pixel text-xs text-pixel-green mb-1">&gt; YOUR RESULTS &lt;</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-pixel-bg border-2 border-pixel-green p-2">
                <Check size={18} className="inline text-pixel-green" />
                <div className="font-pixel text-lg text-pixel-green mt-1">{myStats.correct}</div>
                <div className="font-vt text-sm text-pixel-purple">CORRECT</div>
              </div>
              <div className="bg-pixel-bg border-2 border-pixel-red p-2">
                <X size={18} className="inline text-pixel-red" />
                <div className="font-pixel text-lg text-pixel-red mt-1">{myStats.wrong}</div>
                <div className="font-vt text-sm text-pixel-purple">WRONG</div>
              </div>
              <div className="bg-pixel-bg border-2 border-pixel-yellow p-2">
                <Trophy size={18} className="inline text-pixel-yellow" />
                <div className="font-pixel text-lg text-pixel-yellow mt-1">{myStats.player.score}</div>
                <div className="font-vt text-sm text-pixel-purple">POINTS</div>
              </div>
            </div>
          </div>
        )}

        {/* Full leaderboard */}
        <div className="bg-pixel-bg2 pixel-border p-4 flex flex-col gap-2">
          <div className="font-pixel text-sm text-pixel-cyan mb-2 flex items-center gap-2">
            <Medal size={16} /> FINAL STANDINGS
          </div>
          {players.map((p, i) => {
            const s = stats[p.id];
            return (
              <div
                key={p.id}
                className={`font-vt text-lg flex justify-between items-center px-3 py-2 ${
                  p.id === playerId ? 'bg-pixel-bg border-2 border-pixel-yellow text-pixel-yellow' : 'bg-pixel-bg text-pixel-green border-2 border-pixel-bg2'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="font-pixel text-xs w-6 text-pixel-purple">#{i + 1}</span>
                  {p.nickname}{p.is_host ? ' [H]' : ''}{p.id === playerId && ' (YOU)'}
                </span>
                <span className="flex items-center gap-3">
                  {s && <span className="font-vt text-sm text-pixel-green">{s.correct}/{s.total} right</span>}
                  <span className="text-pixel-cyan font-pixel text-sm">{p.score}</span>
                </span>
              </div>
            );
          })}
          {players.length === 0 && (
            <p className="font-vt text-lg text-pixel-purple text-center">No scores yet.</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={onPlayAgain} className="pixel-btn bg-pixel-green text-black text-sm flex-1 pixel-border-green">
            <span className="flex items-center justify-center gap-2"><RotateCcw size={18} /> PLAY AGAIN</span>
          </button>
          <button onClick={onHome} className="pixel-btn bg-pixel-cyan text-black text-sm flex-1 pixel-border">
            <span className="flex items-center justify-center gap-2"><HomeIcon size={18} /> HOME</span>
          </button>
        </div>
      </div>
    </div>
  );
}
