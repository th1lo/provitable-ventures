import { useState, useEffect, useCallback } from 'react'
import { ItemPrice, GraphQLError, ApiItem, GameMode } from '../types/tarkov'
import { TARKOV_ITEMS, EXTENDED_GRAPHQL_QUERY, BUNDLED_ITEMS } from '../constants/tarkov-data'
import { 
  isFleaMarketRestricted, 
  fetchItemPrices,
  fetchRequiredItemsData,
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
    const startTime = performance.now()
    setLoading(true)
    setError(null)
    
    try {
      const searchTerms = TARKOV_ITEMS.map(item => item.searchTerm)
      
      // Add bundled item search terms
      const bundledItemTerms = Object.values(BUNDLED_ITEMS).map(bundle => bundle.bundledSearchTerm)
      const allSearchTerms = [...searchTerms, ...bundledItemTerms]
      
      console.log(`🚀 Starting data fetch for both PvP and PvE modes with ${allSearchTerms.length} search terms`)
      
      // Fetch both PvP and PvE data simultaneously
      const mainFetchStart = performance.now()
      const [pvpResponse, pveResponse] = await Promise.all([
        fetch('https://api.tarkov.dev/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: EXTENDED_GRAPHQL_QUERY, // PvP is default
            variables: { names: allSearchTerms }
          })
        }),
        fetch('https://api.tarkov.dev/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: EXTENDED_GRAPHQL_QUERY.replace('items(names: $names)', 'items(names: $names, gameMode: pve)'),
            variables: { names: allSearchTerms }
          })
        })
      ])
      const mainFetchTime = performance.now() - mainFetchStart
      console.log(`📊 Main item data fetch completed in ${mainFetchTime.toFixed(0)}ms`)

      if (!pvpResponse.ok || !pveResponse.ok) {
        throw new Error(`HTTP error! PvP status: ${pvpResponse.status}, PvE status: ${pveResponse.status}`)
      }

      const [pvpData, pveData] = await Promise.all([
        pvpResponse.json(),
        pveResponse.json()
      ])
      
      if (pvpData.errors || pveData.errors) {
        console.error('GraphQL errors:', pvpData.errors || pveData.errors)
        throw new Error((pvpData.errors || pveData.errors).map((e: GraphQLError) => e.message).join(', '))
      }

      console.log(`Found ${pvpData.data.items?.length || 0} PvP items and ${pveData.data.items?.length || 0} PvE items from API`)

      // Create maps for bundled items for both game modes
      const pvpBundledItemsMap = new Map<string, ApiItem>()
      const pveBundledItemsMap = new Map<string, ApiItem>()
      
      Object.entries(BUNDLED_ITEMS).forEach(([itemKey, bundle]) => {
        const pvpBundledApiItem = pvpData.data.items.find((apiItem: ApiItem) => 
          apiItem.name.toLowerCase().includes(bundle.bundledSearchTerm.toLowerCase()) ||
          apiItem.shortName.toLowerCase().includes(bundle.bundledSearchTerm.toLowerCase())
        )
        const pveBundledApiItem = pveData.data.items.find((apiItem: ApiItem) => 
          apiItem.name.toLowerCase().includes(bundle.bundledSearchTerm.toLowerCase()) ||
          apiItem.shortName.toLowerCase().includes(bundle.bundledSearchTerm.toLowerCase())
        )
        
        if (pvpBundledApiItem) pvpBundledItemsMap.set(itemKey, pvpBundledApiItem)
        if (pveBundledApiItem) pveBundledItemsMap.set(itemKey, pveBundledApiItem)
      })

      // Map API results back to our item list with both PvP and PvE prices
      const mappedPrices: ItemPrice[] = TARKOV_ITEMS.map(item => {
        const pvpApiItem = pvpData.data.items.find((apiItem: ApiItem) => 
          apiItem.name.toLowerCase().includes(item.searchTerm.toLowerCase()) ||
          apiItem.shortName.toLowerCase().includes(item.searchTerm.toLowerCase())
        )
        
        const pveApiItem = pveData.data.items.find((apiItem: ApiItem) => 
          apiItem.name.toLowerCase().includes(item.searchTerm.toLowerCase()) ||
          apiItem.shortName.toLowerCase().includes(item.searchTerm.toLowerCase())
        )

        if (!pvpApiItem && !pveApiItem) {
          console.warn(`No API data found for item: ${item.searchTerm}`)
        }

        // Use PvP data as primary for general item data, fallback to PvE
        const primaryApiItem = pvpApiItem || pveApiItem
        
        // Get prices from both modes
        const pvpPrice = pvpApiItem?.avg24hPrice || pvpApiItem?.lastLowPrice || 0
        const pvePrice = pveApiItem?.avg24hPrice || pveApiItem?.lastLowPrice || 0
        
        // Use PvP bundled item data as primary, fallback to PvE
        const bundledApiItem = pvpBundledItemsMap.get(item.searchTerm) || pveBundledItemsMap.get(item.searchTerm)
          
        const bundledItemData = bundledApiItem ? {
          id: bundledApiItem.id,
          name: bundledApiItem.name,
          shortName: bundledApiItem.shortName,
          avg24hPrice: bundledApiItem.avg24hPrice || bundledApiItem.lastLowPrice || 0,
          lastLowPrice: bundledApiItem.lastLowPrice || 0,
          barters: bundledApiItem.bartersFor || [],
          sellFor: bundledApiItem.sellFor || [],
          containsItems: bundledApiItem.containsItems || []
        } : undefined
        
        return {
          id: primaryApiItem?.id || `missing-${item.searchTerm}`,
          name: primaryApiItem?.name || item.name,
          shortName: primaryApiItem?.shortName || item.searchTerm,
          avg24hPrice: pvpPrice, // Use PvP as default for compatibility
          lastLowPrice: primaryApiItem?.lastLowPrice || 0,
          changeLast48h: primaryApiItem?.changeLast48h || 0,
          changeLast48hPercent: primaryApiItem?.changeLast48hPercent ?? undefined,
          updated: primaryApiItem?.updated || new Date().toISOString(),
          iconLink: primaryApiItem?.iconLink || '',
          wikiLink: primaryApiItem?.wikiLink || '',
          quantity: item.quantity,
          category: item.category,
          crafts: primaryApiItem?.craftsFor || [],
          barters: primaryApiItem?.bartersFor || [],
          fleaMarketFee: primaryApiItem?.fleaMarketFee,
          sellFor: primaryApiItem?.sellFor || [],
          gameMode: 'pvp', // Default to PvP, will be updated based on current mode
          pvpPrice: pvpPrice, // Always store both prices
          pvePrice: pvePrice, // Always store both prices
          bundledItem: bundledItemData
        }
      })

      // Collect all required item IDs for price fetching (including bundled item requirements)
      const requiredItemIds = new Set<string>()
      mappedPrices.forEach(item => {
        item.crafts.forEach(craft => {
          craft.requiredItems.forEach(req => requiredItemIds.add(req.item.id))
        })
        item.barters.forEach(barter => {
          barter.requiredItems.forEach(req => requiredItemIds.add(req.item.id))
        })
        // Add bundled item barter requirements
        if (item.bundledItem) {
          item.bundledItem.barters.forEach(barter => {
            barter.requiredItems.forEach(req => requiredItemIds.add(req.item.id))
          })
        }
      })

      console.log(`🔍 Fetching prices for ${requiredItemIds.size} required items for both game modes`)

      // Fetch prices for all required items for BOTH game modes simultaneously
      const pricesFetchStart = performance.now()
      const [pvpPriceCacheData, pvePriceCacheData, pvpRequiredData, pveRequiredData] = await Promise.all([
        fetchItemPrices(Array.from(requiredItemIds), 'pvp'),
        fetchItemPrices(Array.from(requiredItemIds), 'pve'),
        fetchRequiredItemsData(Array.from(requiredItemIds), 'pvp'),
        fetchRequiredItemsData(Array.from(requiredItemIds), 'pve')
      ])
      const pricesFetchTime = performance.now() - pricesFetchStart
      console.log(`💰 Required items data fetch completed in ${pricesFetchTime.toFixed(0)}ms`)

      // Store both caches
      setPvpPriceCache(pvpPriceCacheData)
      setPvePriceCache(pvePriceCacheData)
      setPvpRequiredItemsData(pvpRequiredData)
      setPveRequiredItemsData(pveRequiredData)

      // Set initial caches to PvP data
      setItemPriceCache(pvpPriceCacheData)
      setRequiredItemsData(pvpRequiredData)

      // Calculate cheapest acquisition methods for flea market restricted items for both modes
      const acquisitionStart = performance.now()
      for (const item of mappedPrices) {
        const isRestricted = isFleaMarketRestricted(item)
        
        if (isRestricted || (item.pvpPrice === 0 && item.pvePrice === 0)) {
          // Calculate for PvP mode by default
          const cheapestMethod = await findCheapestAcquisitionMethod(item, pvpPriceCacheData)
          item.cheapestAcquisitionMethod = cheapestMethod
        }
      }
      const acquisitionTime = performance.now() - acquisitionStart
      console.log(`⚡ Acquisition methods calculated in ${acquisitionTime.toFixed(0)}ms`)

      setItemPrices(mappedPrices)
      setLastUpdated(new Date())
      
      const totalTime = performance.now() - startTime
      console.log(`✅ Total initial load completed in ${totalTime.toFixed(0)}ms (${(totalTime/1000).toFixed(1)}s)`)
    } catch (err) {
      console.error('Error fetching prices:', err)
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }, []) // No dependencies - fetch data once

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