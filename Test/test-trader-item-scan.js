// Trader Item Scan Test - Find Quest Items in Trader Offerings
// Run with: node test-trader-item-scan.js

console.log('🔍 Trader Item Scan - Finding Quest Items in Trader Offerings')
console.log('============================================================')

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

// GraphQL query to fetch all trader items with their contents
const TRADER_ITEMS_QUERY = `
  query GetTraderItems {
    traders {
      id
      name
      normalizedName
      levels {
        id
        level
        requiredPlayerLevel
        requiredReputation
        requiredCommerce
        payRate
        insuranceRate
        repairCostMultiplier
        barters {
          id
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
              iconLink
            }
            count
          }
          taskUnlock {
            id
            name
          }
        }
        items {
          id
          name
          shortName
          iconLink
          avg24hPrice
          lastLowPrice
          changeLast48h
          changeLast48hPercent
          updated
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
    }
  }
`

// Function to fetch all trader data
async function fetchTraderData() {
  try {
    console.log('📡 Fetching all trader data from Tarkov Dev API...')
    
    const response = await fetch('https://api.tarkov.dev/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: TRADER_ITEMS_QUERY
      })
    })

    if (!response.ok) {
      throw new Error(`Trader API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.data?.traders) {
      console.log('✅ Successfully fetched trader data')
      return data.data.traders
    }
    
    console.log('❌ No trader data found in API response')
    return []
  } catch (error) {
    console.error('❌ Error fetching trader data:', error)
    return []
  }
}

// Function to scan for quest items in trader offerings
function scanForQuestItems(traders) {
  const results = {
    directSales: [],
    barters: [],
    containedInItems: [],
    crafts: []
  }

  traders.forEach(trader => {
    trader.levels.forEach(level => {
      // Scan direct sales
      level.items.forEach(item => {
        if (QUEST_ITEM_IDS.includes(item.id)) {
          results.directSales.push({
            trader: trader.name,
            level: level.level,
            item: {
              id: item.id,
              name: item.name,
              shortName: item.shortName
            },
            price: item.sellFor.find(s => s.source === trader.name)?.price || 0,
            currency: item.sellFor.find(s => s.source === trader.name)?.currency || 'RUB'
          })
        }

        // Scan contained items (weapon parts, etc.)
        if (item.containsItems) {
          item.containsItems.forEach(contained => {
            if (QUEST_ITEM_IDS.includes(contained.item.id)) {
              results.containedInItems.push({
                trader: trader.name,
                level: level.level,
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
                containerPrice: item.sellFor.find(s => s.source === trader.name)?.price || 0
              })
            }
          })
        }

        // Scan crafts
        if (item.craftsFor) {
          item.craftsFor.forEach(craft => {
            craft.rewardItems.forEach(reward => {
              if (QUEST_ITEM_IDS.includes(reward.item.id)) {
                results.crafts.push({
                  trader: trader.name,
                  level: level.level,
                  craft: {
                    id: craft.id,
                    station: craft.station.name,
                    level: craft.level,
                    duration: craft.duration
                  },
                  questItem: {
                    id: reward.item.id,
                    name: reward.item.name,
                    shortName: reward.item.shortName
                  },
                  count: reward.count,
                  requiredItems: craft.requiredItems
                })
              }
            })
          })
        }
      })

      // Scan barters
      level.barters.forEach(barter => {
        barter.rewardItems.forEach(reward => {
          if (QUEST_ITEM_IDS.includes(reward.item.id)) {
            results.barters.push({
              trader: trader.name,
              level: level.level,
              barter: {
                id: barter.id,
                level: barter.level
              },
              questItem: {
                id: reward.item.id,
                name: reward.item.name,
                shortName: reward.item.shortName
              },
              count: reward.count,
              requiredItems: barter.requiredItems,
              taskUnlock: barter.taskUnlock
            })
          }
        })
      })
    })
  })

  return results
}

// Main test function
async function testTraderItemScan() {
  console.log('\n🔍 Testing Trader Item Scan')
  console.log('============================')

  // Test 1: Fetch trader data
  console.log('\n📡 Test 1: Fetching Trader Data')
  const traders = await fetchTraderData()
  console.log(`Fetched data for ${traders.length} traders`)

  // Test 2: Scan for quest items
  console.log('\n🔍 Test 2: Scanning for Quest Items')
  const scanResults = scanForQuestItems(traders)

  // Test 3: Display direct sales
  console.log('\n💰 Test 3: Direct Sales')
  console.log(`Found ${scanResults.directSales.length} direct sales`)
  scanResults.directSales.forEach(sale => {
    console.log(`- ${sale.trader} Level ${sale.level}: ${sale.item.name} (${sale.price} ${sale.currency})`)
  })

  // Test 4: Display contained items
  console.log('\n📦 Test 4: Items Containing Quest Items')
  console.log(`Found ${scanResults.containedInItems.length} items containing quest items`)
  scanResults.containedInItems.forEach(contained => {
    console.log(`- ${contained.trader} Level ${contained.level}: ${contained.containerItem.name} contains ${contained.questItem.name} (${contained.count}x)`)
    console.log(`  Container price: ${contained.containerPrice} RUB`)
  })

  // Test 5: Display barters
  console.log('\n🔄 Test 5: Barters for Quest Items')
  console.log(`Found ${scanResults.barters.length} barters`)
  scanResults.barters.forEach(barter => {
    console.log(`- ${barter.trader} Level ${barter.level}: ${barter.questItem.name} (${barter.count}x)`)
    if (barter.taskUnlock) {
      console.log(`  Requires quest: ${barter.taskUnlock.name}`)
    }
    console.log(`  Required items: ${barter.requiredItems.map(item => `${item.item.name} (${item.count}x)`).join(', ')}`)
  })

  // Test 6: Display crafts
  console.log('\n🔧 Test 6: Crafts for Quest Items')
  console.log(`Found ${scanResults.crafts.length} crafts`)
  scanResults.crafts.forEach(craft => {
    console.log(`- ${craft.craft.station} Level ${craft.craft.level}: ${craft.questItem.name} (${craft.count}x)`)
    console.log(`  Duration: ${formatDuration(craft.craft.duration)}`)
    console.log(`  Required items: ${craft.requiredItems.map(item => `${item.item.name} (${item.count}x)`).join(', ')}`)
  })

  // Test 7: Summary by quest item
  console.log('\n📋 Test 7: Summary by Quest Item')
  QUEST_ITEM_IDS.forEach(itemId => {
    const itemName = getItemName(itemId, scanResults)
    const directSales = scanResults.directSales.filter(s => s.item.id === itemId)
    const containedIn = scanResults.containedInItems.filter(c => c.questItem.id === itemId)
    const barters = scanResults.barters.filter(b => b.questItem.id === itemId)
    const crafts = scanResults.crafts.filter(c => c.questItem.id === itemId)

    console.log(`\n${itemName} (${itemId}):`)
    console.log(`  Direct sales: ${directSales.length}`)
    console.log(`  Contained in: ${containedIn.length}`)
    console.log(`  Barters: ${barters.length}`)
    console.log(`  Crafts: ${crafts.length}`)
  })

  return {
    traders: traders.length,
    directSales: scanResults.directSales.length,
    containedInItems: scanResults.containedInItems.length,
    barters: scanResults.barters.length,
    crafts: scanResults.crafts.length,
    results: scanResults
  }
}

// Helper function to get item name
function getItemName(itemId, scanResults) {
  const allItems = [
    ...scanResults.directSales.map(s => s.item),
    ...scanResults.containedInItems.map(c => c.questItem),
    ...scanResults.barters.map(b => b.questItem),
    ...scanResults.crafts.map(c => c.questItem)
  ]
  const item = allItems.find(i => i.id === itemId)
  return item ? item.name : `Unknown Item (${itemId})`
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
async function runTraderItemScan() {
  console.log('🚀 Starting Trader Item Scan Test')
  console.log('=================================')
  
  const results = await testTraderItemScan()
  
  console.log('\n📊 Test Summary')
  console.log('===============')
  console.log(`Traders scanned: ${results.traders}`)
  console.log(`Direct sales found: ${results.directSales}`)
  console.log(`Items containing quest items: ${results.containedInItems}`)
  console.log(`Barters found: ${results.barters}`)
  console.log(`Crafts found: ${results.crafts}`)
  
  console.log('\n🎯 Integration Ready!')
  console.log('Use the scan results to build comprehensive acquisition methods for quest items.')
  
  return results
}

// Execute the test
runTraderItemScan().catch(console.error) 