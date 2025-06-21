import { useState, useEffect, useCallback } from 'react'
import { ItemPrice, GraphQLError, ApiItem } from '../types/tarkov'
import { TARKOV_ITEMS, EXTENDED_GRAPHQL_QUERY } from '../constants/tarkov-data'
import { 
  isFleaMarketRestricted, 
  getTotalValue,
  fetchItemPrices,
  findCheapestAcquisitionMethod
} from '../utils/tarkov-utils'

export const useTarkovData = () => {
  const [itemPrices, setItemPrices] = useState<ItemPrice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [itemPriceCache, setItemPriceCache] = useState<Map<string, number>>(new Map())

  const fetchPrices = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const searchTerms = TARKOV_ITEMS.map(item => item.searchTerm)
      
      const response = await fetch('https://api.tarkov.dev/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: EXTENDED_GRAPHQL_QUERY,
          variables: { names: searchTerms }
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.errors) {
        throw new Error(data.errors.map((e: GraphQLError) => e.message).join(', '))
      }

      // Map API results back to our item list
      const mappedPrices: ItemPrice[] = TARKOV_ITEMS.map(item => {
        const apiItem = data.data.items.find((apiItem: ApiItem) => 
          apiItem.name.toLowerCase().includes(item.searchTerm.toLowerCase()) ||
          apiItem.shortName.toLowerCase().includes(item.searchTerm.toLowerCase())
        )

        return {
          id: apiItem?.id || `missing-${item.searchTerm}`,
          name: apiItem?.name || item.name,
          shortName: apiItem?.shortName || item.searchTerm,
          avg24hPrice: apiItem?.avg24hPrice || 0,
          lastLowPrice: apiItem?.lastLowPrice || 0,
          changeLast48h: apiItem?.changeLast48h || 0,
          changeLast48hPercent: apiItem?.changeLast48hPercent || 0,
          updated: apiItem?.updated || new Date().toISOString(),
          iconLink: apiItem?.iconLink || '',
          wikiLink: apiItem?.wikiLink || '',
          quantity: item.quantity,
          category: item.category,
          crafts: apiItem?.craftsFor || [],
          barters: apiItem?.bartersFor || [],
          fleaMarketFee: apiItem?.fleaMarketFee,
          sellFor: apiItem?.sellFor || []
        }
      })

      // Collect all required item IDs for price fetching
      const requiredItemIds = new Set<string>()
      mappedPrices.forEach(item => {
        item.crafts.forEach(craft => {
          craft.requiredItems.forEach(req => requiredItemIds.add(req.item.id))
        })
        item.barters.forEach(barter => {
          barter.requiredItems.forEach(req => requiredItemIds.add(req.item.id))
        })
      })

      // Fetch prices for all required items
      const priceCache = await fetchItemPrices(Array.from(requiredItemIds))
      setItemPriceCache(priceCache)

      // Calculate cheapest acquisition methods for flea market restricted items or items with no price
      for (const item of mappedPrices) {
        if (isFleaMarketRestricted(item) || item.avg24hPrice === 0) {
          item.cheapestAcquisitionMethod = await findCheapestAcquisitionMethod(item, priceCache)
        }
      }

      setItemPrices(mappedPrices)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPrices()
  }, [fetchPrices])

  // Computed values
  const grandTotal = itemPrices.reduce((sum, item) => sum + getTotalValue(item), 0)

  const categoryTotals = itemPrices.reduce((acc, item) => {
    const total = getTotalValue(item)
    acc[item.category] = (acc[item.category] || 0) + total
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
    
    // Computed values
    grandTotal,
    categoryTotals,
    
    // Functions
    fetchPrices,
    groupItemsByQuest
  }
} 