import { NextRequest, NextResponse } from 'next/server'
import { TARKOV_ITEMS, EXTENDED_GRAPHQL_QUERY, BUNDLED_ITEMS } from '../../constants/tarkov-data'
import { fetchItemPrices, fetchRequiredItemsData } from '../../utils/tarkov-utils'
import type { GameMode, ApiItem, ItemPrice } from '../../types/tarkov'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const startTime = performance.now()
    
    // Prepare search terms
    const searchTerms = TARKOV_ITEMS.map(item => item.searchTerm)
    const bundledItemTerms = Object.values(BUNDLED_ITEMS).map(bundle => bundle.bundledSearchTerm)
    const allSearchTerms = [...searchTerms, ...bundledItemTerms]

    // Fetch both PvP and PvE data simultaneously
    const [pvpResponse, pveResponse] = await Promise.all([
      fetch('https://api.tarkov.dev/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: EXTENDED_GRAPHQL_QUERY,
          variables: { names: allSearchTerms }
        })
      }),
      fetch('https://api.tarkov.dev/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      throw new Error((pvpData.errors || pveData.errors).map((e: { message: string }) => e.message).join(', '))
    }

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
        gameMode: 'pvp' as GameMode, // Default to PvP, will be updated based on current mode
        pvpPrice: pvpPrice, // Always store both prices
        pvePrice: pvePrice, // Always store both prices
        bundledItem: bundledItemData
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
      // Add bundled item barter requirements
      if (item.bundledItem) {
        item.bundledItem.barters.forEach(barter => {
          barter.requiredItems.forEach(req => requiredItemIds.add(req.item.id))
        })
      }
    })

    // Fetch prices for all required items for BOTH game modes simultaneously
    const [pvpPriceCacheData, pvePriceCacheData, pvpRequiredData, pveRequiredData] = await Promise.all([
      fetchItemPrices(Array.from(requiredItemIds), 'pvp'),
      fetchItemPrices(Array.from(requiredItemIds), 'pve'),
      fetchRequiredItemsData(Array.from(requiredItemIds), 'pvp'),
      fetchRequiredItemsData(Array.from(requiredItemIds), 'pve')
    ])

    const totalTime = performance.now() - startTime

    // Return the complete data structure
    const responseData = {
      mappedPrices,
      pvpPriceCache: Object.fromEntries(pvpPriceCacheData),
      pvePriceCache: Object.fromEntries(pvePriceCacheData),
      pvpRequiredItemsData: Object.fromEntries(pvpRequiredData),
      pveRequiredItemsData: Object.fromEntries(pveRequiredData),
      totalTime,
      timestamp: Date.now()
    }

    // Create response with aggressive CDN caching
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // 5min cache, 10min stale
        'CDN-Cache-Control': 'public, s-maxage=300',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=300',
      }
    })

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache' // Don't cache errors
        }
      }
    )
  }
} 