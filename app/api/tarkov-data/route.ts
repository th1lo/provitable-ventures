import { NextRequest, NextResponse } from 'next/server'
import { fetchItemPrices, fetchRequiredItemsData } from '../../utils/tarkov-utils'
import type { GameMode, ApiItem, ItemPrice } from '../../types/tarkov'

// Red Achievement Quest IDs - the only hardcoded data
const RED_ACHIEVEMENT_QUEST_IDS = [
  '67af4c1405c58dc6f7056667', // Profitable Venture
  '67af4c169d95ad16e004fd86', // Safety Guarantee
  '67af4c17f4f1fb58a907f8f6', // Never Too Late To Learn
  '67af4c1991ee75c6d7060a16', // Get a Foothold
  '67af4c1a6c3ebfd8e6034916', // Profit Retention
  '67af4c1cc0e59d55e2010b97', // A Life Lesson
  '67af4c1d8c9482eca103e477'  // Consolation Prize
]

// Quest name to order mapping for UI consistency
const QUEST_ORDER_MAPPING: Record<string, number> = {
  'Profitable Venture': 1,
  'Safety Guarantee': 2,
  'Never Too Late To Learn': 3,
  'Get a Foothold': 4,
  'Profit Retention': 5,
  'A Life Lesson': 6,
  'Consolation Prize': 7
}

interface QuestObjective {
  id: string
  description: string
  type: string
  item?: {
    id: string
    name: string
    shortName: string
  }
  count?: number
  foundInRaid?: boolean
}

interface Quest {
  id: string
  name: string
  trader: {
    id: string
    name: string
  }
  objectives: QuestObjective[]
}

interface QuestApiResponse {
  tasks: Quest[]
}



// Quest data query
const QUEST_DATA_QUERY = `
  query GetRedAchievementQuests {
    tasks {
      id
      name
      trader {
        id
        name
      }
      objectives {
        id
        description
        type
        ... on TaskObjectiveItem {
          item {
            id
            name
            shortName
          }
          count
          foundInRaid
        }
      }
    }
  }
`

// Bundled items query for weapons containing quest items
const BUNDLED_ITEMS_QUERY = `
  query GetBundledItems($names: [String!]!, $gameMode: GameMode) {
    items(names: $names, gameMode: $gameMode) {
      id
      name
      shortName
      avg24hPrice
      lastLowPrice
      iconLink
      categories {
        id
        name
        normalizedName
      }
      containsItems {
        item {
          id
          name
          shortName
          iconLink
          avg24hPrice
          lastLowPrice
          changeLast48h
          sellFor {
            source
            price
            currency
            priceRUB
            vendor {
              name
              normalizedName
              ... on TraderOffer {
                minTraderLevel
                buyLimit
              }
              ... on FleaMarket {
                foundInRaidRequired
              }
            }
          }
        }
        count
      }
      bartersFor {
        id
        trader {
          id
          name
          normalizedName
        }
        level
        requiredItems {
          item {
            id
            name
            shortName
            iconLink
            avg24hPrice
            lastLowPrice
            changeLast48hPercent
          }
          count
        }
        rewardItems {
          item {
            id
            name
            shortName
          }
          count
        }
      }
      sellFor {
        source
        price
        currency
        priceRUB
        vendor {
          name
          normalizedName
          ... on TraderOffer {
            minTraderLevel
            buyLimit
          }
        }
      }
    }
  }
`

// GraphQL query helper
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function graphqlQuery(query: string, variables: Record<string, unknown> = {}): Promise<any> {
  const response = await fetch('https://api.tarkov.dev/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  })

  if (!response.ok) {
    throw new Error(`GraphQL HTTP error: ${response.status}`)
  }

  const data = await response.json()
  
  if (data.errors) {
    throw new Error(`GraphQL errors: ${data.errors.map((e: { message: string }) => e.message).join(', ')}`)
  }

  return data.data
}

// Fetch Red Achievement quests dynamically
async function fetchRedAchievementQuests(): Promise<Quest[]> {
  const data: QuestApiResponse = await graphqlQuery(QUEST_DATA_QUERY)
  
  // Filter for Red Achievement quests only
  const redAchievementQuests = data.tasks.filter((quest: Quest) => 
    RED_ACHIEVEMENT_QUEST_IDS.includes(quest.id)
  )
  
  // Filter for quests that have required items
  const questsWithItems = redAchievementQuests.filter((quest: Quest) => 
    quest.objectives.some((obj: QuestObjective) => obj.type === 'giveItem' && obj.item)
  )
  
  return questsWithItems
}

// Extract quest items from dynamic quest data
function extractQuestItems(quests: Quest[]): ItemPrice[] {
  const questItems: ItemPrice[] = []
  
  quests.forEach(quest => {
    const questOrder = QUEST_ORDER_MAPPING[quest.name] || 999
    
    quest.objectives.forEach(objective => {
      if (objective.type === 'giveItem' && objective.item && objective.count) {
        questItems.push({
          id: objective.item.id,
          name: objective.item.name,
          shortName: objective.item.shortName,
          avg24hPrice: 0, // Will be filled by API data
          lastLowPrice: 0,
          changeLast48h: 0,
          changeLast48hPercent: 0,
          updated: new Date().toISOString(),
          iconLink: '',
          wikiLink: '',
          quantity: objective.count,
          category: quest.name, // Use quest name as category
          crafts: [],
          barters: [],
          fleaMarketFee: 0,
          sellFor: [],
          gameMode: 'pvp' as GameMode,
          pvpPrice: 0,
          pvePrice: 0,
          questOrder: questOrder
        })
      }
    })
  })
  
  return questItems
}

// Batch fetch items by IDs in chunks for performance
async function fetchItemsByIds(itemIds: string[], gameMode: GameMode, batchSize: number = 50): Promise<ApiItem[]> {
  const allItems: ApiItem[] = []
  const batches: string[][] = []
  
  // Create batches
  for (let i = 0; i < itemIds.length; i += batchSize) {
    batches.push(itemIds.slice(i, i + batchSize))
  }
  
  // Enhanced query for fetching by IDs
  const ITEMS_BY_ID_QUERY = `
    query GetItemsByIds($ids: [ID!]!, $gameMode: GameMode) {
      items(ids: $ids, gameMode: $gameMode) {
        id
        name
        shortName
        avg24hPrice
        lastLowPrice
        changeLast48h
        changeLast48hPercent
        updated
        iconLink
        wikiLink
        fleaMarketFee
        categories {
          id
          name
          normalizedName
        }
        sellFor {
          source
          price
          currency
          priceRUB
          vendor {
            name
            normalizedName
            ... on TraderOffer {
              minTraderLevel
              buyLimit
            }
            ... on FleaMarket {
              foundInRaidRequired
            }
          }
        }
        containsItems {
          item {
            id
            name
            shortName
            iconLink
            avg24hPrice
            lastLowPrice
            changeLast48h
            sellFor {
              source
              price
              currency
              priceRUB
              vendor {
                name
                normalizedName
                ... on TraderOffer {
                  minTraderLevel
                  buyLimit
                }
                ... on FleaMarket {
                  foundInRaidRequired
                }
              }
            }
          }
          count
        }
        craftsFor {
          id
          station {
            id
            name
            normalizedName
          }
          level
          duration
          requiredItems {
            item {
              id
              name
              shortName
              iconLink
              avg24hPrice
              lastLowPrice
              changeLast48hPercent
            }
            count
          }
          rewardItems {
            item {
              id
              name
              shortName
            }
            count
          }
        }
        bartersFor {
          id
          trader {
            id
            name
            normalizedName
          }
          level
          requiredItems {
            item {
              id
              name
              shortName
              iconLink
              avg24hPrice
              lastLowPrice
              changeLast48hPercent
            }
            count
          }
          rewardItems {
            item {
              id
              name
              shortName
            }
            count
          }
          taskUnlock {
            id
            name
          }
        }
      }
    }
  `
  
  // Process batches with delay to avoid rate limiting
  for (const batch of batches) {
    try {
      const data = await graphqlQuery(ITEMS_BY_ID_QUERY, { 
        ids: batch, 
        gameMode: gameMode === 'pve' ? 'pve' : undefined // Only pass gameMode for PvE
      })
      
      if (data.items) {
        allItems.push(...data.items)
      }
      
      // Small delay between batches to be API-friendly
      if (batches.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch (error) {
      console.error(`Batch fetch failed for item IDs: ${batch.join(', ')}`, error)
      // Continue with other batches even if one fails
    }
  }
  
  return allItems
}

// Find bundled items that contain quest items (like M4A1 with REAP-IR)
async function findBundledItems(questItems: ItemPrice[], gameMode: GameMode): Promise<Map<string, ApiItem>> {
  const bundledItemsMap = new Map<string, ApiItem>()
  
  // Look for weapons that might contain quest items
  const weaponSearchTerms = [
    'M4A1 REAP-IR', // Known bundled item for REAP-IR
    'Colt M4A1 5.56x45 assault rifle REAP-IR'
  ]
  
  try {
    const data = await graphqlQuery(BUNDLED_ITEMS_QUERY, { 
      names: weaponSearchTerms,
      gameMode: gameMode === 'pve' ? 'pve' : undefined
    })
    
    if (data.items) {
      data.items.forEach((item: ApiItem) => {
        // Check if this bundled item contains any of our quest items
        const containsQuestItem = item.containsItems?.some(contained => 
          questItems.some(questItem => 
            questItem.id === contained.item.id ||
            questItem.shortName.toLowerCase().includes(contained.item.shortName.toLowerCase())
          )
        )
        
        if (containsQuestItem) {
          // Map bundled items by the quest items they contain, not by their own shortName
          item.containsItems?.forEach(contained => {
            questItems.forEach(questItem => {
              if (questItem.id === contained.item.id ||
                  questItem.shortName.toLowerCase().includes(contained.item.shortName.toLowerCase())) {
                bundledItemsMap.set(questItem.shortName, item)
              }
            })
          })
        }
      })
    }
  } catch (error) {
    console.error('Failed to fetch bundled items:', error)
    // Continue without bundled items if this fails
  }
  
  return bundledItemsMap
}

export async function GET(request: NextRequest) {
  const startTime = performance.now()
  const gameMode = (request.nextUrl.searchParams.get('gameMode') || 'pvp') as GameMode
  
  try {
    // Step 1: Fetch Red Achievement quests dynamically
    const questData = await fetchRedAchievementQuests()
    if (process.env.NODE_ENV === 'development') {
      console.log(`Found ${questData.length} Red Achievement quests with required items`)
    }
    
    // Step 2: Extract quest items from dynamic data
    const dynamicQuestItems = extractQuestItems(questData)
    if (process.env.NODE_ENV === 'development') {
      console.log(`Extracted ${dynamicQuestItems.length} quest items`)
    }
    
    // Step 3: Prepare item IDs for API calls (use IDs instead of search terms)
    const itemIds = dynamicQuestItems.map(item => item.id)
    
    // Step 4: Fetch both game modes simultaneously for comprehensive data
    const [pvpItems, pveItems] = await Promise.all([
      fetchItemsByIds(itemIds, 'pvp'),
      fetchItemsByIds(itemIds, 'pve')
    ])
    
    // Step 5: Find bundled items for both game modes
    const [pvpBundledItems, pveBundledItems] = await Promise.all([
      findBundledItems(dynamicQuestItems, 'pvp'),
      findBundledItems(dynamicQuestItems, 'pve')
    ])
    
    // Step 6: Map API results back to quest items with both PvP and PvE data
    const mappedPrices: ItemPrice[] = dynamicQuestItems.map(questItem => {
      // Find matching items in API results by ID (direct match)
      const pvpApiItem = pvpItems.find((apiItem: ApiItem) => 
        apiItem.id === questItem.id
      )
      
      const pveApiItem = pveItems.find((apiItem: ApiItem) => 
        apiItem.id === questItem.id
      )
      
      // Use PvP data as primary, fallback to PvE
      const primaryApiItem = pvpApiItem || pveApiItem
      
      // Get prices from both modes
      const pvpPrice = pvpApiItem?.avg24hPrice || pvpApiItem?.lastLowPrice || 0
      const pvePrice = pveApiItem?.avg24hPrice || pveApiItem?.lastLowPrice || 0
      
      // Find bundled item if exists
      const bundledApiItem = pvpBundledItems.get(questItem.shortName) || pveBundledItems.get(questItem.shortName)
      
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
        id: primaryApiItem?.id || questItem.id,
        name: primaryApiItem?.name || questItem.name,
        shortName: primaryApiItem?.shortName || questItem.shortName,
        avg24hPrice: pvpPrice, // Default to PvP for compatibility
        lastLowPrice: primaryApiItem?.lastLowPrice || 0,
        changeLast48h: primaryApiItem?.changeLast48h || 0,
        changeLast48hPercent: primaryApiItem?.changeLast48hPercent ?? undefined,
        updated: primaryApiItem?.updated || new Date().toISOString(),
        iconLink: primaryApiItem?.iconLink || '',
        wikiLink: primaryApiItem?.wikiLink || '',
        quantity: questItem.quantity,
        category: questItem.category,
        crafts: primaryApiItem?.craftsFor || [],
        barters: primaryApiItem?.bartersFor || [],
        fleaMarketFee: primaryApiItem?.fleaMarketFee,
        sellFor: primaryApiItem?.sellFor || [],
        gameMode: 'pvp' as GameMode, // Default, will be updated by hook
        pvpPrice: pvpPrice,
        pvePrice: pvePrice,
        bundledItem: bundledItemData,
        questOrder: questItem.questOrder
      }
    })
    
    // Step 7: Collect all required item IDs for price caching
    const requiredItemIds = new Set<string>()
    mappedPrices.forEach(item => {
      item.crafts.forEach(craft => {
        craft.requiredItems.forEach(req => requiredItemIds.add(req.item.id))
      })
      item.barters.forEach(barter => {
        barter.requiredItems.forEach(req => requiredItemIds.add(req.item.id))
      })
      if (item.bundledItem) {
        item.bundledItem.barters.forEach(barter => {
          barter.requiredItems.forEach(req => requiredItemIds.add(req.item.id))
        })
      }
    })
    
    // Step 8: Fetch prices for all required items for both game modes
    const [pvpPriceCacheData, pvePriceCacheData, pvpRequiredData, pveRequiredData] = await Promise.all([
      fetchItemPrices(Array.from(requiredItemIds), 'pvp'),
      fetchItemPrices(Array.from(requiredItemIds), 'pve'),
      fetchRequiredItemsData(Array.from(requiredItemIds), 'pvp'),
      fetchRequiredItemsData(Array.from(requiredItemIds), 'pve')
    ])
    
    const totalTime = performance.now() - startTime
    if (process.env.NODE_ENV === 'development') {
      console.log(`Dynamic quest analysis completed in ${totalTime.toFixed(2)}ms`)
    }
    
    // Return the same data structure as before for UI compatibility
    const responseData = {
      mappedPrices,
      pvpPriceCache: Object.fromEntries(pvpPriceCacheData),
      pvePriceCache: Object.fromEntries(pvePriceCacheData),
      pvpRequiredItemsData: Object.fromEntries(pvpRequiredData),
      pveRequiredItemsData: Object.fromEntries(pveRequiredData),
      totalTime,
      timestamp: Date.now(),
      questDataSource: 'dynamic', // Indicate this is from dynamic quest fetching
      questsAnalyzed: questData.length,
      itemsProcessed: mappedPrices.length
    }
    
    // Smart caching strategy for Vercel Edge Cache
    const cacheControl = gameMode === 'pve' 
      ? 'public, s-maxage=300, stale-while-revalidate=900' // 5min cache, 15min stale for PvE
      : 'public, s-maxage=300, stale-while-revalidate=600' // 5min cache, 10min stale for PvP
    
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': cacheControl,
        'CDN-Cache-Control': `public, s-maxage=300`,
        'Vercel-CDN-Cache-Control': `public, s-maxage=300`,
        'X-Quest-Analysis': 'dynamic',
        'X-Processing-Time': `${totalTime.toFixed(2)}ms`
      }
    })
    
  } catch (error) {
    console.error('Dynamic quest analysis failed:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Quest analysis failed',
        questDataSource: 'failed',
        timestamp: Date.now()
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Quest-Analysis': 'failed'
        }
      }
    )
  }
} 