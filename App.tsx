import { useCallback, useEffect, useState } from 'react';
import Home from '@/screens/Home';
import HostSetup from '@/screens/HostSetup';
import JoinGame from '@/screens/JoinGame';
import Lobby from '@/screens/Lobby';
import Game from '@/screens/Game';
import Results from '@/screens/Results';
import type { Player, Room } from '@/lib/supabase';
import { useHeartbeat } from '@/lib/useHeartbeat';

type Screen = 'home' | 'host' | 'join' | 'lobby' | 'game' | 'results';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [room, setRoom] = useState<Room | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [joinPrefill, setJoinPrefill] = useState<string | undefined>(undefined);

  useHeartbeat(player?.id ?? null);

  // Parse hash for #join=CODE
  useEffect(() => {
    const m = window.location.hash.match(/join=([A-Za-z0-9]{6})/);
    if (m) {
      setJoinPrefill(m[1].toUpperCase());
      setScreen('join');
    }
  }, []);

  const goHome = useCallback(() => {
    setRoom(null);
    setPlayer(null);
    setScreen('home');
    if (window.location.hash) window.location.hash = '';
  }, []);

  const handleHost = () => setScreen('host');
  const handleJoin = () => setScreen('join');

  const handleCreated = (r: Room, p: Player) => {
    setRoom(r);
    setPlayer(p);
    setScreen('lobby');
  };

  const handleJoined = (r: Room, p: Player) => {
    setRoom(r);
    setPlayer(p);
    if (r.status === 'playing') setScreen('game');
    else if (r.status === 'finished') setScreen('results');
    else setScreen('lobby');
  };

  const handleGameStart = () => setScreen('game');
  const handleGameEnd = () => setScreen('results');

  const handlePlayAgain = async () => {
    // Host goes to a fresh host setup; players go home to rejoin
    if (player?.is_host) {
      goHome();
      setScreen('host');
    } else {
      goHome();
      setScreen('join');
    }
  };

  if (screen === 'home') {
    return <Home onHost={handleHost} onJoin={handleJoin} initialCode={joinPrefill} onJoinWithCode={(code) => { setJoinPrefill(code); setScreen('join'); }} />;
  }
  if (screen === 'host') {
    return <HostSetup onBack={goHome} onCreated={handleCreated} />;
  }
  if (screen === 'join') {
    return <JoinGame onBack={goHome} onJoined={handleJoined} initialCode={joinPrefill} />;
  }
  if (screen === 'lobby' && room && player) {
    return <Lobby room={room} player={player} onGameStart={handleGameStart} onLeave={goHome} />;
  }
  if (screen === 'game' && room && player) {
    return <Game room={room} player={player} onGameEnd={handleGameEnd} onLeave={goHome} />;
  }
  if (screen === 'results' && room && player) {
    return <Results room={room} playerId={player.id} onPlayAgain={handlePlayAgain} onHome={goHome} />;
  }
  // fallback
  return <Home onHost={handleHost} onJoin={handleJoin} initialCode={joinPrefill} onJoinWithCode={(code) => { setJoinPrefill(code); setScreen('join'); }} />;
}
