# Multiplayer Quiz Game — Pixel Edition

A live, real-time multiplayer quiz game with a retro pixel-art theme. A host creates a room with a unique code, players join from their phones, and everyone races to answer trivia questions against a countdown timer. Scores update live on a shared leaderboard, ending with a top-3 podium.

## Features

- **Host creates a room** — generates a unique 6-character room code shown large with a copy button and a scannable QR code.
- **Players join** — enter the room code + nickname. Invalid codes, already-started games, and duplicate nicknames show clear errors.
- **Live lobby** — players appear in the host's lobby in real time as they join. Host picks category, number of questions (5/10/15), and time per question (10/20/30s).
- **Countdown timer** — every question has a visual timer bar that turns red in the final seconds. At zero, answers lock and the correct answer is revealed.
- **4 colored answer buttons** — large, tappable, mobile-first.
- **Server-side scoring** — 1000 points for a correct answer plus a speed bonus (up to +500 for the fastest). Wrong/timeout = 0. Scores are calculated on the server so players can't cheat.
- **Live leaderboard** — updates in real time after every question.
- **Final podium** — top 3 players on a 3-tier podium, with full standings below.
- **Reconnection** — refresh your browser and you rejoin the same room.
- **Multiple rooms** — run many games at once without interference.
- **50+ questions** across 5 categories: General Knowledge, Science, Technology, Sports, Movies.

## Tech Stack

- **Frontend:** React + TypeScript + Vite, Tailwind CSS, lucide-react icons
- **Backend:** Supabase (Postgres, Realtime, Edge Functions)
- **Realtime:** Supabase Realtime (postgres_changes) for player joins, score updates, question advances, and reveals
- **Server logic:** Deno Edge Function (`game-engine`) handles room creation, joins, game flow, answer validation, and scoring
- **Theme:** Custom pixel-art CSS with Press Start 2P + VT323 fonts, scanlines, and chunky pixel borders

## How to Run Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env` values — the Supabase URL and anon key must be present (pre-populated in Bolt environments).
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open the local URL in your browser.

The Supabase schema, RLS policies, realtime publication, and question bank are applied via migrations. The `game-engine` edge function is deployed to Supabase.

## How to Play

1. **Host:** click "Host a Game", enter your name, pick a category + number of questions + time per question, then "Create Room".
2. Share the **6-character room code** or the **QR code** with friends.
3. **Players:** scan the QR code or go to the site, click "Join a Game", enter the code and a nickname.
4. When everyone's in, the host clicks **Start Game**.
5. Each question appears on everyone's screen at the same time with 4 colored options. Tap one — you only get one answer!
6. When the timer ends, the correct answer is revealed and the live leaderboard updates.
7. After the last question, the **top 3** face off on the podium. Hit "Play Again" or go back home.

Tip: answer fast — the speed bonus rewards quick correct answers with up to 500 extra points.

## Project Structure

```
src/
  components/    QrCode.tsx
  lib/           supabase.ts (client + types), api.ts (edge fn calls), useHeartbeat.ts
  screens/       Home, HostSetup, JoinGame, Lobby, Game, Results
  App.tsx        routing + state
supabase/
  functions/game-engine/index.ts   server-side game logic
  config.toml
```
