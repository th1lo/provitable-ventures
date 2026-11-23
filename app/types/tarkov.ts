// Game modes as named by the tarkov.dev JSON API (https://json.tarkov.dev/endpoints)
export type GameMode = 'regular' | 'pve' | 'pvp-season'

// Where the price of an ingredient comes from
export type PriceSource = 'flea' | 'trader' | 'gp' | 'estimate' | 'unknown'

// One item that is consumed (or needed as a tool) by a barter or craft
export interface CostLine {
  id: string
  name: string
  shortName: string
  iconLink: string
  wikiLink?: string
  count: number
  unitPrice: number
  totalPrice: number
  priceSource: PriceSource
  // "Flea", "Therapist LL2", "GP coin value", "Trader sell value", "No price"
  priceLabel: string
  changeLast48hPercent?: number
}

// One part you get on top of the quest item when buying a preset or pack, and where to sell it
export interface ResaleLine {
  id: string
  name: string
  shortName: string
  iconLink: string
  wikiLink?: string
  count: number
  sellTo: 'flea' | 'trader' | 'none'
  sellToLabel: string
  // Value of one unit after the flea market fee, or the trader price
  unitValue: number
  totalValue: number
  changeLast48hPercent?: number
}

export type AcquisitionType = 'flea' | 'trader' | 'barter' | 'craft' | 'bundle'

export interface AcquisitionMethod {
  id: string
  type: AcquisitionType
  // "Flea Market", "Mechanic LL4", "Workbench level 3"
  label: string
  // Trader portrait or hideout station image
  imageLink?: string
  // Cost of ONE quest item in roubles
  unitCost: number
  // What one trade or craft costs and how many quest items it gives
  batchCost: number
  outputCount: number
  // True when an ingredient has no market price and was valued at its trader sell price
  approximate: boolean
  unknownItems: string[]
  traderLevel?: number
  buyLimit?: number
  taskUnlock?: { id: string; name: string; wikiLink?: string }
  // Craft duration in seconds
  duration?: number
  // Price in the trader's own currency when it is not roubles
  currencyPrice?: { amount: number; currency: string }
  changeLast48hPercent?: number
  requiredItems: CostLine[]
  tools: CostLine[]
  bundle?: {
    id: string
    name: string
    shortName: string
    iconLink: string
    // Quest items inside one bundle
    countInBundle: number
    grossCost: number
    resaleValue: number
    fleaResale: number
    traderResale: number
    parts: ResaleLine[]
  }
}

export interface QuestItem {
  id: string
  name: string
  shortName: string
  iconLink: string
  wikiLink?: string
  quantity: number
  foundInRaid: boolean
  // The item cannot be listed on the flea market
  fleaBanned: boolean
  note?: string
  // Sorted cheapest first; exact prices before approximate ones
  methods: AcquisitionMethod[]
  unitCost: number
  totalCost: number
  changeLast48hPercent?: number
}

export interface Quest {
  id: string
  name: string
  wikiLink?: string
  imageLink?: string
  minPlayerLevel?: number
  order: number
  // Objectives that are not item hand-ins, e.g. "Survive and extract from The Lab (15)"
  otherObjectives: string[]
  items: QuestItem[]
  totalCost: number
  changeLast48hPercent?: number
}

export interface SeasonInfo {
  name: string
  start: number
  end: number
}

export interface TarkovData {
  gameMode: GameMode
  quests: Quest[]
  grandTotal: number
  overallPriceChange: number
  totalItems: number
  restrictedItems: number
  gpCoinValue: number
  season?: SeasonInfo
  // When tarkov.dev last updated the price data (ms since epoch)
  pricesUpdated: number
  // When our server last checked tarkov.dev (ms since epoch)
  timestamp: number
}
