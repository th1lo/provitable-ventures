import { NextRequest, NextResponse } from 'next/server'
import { fetchItemPrices, fetchRequiredItemsData } from '../../utils/tarkov-utils'
import type { GameMode, ApiItem, ItemPrice } from '../../types/tarkov'
import { promises as fs } from 'fs'
import path from 'path'

// Cache settings - different durations for different data types
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes for general cache
const PRICE_CACHE_DURATION = 2 * 60 * 1000 // 2 minutes for price data (more frequent updates)
const QUEST_CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours for quest data (rarely changes)
const TRADER_CACHE_DURATION = 12 * 60 * 60 * 1000 // 12 hours for trader data (changes less often)
const CACHE_DIR = path.join(process.cwd(), '.cache')

// Ensure cache directory exists
async function ensureCacheDir() {
  try {
    await fs.access(CACHE_DIR)
  } catch {
    await fs.mkdir(CACHE_DIR, { recursive: true })
  }
}

// Helper to generate cache key
function getCacheKey(prefix: string, gameMode: GameMode, suffix?: string): string {
  return `${prefix}-${gameMode}${suffix ? `-${suffix}` : ''}.json`
}

// Check if cache is valid (not expired) with custom duration
async function isCacheValid(filePath: string, customDuration?: number): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath)
    const now = Date.now()
    const fileAge = now - stats.mtime.getTime()
    const duration = customDuration || CACHE_DURATION
    return fileAge < duration
  } catch {
    return false
  }
}

// Read from cache
async function readCache<T>(filePath: string): Promise<T | null> {
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

// Write to cache
async function writeCache<T>(filePath: string, data: T): Promise<void> {
  try {
    await ensureCacheDir()
    await fs.writeFile(filePath, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Cache write failed:', error)
    // Don't throw - caching is not critical
  }
}

// Special cases - items not in quest objectives but still required
const SPECIAL_QUEST_ITEMS = {
  'Consolation Prize': {
    id: '5c94bbff86f7747ee735c08f', // TerraGroup Labs access keycard
    name: 'TerraGroup Labs access keycard',
    shortName: 'Access',
    quantity: 15, // Need 15 Labs cards for 15 extractions
    reason: 'Required for 15 Labs extractions'
  }
}

// Dynamic quest order detection - will be determined from quest dependencies
function determineQuestOrder(quests: Quest[]): Record<string, number> {
  // Create a basic ordering map based on quest discovery order
  // In future: analyze taskRequirement dependencies for proper ordering
  const orderMap: Record<string, number> = {}
  
  quests.forEach((quest, index) => {
    orderMap[quest.name] = index + 1
  })
  
  return orderMap
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

// REMOVED: Old hardcoded bundled items query - now using dynamic containsItems detection

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
    console.error('GraphQL errors:', data.errors)
    throw new Error(`GraphQL errors: ${data.errors.map((e: { message: string }) => e.message).join(', ')}`)
  }

  return data.data
}

// Fetch Red Achievement quests dynamically with caching
async function fetchRedAchievementQuests(): Promise<Quest[]> {
  const cacheFilePath = path.join(CACHE_DIR, 'quest-data.json')
  
  // Try to read from cache first (24 hour cache for quest data)
  if (await isCacheValid(cacheFilePath, QUEST_CACHE_DURATION)) {
    const cachedData = await readCache<{ quests: Quest[], timestamp: number }>(cacheFilePath)
    if (cachedData?.quests) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Cache HIT for quest data (${cachedData.quests.length} quests)`)
      }
      return cachedData.quests
    }
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Cache MISS for quest data - fetching from API')
  }
  
  const data: QuestApiResponse = await graphqlQuery(QUEST_DATA_QUERY)
  
  // Dynamic Red Achievement quest detection by Skier trader and specific quest names
  const redAchievementQuests = data.tasks.filter((quest: Quest) => {
    // Filter by Skier trader AND quest names that match the Red Achievement series
    const isSkierQuest = quest.trader.name === 'Skier'
    const isRedAchievementQuest = [
      'Profitable Venture',
      'Safety Guarantee', 
      'Never Too Late To Learn',
      'Get a Foothold',
      'Profit Retention',
      'A Life Lesson',
      'Consolation Prize'
    ].includes(quest.name)
    
    return isSkierQuest && isRedAchievementQuest
  })
  
  // Filter for quests that have required items OR special cases
  const questsWithItems = redAchievementQuests.filter((quest: Quest) => 
    quest.objectives.some((obj: QuestObjective) => obj.type === 'giveItem' && obj.item) ||
    Object.keys(SPECIAL_QUEST_ITEMS).includes(quest.name)
  )
  
  // Cache the quest data
  if (questsWithItems.length > 0) {
    await writeCache(cacheFilePath, {
      quests: questsWithItems,
      timestamp: Date.now()
    })
  }
  
  return questsWithItems
}

// Extract quest items from dynamic quest data
function extractQuestItems(quests: Quest[]): ItemPrice[] {
  const questItems: ItemPrice[] = []
  const questOrderMap = determineQuestOrder(quests)
  
  quests.forEach(quest => {
    const questOrder = questOrderMap[quest.name] || 999
    
    // Handle regular giveItem objectives
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
    
    // Handle special quest items (like Labs cards for Consolation Prize)
    const specialItemKey = quest.name as keyof typeof SPECIAL_QUEST_ITEMS
    if (SPECIAL_QUEST_ITEMS[specialItemKey]) {
      const specialItem = SPECIAL_QUEST_ITEMS[specialItemKey]
      questItems.push({
        id: specialItem.id,
        name: specialItem.name,
        shortName: specialItem.shortName,
        avg24hPrice: 0, // Will be filled by API data
        lastLowPrice: 0,
        changeLast48h: 0,
        changeLast48hPercent: 0,
        updated: new Date().toISOString(),
        iconLink: '',
        wikiLink: '',
        quantity: specialItem.quantity,
        category: quest.name,
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
  
  return questItems
}

// Batch fetch items by IDs in chunks for performance with caching
async function fetchItemsByIds(itemIds: string[], gameMode: GameMode, batchSize: number = 50): Promise<ApiItem[]> {
  // Generate cache key based on item IDs hash
  const itemIdsHash = Buffer.from(itemIds.sort().join(',')).toString('base64').slice(0, 16)
  const cacheFilePath = path.join(CACHE_DIR, getCacheKey('items', gameMode, itemIdsHash))
  
  // Try to read from cache first
  if (await isCacheValid(cacheFilePath)) {
    const cachedData = await readCache<{ items: ApiItem[], timestamp: number }>(cacheFilePath)
    if (cachedData?.items) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Cache HIT for ${gameMode} items (${cachedData.items.length} items)`)
      }
      return cachedData.items
    }
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`Cache MISS for ${gameMode} items - fetching from API`)
  }
  
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
  
  // Cache the fetched data
  if (allItems.length > 0) {
    await writeCache(cacheFilePath, {
      items: allItems,
      timestamp: Date.now()
    })
  }
  
  return allItems
}

// Find trader weapons that contain quest items (weapon mods/attachments)
async function findBundledItems(questItems: ItemPrice[], gameMode: GameMode): Promise<Map<string, ApiItem>> {
  const cacheFilePath = path.join(CACHE_DIR, getCacheKey('bundled-weapons', gameMode))
  
  // Try to read from cache first (12 hour cache for trader weapons)
  if (await isCacheValid(cacheFilePath, TRADER_CACHE_DURATION)) {
    const cachedData = await readCache<{ bundledItems: Array<[string, ApiItem]>, timestamp: number }>(cacheFilePath)
    if (cachedData?.bundledItems) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Cache HIT for ${gameMode} trader weapons (${cachedData.bundledItems.length} weapons)`)
      }
      return new Map(cachedData.bundledItems)
    }
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`Cache MISS for ${gameMode} trader weapons - searching dynamically`)
  }
  
  const bundledItemsMap = new Map<string, ApiItem>()
  
  // Simplified approach: Search for weapons that contain quest items
  try {
    const SIMPLIFIED_WEAPON_QUERY = `
      query FindWeaponsWithMods($gameMode: GameMode) {
        items(gameMode: $gameMode) {
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
            }
            count
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
        }
      }
    `
    
    const data = await graphqlQuery(SIMPLIFIED_WEAPON_QUERY, { 
      gameMode: gameMode === 'pve' ? 'pve' : undefined
    })
    
    if (data.items) {
      data.items.forEach((item: any) => {
        // Only process weapons that have containsItems and are sold by traders
        if (!item?.containsItems?.length) return
        if (!item?.sellFor?.length && !item?.bartersFor?.length) return
        
        // Check if it's available from traders (not just flea market)
        const availableFromTraders = item.sellFor?.some((sell: any) => 
          sell.vendor?.normalizedName && sell.vendor.normalizedName !== 'flea-market'
        ) || item.bartersFor?.length > 0
        
        if (availableFromTraders) {
          processWeaponForQuestItems(item, questItems, bundledItemsMap)
        }
      })
    }
  } catch (error) {
    console.error('Failed to fetch trader weapons:', error)
    // Continue without bundled items if this fails
  }
  
  // Cache the weapons data (12 hour cache)
  if (bundledItemsMap.size > 0) {
    await writeCache(cacheFilePath, {
      bundledItems: Array.from(bundledItemsMap.entries()),
      timestamp: Date.now()
    })
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`Found ${bundledItemsMap.size} trader weapons containing quest items`)
  }
  
  return bundledItemsMap
}

// Helper function to process weapon for quest items with proper safety checks
function processWeaponForQuestItems(weapon: any, questItems: ItemPrice[], bundledItemsMap: Map<string, ApiItem>) {
  if (!weapon?.categories?.length) return
  
  // Only process actual weapons, not ammo packs or other items
  const weaponCategories = weapon.categories.map((cat: any) => cat.normalizedName)
  const isWeapon = weaponCategories.some((cat: string) => 
    ['assault-rifle', 'assault-carbine', 'machine-gun', 'sniper-rifle', 'marksman-rifle', 
     'submachine-gun', 'shotgun', 'pistol', 'grenade-launcher'].includes(cat)
  )
  
  if (!isWeapon) return
  
  // Check if this weapon contains any of our quest items (weapon mods/attachments)
  const containsQuestItem = weapon.containsItems?.some((contained: any) => 
    questItems.some(questItem => {
      // Match by ID or by shortName for weapon attachments
      const matchesId = questItem.id === contained.item?.id
      const matchesShortName = questItem.shortName?.toLowerCase().includes(contained.item?.shortName?.toLowerCase())
      return matchesId || matchesShortName
    })
  )
  
  if (containsQuestItem) {
    weapon.containsItems.forEach((contained: any) => {
      questItems.forEach(questItem => {
        const matchesId = questItem.id === contained.item?.id
        const matchesShortName = questItem.shortName?.toLowerCase().includes(contained.item?.shortName?.toLowerCase())
        
        if (matchesId || matchesShortName) {
          bundledItemsMap.set(questItem.shortName, weapon)
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`Found trader weapon: ${weapon.name} contains ${questItem.shortName}`)
          }
        }
      })
    })
  }
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
    
    // Step 8: Fetch prices for all required items for both game modes with caching
    const requiredItemIdsArray = Array.from(requiredItemIds)
    const requiredItemsHash = Buffer.from(requiredItemIdsArray.sort().join(',')).toString('base64').slice(0, 16)
    
    const pvpPriceCachePath = path.join(CACHE_DIR, getCacheKey('required-items', 'pvp', requiredItemsHash))
    const pvePriceCachePath = path.join(CACHE_DIR, getCacheKey('required-items', 'pve', requiredItemsHash))
    
    // Try to read from cache first (2 minute cache for price data)
    const [cachedPvpPrices, cachedPvePrices] = await Promise.all([
      (async () => {
        if (await isCacheValid(pvpPriceCachePath, PRICE_CACHE_DURATION)) {
          const cached = await readCache<{ prices: Array<[string, number]>, requiredData: Array<[string, ApiItem]>, timestamp: number }>(pvpPriceCachePath)
          if (cached) {
            if (process.env.NODE_ENV === 'development') {
              console.log('Cache HIT for PvP required items')
            }
            return { prices: new Map(cached.prices), requiredData: new Map(cached.requiredData) }
          }
        }
        return null
      })(),
      (async () => {
        if (await isCacheValid(pvePriceCachePath, PRICE_CACHE_DURATION)) {
          const cached = await readCache<{ prices: Array<[string, number]>, requiredData: Array<[string, ApiItem]>, timestamp: number }>(pvePriceCachePath)
          if (cached) {
            if (process.env.NODE_ENV === 'development') {
              console.log('Cache HIT for PvE required items')
            }
            return { prices: new Map(cached.prices), requiredData: new Map(cached.requiredData) }
          }
        }
        return null
      })()
    ])
    
    // Fetch missing data
    const [pvpPriceCacheData, pvePriceCacheData, pvpRequiredData, pveRequiredData] = await Promise.all([
      cachedPvpPrices?.prices || fetchItemPrices(requiredItemIdsArray, 'pvp'),
      cachedPvePrices?.prices || fetchItemPrices(requiredItemIdsArray, 'pve'),
      cachedPvpPrices?.requiredData || fetchRequiredItemsData(requiredItemIdsArray, 'pvp'),
      cachedPvePrices?.requiredData || fetchRequiredItemsData(requiredItemIdsArray, 'pve')
    ])
    
    // Cache the data if it was fetched fresh
    if (!cachedPvpPrices && (pvpPriceCacheData.size > 0 || pvpRequiredData.size > 0)) {
      await writeCache(pvpPriceCachePath, {
        prices: Array.from(pvpPriceCacheData.entries()),
        requiredData: Array.from(pvpRequiredData.entries()),
        timestamp: Date.now()
      })
    }
    
    if (!cachedPvePrices && (pvePriceCacheData.size > 0 || pveRequiredData.size > 0)) {
      await writeCache(pvePriceCachePath, {
        prices: Array.from(pvePriceCacheData.entries()),
        requiredData: Array.from(pveRequiredData.entries()),
        timestamp: Date.now()
      })
    }
    
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
        'X-Processing-Time': `${totalTime.toFixed(2)}ms`,
        'X-Cache-Status': 'server-cached'
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