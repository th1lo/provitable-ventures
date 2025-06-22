import { Craft, Barter, ApiItem } from '../types/tarkov'

// Quest IDs for "all on red" quests
export const QUEST_IDS = {
  'Profitable Venture': '67af4c1405c58dc6f7056667',
  'Safety Guarantee': '67af4c169d95ad16e004fd86',
  'Never Too Late To Learn': '67af4c17f4f1fb58a907f8f6',
  'Get a Foothold': '67af4c1991ee75c6d7060a16',
  'Profit Retention': '67af4c1a6c3ebfd8e6034916',
  'A Life Lesson': '67af4c1cc0e59d55e2010b97',
  'Consolation Prize': '67af4c1d8c9482eca103e477'
}

// Enhanced barter/craft search logic for quest-related items
export class QuestBarterCraftAnalyzer {
  private questIds: Set<string>
  private priceCache: Map<string, number>
  private itemDataCache: Map<string, ApiItem>

  constructor(questIds: string[] = Object.values(QUEST_IDS)) {
    this.questIds = new Set(questIds)
    this.priceCache = new Map()
    this.itemDataCache = new Map()
  }

  // Check if an item has quest-related acquisition methods
  hasQuestRelatedAcquisition(item: ApiItem): boolean {
    // Check barters that require specific quests
    const hasQuestBarters = item.bartersFor.some(barter => 
      barter.taskUnlock && this.questIds.has(barter.taskUnlock.id)
    )

    // Check if item is craftable (crafts are always available regardless of quests)
    const hasCrafts = item.craftsFor.length > 0

    return hasQuestBarters || hasCrafts
  }

  // Get all quest-related acquisition methods for an item
  getQuestAcquisitionMethods(item: ApiItem): {
    questBarters: Barter[]
    crafts: Craft[]
    questUnlocks: Array<{
      questId: string
      questName: string
      trader: string
      level: number
    }>
  } {
    const questBarters = item.bartersFor.filter(barter => 
      barter.taskUnlock && this.questIds.has(barter.taskUnlock.id)
    )

    const questUnlocks = questBarters.map(barter => ({
      questId: barter.taskUnlock!.id,
      questName: barter.taskUnlock!.name,
      trader: barter.trader.name,
      level: barter.level
    }))

    return {
      questBarters,
      crafts: item.craftsFor,
      questUnlocks
    }
  }

  // Calculate costs for all acquisition methods
  async calculateAcquisitionCosts(item: ApiItem): Promise<{
    craftCosts: Array<{ craft: Craft; cost: number; duration: number }>
    barterCosts: Array<{ barter: Barter; cost: number; questRequired: string | null }>
    fleaPrice: number
    cheapestMethod: {
      type: 'craft' | 'barter' | 'flea'
      cost: number
      details: string
    }
  }> {
    // Calculate craft costs
    const craftCosts = await Promise.all(item.craftsFor.map(async (craft) => {
      const cost = await this.calculateCraftCost(craft)
      return { craft, cost, duration: craft.duration }
    }))

    // Calculate barter costs
    const barterCosts = await Promise.all(item.bartersFor.map(async (barter) => {
      const cost = await this.calculateBarterCost(barter)
      const questRequired = barter.taskUnlock?.name || null
      return { barter, cost, questRequired }
    }))

    const fleaPrice = item.avg24hPrice || 0

    // Find cheapest method
    const allMethods = [
      ...craftCosts.map(c => ({ type: 'craft' as const, cost: c.cost, details: `${c.craft.station.name} Level ${c.craft.level}` })),
      ...barterCosts.map(b => ({ type: 'barter' as const, cost: b.cost, details: `${b.barter.trader.name} Level ${b.barter.level}` })),
      { type: 'flea' as const, cost: fleaPrice, details: 'Flea Market' }
    ]

    const cheapestMethod = allMethods.reduce((min, method) => 
      method.cost < min.cost ? method : min
    )

    return {
      craftCosts,
      barterCosts,
      fleaPrice,
      cheapestMethod
    }
  }

  // Calculate cost for a specific craft
  private async calculateCraftCost(craft: Craft): Promise<number> {
    let totalCost = 0
    
    for (const requiredItem of craft.requiredItems) {
      const itemPrice = this.priceCache.get(requiredItem.item.id) || 0
      totalCost += itemPrice * requiredItem.count
    }
    
    return totalCost
  }

  // Calculate cost for a specific barter
  private async calculateBarterCost(barter: Barter): Promise<number> {
    let totalCost = 0
    
    for (const requiredItem of barter.requiredItems) {
      const itemPrice = this.priceCache.get(requiredItem.item.id) || 0
      totalCost += itemPrice * requiredItem.count
    }
    
    return totalCost
  }

  // Set price cache (would be populated from API calls)
  setPriceCache(prices: Map<string, number>) {
    this.priceCache = prices
  }

  // Set item data cache (would be populated from API calls)
  setItemDataCache(items: Map<string, ApiItem>) {
    this.itemDataCache = items
  }

  // Get quest requirements for an item
  getQuestRequirements(item: ApiItem): {
    requiredQuests: string[]
    availableWithoutQuests: boolean
  } {
    const questBarters = item.bartersFor.filter(barter => 
      barter.taskUnlock && this.questIds.has(barter.taskUnlock.id)
    )

    const requiredQuests = [...new Set(questBarters.map(b => b.taskUnlock!.name))]
    const availableWithoutQuests = item.craftsFor.length > 0 || 
      item.bartersFor.some(b => !b.taskUnlock || !this.questIds.has(b.taskUnlock.id))

    return {
      requiredQuests,
      availableWithoutQuests
    }
  }

  // Filter items that have quest-related acquisition methods
  filterQuestRelatedItems(items: ApiItem[]): ApiItem[] {
    return items.filter(item => this.hasQuestRelatedAcquisition(item))
  }

  // Get quest unlock information for all items
  getQuestUnlockSummary(items: ApiItem[]): {
    questName: string
    questId: string
    items: Array<{
      item: ApiItem
      trader: string
      level: number
    }>
  }[] {
    const questMap = new Map<string, {
      questName: string
      questId: string
      items: Array<{
        item: ApiItem
        trader: string
        level: number
      }>
    }>()

    items.forEach(item => {
      const questBarters = item.bartersFor.filter(barter => 
        barter.taskUnlock && this.questIds.has(barter.taskUnlock.id)
      )

      questBarters.forEach(barter => {
        const questId = barter.taskUnlock!.id
        const questName = barter.taskUnlock!.name

        if (!questMap.has(questId)) {
          questMap.set(questId, {
            questName,
            questId,
            items: []
          })
        }

        questMap.get(questId)!.items.push({
          item,
          trader: barter.trader.name,
          level: barter.level
        })
      })
    })

    return Array.from(questMap.values())
  }
}

// Utility functions for quest analysis
export const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Create a singleton instance for use throughout the app
export const questAnalyzer = new QuestBarterCraftAnalyzer() 