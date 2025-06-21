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
      
      // Update the query to support game modes
      const queryWithGameMode = gameMode === 'pve' 
        ? EXTENDED_GRAPHQL_QUERY.replace('items(names: $names)', 'items(names: $names, gameMode: pve)')
        : EXTENDED_GRAPHQL_QUERY
      
      console.log(`Fetching data for ${gameMode.toUpperCase()} mode with ${allSearchTerms.length} search terms (including bundled items)`)
      
      const response = await fetch('https://api.tarkov.dev/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: queryWithGameMode,
          variables: { names: allSearchTerms }
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.errors) {
        console.error('GraphQL errors:', data.errors)
        throw new Error(data.errors.map((e: GraphQLError) => e.message).join(', '))
      }

      console.log(`Found ${data.data.items?.length || 0} items from API (including bundled items)`)

      // Create a map of bundled items
      const bundledItemsMap = new Map<string, ApiItem>()
      Object.entries(BUNDLED_ITEMS).forEach(([itemKey, bundle]) => {
        const bundledApiItem = data.data.items.find((apiItem: ApiItem) => 
          apiItem.name.toLowerCase().includes(bundle.bundledSearchTerm.toLowerCase()) ||
          apiItem.shortName.toLowerCase().includes(bundle.bundledSearchTerm.toLowerCase())
        )
        if (bundledApiItem) {
          bundledItemsMap.set(itemKey, bundledApiItem)
        }
      })

      // Map API results back to our item list
      const mappedPrices: ItemPrice[] = TARKOV_ITEMS.map(item => {
        const apiItem = data.data.items.find((apiItem: ApiItem) => 
          apiItem.name.toLowerCase().includes(item.searchTerm.toLowerCase()) ||
          apiItem.shortName.toLowerCase().includes(item.searchTerm.toLowerCase())
        )

        if (!apiItem) {
          console.warn(`No API data found for item: ${item.searchTerm}`)
        }

        // Use the actual API prices - prioritize avg24hPrice for more stable pricing
        const basePrice = apiItem?.avg24hPrice || apiItem?.lastLowPrice || 0
        
        console.log(`Mapping ${item.searchTerm}: API price = ₽${basePrice}, fleaFee = ${apiItem?.fleaMarketFee}`)
        
        // Check if this item has bundled item data
        const bundledApiItem = bundledItemsMap.get(item.searchTerm)
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
          id: apiItem?.id || `missing-${item.searchTerm}`,
          name: apiItem?.name || item.name,
          shortName: apiItem?.shortName || item.searchTerm,
          avg24hPrice: basePrice,
          lastLowPrice: apiItem?.lastLowPrice || 0,
          changeLast48h: apiItem?.changeLast48h || 0,
          changeLast48hPercent: apiItem?.changeLast48hPercent ?? undefined,
          updated: apiItem?.updated || new Date().toISOString(),
          iconLink: apiItem?.iconLink || '',
          wikiLink: apiItem?.wikiLink || '',
          quantity: item.quantity,
          category: item.category,
          crafts: apiItem?.craftsFor || [],
          barters: apiItem?.bartersFor || [],
          fleaMarketFee: apiItem?.fleaMarketFee,
          sellFor: apiItem?.sellFor || [],
          gameMode: gameMode,
          pvpPrice: gameMode === 'pvp' ? basePrice : 0, // Only set if we're in PvP mode
          pvePrice: gameMode === 'pve' ? basePrice : 0,  // Only set if we're in PvE mode
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

      // Fetch prices for all required items
      const priceCache = await fetchItemPrices(Array.from(requiredItemIds))
      setItemPriceCache(priceCache)

      // Fetch complete data for required items (including price change data)
      const requiredItemsFullData = await fetchRequiredItemsData(Array.from(requiredItemIds))
      setRequiredItemsData(requiredItemsFullData)

      // Calculate cheapest acquisition methods for flea market restricted items or items with no price
      for (const item of mappedPrices) {
        const isRestricted = isFleaMarketRestricted(item)
        console.log(`${item.shortName}: fleaRestricted=${isRestricted}, basePrice=${item.avg24hPrice}, hasBundled=${!!item.bundledItem}`)
        
        if (isRestricted || item.avg24hPrice === 0) {
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