// Item Acquisition Scan - Find all ways to get quest items
// Run with: node test-item-acquisition-scan.js

console.log('🔍 Item Acquisition Scan - Finding All Ways to Get Quest Items')
console.log('=============================================================')

// Quest item IDs we need to find
const QUEST_ITEM_IDS = [
  '5a1eaa87fcdbcb001865f75e', // REAP-IR scope
  '5c0e625a86f7742d77340f62', // BNTI Zhuk armor
  '5ca20ee186f774799474abc2', // Vulkan-5 helmet
  '5c0e842486f77443a74d2976', // Maska face shield
  '5bb2475ed4351e00853264e3', // HK 416A5 rifle
  '60194943740c5d77f6705eea', // SOST ammo
  '601948682627df266209af05', // Taiga-1 machete
  '5c0e531d86f7747fa23f4d42', // SJ6 stim
  '637b60c3b7afa97bfc3d7001', // Obdolbos 2
  '5c0e530286f7747fa1419862', // Propital
  '5ed51652f6c34d2cc26336a1', // M.U.L.E.
  '5c0e534186f7747fa1419867', // eTG-change
  '5fca13ca637ee0341a484f46', // SJ9
  '637b612fb7afa97bfc3d7005', // SJ12
  '5ed5160a87bb8443d10680b5', // Meldonin
  '57347ca924597744596b4e71', // Graphics card
  '59faff1d86f7746c51718c9c', // Physical Bitcoin
  '5d40407c86f774318526545a', // Tarkovskaya vodka
  '5d403f9186f7743cac3f229b', // Dan Jackiel whiskey
  '5d1b376e86f774252519444e'  // Fierce Hatchling moonshine
]

// GraphQL query to fetch items with all acquisition methods
const ITEM_ACQUISITION_QUERY = `
  query GetItemAcquisitionMethods($ids: [String!]!) {
    items(ids: $ids) {
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

// Function to fetch item acquisition data
async function fetchItemAcquisitionData(itemIds) {
  try {
    console.log(`📡 Fetching acquisition data for ${itemIds.length} items...`)
    
    const response = await fetch('https://api.tarkov.dev/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: ITEM_ACQUISITION_QUERY,
        variables: { ids: itemIds }
      })
    })

    if (!response.ok) {
      throw new Error(`Item API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.data?.items) {
      console.log('✅ Successfully fetched item acquisition data')
      return data.data.items
    }
    
    console.log('❌ No item data found in API response')
    return []
  } catch (error) {
    console.error('❌ Error fetching item data:', error)
    return []
  }
}

// Function to analyze acquisition methods for each item
function analyzeAcquisitionMethods(items) {
  const results = {
    directSales: [],
    barters: [],
    crafts: [],
    containedInItems: [],
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

  items.forEach(item => {
    if (item.containsItems) {
      item.containsItems.forEach(contained => {
        if (QUEST_ITEM_IDS.includes(contained.item.id)) {
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
async function testItemAcquisitionScan() {
  console.log('\n🔍 Testing Item Acquisition Scan')
  console.log('=================================')

  // Test 1: Fetch item acquisition data
  console.log('\n📡 Test 1: Fetching Item Acquisition Data')
  const items = await fetchItemAcquisitionData(QUEST_ITEM_IDS)
  console.log(`Fetched data for ${items.length}/${QUEST_ITEM_IDS.length} quest items`)

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
  QUEST_ITEM_IDS.forEach(itemId => {
    const item = items.find(i => i.id === itemId)
    if (!item) {
      console.log(`\nUnknown Item (${itemId}): Not found in API`)
      return
    }

    const directSales = acquisitionResults.directSales.filter(s => s.itemId === itemId)
    const fleaMarket = acquisitionResults.fleaMarket.filter(f => f.itemId === itemId)
    const barters = acquisitionResults.barters.filter(b => b.itemId === itemId)
    const crafts = acquisitionResults.crafts.filter(c => c.itemId === itemId)
    const containedIn = containingItems.filter(c => c.questItem.id === itemId)

    console.log(`\n${item.name} (${itemId}):`)
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
async function runItemAcquisitionScan() {
  console.log('🚀 Starting Item Acquisition Scan Test')
  console.log('======================================')
  
  const results = await testItemAcquisitionScan()
  
  console.log('\n📊 Test Summary')
  console.log('===============')
  console.log(`Items found: ${results.itemsFound}/${QUEST_ITEM_IDS.length}`)
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
runItemAcquisitionScan().catch(console.error) 