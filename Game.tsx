import { useEffect, useRef, useState } from 'react';
import { Trophy, Zap, Clock, Check, X, Loader2, ChevronRight, Eye } from 'lucide-react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { OPTION_COLORS } from '@/lib/supabase';
import type { Answer, GameQuestion, Player, Question, Room } from '@/lib/supabase';

interface Props {
  room: Room;
  player: Player;
  onGameEnd: () => void;
  onLeave: () => void;
}

type Phase = 'question' | 'reveal';

export default function Game({ room: initialRoom, player, onGameEnd, onLeave }: Props) {
  const [currentRoom, setCurrentRoom] = useState<Room>(initialRoom);
  const [gqs, setGqs] = useState<GameQuestion[]>([]);
  const [questions, setQuestions] = useState<Record<string, Question>>({});
  const [players, setPlayers] = useState<Player[]>([]);
  const [myAnswer, setMyAnswer] = useState<Answer | null>(null);
  const [roomAnswers, setRoomAnswers] = useState<Answer[]>([]);
  const [phase, setPhase] = useState<Phase>('question');
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [loaded, setLoaded] = useState(false);
  const isHost = player.is_host;
  const revealDone = useRef(false);
  const endedRef = useRef(false);

  const currentPos = currentRoom.current_index;
  const currentGq = gqs.find((g) => g.position === currentPos);
  const currentQ = currentGq ? questions[currentGq.question_id] : null;

  // Refs for use inside realtime callbacks (which capture stale closures)
  const currentRoomRef = useRef(currentRoom);
  currentRoomRef.current = currentRoom;
  const myAnswerRef = useRef(myAnswer);
  myAnswerRef.current = myAnswer;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // On mount: fetch the LATEST room state (the prop may be stale from lobby)
  // + game questions + question texts + players + all answers for current position
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: freshRoom } = await supabase.from('rooms').select().eq('id', initialRoom.id).maybeSingle();
      if (cancelled) return;
      if (freshRoom) {
        setCurrentRoom(freshRoom);
        if (freshRoom.status === 'finished' && !endedRef.current) {
          endedRef.current = true;
          onGameEnd();
          return;
        }
      }

      const { data: gqRows } = await supabase.from('game_questions').select().eq('room_id', initialRoom.id).order('position');
      if (cancelled) return;
      if (gqRows) {
        setGqs(gqRows);
        const qIds = [...new Set(gqRows.map((g) => g.question_id))];
        const { data: qRows } = await supabase.from('questions').select().in('id', qIds);
        const map: Record<string, Question> = {};
        qRows?.forEach((q) => { map[q.id] = q; });
        setQuestions(map);
      }

      const { data: pRows } = await supabase.from('players').select().eq('room_id', initialRoom.id).order('score', { ascending: false });
      if (cancelled) return;
      if (pRows) setPlayers(pRows);

      const roomToUse = freshRoom || initialRoom;
      const { data: aRows } = await supabase.from('answers').select().eq('room_id', initialRoom.id).eq('position', roomToUse.current_index);
      if (cancelled) return;
      if (aRows) {
        setRoomAnswers(aRows);
        const mine = aRows.find((a) => a.player_id === player.id);
        if (mine) setMyAnswer(mine);
      }

      // If the current question was already revealed (e.g. reconnect), show reveal
      const { data: curGq } = await supabase.from('game_questions').select().eq('room_id', initialRoom.id).eq('position', roomToUse.current_index).maybeSingle();
      if (cancelled) return;
      if (curGq?.revealed) {
        const { data: q } = await supabase.from('questions').select().eq('id', curGq.question_id).maybeSingle();
        if (q) {
          setCorrectIndex(q.correct_index);
          setPhase('reveal');
          revealDone.current = true;
        }
      }

      setLoaded(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRoom.id]);

  // Realtime: subscribe once per room + player
  useEffect(() => {
    const channel = supabase
      .channel(`game-${initialRoom.id}-${player.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${initialRoom.id}` }, (payload) => {
        const r = payload.new as Room;
        setCurrentRoom((prev) => {
          if (r.current_index !== prev.current_index || (prev.status !== 'playing' && r.status === 'playing')) {
            setMyAnswer(null);
            setCorrectIndex(null);
            setPhase('question');
            revealDone.current = false;
            // fetch answers for the new position
            supabase.from('answers').select().eq('room_id', initialRoom.id).eq('position', r.current_index).then(({ data }) => {
              setRoomAnswers(data || []);
            });
          }
          if (r.status === 'finished' && !endedRef.current) {
            endedRef.current = true;
            setTimeout(() => onGameEnd(), 200);
          }
          return r;
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${initialRoom.id}` }, () => {
        supabase.from('players').select().eq('room_id', initialRoom.id).order('score', { ascending: false }).then(({ data }) => {
          if (data) setPlayers(data);
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'answers', filter: `room_id=eq.${initialRoom.id}` }, (payload) => {
        const ans = payload.new as Answer;
        if (ans.position !== currentRoomRef.current.current_index) return;
        setRoomAnswers((prev) => {
          if (prev.some((a) => a.id === ans.id)) return prev;
          return [...prev, ans];
        });
        if (ans.player_id === player.id) setMyAnswer(ans);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_questions', filter: `room_id=eq.${initialRoom.id}` }, (payload) => {
        const gq = payload.new as GameQuestion;
        if (gq.revealed && gq.position === currentRoomRef.current.current_index && phaseRef.current === 'question') {
          // Fetch correct index
          supabase.from('questions').select().eq('id', gq.question_id).maybeSingle().then(({ data: q }) => {
            if (q) {
              setCorrectIndex(q.correct_index);
              setPhase('reveal');
            }
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRoom.id, player.id]);

  // Timer tick — every 100ms
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, []);

  const endsAt = currentRoom.current_ends_at ? new Date(currentRoom.current_ends_at).getTime() : null;
  const totalTime = currentRoom.question_time;
  const timeRemaining = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : totalTime;
  const pct = endsAt ? Math.max(0, Math.min(100, ((endsAt - now) / (totalTime * 1000)) * 100)) : 100;
  const timeUp = endsAt ? now >= endsAt : false;

  // How many players have answered the current question
  const answeredCount = roomAnswers.length;
  const allAnswered = players.length > 0 && answeredCount >= players.length;

  // Polling fallback: when the timer is up or we've answered, poll for the
  // reveal state every 800ms. Mobile connections drop realtime events often,
  // so this guarantees everyone (host included) sees the correct-answer screen.
  useEffect(() => {
    if (!loaded || phase !== 'question') return;
    if (!timeUp && !myAnswer) return;

    let stopped = false;
    const poll = async () => {
      while (!stopped) {
        if (phaseRef.current !== 'question') break;
        const { data: r } = await supabase.from('rooms').select().eq('id', initialRoom.id).maybeSingle();
        if (!r) { await new Promise((res) => setTimeout(res, 800)); continue; }
        if (r.current_index !== currentRoomRef.current.current_index) {
          setCurrentRoom(r);
          setMyAnswer(null);
          setCorrectIndex(null);
          setPhase('question');
          revealDone.current = false;
          const { data: aRows } = await supabase.from('answers').select().eq('room_id', initialRoom.id).eq('position', r.current_index);
          setRoomAnswers(aRows || []);
          const mine = (aRows || []).find((a) => a.player_id === player.id);
          if (mine) setMyAnswer(mine);
          break;
        }
        if (r.status === 'finished') {
          if (!endedRef.current) { endedRef.current = true; onGameEnd(); }
          break;
        }
        const { data: gq } = await supabase.from('game_questions').select().eq('room_id', initialRoom.id).eq('position', r.current_index).maybeSingle();
        if (gq?.revealed) {
          const { data: q } = await supabase.from('questions').select().eq('id', gq.question_id).maybeSingle();
          if (q) {
            setCorrectIndex(q.correct_index);
            setPhase('reveal');
            const { data: pRows } = await supabase.from('players').select().eq('room_id', initialRoom.id).order('score', { ascending: false });
            if (pRows) setPlayers(pRows);
            if (!myAnswerRef.current) {
              const { data: aRows } = await supabase.from('answers').select().eq('room_id', initialRoom.id).eq('player_id', player.id).eq('position', r.current_index).maybeSingle();
              if (aRows) setMyAnswer(aRows);
            }
          }
          break;
        }
        await new Promise((res) => setTimeout(res, 800));
      }
    };
    poll();
    return () => { stopped = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp, myAnswer, phase, loaded]);

  // Auto-reveal when timer expires (host triggers it)
  useEffect(() => {
    if (phase !== 'question' || !loaded) return;
    if (timeUp && isHost && !revealDone.current) {
      revealDone.current = true;
      doReveal();
    }
    if (timeUp && !isHost && !myAnswer && !submitting) {
      setSubmitting(true);
      api.submitAnswer(initialRoom.id, player.id, currentPos, -1).catch(() => {}).finally(() => setSubmitting(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp, phase, isHost, myAnswer, currentPos, submitting, loaded]);

  const submit = async (idx: number) => {
    if (myAnswer || phase !== 'question' || submitting || timeUp) return;
    setSubmitting(true);
    setError(null);
    try {
      const data = await api.submitAnswer(initialRoom.id, player.id, currentPos, idx);
      setMyAnswer(data.answer as Answer);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('Already answered')) {
        const { data: existing } = await supabase.from('answers').select().eq('room_id', initialRoom.id).eq('player_id', player.id).eq('position', currentPos).maybeSingle();
        if (existing) setMyAnswer(existing as Answer);
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const doReveal = async () => {
    try {
      const d = await api.endQuestion(initialRoom.id, currentPos);
      setCorrectIndex(d.correctIndex);
      setPhase('reveal');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const nextQuestion = async () => {
    try {
      await api.nextQuestion(initialRoom.id);
      // realtime will update room -> new question
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const isLast = currentPos >= gqs.length - 1;

  if (!loaded) {
    return (
      <div className="min-h-screen pixel-bg scanlines flex flex-col items-center justify-center p-4">
        <Loader2 size={32} className="animate-spin text-pixel-cyan mb-3" />
        <span className="font-vt text-xl text-pixel-cyan">LOADING GAME...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen pixel-bg scanlines flex flex-col items-center p-3 sm:p-5">
      <div className="w-full max-w-3xl flex flex-col gap-4">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-pixel text-xs sm:text-sm text-pixel-yellow">
            Q {currentPos + 1}/{gqs.length || '?'}
          </span>
          <span className="font-vt text-base text-pixel-cyan truncate">
            {currentRoom.category}
          </span>
          <button onClick={onLeave} className="font-vt text-sm text-pixel-purple hover:text-pixel-pink">
            LEAVE
          </button>
        </div>

        {/* Timer bar */}
        <div className="w-full h-6 bg-pixel-bg2 border-2 border-pixel-purple relative overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ${timeRemaining <= 5 ? 'bg-pixel-red' : timeRemaining <= 10 ? 'bg-pixel-orange' : 'bg-pixel-green'}`}
            style={{ width: `${pct}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center font-pixel text-xs text-white">
            <Clock size={14} className="mr-1" /> {timeRemaining}s
          </div>
        </div>

        {/* Answered indicator */}
        <div className="font-vt text-sm text-pixel-purple text-center">
          &gt; {answeredCount}/{players.length} ANSWERED &lt;
        </div>

        {/* Question card */}
        {currentQ && phase !== 'reveal' && (
          <div className="bg-pixel-bg2 pixel-border p-4 sm:p-6">
            <div className="font-pixel text-xs text-pixel-pink mb-3">{currentQ.category}</div>
            <p className="font-vt text-xl sm:text-2xl text-pixel-green leading-snug">
              {currentQ.prompt}
            </p>
          </div>
        )}

        {/* Options */}
        {currentQ && phase !== 'reveal' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQ.options.map((opt, idx) => {
              const color = OPTION_COLORS[idx];
              const selected = myAnswer?.selected_index === idx;
              return (
                <button
                  key={idx}
                  onClick={() => submit(idx)}
                  disabled={!!myAnswer || submitting || timeUp}
                  className={`relative ${color.bg} ${color.text} font-vt text-lg sm:text-xl p-4 text-left border-4 border-pixel-bg transition-all hover:brightness-110 ${myAnswer ? 'opacity-70' : 'hover:translate-x-1'} ${selected ? 'ring-4 ring-white' : ''}`}
                >
                  <span className="font-pixel text-sm mr-2">{color.label}</span>
                  {opt}
                  {selected && <Check size={20} className="absolute top-2 right-2" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Waiting after answer (non-host; host has the reveal button) */}
        {myAnswer && phase === 'question' && !isHost && (
          <div className="bg-pixel-bg2 border-2 border-pixel-cyan p-4 text-center">
            <Loader2 size={20} className="inline animate-spin text-pixel-cyan mr-2" />
            <span className="font-vt text-lg text-pixel-cyan">&gt; ANSWER LOCKED. WAITING... &lt;</span>
          </div>
        )}

        {/* Host reveal button — always available to host during question phase
            so the host is never stuck waiting for a timer that may not fire. */}
        {isHost && phase === 'question' && (
          <button
            onClick={doReveal}
            className="pixel-btn bg-pixel-orange text-black text-xs sm:text-sm w-full pixel-border-yellow"
          >
            <span className="flex items-center justify-center gap-2">
              <Eye size={18} /> REVEAL ANSWER{allAnswered && !timeUp ? ' (ALL ANSWERED)' : ''}
            </span>
          </button>
        )}

        {error && (
          <p className="font-vt text-lg text-pixel-red bg-pixel-bg px-3 py-2 border-2 border-pixel-red">
            ! {error}
          </p>
        )}

        {/* Reveal phase */}
        {phase === 'reveal' && currentQ && correctIndex !== null && (
          <div className="bg-pixel-bg2 pixel-border-yellow p-5 flex flex-col gap-4 slide-in">
            <div className="font-pixel text-sm text-pixel-yellow text-center">&gt; CORRECT ANSWER &lt;</div>
            <div className="font-vt text-xl text-pixel-green text-center mb-2">{currentQ.prompt}</div>
            {currentQ.options.map((opt, idx) => {
              const color = OPTION_COLORS[idx];
              const isCorrect = idx === correctIndex;
              const mine = myAnswer?.selected_index === idx;
              return (
                <div
                  key={idx}
                  className={`${color.bg} ${color.text} font-vt text-lg p-3 border-4 ${isCorrect ? 'border-white option-correct' : 'border-pixel-bg opacity-60'}`}
                >
                  <span className="font-pixel text-xs mr-2">{color.label}</span>
                  {opt}
                  {isCorrect && <Check size={18} className="inline ml-2" />}
                  {mine && !isCorrect && <X size={18} className="inline ml-2" />}
                  {mine && <span className="ml-2 font-pixel text-xs">[YOURS]</span>}
                </div>
              );
            })}

            {/* My result */}
            {myAnswer && (
              <div className="text-center font-vt text-lg">
                {myAnswer.is_correct ? (
                  <span className="text-pixel-green">
                    <Zap size={16} className="inline mr-1" /> CORRECT! +{myAnswer.points_awarded} pts
                  </span>
                ) : (
                  <span className="text-pixel-red">Wrong or no answer this round.</span>
                )}
              </div>
            )}
            {!myAnswer && (
              <div className="text-center font-vt text-lg text-pixel-red">
                No answer submitted.
              </div>
            )}

            {/* Mini leaderboard */}
            <div className="bg-pixel-bg border-2 border-pixel-purple p-3">
              <div className="font-pixel text-xs text-pixel-cyan mb-2 flex items-center gap-1">
                <Trophy size={14} /> LIVE LEADERBOARD
              </div>
              <div className="flex flex-col gap-1">
                {players.slice(0, 8).map((p, i) => (
                  <div
                    key={p.id}
                    className={`font-vt text-base flex justify-between px-2 py-1 ${p.id === player.id ? 'text-pixel-yellow border-2 border-pixel-yellow' : 'text-pixel-green'}`}
                  >
                    <span>#{i + 1} {p.nickname}{p.is_host ? ' [H]' : ''}</span>
                    <span className="text-pixel-cyan">{p.score}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Host controls */}
            {isHost && (
              <button
                onClick={nextQuestion}
                className="pixel-btn bg-pixel-yellow text-black text-sm w-full pixel-border-yellow"
              >
                <span className="flex items-center justify-center gap-2">
                  <ChevronRight size={20} /> {isLast ? 'FINISH GAME' : 'NEXT QUESTION'}
                </span>
              </button>
            )}
            {!isHost && (
              <p className="font-vt text-base text-pixel-purple text-center blink">
                &gt; WAITING FOR HOST... &lt;
              </p>
            )}
          </div>
        )}

        {/* Waiting for reveal (player, timer up, answer locked) */}
        {phase === 'question' && (timeUp || myAnswer) && !isHost && (
          <div className="bg-pixel-bg2 border-2 border-pixel-pink p-5 text-center">
            <Loader2 size={24} className="inline animate-spin text-pixel-pink mr-2" />
            <span className="font-vt text-xl text-pixel-pink">&gt; WAITING FOR ANSWER REVEAL... &lt;</span>
          </div>
        )}

        {/* Loading state */}
        {!currentQ && phase !== 'reveal' && (
          <div className="bg-pixel-bg2 pixel-border p-8 text-center">
            <Loader2 size={28} className="inline animate-spin text-pixel-cyan mr-2" />
            <span className="font-vt text-xl text-pixel-cyan">LOADING QUESTION...</span>
          </div>
        )}
      </div>
    </div>
  );
}
