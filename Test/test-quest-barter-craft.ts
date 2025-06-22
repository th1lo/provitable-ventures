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

// Mock data for testing
const mockItemData: ApiItem = {
  id: 'test-item-id',
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
      id: 'craft-1',
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
            id: 'required-item-1',
            name: 'Required Item 1',
            shortName: 'RI1',
            iconLink: 'https://example.com/ri1.png'
          },
          count: 2
        }
      ],
      rewardItems: [
        {
          item: {
            id: 'test-item-id',
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
      id: 'barter-1',
      trader: {
        id: 'mechanic',
        name: 'Mechanic',
        normalizedName: 'mechanic'
      },
      level: 4,
      requiredItems: [
        {
          item: {
            id: 'barter-item-1',
            name: 'Barter Item 1',
            shortName: 'BI1',
            iconLink: 'https://example.com/bi1.png'
          },
          count: 3
        }
      ],
      rewardItems: [
        {
          item: {
            id: 'test-item-id',
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

// Test functions
export const testQuestBarterCraftLogic = () => {
  console.log('🧪 Testing Quest Barter/Craft Logic')
  console.log('=====================================')

  // Test 1: Check if item has quest-related barters
  const testQuestRelatedBarters = () => {
    console.log('\n📋 Test 1: Quest-Related Barters')
    
    const questBarters = mockItemData.bartersFor.filter(barter => 
      barter.taskUnlock && Object.values(QUEST_IDS).includes(barter.taskUnlock.id)
    )
    
    console.log(`Found ${questBarters.length} quest-related barters`)
    questBarters.forEach(barter => {
      console.log(`- ${barter.trader.name} Level ${barter.level}: ${barter.taskUnlock?.name}`)
    })
    
    return questBarters.length > 0
  }

  // Test 2: Check if item has crafts available
  const testCraftsAvailable = () => {
    console.log('\n🔧 Test 2: Available Crafts')
    
    const availableCrafts = mockItemData.craftsFor
    console.log(`Found ${availableCrafts.length} available crafts`)
    availableCrafts.forEach(craft => {
      console.log(`- ${craft.station.name} Level ${craft.level}: ${formatDuration(craft.duration)}`)
    })
    
    return availableCrafts.length > 0
  }

  // Test 3: Calculate acquisition costs
  const testAcquisitionCosts = () => {
    console.log('\n💰 Test 3: Acquisition Costs')
    
    // Mock price cache
    const priceCache = new Map<string, number>([
      ['required-item-1', 100000],
      ['barter-item-1', 50000]
    ])
    
    // Calculate craft cost
    const craftCost = mockItemData.craftsFor.reduce((total, craft) => {
      const cost = craft.requiredItems.reduce((sum, item) => {
        return sum + (priceCache.get(item.item.id) || 0) * item.count
      }, 0)
      return Math.min(total, cost)
    }, Infinity)
    
    // Calculate barter cost
    const barterCost = mockItemData.bartersFor.reduce((total, barter) => {
      const cost = barter.requiredItems.reduce((sum, item) => {
        return sum + (priceCache.get(item.item.id) || 0) * item.count
      }, 0)
      return Math.min(total, cost)
    }, Infinity)
    
    console.log(`Craft cost: ${formatCurrency(craftCost)}`)
    console.log(`Barter cost: ${formatCurrency(barterCost)}`)
    console.log(`Flea market price: ${formatCurrency(mockItemData.avg24hPrice)}`)
    
    return { craftCost, barterCost, fleaPrice: mockItemData.avg24hPrice }
  }

  // Test 4: Find cheapest acquisition method
  const testCheapestMethod = () => {
    console.log('\n🏆 Test 4: Cheapest Acquisition Method')
    
    const costs = testAcquisitionCosts()
    const methods = [
      { type: 'craft', cost: costs.craftCost, name: 'Crafting' },
      { type: 'barter', cost: costs.barterCost, name: 'Barter' },
      { type: 'flea', cost: costs.fleaPrice, name: 'Flea Market' }
    ]
    
    const cheapest = methods.reduce((min, method) => 
      method.cost < min.cost ? method : min
    )
    
    console.log(`Cheapest method: ${cheapest.name} at ${formatCurrency(cheapest.cost)}`)
    
    return cheapest
  }

  // Test 5: Quest unlock requirements
  const testQuestUnlocks = () => {
    console.log('\n🔓 Test 5: Quest Unlock Requirements')
    
    const questUnlocks = mockItemData.bartersFor
      .filter(barter => barter.taskUnlock)
      .map(barter => ({
        questId: barter.taskUnlock!.id,
        questName: barter.taskUnlock!.name,
        trader: barter.trader.name,
        level: barter.level
      }))
    
    console.log(`Found ${questUnlocks.length} quest unlocks`)
    questUnlocks.forEach(unlock => {
      console.log(`- ${unlock.questName} (${unlock.trader} Level ${unlock.level})`)
    })
    
    return questUnlocks
  }

  // Run all tests
  const results = {
    questBarters: testQuestRelatedBarters(),
    craftsAvailable: testCraftsAvailable(),
    cheapestMethod: testCheapestMethod(),
    questUnlocks: testQuestUnlocks()
  }

  console.log('\n✅ Test Results Summary')
  console.log('=======================')
  console.log(`Quest-related barters: ${results.questBarters ? '✅' : '❌'}`)
  console.log(`Crafts available: ${results.craftsAvailable ? '✅' : '❌'}`)
  console.log(`Cheapest method: ${results.cheapestMethod.name}`)
  console.log(`Quest unlocks found: ${results.questUnlocks.length}`)

  return results
}

// Utility function for formatting duration
const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
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
export default testQuestBarterCraftLogic 