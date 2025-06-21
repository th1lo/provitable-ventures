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

  const fetchPrices = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const searchTerms = TARKOV_ITEMS.map(item => item.searchTerm)
      
      // Add bundled item search terms
      const bundledItemTerms = Object.values(BUNDLED_ITEMS).map(bundle => bundle.bundledSearchTerm)
      const allSearchTerms = [...searchTerms, ...bundledItemTerms]
      
      console.log(`Fetching data for both PvP and PvE modes with ${allSearchTerms.length} search terms (including bundled items)`)
      
      // Fetch both PvP and PvE data simultaneously
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

        // Use the API item from current game mode for general data, fallback to the other mode
        const primaryApiItem = gameMode === 'pvp' ? (pvpApiItem || pveApiItem) : (pveApiItem || pvpApiItem)
        
        // Get prices from both modes
        const pvpPrice = pvpApiItem?.avg24hPrice || pvpApiItem?.lastLowPrice || 0
        const pvePrice = pveApiItem?.avg24hPrice || pveApiItem?.lastLowPrice || 0
        
        console.log(`Mapping ${item.searchTerm}: PvP price = ₽${pvpPrice}, PvE price = ₽${pvePrice}`)
        
        // Check if this item has bundled item data (prefer current game mode)
        const bundledApiItem = gameMode === 'pvp' ? 
          (pvpBundledItemsMap.get(item.searchTerm) || pveBundledItemsMap.get(item.searchTerm)) :
          (pveBundledItemsMap.get(item.searchTerm) || pvpBundledItemsMap.get(item.searchTerm))
          
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

        if (bundledItemData) {
          console.log(`Found bundled item for ${item.searchTerm}: ${bundledItemData.name}`)
        }
        
        return {
          id: primaryApiItem?.id || `missing-${item.searchTerm}`,
          name: primaryApiItem?.name || item.name,
          shortName: primaryApiItem?.shortName || item.searchTerm,
          avg24hPrice: gameMode === 'pvp' ? pvpPrice : pvePrice, // Current mode price for compatibility
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
          gameMode: gameMode,
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

      console.log(`Fetching prices for ${requiredItemIds.size} required items (including bundled requirements)`)

      // Fetch prices for all required items using game mode specific pricing
      const priceCache = await fetchItemPrices(Array.from(requiredItemIds), gameMode)
      setItemPriceCache(priceCache)

      // Fetch complete data for required items (including price change data)
      const requiredItemsFullData = await fetchRequiredItemsData(Array.from(requiredItemIds), gameMode)
      setRequiredItemsData(requiredItemsFullData)

      // Calculate cheapest acquisition methods for flea market restricted items or items with no price
      for (const item of mappedPrices) {
        const isRestricted = isFleaMarketRestricted(item)
        const currentPrice = gameMode === 'pvp' ? item.pvpPrice : item.pvePrice
        console.log(`${item.shortName}: fleaRestricted=${isRestricted}, pvpPrice=${item.pvpPrice}, pvePrice=${item.pvePrice}, hasBundled=${!!item.bundledItem}`)
        
        if (isRestricted || currentPrice === 0) {
          console.log(`Calculating acquisition methods for ${item.shortName} (including bundled options)`)
          const cheapestMethod = await findCheapestAcquisitionMethod(item, priceCache)
          item.cheapestAcquisitionMethod = cheapestMethod
          console.log(`Cheapest acquisition for ${item.shortName}:`, cheapestMethod)
        }
      }

      setItemPrices(mappedPrices)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error fetching prices:', err)
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }, [gameMode])

  useEffect(() => {
    fetchPrices()
  }, [fetchPrices])

  // Computed values - use the appropriate price based on game mode consistently
  const grandTotal = itemPrices.reduce((sum, item) => {
    const value = getTotalValue(item, gameMode)
    console.log(`${item.shortName} (${item.category}): ₽${value.toLocaleString()}`)
    return sum + value
  }, 0)

  const categoryTotals = itemPrices.reduce((acc, item) => {
    const value = getTotalValue(item, gameMode)
    acc[item.category] = (acc[item.category] || 0) + value
    return acc
  }, {} as Record<string, number>)

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
    
    // Functions
    fetchPrices,
    groupItemsByQuest
  }
} 