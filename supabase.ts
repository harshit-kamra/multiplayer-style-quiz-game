import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 10 } },
});

export type RoomStatus = 'lobby' | 'playing' | 'finished';

export interface Room {
  id: string;
  code: string;
  host_id: string;
  host_name: string;
  category: string;
  num_questions: number;
  question_time: number;
  status: RoomStatus;
  current_index: number;
  current_started_at: string | null;
  current_ends_at: string | null;
  created_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  session_id: string;
  nickname: string;
  score: number;
  is_host: boolean;
  last_seen_at: string;
  joined_at: string;
}

export interface Question {
  id: string;
  category: string;
  prompt: string;
  options: string[];
  correct_index: number;
}

export interface GameQuestion {
  id: string;
  room_id: string;
  position: number;
  question_id: string;
  revealed: boolean;
}

export interface Answer {
  id: string;
  room_id: string;
  player_id: string;
  position: number;
  selected_index: number | null;
  is_correct: boolean;
  points_awarded: number;
  time_taken_ms: number;
  submitted_at: string;
}

export const CATEGORIES = ['Mixed', 'General Knowledge', 'Science', 'Technology', 'Sports', 'Movies'] as const;
export const QUESTION_COUNTS = [5, 10, 15] as const;
export const QUESTION_TIMES = [10, 20, 30] as const;

export const OPTION_COLORS = [
  { bg: 'bg-pixel-pink', text: 'text-white', label: 'A' },
  { bg: 'bg-pixel-blue', text: 'text-white', label: 'B' },
  { bg: 'bg-pixel-yellow', text: 'text-black', label: 'C' },
  { bg: 'bg-pixel-green', text: 'text-black', label: 'D' },
];
