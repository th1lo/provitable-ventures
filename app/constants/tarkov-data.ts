import type { GameMode } from '../types/tarkov'

// Skier's "All on Red" task line, in the order the tasks are shown.
// The ids are the same in every game mode.
export const RED_QUEST_IDS: string[] = [
  '67af4c1405c58dc6f7056667', // Profitable Venture
  '67af4c169d95ad16e004fd86', // Safety Guarantee
  '67af4c17f4f1fb58a907f8f6', // Never Too Late To Learn
  '67af4c1991ee75c6d7060a16', // Get a Foothold
  '67af4c1a6c3ebfd8e6034916', // Profit Retention
  '67af4c1cc0e59d55e2010b97', // A Life Lesson
  '67af4c1d8c9482eca103e477'  // Consolation Prize
]

// Consolation Prize asks for Labs extractions, and every Labs raid uses up one keycard.
// The task data has no item objective for that, so the keycard is added by hand.
export const LABS_MAP_ID = '5b0fc42d86f7744a585f9105'
export const LABS_KEYCARD_ID = '5c94bbff86f7747ee735c08f'

export const GP_COIN_ID = '5d235b4d86f7742e017bc88a'

export const GAME_MODES: { id: GameMode; label: string; description: string }[] = [
  { id: 'regular', label: 'PvP', description: 'Permanent PvP characters' },
  { id: 'pve', label: 'PvE', description: 'PvE mode' },
  { id: 'pvp-season', label: 'Season', description: 'Seasonal PvP characters' }
]

export const DEFAULT_GAME_MODE: GameMode = 'regular'

export const parseGameMode = (value: string | null | undefined): GameMode => {
  if (value === 'pve') return 'pve'
  if (value === 'pvp-season' || value === 'season') return 'pvp-season'
  return 'regular'
}

// tarkov.dev refreshes flea market prices roughly every 5 minutes
export const CACHE_DURATIONS = {
  PRICE_DATA: 5 * 60 * 1000,
  CLIENT_CACHE: 2 * 60 * 1000
} as const
