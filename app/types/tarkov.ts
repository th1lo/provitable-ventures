export type GameMode = 'pvp' | 'pve'

export interface ItemPrice {
  id: string
  name: string
  shortName: string
  avg24hPrice: number
  lastLowPrice: number
  changeLast48h: number
  changeLast48hPercent: number
  updated: string
  iconLink: string
  wikiLink: string
  quantity: number
  category: string
  crafts: Craft[]
  barters: Barter[]
  fleaMarketFee?: number
  sellFor: SellPrice[]
  cheapestAcquisitionMethod?: {
    type: 'craft' | 'barter' | 'trader' | 'bundled'
    cost: number
    costInRubles: number
    currency: string
    details: string
    id: string
    bundledItemDetails?: {
      bundledItemName: string
      bundledItemShortName: string
      barterCost: number
      sellValue: number
      netCost: number
      trader: string
      traderLevel: number
      requiredItems: Array<{ item: { id: string; name: string; shortName: string; iconLink: string }; count: number }>
      weaponParts?: Array<{
        id: string
        name: string
        shortName: string
        iconLink: string
        count: number
        marketPrice: number
        bestTraderPrice: number
        bestTraderName: string
        fleaPrice: number
        recommendFlea: boolean
        sellValue: number
        isKeepForQuest: boolean
        changeLast48h: number
      }>
      totalSellValue: number
      fleaSellValue: number
      traderSellValue: number
    }
  }
  // Game mode specific prices
  gameMode?: GameMode
  pvpPrice?: number
  pvePrice?: number
  
  // Bundled item data
  bundledItem?: {
    id: string
    name: string
    shortName: string
    avg24hPrice: number
    lastLowPrice: number
    barters: Barter[]
    sellFor: SellPrice[]
    netCostPerUnit?: number
    containsItems?: Array<{
      item: {
        id: string
        name: string
        shortName: string
        iconLink: string
        avg24hPrice: number
        lastLowPrice: number
        changeLast48h?: number
        sellFor: Array<{
          source: string
          price: number
          currency: string
          priceRUB: number
          vendor?: { name: string; normalizedName: string; minTraderLevel?: number; buyLimit?: number; foundInRaidRequired?: boolean }
        }>
      }
      count: number
    }>
  }
}

export interface Craft {
  id: string
  station: {
    id: string
    name: string
    normalizedName: string
  }
  level: number
  duration: number
  requiredItems: {
    item: {
      id: string
      name: string
      shortName: string
      iconLink: string
    }
    count: number
  }[]
  rewardItems: {
    item: {
      id: string
      name: string
      shortName: string
    }
    count: number
  }[]
}

export interface Barter {
  id: string
  trader: {
    id: string
    name: string
    normalizedName: string
  }
  level: number
  requiredItems: {
    item: {
      id: string
      name: string
      shortName: string
      iconLink: string
    }
    count: number
  }[]
  rewardItems: {
    item: {
      id: string
      name: string
      shortName: string
    }
    count: number
  }[]
  taskUnlock?: {
    id: string
    name: string
  }
}

export interface SellPrice {
  source: string
  price: number
  currency: string
  priceRUB?: number
  vendor?: {
    name: string
    normalizedName: string
    minTraderLevel?: number
    buyLimit?: number
    foundInRaidRequired?: boolean
  }
}

export interface GraphQLError {
  message: string
}

export interface ApiItem {
  id: string
  name: string
  shortName: string
  avg24hPrice: number
  lastLowPrice: number
  changeLast48h: number
  changeLast48hPercent: number
  updated: string
  iconLink: string
  wikiLink: string
  craftsFor: Craft[]
  bartersFor: Barter[]
  fleaMarketFee?: number
  sellFor: SellPrice[]
  containsItems?: Array<{
    item: {
      id: string
      name: string
      shortName: string
      iconLink: string
      avg24hPrice: number
      lastLowPrice: number
      changeLast48h?: number
      sellFor: Array<{
        source: string
        price: number
        currency: string
        priceRUB: number
        vendor?: { name: string; normalizedName: string; minTraderLevel?: number; buyLimit?: number; foundInRaidRequired?: boolean }
      }>
    }
    count: number
  }>
} 