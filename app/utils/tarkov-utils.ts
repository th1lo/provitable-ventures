import { ItemPrice, Craft, Barter, ApiItem } from '../types/tarkov'
import { TRADER_RESET_TIMES, ITEM_PRICES_QUERY } from '../constants/tarkov-data'

export const formatCurrency = (amount: number, currency: 'RUB' | 'USD' | 'EUR' = 'RUB') => {
  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
  
  const symbols = {
    'RUB': '₽',
    'USD': '$',
    'EUR': '€'
  }
  
  return `${symbols[currency]} ${formattedNumber}`
}

export const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num)
}

export const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

export const isFleaMarketRestricted = (item: ItemPrice) => {
  return item.avg24hPrice === 0 || item.fleaMarketFee === undefined
}

export const getTotalValue = (item: ItemPrice) => {
  // Use flea market price if available
  if (item.avg24hPrice > 0) {
    return item.avg24hPrice * item.quantity
  }
  
  // For items without flea market price, try acquisition method cost
  if (item.cheapestAcquisitionMethod?.cost) {
    return item.cheapestAcquisitionMethod.cost * item.quantity
  }
  
  // Fall back to last low price
  if (item.lastLowPrice > 0) {
    return item.lastLowPrice * item.quantity
  }
  
  return 0
}

export const calculateBitcoinFarmTime = (baseDuration: number, farmLevel: number) => {
  // Bitcoin farm reduces craft time based on level
  const reductionPerLevel = 0.012 // 1.2% per level
  const reduction = Math.min(farmLevel * reductionPerLevel, 0.75) // Max 75% reduction
  return Math.round(baseDuration * (1 - reduction))
}

export const getTraderResetTime = (traderName: string) => {
  const normalizedName = traderName.toLowerCase()
  const hours = TRADER_RESET_TIMES[normalizedName] || 3
  if (hours < 1) {
    return `${Math.round(hours * 60)}min`
  }
  return `${hours}h`
}

export const fetchItemPrices = async (itemIds: string[]): Promise<Map<string, number>> => {
  try {
    const response = await fetch('https://api.tarkov.dev/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: ITEM_PRICES_QUERY,
        variables: { ids: itemIds }
      })
    })

    const data = await response.json()
    const priceMap = new Map<string, number>()

    if (data.data?.items) {
      data.data.items.forEach((item: ApiItem) => {
        // Use flea market price for ACQUIRING items (not selling)
        const acquisitionPrice = item.avg24hPrice || item.lastLowPrice || 0
        priceMap.set(item.id, acquisitionPrice)
      })
    }

    return priceMap
  } catch (error) {
    console.error('Failed to fetch item prices:', error)
    return new Map()
  }
}

export const calculateCraftCost = async (craft: Craft, priceCache: Map<string, number>): Promise<number> => {
  let totalCost = 0
  
  for (const requiredItem of craft.requiredItems) {
    const itemPrice = priceCache.get(requiredItem.item.id) || 0
    totalCost += itemPrice * requiredItem.count
  }
  
  return totalCost
}

export const calculateBarterCost = async (barter: Barter, priceCache: Map<string, number>): Promise<number> => {
  let totalCost = 0
  
  for (const requiredItem of barter.requiredItems) {
    const itemPrice = priceCache.get(requiredItem.item.id) || 0
    totalCost += itemPrice * requiredItem.count
  }
  
  return totalCost
}

export const getAllAcquisitionMethods = async (item: ItemPrice, priceCache: Map<string, number>) => {
  const methods: Array<{
    type: 'craft' | 'barter' | 'trader'
    cost: number
    details: string
    id: string
    data?: any
  }> = []

  // Add direct trader purchases
  if (item.sellFor) {
    for (const sellOption of item.sellFor) {
      if (sellOption.source !== 'flea-market' && sellOption.price > 0) {
        methods.push({
          type: 'trader',
          cost: sellOption.price,
          details: `${sellOption.source} (Direct Purchase)`,
          id: `${sellOption.source}-${item.id}`,
          data: sellOption
        })
      }
    }
  }

  // Add craft methods
  for (const craft of item.crafts) {
    const cost = await calculateCraftCost(craft, priceCache)
    if (cost > 0) {
      methods.push({
        type: 'craft',
        cost,
        details: `${craft.station.name} Level ${craft.level} (${formatDuration(craft.duration)})`,
        id: craft.id,
        data: craft
      })
    }
  }

  // Add barter methods
  for (const barter of item.barters) {
    const cost = await calculateBarterCost(barter, priceCache)
    if (cost > 0) {
      methods.push({
        type: 'barter',
        cost,
        details: `${barter.trader.name} LL${barter.level}${barter.taskUnlock ? ` (${barter.taskUnlock.name})` : ''}`,
        id: barter.id,
        data: barter
      })
    }
  }

  // Sort by cost (cheapest first)
  return methods.sort((a, b) => a.cost - b.cost)
}

export const findCheapestAcquisitionMethod = async (item: ItemPrice, priceCache: Map<string, number>) => {
  const methods = await getAllAcquisitionMethods(item, priceCache)
  return methods.length > 0 ? methods[0] : undefined
} 