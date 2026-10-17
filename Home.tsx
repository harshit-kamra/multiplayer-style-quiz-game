import { useEffect, useState } from 'react';
import { Gamepad2, Plus, LogIn, HelpCircle } from 'lucide-react';

interface Props {
  onHost: () => void;
  onJoin: () => void;
  onJoinWithCode?: (code: string) => void;
  initialCode?: string;
}

export default function Home({ onHost, onJoin, onJoinWithCode, initialCode }: Props) {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (initialCode && onJoinWithCode) {
      onJoinWithCode(initialCode);
    }
  }, [initialCode, onJoinWithCode]);

  return (
    <div className="min-h-screen pixel-bg scanlines flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl flex flex-col items-center gap-8">
        {/* Title */}
        <div className="text-center float">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Gamepad2 size={48} className="text-pixel-cyan" />
          </div>
          <h1 className="font-pixel text-2xl sm:text-4xl text-pixel-yellow leading-relaxed drop-shadow-[4px_4px_0_#ff2e88]">
            MULTIPLAYER
          </h1>
          <h2 className="font-pixel text-2xl sm:text-4xl text-pixel-cyan leading-relaxed mt-2 drop-shadow-[4px_4px_0_#9d4edd]">
            QUIZ GAME
          </h2>
          <p className="font-vt text-xl sm:text-2xl text-pixel-green mt-4 blink">
            &gt; PRESS START &lt;
          </p>
        </div>

        {/* Buttons */}
        <div className="w-full flex flex-col gap-4">
          <button
            onClick={onHost}
            className="pixel-btn bg-pixel-pink text-white text-sm sm:text-lg w-full pixel-border-pink"
          >
            <span className="flex items-center justify-center gap-3">
              <Plus size={20} /> HOST A GAME
            </span>
          </button>
          <button
            onClick={onJoin}
            className="pixel-btn bg-pixel-cyan text-black text-sm sm:text-lg w-full pixel-border"
          >
            <span className="flex items-center justify-center gap-3">
              <LogIn size={20} /> JOIN A GAME
            </span>
          </button>
        </div>

        {/* How to Play */}
        <button
          onClick={() => setShowHelp((s) => !s)}
          className="font-pixel text-xs text-pixel-yellow flex items-center gap-2 hover:text-pixel-orange transition-colors"
        >
          <HelpCircle size={16} /> HOW TO PLAY
        </button>

        {showHelp && (
          <div className="w-full bg-pixel-bg2 pixel-border-green p-5 slide-in">
            <ul className="font-vt text-lg sm:text-xl text-pixel-green space-y-2 list-none">
              <li>&gt; HOST creates a room and shares the 6-char code.</li>
              <li>&gt; PLAYERS join with the code + a nickname.</li>
              <li>&gt; Each question has a countdown timer — answer fast!</li>
              <li>&gt; Correct = 1000 pts + a speed bonus (up to +500).</li>
              <li>&gt; Live leaderboard updates after every question.</li>
              <li>&gt; Top 3 face off on the final podium!</li>
            </ul>
          </div>
        )}

        <p className="font-vt text-sm text-pixel-purple text-center">
          v1.0 // PIXEL EDITION
        </p>
      </div>
    </div>
  );
}
