// Server-side access to the tarkov.dev JSON API.
// The old GraphQL endpoint (api.tarkov.dev/graphql) no longer answers; the data now comes as
// plain JSON files per game mode, listed at https://json.tarkov.dev/endpoints.
// Texts (names) are separate files: "<path>_en" maps a translation key to the English text.

import type { GameMode, TarkovData } from '../types/tarkov'
import { buildTarkovData } from './quest-costs'

const API_BASE = 'https://json.tarkov.dev'

// How long a built result is served before tarkov.dev is asked again
const REVALIDATE_MS = 2 * 60 * 1000

export interface RawCountedItem {
  item: string
  count: number
  attributes?: Record<string, unknown>
}

export interface RawTraderOffer {
  trader: string
  price: number
  priceRUB: number
  currency: string
  minTraderLevel?: number
  taskUnlock?: string | null
  buyLimit?: number
}

export interface RawTraderPrice {
  trader: string
  price: number
  priceRUB: number
  currency: string
}

export interface RawItem {
  id: string
  name: string
  shortName: string
  types: string[]
  wikiLink?: string
  iconLink?: string
  basePrice?: number
  lastLowPrice?: number | null
  avg24hPrice?: number | null
  changeLast48hPercent?: number | null
  containsItems?: RawCountedItem[]
  buyFromTrader?: RawTraderOffer[]
  sellToTrader?: RawTraderPrice[]
}

export interface RawBarter {
  id: string
  trader: string
  taskUnlock?: string | null
  requiredItems: RawCountedItem[]
  buyLimit?: number
  minTraderLevel: number
  offeredItem: RawCountedItem
}

export interface RawCraft {
  id: string
  station: string
  level: number
  duration: number
  taskUnlock?: string | null
  requiredItems: RawCountedItem[]
  productItem: RawCountedItem
}

export interface RawObjective {
  id: string
  type: string
  description?: string
  count?: number
  items?: string[]
  foundInRaid?: boolean
  maps?: string[]
}

export interface RawTask {
  id: string
  name: string
  wikiLink?: string
  taskImageLink?: string
  minPlayerLevel?: number
  objectives: RawObjective[]
}

export interface RawTrader {
  id: string
  name: string
  normalizedName: string
  imageLink?: string
}

export interface RawStation {
  id: string
  name: string
  normalizedName: string
  imageLink?: string
}

export interface RawSeason {
  name: string
  start: number
  end: number
}

export interface RawData {
  items: Record<string, RawItem>
  fleaMarket: { enabled?: boolean; sellOfferFeeRate?: number; sellRequirementFeeRate?: number }
  settings: { gpCoinValue?: number }
  tasks: Record<string, RawTask>
  barters: RawBarter[]
  crafts: RawCraft[]
  traders: Record<string, RawTrader>
  stations: Record<string, RawStation>
  // Translation key -> English text, merged from all "_en" files
  texts: Record<string, string>
  season?: RawSeason
  itemsLastModified?: number
}

interface FetchResult<T> {
  notModified: boolean
  data?: T
  etag?: string
  lastModified?: string
}

async function fetchJson<T>(path: string, etag?: string): Promise<FetchResult<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (etag) headers['If-None-Match'] = etag

  // The item file is far above the size Next.js can keep in its fetch cache, so it is not used
  const response = await fetch(`${API_BASE}${path}`, { headers, cache: 'no-store' })

  if (response.status === 304) {
    return { notModified: true, etag }
  }
  if (!response.ok) {
    throw new Error(`tarkov.dev answered ${response.status} for ${path}`)
  }

  const body = (await response.json()) as { data: T }
  return {
    notModified: false,
    data: body.data,
    etag: response.headers.get('etag') ?? undefined,
    lastModified: response.headers.get('last-modified') ?? undefined
  }
}

async function fetchData<T>(path: string): Promise<T> {
  const result = await fetchJson<T>(path)
  return result.data as T
}

// Hideout stations come as a list in some versions of the API and keyed by id in others
function byId<T extends { id: string }>(value: Record<string, T> | T[]): Record<string, T> {
  if (!Array.isArray(value)) return value
  return Object.fromEntries(value.map(entry => [entry.id, entry]))
}

interface ItemsFile {
  items: Record<string, RawItem>
  fleaMarket: RawData['fleaMarket']
  settings: RawData['settings']
}

async function fetchSeason(): Promise<{ season: RawSeason; texts: Record<string, string> } | undefined> {
  try {
    const [season, texts] = await Promise.all([
      fetchData<RawSeason>('/pvp-season/season'),
      fetchData<Record<string, string>>('/pvp-season/season_en')
    ])
    return { season, texts }
  } catch {
    // The season is only shown as a label, so the page works without it
    return undefined
  }
}

async function loadRawData(gameMode: GameMode, itemsResult: FetchResult<ItemsFile>): Promise<RawData> {
  const base = `/${gameMode}`
  const [tasksFile, barters, crafts, traders, hideout, itemsEn, tasksEn, tradersEn, hideoutEn, season] =
    await Promise.all([
      fetchData<{ tasks: Record<string, RawTask> }>(`${base}/tasks`),
      fetchData<RawBarter[]>(`${base}/barters`),
      fetchData<RawCraft[]>(`${base}/crafts`),
      fetchData<Record<string, RawTrader>>(`${base}/traders`),
      fetchData<Record<string, RawStation> | RawStation[]>(`${base}/hideout`),
      fetchData<Record<string, string>>(`${base}/items_en`),
      fetchData<Record<string, string>>(`${base}/tasks_en`),
      fetchData<Record<string, string>>(`${base}/traders_en`),
      fetchData<Record<string, string>>(`${base}/hideout_en`),
      gameMode === 'pvp-season' ? fetchSeason() : Promise.resolve(undefined)
    ])

  const itemsFile = itemsResult.data as ItemsFile
  const lastModified = itemsResult.lastModified ? Date.parse(itemsResult.lastModified) : NaN

  return {
    items: itemsFile.items,
    fleaMarket: itemsFile.fleaMarket ?? {},
    settings: itemsFile.settings ?? {},
    tasks: tasksFile.tasks,
    barters,
    crafts,
    traders: byId(traders),
    stations: byId(hideout),
    texts: { ...itemsEn, ...tasksEn, ...tradersEn, ...hideoutEn, ...(season?.texts ?? {}) },
    season: season?.season,
    itemsLastModified: Number.isNaN(lastModified) ? undefined : lastModified
  }
}

interface CacheEntry {
  data: TarkovData
  checkedAt: number
  itemsEtag?: string
}

const cache = new Map<GameMode, CacheEntry>()
const inflight = new Map<GameMode, Promise<TarkovData>>()

async function refresh(gameMode: GameMode): Promise<TarkovData> {
  const entry = cache.get(gameMode)
  const now = Date.now()

  // Prices live in the item file. If it has not changed, the result we already built is still right.
  const itemsResult = await fetchJson<ItemsFile>(`/${gameMode}/items`, entry?.itemsEtag)
  if (itemsResult.notModified && entry) {
    entry.checkedAt = now
    entry.data = { ...entry.data, timestamp: now }
    return entry.data
  }

  const raw = await loadRawData(gameMode, itemsResult)
  const data = buildTarkovData(raw, gameMode, now)
  cache.set(gameMode, { data, checkedAt: now, itemsEtag: itemsResult.etag })
  return data
}

export async function getTarkovData(gameMode: GameMode): Promise<TarkovData> {
  const entry = cache.get(gameMode)
  if (entry && Date.now() - entry.checkedAt < REVALIDATE_MS) {
    return entry.data
  }

  const running = inflight.get(gameMode)
  if (running) return running

  const request = refresh(gameMode)
    .catch(error => {
      // Old prices are better than an error page while tarkov.dev is unreachable
      if (entry) {
        console.error(`tarkov.dev refresh failed for ${gameMode}, serving the last result:`, error)
        return entry.data
      }
      throw error
    })
    .finally(() => {
      inflight.delete(gameMode)
    })

  inflight.set(gameMode, request)
  return request
}
