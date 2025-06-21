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
    type: 'craft' | 'barter' | 'trader'
    cost: number
    details: string
    id: string
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
} 