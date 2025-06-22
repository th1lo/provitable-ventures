// Item Search by Name - Find acquisition methods for quest items
// Run with: node test-item-search-by-name.js

console.log('🔍 Item Search by Name - Finding Acquisition Methods for Quest Items')
console.log('===================================================================')

// Quest items with their names and short names
const QUEST_ITEMS = [
  { name: 'Trijicon REAP-IR thermal scope', shortName: 'REAP-IR' },
  { name: 'BNTI Zhuk body armor (EMR)', shortName: 'Zhuk EMR' },
  { name: 'Vulkan-5 LShZ-5 bulletproof helmet (Black)', shortName: 'Vulkan-5' },
  { name: 'Maska-1SCh face shield (Killa Edition)', shortName: '1SCh FS' },
  { name: 'HK 416A5 5.56x45 assault rifle', shortName: 'HK 416A5' },
  { name: '5.56x45mm MK 318 Mod 0 (SOST)', shortName: 'SOST' },
  { name: 'UVSR Taiga-1 survival machete', shortName: 'Taiga-1' },
  { name: 'SJ6 TGLabs combat stimulant injector', shortName: 'SJ6' },
  { name: 'Obdolbos 2 cocktail injector', shortName: 'Dolbos 2' },
  { name: 'Propital regenerative stimulant injector', shortName: 'Propital' },
  { name: 'M.U.L.E. stimulant injector', shortName: 'M.U.L.E.' },
  { name: 'eTG-change regenerative stimulant injector', shortName: 'eTG-c' },
  { name: 'SJ9 TGLabs combat stimulant injector', shortName: 'SJ9' },
  { name: 'SJ12 TGLabs combat stimulant injector', shortName: 'SJ12' },
  { name: 'Meldonin injector', shortName: 'Meldonin' },
  { name: 'Graphics card', shortName: 'GPU' },
  { name: 'Physical Bitcoin', shortName: '0.2BTC' },
  { name: 'Bottle of Tarkovskaya vodka', shortName: 'Vodka' },
  { name: 'Bottle of Dan Jackiel whiskey', shortName: 'Whiskey' },
  { name: 'Bottle of Fierce Hatchling moonshine', shortName: 'Moonshine' }
]

// GraphQL query to search items by name
const ITEM_SEARCH_QUERY = `
  query SearchItemsByName($names: [String!]!) {
    items(names: $names) {
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

// Function to search items by name
async function searchItemsByName(itemNames) {
  try {
    console.log(`📡 Searching for ${itemNames.length} items by name...`)
    
    const response = await fetch('https://api.tarkov.dev/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: ITEM_SEARCH_QUERY,
        variables: { names: itemNames }
      })
    })

    if (!response.ok) {
      throw new Error(`Item search API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.data?.items) {
      console.log('✅ Successfully fetched item data')
      return data.data.items
    }
    
    console.log('❌ No item data found in API response')
    return []
  } catch (error) {
    console.error('❌ Error searching items:', error)
    return []
  }
}

// Function to analyze acquisition methods
function analyzeAcquisitionMethods(items) {
  const results = {
    directSales: [],
    barters: [],
    crafts: [],
    fleaMarket: []
  }

  items.forEach(item => {
    // Direct trader sales
    item.sellFor.forEach(sale => {
      if (sale.vendor && sale.vendor.name !== 'Flea Market') {
        results.directSales.push({
          itemId: item.id,
          itemName: item.name,
          trader: sale.vendor.name,
          price: sale.price,
          currency: sale.currency,
          level: sale.vendor.minTraderLevel || 1,
          buyLimit: sale.vendor.buyLimit
        })
      }
    })

    // Flea market availability
    const fleaSale = item.sellFor.find(s => s.source === 'Flea Market')
    if (fleaSale) {
      results.fleaMarket.push({
        itemId: item.id,
        itemName: item.name,
        price: fleaSale.price,
        fee: item.fleaMarketFee || 0
      })
    }

    // Barters
    item.bartersFor.forEach(barter => {
      results.barters.push({
        itemId: item.id,
        itemName: item.name,
        trader: barter.trader.name,
        level: barter.level,
        requiredItems: barter.requiredItems,
        rewardCount: barter.rewardItems.find(r => r.item.id === item.id)?.count || 1,
        taskUnlock: barter.taskUnlock
      })
    })

    // Crafts
    item.craftsFor.forEach(craft => {
      results.crafts.push({
        itemId: item.id,
        itemName: item.name,
        station: craft.station.name,
        level: craft.level,
        duration: craft.duration,
        requiredItems: craft.requiredItems,
        rewardCount: craft.rewardItems.find(r => r.item.id === item.id)?.count || 1
      })
    })
  })

  return results
}

// Function to find items that contain our quest items
function findContainingItems(items) {
  const results = []
  const questItemNames = QUEST_ITEMS.map(item => item.name.toLowerCase())

  items.forEach(item => {
    if (item.containsItems) {
      item.containsItems.forEach(contained => {
        if (questItemNames.includes(contained.item.name.toLowerCase())) {
          results.push({
            containerItem: {
              id: item.id,
              name: item.name,
              shortName: item.shortName
            },
            questItem: {
              id: contained.item.id,
              name: contained.item.name,
              shortName: contained.item.shortName
            },
            count: contained.count,
            containerPrice: item.avg24hPrice || 0
          })
        }
      })
    }
  })

  return results
}

// Main test function
async function testItemSearchByName() {
  console.log('\n🔍 Testing Item Search by Name')
  console.log('==============================')

  // Test 1: Search for items by name
  console.log('\n📡 Test 1: Searching Items by Name')
  const itemNames = QUEST_ITEMS.map(item => item.name)
  const items = await searchItemsByName(itemNames)
  console.log(`Found ${items.length}/${QUEST_ITEMS.length} quest items`)

  // Test 2: Analyze acquisition methods
  console.log('\n🔍 Test 2: Analyzing Acquisition Methods')
  const acquisitionResults = analyzeAcquisitionMethods(items)

  // Test 3: Display direct sales
  console.log('\n💰 Test 3: Direct Trader Sales')
  console.log(`Found ${acquisitionResults.directSales.length} direct sales`)
  acquisitionResults.directSales.forEach(sale => {
    console.log(`- ${sale.trader} Level ${sale.level}: ${sale.itemName} (${sale.price} ${sale.currency})`)
    if (sale.buyLimit) {
      console.log(`  Buy limit: ${sale.buyLimit}`)
    }
  })

  // Test 4: Display flea market availability
  console.log('\n🛒 Test 4: Flea Market Availability')
  console.log(`Found ${acquisitionResults.fleaMarket.length} items on flea market`)
  acquisitionResults.fleaMarket.forEach(flea => {
    console.log(`- ${flea.itemName}: ${flea.price} RUB (Fee: ${flea.fee} RUB)`)
  })

  // Test 5: Display barters
  console.log('\n🔄 Test 5: Barters for Quest Items')
  console.log(`Found ${acquisitionResults.barters.length} barters`)
  acquisitionResults.barters.forEach(barter => {
    console.log(`- ${barter.trader} Level ${barter.level}: ${barter.itemName} (${barter.rewardCount}x)`)
    if (barter.taskUnlock) {
      console.log(`  Requires quest: ${barter.taskUnlock.name}`)
    }
    console.log(`  Required: ${barter.requiredItems.map(item => `${item.item.name} (${item.count}x)`).join(', ')}`)
  })

  // Test 6: Display crafts
  console.log('\n🔧 Test 6: Crafts for Quest Items')
  console.log(`Found ${acquisitionResults.crafts.length} crafts`)
  acquisitionResults.crafts.forEach(craft => {
    console.log(`- ${craft.station} Level ${craft.level}: ${craft.itemName} (${craft.rewardCount}x)`)
    console.log(`  Duration: ${formatDuration(craft.duration)}`)
    console.log(`  Required: ${craft.requiredItems.map(item => `${item.item.name} (${item.count}x)`).join(', ')}`)
  })

  // Test 7: Find items containing quest items
  console.log('\n📦 Test 7: Items Containing Quest Items')
  const containingItems = findContainingItems(items)
  console.log(`Found ${containingItems.length} items containing quest items`)
  containingItems.forEach(contained => {
    console.log(`- ${contained.containerItem.name} contains ${contained.questItem.name} (${contained.count}x)`)
    console.log(`  Container price: ${contained.containerPrice} RUB`)
  })

  // Test 8: Summary by quest item
  console.log('\n📋 Test 8: Summary by Quest Item')
  QUEST_ITEMS.forEach(questItem => {
    const item = items.find(i => i.name.toLowerCase() === questItem.name.toLowerCase())
    if (!item) {
      console.log(`\n${questItem.name}: Not found in API`)
      return
    }

    const directSales = acquisitionResults.directSales.filter(s => s.itemId === item.id)
    const fleaMarket = acquisitionResults.fleaMarket.filter(f => f.itemId === item.id)
    const barters = acquisitionResults.barters.filter(b => b.itemId === item.id)
    const crafts = acquisitionResults.crafts.filter(c => c.itemId === item.id)
    const containedIn = containingItems.filter(c => c.questItem.id === item.id)

    console.log(`\n${item.name} (${item.id}):`)
    console.log(`  Direct sales: ${directSales.length}`)
    console.log(`  Flea market: ${fleaMarket.length > 0 ? 'Available' : 'Not available'}`)
    console.log(`  Barters: ${barters.length}`)
    console.log(`  Crafts: ${crafts.length}`)
    console.log(`  Contained in: ${containedIn.length}`)
  })

  return {
    itemsFound: items.length,
    directSales: acquisitionResults.directSales.length,
    fleaMarket: acquisitionResults.fleaMarket.length,
    barters: acquisitionResults.barters.length,
    crafts: acquisitionResults.crafts.length,
    containingItems: containingItems.length,
    results: acquisitionResults,
    containingItemsResults: containingItems
  }
}

// Helper function to format duration
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

// Run the test
async function runItemSearchByName() {
  console.log('🚀 Starting Item Search by Name Test')
  console.log('====================================')
  
  const results = await testItemSearchByName()
  
  console.log('\n📊 Test Summary')
  console.log('===============')
  console.log(`Items found: ${results.itemsFound}/${QUEST_ITEMS.length}`)
  console.log(`Direct sales: ${results.directSales}`)
  console.log(`Flea market items: ${results.fleaMarket}`)
  console.log(`Barters: ${results.barters}`)
  console.log(`Crafts: ${results.crafts}`)
  console.log(`Items containing quest items: ${results.containingItems}`)
  
  console.log('\n🎯 Integration Ready!')
  console.log('Use these results to build comprehensive acquisition methods for quest items.')
  
  return results
}

// Execute the test
runItemSearchByName().catch(console.error) 