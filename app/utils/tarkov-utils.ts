import { ItemPrice, Craft, Barter, ApiItem } from '../types/tarkov'
import { TRADER_RESET_TIMES, ITEM_PRICES_QUERY } from '../constants/tarkov-data'

// Exchange rates (approximate, update as needed)
const EXCHANGE_RATES = {
  'USD': 140, // 1 USD = ~140 RUB
  'EUR': 150, // 1 EUR = ~150 RUB
  'RUB': 1
}

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

export const convertToRubles = (amount: number, currency: string): number => {
  const rate = EXCHANGE_RATES[currency as keyof typeof EXCHANGE_RATES] || 1
  return amount * rate
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
  // Check if item has flea market fee data and non-zero prices
  return item.fleaMarketFee === undefined || (item.pvpPrice === 0 && item.pvePrice === 0)
}

export const getTotalValue = (item: ItemPrice, gameMode: 'pvp' | 'pve' = 'pvp') => {
  // For flea market restricted items, ALWAYS use cheapest acquisition method first
  if (isFleaMarketRestricted(item) && item.cheapestAcquisitionMethod?.costInRubles) {
    return item.cheapestAcquisitionMethod.costInRubles * item.quantity
  }
  
  // For flea market available items, use game mode specific pricing
  if (gameMode === 'pve') {
    const price = item.pvePrice || 0
    if (price > 0) {
      return price * item.quantity
    }
  } else {
    const price = item.pvpPrice || 0
    if (price > 0) {
      return price * item.quantity
    }
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

export const fetchItemPrices = async (itemIds: string[], gameMode: 'pvp' | 'pve' = 'pvp'): Promise<Map<string, number>> => {
  try {
    // Create query for the specific game mode
    const query = gameMode === 'pve' 
      ? ITEM_PRICES_QUERY.replace('items(ids: $ids)', 'items(ids: $ids, gameMode: pve)')
      : ITEM_PRICES_QUERY
      
    const response = await fetch('https://api.tarkov.dev/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        variables: { ids: itemIds }
      })
    })

    const data = await response.json()
    const priceMap = new Map<string, number>()

    if (data.data?.items) {
      data.data.items.forEach((item: ApiItem) => {
        // Use average prices for more stable pricing - prioritize avg24hPrice
        const acquisitionPrice = item.avg24hPrice || item.lastLowPrice || 0
        priceMap.set(item.id, acquisitionPrice)
      })
    }

    return priceMap
      } catch {
      return new Map()
  }
}

export const fetchRequiredItemsData = async (itemIds: string[], gameMode: 'pvp' | 'pve' = 'pvp'): Promise<Map<string, ApiItem>> => {
  try {
    // Create query for the specific game mode
    const query = gameMode === 'pve' 
      ? ITEM_PRICES_QUERY.replace('items(ids: $ids)', 'items(ids: $ids, gameMode: pve)')
      : ITEM_PRICES_QUERY
      
    const response = await fetch('https://api.tarkov.dev/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        variables: { ids: itemIds }
      })
    })

    const data = await response.json()
    const itemDataMap = new Map<string, ApiItem>()

    if (data.data?.items) {
      data.data.items.forEach((item: ApiItem) => {
        itemDataMap.set(item.id, item)
      })
    }

    return itemDataMap
      } catch {
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

export const calculateBundledItemCost = async (
  bundledItem: ItemPrice['bundledItem'], 
  priceCache: Map<string, number>
): Promise<number | null> => {
  if (!bundledItem || !bundledItem.barters.length) {
    return null;
  }

  // Analyze weapon parts for accurate sell value
  const partsAnalysis = analyzeWeaponParts(bundledItem);
  let bestNetCost = Infinity;

  for (const barter of bundledItem.barters) {
    // Calculate the cost to get the bundled item through barter
    const barterCost = await calculateBarterCost(barter, priceCache);
    
    // Net cost = what we pay - what we get back from selling all parts (except REAP-IR)
    const netCost = barterCost - partsAnalysis.totalSellValue;
    
    if (netCost < bestNetCost) {
      bestNetCost = netCost;
    }
  }

  return bestNetCost === Infinity ? null : bestNetCost;
}

export const analyzeWeaponParts = (bundledItem: ItemPrice['bundledItem']) => {
  if (!bundledItem?.containsItems || bundledItem.containsItems.length === 0) {
    return {
      weaponParts: [],
      totalSellValue: 0,
      fleaSellValue: 0,
      traderSellValue: 0
    };
  }

  // Debug logging for weapon parts data
  if (process.env.NODE_ENV === 'development') {
    console.log(`Analyzing weapon parts for ${bundledItem.name}:`, {
      containsItemsCount: bundledItem.containsItems.length,
      firstItem: bundledItem.containsItems[0]?.item ? {
        name: bundledItem.containsItems[0].item.name,
        hasSellFor: !!bundledItem.containsItems[0].item.sellFor,
        sellForLength: bundledItem.containsItems[0].item.sellFor?.length || 0,
        hasAvg24hPrice: !!bundledItem.containsItems[0].item.avg24hPrice,
        avg24hPrice: bundledItem.containsItems[0].item.avg24hPrice
      } : 'No item data'
    });
  }

  // Hardcoded list of items that should be sold on flea market
  const fleaMarketItemIds = [
    '5a1ead28fcdbcb001912fa9f', // DLOC-IRD
    '59f8a37386f7747af3328f06', // Shift
    '59bfe68886f7746004266202', // MUR-1S
    '59db3a1d86f77429e05b4e92'  // GRAL-S
  ];

  const weaponParts = bundledItem.containsItems.map(part => {
    const isKeepForQuest = part.item.name.toLowerCase().includes('reap-ir');
    
    // Get best trader sell price with null checks
    const traderSells = part.item.sellFor?.filter(sell => 
      sell.vendor?.normalizedName && sell.vendor.normalizedName !== 'flea-market'
    ) || [];
    
    const bestTraderSell = traderSells.length > 0 
      ? traderSells.reduce((best, current) => 
          (current.priceRUB || current.price) > (best.priceRUB || best.price) ? current : best
        )
      : null;
    
    // Get flea market sell price with null checks
    const fleaSell = part.item.sellFor?.find(sell => 
      sell.vendor?.normalizedName === 'flea-market'
    );
    
    const bestTraderPrice = bestTraderSell ? (bestTraderSell.priceRUB || bestTraderSell.price) : 0;
    const fleaPrice = fleaSell ? (fleaSell.priceRUB || fleaSell.price) : 0;
    const marketPrice = part.item.avg24hPrice || part.item.lastLowPrice || 0;
    
    // Recommend flea if item ID is in the hardcoded list
    const recommendFlea = fleaMarketItemIds.includes(part.item.id);
    const sellValue = isKeepForQuest ? 0 : (recommendFlea ? fleaPrice : bestTraderPrice) * part.count;
    
    return {
      id: part.item.id,
      name: part.item.name,
      shortName: part.item.shortName,
      iconLink: part.item.iconLink,
      count: part.count,
      marketPrice,
      bestTraderPrice,
      bestTraderName: bestTraderSell?.vendor?.name || 'Unknown',
      fleaPrice,
      recommendFlea,
      sellValue,
      isKeepForQuest,
      changeLast48h: part.item.changeLast48h || 0
    };
  });

  const sellableParts = weaponParts.filter(part => !part.isKeepForQuest);
  const totalSellValue = sellableParts.reduce((sum, part) => sum + part.sellValue, 0);
  const fleaSellValue = sellableParts.filter(part => part.recommendFlea).reduce((sum, part) => sum + part.sellValue, 0);
  const traderSellValue = sellableParts.filter(part => !part.recommendFlea).reduce((sum, part) => sum + part.sellValue, 0);

  return {
    weaponParts,
    totalSellValue,
    fleaSellValue,
    traderSellValue
  };
};

export const getAllAcquisitionMethods = async (item: ItemPrice, priceCache: Map<string, number>) => {
  const methods: Array<{
    type: 'craft' | 'barter' | 'trader' | 'bundled'
    cost: number
    costInRubles: number
    currency: string
    details: string
    id: string
    data?: Craft | Barter
    bundledItemDetails?: {
      bundledItemName: string
      bundledItemShortName: string
      barterCost: number
      sellValue: number
      netCost: number
      trader: string
      traderLevel: number
      requiredItems: Array<{ item: { id: string; name: string; shortName: string; iconLink: string }; count: number }>
      weaponParts: Array<{
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
  }> = []

  // Note: sellFor is what traders PAY YOU when selling TO them, not what you pay to buy FROM them
  // Direct trader purchases are typically handled through bartersFor with currency exchanges

  // Add craft methods
  for (const craft of item.crafts) {
    const cost = await calculateCraftCost(craft, priceCache)
    if (cost > 0) {
      methods.push({
        type: 'craft',
        cost,
        costInRubles: cost, // Already in rubles
        currency: 'RUB',
        details: `${craft.station.name} Level ${craft.level} (${formatDuration(craft.duration)})`,
        id: craft.id,
        data: craft
      })
    }
  }

  // Add barter methods (includes both item trades and currency purchases)
  for (const barter of item.barters) {
    const cost = await calculateBarterCost(barter, priceCache)
    if (cost > 0) {
      methods.push({
        type: 'barter',
        cost,
        costInRubles: cost, // Already in rubles
        currency: 'RUB',
        details: `${barter.trader.name} LL${barter.level}${barter.taskUnlock ? ` (${barter.taskUnlock.name})` : ''}`,
        id: barter.id,
        data: barter
      })
    }
  }

  // Add bundled item methods
  if (item.bundledItem) {
    // Analyze weapon parts for smart sell recommendations
    const partsAnalysis = analyzeWeaponParts(item.bundledItem);
    
    const bundledCost = await calculateBundledItemCost(item.bundledItem, priceCache);
    if (bundledCost !== null && bundledCost > 0) {
      // Find the best barter for the bundled item to get details
      let bestBarter = null;
      let bestCost = Infinity;
      let bestBarterCost = 0;
      
      for (const barter of item.bundledItem.barters) {
        const barterCost = await calculateBarterCost(barter, priceCache);
        const netCost = barterCost - partsAnalysis.totalSellValue;
        
        if (netCost < bestCost) {
          bestCost = netCost;
          bestBarter = barter;
          bestBarterCost = barterCost;
        }
      }

      if (bestBarter) {
        methods.push({
          type: 'bundled',
          cost: bundledCost,
          costInRubles: bundledCost,
          currency: 'RUB',
          details: `${bestBarter.trader.name} LL${bestBarter.level} ${item.bundledItem.shortName} (net cost after selling)`,
          id: `bundled-${bestBarter.id}`,
          data: bestBarter,
          bundledItemDetails: {
            bundledItemName: item.bundledItem.name,
            bundledItemShortName: item.bundledItem.shortName,
            barterCost: bestBarterCost,
            sellValue: partsAnalysis.totalSellValue,
            netCost: bundledCost,
            trader: bestBarter.trader.name,
            traderLevel: bestBarter.level,
            requiredItems: bestBarter.requiredItems,
            weaponParts: partsAnalysis.weaponParts,
            totalSellValue: partsAnalysis.totalSellValue,
            fleaSellValue: partsAnalysis.fleaSellValue,
            traderSellValue: partsAnalysis.traderSellValue
          }
        });
      }
    }
  }

  // Sort by cost in rubles (cheapest first)
  return methods.sort((a, b) => a.costInRubles - b.costInRubles)
}

export const findCheapestAcquisitionMethod = async (item: ItemPrice, priceCache: Map<string, number>) => {
  const methods = await getAllAcquisitionMethods(item, priceCache)
  return methods.length > 0 ? methods[0] : undefined
} 