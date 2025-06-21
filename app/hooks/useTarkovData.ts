import { useState, useEffect, useCallback } from 'react'
import { ItemPrice, ApiItem, GameMode } from '../types/tarkov'
import { 
  isFleaMarketRestricted, 
  findCheapestAcquisitionMethod,
  getTotalValue
} from '../utils/tarkov-utils'

export const useTarkovData = (gameMode: GameMode = 'pvp') => {
  const [itemPrices, setItemPrices] = useState<ItemPrice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [itemPriceCache, setItemPriceCache] = useState<Map<string, number>>(new Map())
  const [requiredItemsData, setRequiredItemsData] = useState<Map<string, ApiItem>>(new Map())
  
  // Cache for both game modes to avoid refetching
  const [pvpPriceCache, setPvpPriceCache] = useState<Map<string, number>>(new Map())
  const [pvePriceCache, setPvePriceCache] = useState<Map<string, number>>(new Map())
  const [pvpRequiredItemsData, setPvpRequiredItemsData] = useState<Map<string, ApiItem>>(new Map())
  const [pveRequiredItemsData, setPveRequiredItemsData] = useState<Map<string, ApiItem>>(new Map())

  const fetchPrices = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Call our new cached API route instead of external APIs
      const response = await fetch(`/api/tarkov-data?gameMode=${gameMode}`)
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      // Convert the response data back to our expected formats
      const mappedPrices = data.mappedPrices
      const pvpPriceCacheData = new Map(Object.entries(data.pvpPriceCache).map(([k, v]) => [k, v as number]))
      const pvePriceCacheData = new Map(Object.entries(data.pvePriceCache).map(([k, v]) => [k, v as number]))
      const pvpRequiredData = new Map(Object.entries(data.pvpRequiredItemsData).map(([k, v]) => [k, v as ApiItem]))
      const pveRequiredData = new Map(Object.entries(data.pveRequiredItemsData).map(([k, v]) => [k, v as ApiItem]))

      // Store both caches
      setPvpPriceCache(pvpPriceCacheData)
      setPvePriceCache(pvePriceCacheData)
      setPvpRequiredItemsData(pvpRequiredData)
      setPveRequiredItemsData(pveRequiredData)

      // Set initial caches to PvP data
      setItemPriceCache(pvpPriceCacheData)
      setRequiredItemsData(pvpRequiredData)

      // Calculate cheapest acquisition methods for flea market restricted items for both modes
      for (const item of mappedPrices) {
        const isRestricted = isFleaMarketRestricted(item)
        
        if (isRestricted || (item.pvpPrice === 0 && item.pvePrice === 0)) {
          // Calculate for PvP mode by default
          const cheapestMethod = await findCheapestAcquisitionMethod(item, pvpPriceCacheData)
          item.cheapestAcquisitionMethod = cheapestMethod
        }
      }

      setItemPrices(mappedPrices)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }, [gameMode]) // Refetch when game mode changes

  useEffect(() => {
    fetchPrices()
  }, [fetchPrices])

  // Handle game mode changes efficiently using cached data
  useEffect(() => {
    // Only run if we have data and both caches are ready
    if (itemPrices.length === 0 || pvpPriceCache.size === 0 || pvePriceCache.size === 0) return
    
    // Only run if the current itemPrices don't match the gameMode (avoid unnecessary updates)
    if (itemPrices.length > 0 && itemPrices[0].gameMode === gameMode) return

    const updateGameModeData = async () => {
      // Switch to the appropriate cached data instantly
      const currentPriceCache = gameMode === 'pvp' ? pvpPriceCache : pvePriceCache
      const currentRequiredData = gameMode === 'pvp' ? pvpRequiredItemsData : pveRequiredItemsData
      
      setItemPriceCache(currentPriceCache)
      setRequiredItemsData(currentRequiredData)

      // Update item prices and recalculate acquisition methods for flea restricted items
      const updatedItemPrices = await Promise.all(itemPrices.map(async (item) => {
        const updatedItem = {
          ...item,
          gameMode: gameMode,
          avg24hPrice: (gameMode === 'pvp' ? item.pvpPrice : item.pvePrice) || 0
        }

        // Recalculate acquisition methods for flea restricted items with new game mode pricing
        const isRestricted = isFleaMarketRestricted(item)
        const currentPrice = gameMode === 'pvp' ? item.pvpPrice : item.pvePrice
        
        if (isRestricted || currentPrice === 0) {
          const cheapestMethod = await findCheapestAcquisitionMethod(item, currentPriceCache)
          updatedItem.cheapestAcquisitionMethod = cheapestMethod
        }

        return updatedItem
      }))
      
      setItemPrices(updatedItemPrices)
    }

    updateGameModeData()
  }, [gameMode, itemPrices, pvpPriceCache, pvePriceCache, pvpRequiredItemsData, pveRequiredItemsData]) // Switch and recalculate using cached data

  // Computed values - use the appropriate price based on game mode consistently
  const grandTotal = itemPrices.reduce((sum, item) => {
    const value = getTotalValue(item, gameMode)
    return sum + value
  }, 0)

  const categoryTotals = itemPrices.reduce((acc, item) => {
    const value = getTotalValue(item, gameMode)
    acc[item.category] = (acc[item.category] || 0) + value
    return acc
  }, {} as Record<string, number>)

  // Calculate overall price development change (weighted by item values)
  const priceChangeCalculation = itemPrices.length > 0 ? itemPrices.reduce((acc, item) => {
    const itemValue = getTotalValue(item, gameMode)
    const priceChange = item.changeLast48hPercent
    
    // Only include items with valid price change data and non-zero values
    if (priceChange !== undefined && priceChange !== null && itemValue > 0) {
      acc.totalWeightedChange += (priceChange * itemValue)
      acc.totalValue += itemValue
    }
    
    return acc
  }, { totalWeightedChange: 0, totalValue: 0 }) : { totalWeightedChange: 0, totalValue: 0 }

  const overallPriceChange = priceChangeCalculation.totalValue > 0 
    ? priceChangeCalculation.totalWeightedChange / priceChangeCalculation.totalValue 
    : 0

  const groupItemsByQuest = () => {
    const grouped = itemPrices.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    }, {} as Record<string, ItemPrice[]>)

    // Sort by quest order
    const questOrder = ['Profitable Ventures', 'Safety Guarantee', 'Never Too Late To Learn', 'Get a Foothold', 'Profit Retention', 'A Life Lesson']
    const sortedQuests: Array<[string, ItemPrice[]]> = []
    
    questOrder.forEach(questName => {
      if (grouped[questName]) {
        sortedQuests.push([questName, grouped[questName]])
      }
    })

    return sortedQuests
  }

  return {
    // State
    itemPrices,
    loading,
    error,
    lastUpdated,
    itemPriceCache,
    requiredItemsData,
    
    // Computed values
    grandTotal,
    categoryTotals,
    overallPriceChange,
    
    // Functions
    fetchPrices,
    groupItemsByQuest
  }
} 