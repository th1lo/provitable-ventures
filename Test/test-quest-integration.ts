import { ItemPrice, Craft, Barter, ApiItem } from '../app/types/tarkov'

// Quest IDs for "all on red" quests
const QUEST_IDS = {
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

  constructor(questIds: string[]) {
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
}

// Test the integration logic
export const testQuestIntegration = () => {
  console.log('🔗 Testing Quest Integration Logic')
  console.log('==================================')

  // Create analyzer with quest IDs
  const analyzer = new QuestBarterCraftAnalyzer(Object.values(QUEST_IDS))

  // Mock item data (REAP-IR scope)
  const mockItem: ApiItem = {
    id: 'reap-ir-scope',
    name: 'Trijicon REAP-IR thermal scope',
    shortName: 'REAP-IR',
    avg24hPrice: 500000,
    lastLowPrice: 480000,
    changeLast48h: 20000,
    changeLast48hPercent: 4,
    updated: new Date().toISOString(),
    iconLink: 'https://example.com/icon.png',
    wikiLink: 'https://example.com/wiki',
    craftsFor: [
      {
        id: 'craft-reap-ir',
        station: {
          id: 'workbench',
          name: 'Workbench',
          normalizedName: 'workbench'
        },
        level: 3,
        duration: 3600,
        requiredItems: [
          {
            item: {
              id: 'electronics',
              name: 'Electronics',
              shortName: 'Electronics',
              iconLink: 'https://example.com/electronics.png'
            },
            count: 2
          },
          {
            item: {
              id: 'circuit-board',
              name: 'Circuit Board',
              shortName: 'Circuit',
              iconLink: 'https://example.com/circuit.png'
            },
            count: 1
          }
        ],
        rewardItems: [
          {
            item: {
              id: 'reap-ir-scope',
              name: 'Trijicon REAP-IR thermal scope',
              shortName: 'REAP-IR'
            },
            count: 1
          }
        ]
      }
    ],
    bartersFor: [
      {
        id: 'barter-reap-ir-mechanic',
        trader: {
          id: 'mechanic',
          name: 'Mechanic',
          normalizedName: 'mechanic'
        },
        level: 4,
        requiredItems: [
          {
            item: {
              id: 'graphics-card',
              name: 'Graphics Card',
              shortName: 'GPU',
              iconLink: 'https://example.com/gpu.png'
            },
            count: 2
          }
        ],
        rewardItems: [
          {
            item: {
              id: 'reap-ir-scope',
              name: 'Trijicon REAP-IR thermal scope',
              shortName: 'REAP-IR'
            },
            count: 1
          }
        ],
        taskUnlock: {
          id: QUEST_IDS['Profitable Venture'],
          name: 'Profitable Venture'
        }
      }
    ],
    fleaMarketFee: 50000,
    sellFor: [
      {
        source: 'Flea Market',
        price: 500000,
        currency: 'RUB',
        priceRUB: 500000
      }
    ]
  }

  // Set up price cache
  const priceCache = new Map<string, number>([
    ['electronics', 50000],
    ['circuit-board', 30000],
    ['graphics-card', 150000]
  ])
  analyzer.setPriceCache(priceCache)

  // Test 1: Check if item has quest-related acquisition
  console.log('\n📋 Test 1: Quest-Related Acquisition Check')
  const hasQuestAcquisition = analyzer.hasQuestRelatedAcquisition(mockItem)
  console.log(`Item has quest-related acquisition: ${hasQuestAcquisition ? '✅' : '❌'}`)

  // Test 2: Get acquisition methods
  console.log('\n🔧 Test 2: Acquisition Methods')
  const methods = analyzer.getQuestAcquisitionMethods(mockItem)
  console.log(`Quest barters: ${methods.questBarters.length}`)
  console.log(`Crafts: ${methods.crafts.length}`)
  console.log(`Quest unlocks: ${methods.questUnlocks.length}`)

  // Test 3: Calculate costs
  console.log('\n💰 Test 3: Cost Calculation')
  analyzer.calculateAcquisitionCosts(mockItem).then(costs => {
    console.log(`Craft costs: ${costs.craftCosts.length}`)
    costs.craftCosts.forEach(c => {
      console.log(`- ${c.craft.station.name} Level ${c.craft.level}: ${formatCurrency(c.cost)}`)
    })

    console.log(`Barter costs: ${costs.barterCosts.length}`)
    costs.barterCosts.forEach(b => {
      console.log(`- ${b.barter.trader.name} Level ${b.barter.level}: ${formatCurrency(b.cost)}`)
    })

    console.log(`Flea price: ${formatCurrency(costs.fleaPrice)}`)
    console.log(`Cheapest method: ${costs.cheapestMethod.details} at ${formatCurrency(costs.cheapestMethod.cost)}`)
  })

  // Test 4: Quest requirements
  console.log('\n🔓 Test 4: Quest Requirements')
  const requirements = analyzer.getQuestRequirements(mockItem)
  console.log(`Required quests: ${requirements.requiredQuests.join(', ')}`)
  console.log(`Available without quests: ${requirements.availableWithoutQuests ? '✅' : '❌'}`)

  return {
    hasQuestAcquisition,
    methods,
    requirements
  }
}

// Utility function for formatting currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Export the main test function
export default testQuestIntegration 