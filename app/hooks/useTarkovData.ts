import { useState, useEffect, useCallback, useRef } from 'react'
import type { GameMode, TarkovData } from '../types/tarkov'
import { CACHE_DURATIONS } from '../constants/tarkov-data'

interface ModeEntry {
  data: TarkovData
  fetchedAt: number
}

// All costs are calculated on the server (app/lib/quest-costs.ts).
// This hook only loads the result for the chosen game mode and keeps it fresh.
export const useTarkovData = (gameMode: GameMode) => {
  const [entries, setEntries] = useState<Partial<Record<GameMode, ModeEntry>>>({})
  const [loadingMode, setLoadingMode] = useState<GameMode | null>(null)
  const [errors, setErrors] = useState<Partial<Record<GameMode, string>>>({})
  const inflight = useRef<Partial<Record<GameMode, Promise<void>>>>({})

  const load = useCallback((mode: GameMode) => {
    const running = inflight.current[mode]
    if (running) return running

    const request = (async () => {
      setLoadingMode(mode)
      try {
        const response = await fetch(`/api/tarkov-data?gameMode=${mode}`)
        const body = await response.json().catch(() => null)

        if (!response.ok || !body || body.error) {
          throw new Error(body?.error || `API error: ${response.status}`)
        }

        setEntries(previous => ({ ...previous, [mode]: { data: body as TarkovData, fetchedAt: Date.now() } }))
        setErrors(previous => ({ ...previous, [mode]: undefined }))
      } catch (err) {
        setErrors(previous => ({
          ...previous,
          [mode]: err instanceof Error ? err.message : 'An unknown error occurred'
        }))
      } finally {
        delete inflight.current[mode]
        setLoadingMode(current => (current === mode ? null : current))
      }
    })()

    inflight.current[mode] = request
    return request
  }, [])

  const entry = entries[gameMode]
  const fetchedAt = entry?.fetchedAt

  // Load when the mode is opened for the first time or its data is older than the client cache
  useEffect(() => {
    if (!fetchedAt || Date.now() - fetchedAt > CACHE_DURATIONS.CLIENT_CACHE) {
      load(gameMode)
    }
  }, [gameMode, fetchedAt, load])

  // Reload on its own once the prices are due for an update and the tab is visible
  useEffect(() => {
    if (!fetchedAt) return
    const interval = setInterval(() => {
      const due = Date.now() - fetchedAt > CACHE_DURATIONS.PRICE_DATA
      if (due && document.visibilityState === 'visible') {
        load(gameMode)
      }
    }, 15 * 1000)
    return () => clearInterval(interval)
  }, [gameMode, fetchedAt, load])

  return {
    data: entry?.data ?? null,
    loading: loadingMode === gameMode,
    error: errors[gameMode] ?? null,
    // When tarkov.dev last changed its prices
    pricesUpdated: entry ? new Date(entry.data.pricesUpdated) : null,
    // When this page will ask for new prices
    nextUpdateTime: fetchedAt ? new Date(fetchedAt + CACHE_DURATIONS.PRICE_DATA) : null,
    refresh: () => load(gameMode)
  }
}
