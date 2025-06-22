// Quest Data Validation Test Runner
// Run with: node run-quest-validation.js

console.log('🔍 Quest Data Validation Test Runner')
console.log('====================================')

// Quest IDs we want to validate
const TARGET_QUEST_IDS = [
  '67af4c1405c58dc6f7056667',  // Profitable Venture
  '67af4c169d95ad16e004fd86', // Safety Guarantee
  '67af4c17f4f1fb58a907f8f6', // Never Too Late To Learn
  '67af4c1991ee75c6d7060a16', // Get a Foothold
  '67af4c1a6c3ebfd8e6034916', // Profit Retention
  '67af4c1cc0e59d55e2010b97', // A Life Lesson
  '67af4c1d8c9482eca103e477'  // Consolation Prize
]

const QUEST_NAME_MAPPING = {
  'Profitable Venture': 1,
  'Safety Guarantee': 2,
  'Never Too Late To Learn': 3,
  'Get a Foothold': 4,
  'Profit Retention': 5,
  'A Life Lesson': 6,
  'Consolation Prize': 7
}

// GraphQL query to fetch quest data
const QUEST_DATA_QUERY = `
  query GetQuestData {
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

// Function to fetch quest data from Tarkov Dev API
async function fetchQuestData() {
  try {
    console.log('📡 Fetching quest data from Tarkov Dev API...')
    
    const response = await fetch('https://api.tarkov.dev/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: QUEST_DATA_QUERY
      })
    })

    if (!response.ok) {
      throw new Error(`Quest API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.data?.tasks) {
      console.log('✅ Successfully fetched quest data')
      return data.data.tasks
    }
    
    console.log('❌ No quest data found in API response')
    return []
  } catch (error) {
    console.error('❌ Error fetching quest data:', error)
    return []
  }
}

// Function to extract quest items from API data with item IDs
function extractQuestItems(quests) {
  const questItems = []
  
  // Filter for our target quests
  const targetQuests = quests.filter(quest => 
    Object.keys(QUEST_NAME_MAPPING).includes(quest.name)
  )
  
  targetQuests.forEach(quest => {
    const questOrder = QUEST_NAME_MAPPING[quest.name]
    if (!questOrder) return
    
    quest.objectives.forEach(objective => {
      if (objective.type === 'giveItem' && objective.item && objective.count) {
        questItems.push({
          id: objective.item.id,
          name: objective.item.name,
          shortName: objective.item.shortName,
          quantity: objective.count,
          category: quest.name,
          questOrder: questOrder,
          questId: quest.id,
          trader: quest.trader.name
        })
      }
    })
  })
  
  return questItems
}

// Main test function
async function testQuestDataValidation() {
  console.log('\n🔍 Testing Quest Data Collection & Validation')
  console.log('=============================================')

  // Test 1: Fetch quest data from Tarkov Dev API
  console.log('\n📡 Test 1: Fetching Quest Data from API')
  const questData = await fetchQuestData()
  console.log(`Fetched ${questData.length} total quests from API`)

  // Test 2: Validate our target quest IDs exist
  console.log('\n🎯 Test 2: Validating Target Quest IDs')
  const targetQuests = questData.filter(quest => 
    TARGET_QUEST_IDS.includes(quest.id)
  )
  
  console.log(`Found ${targetQuests.length}/${TARGET_QUEST_IDS.length} target quests`)
  
  targetQuests.forEach(quest => {
    console.log(`✅ ${quest.name} (${quest.id}) - ${quest.trader.name}`)
  })

  // Test 3: Check for missing quests
  console.log('\n❌ Test 3: Missing Quests')
  const missingQuests = TARGET_QUEST_IDS.filter(questId => 
    !questData.some(quest => quest.id === questId)
  )
  
  if (missingQuests.length > 0) {
    console.log(`Missing ${missingQuests.length} quests:`)
    missingQuests.forEach(questId => {
      console.log(`❌ Quest ID: ${questId}`)
    })
  } else {
    console.log('✅ All target quests found!')
  }

  // Test 4: Validate quest name mapping
  console.log('\n📋 Test 4: Quest Name Mapping Validation')
  const mappedQuests = questData.filter(quest => 
    Object.keys(QUEST_NAME_MAPPING).includes(quest.name)
  )
  
  console.log(`Found ${mappedQuests.length}/${Object.keys(QUEST_NAME_MAPPING).length} mapped quests`)
  
  mappedQuests.forEach(quest => {
    const order = QUEST_NAME_MAPPING[quest.name]
    console.log(`✅ ${quest.name} - Order: ${order} - Trader: ${quest.trader.name}`)
  })

  // Test 5: Extract and validate quest items with IDs
  console.log('\n📦 Test 5: Quest Items Extraction with Item IDs')
  const questItems = extractQuestItems(questData)
  console.log(`Extracted ${questItems.length} quest items`)

  // Group items by quest
  const itemsByQuest = questItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {})

  Object.entries(itemsByQuest).forEach(([questName, items]) => {
    console.log(`\n${questName}:`)
    items.forEach(item => {
      console.log(`  - ${item.name} (${item.quantity}x)`)
      console.log(`    Item ID: ${item.id}`)
      console.log(`    Short Name: ${item.shortName}`)
      console.log(`    Quest ID: ${item.questId}`)
      console.log(`    Trader: ${item.trader}`)
    })
  })

  // Test 6: Validate quest objectives with item IDs
  console.log('\n🎯 Test 6: Quest Objectives Validation with Item IDs')
  targetQuests.forEach(quest => {
    console.log(`\n${quest.name} (${quest.trader.name}) - Quest ID: ${quest.id}:`)
    const itemObjectives = quest.objectives.filter(obj => obj.type === 'giveItem')
    console.log(`  Item objectives: ${itemObjectives.length}`)
    
    itemObjectives.forEach(obj => {
      if (obj.item) {
        console.log(`    - ${obj.item.name} (${obj.count}x)`)
        console.log(`      Item ID: ${obj.item.id}`)
        console.log(`      Short Name: ${obj.item.shortName}`)
      }
    })
  })

  // Test 7: Check for quest ID consistency
  console.log('\n🆔 Test 7: Quest ID Consistency Check')
  const questIdMapping = {
    'Profitable Venture': '67af4c1405c58dc6f7056667',
    'Safety Guarantee': '67af4c169d95ad16e004fd86',
    'Never Too Late To Learn': '67af4c17f4f1fb58a907f8f6',
    'Get a Foothold': '67af4c1991ee75c6d7060a16',
    'Profit Retention': '67af4c1a6c3ebfd8e6034916',
    'A Life Lesson': '67af4c1cc0e59d55e2010b97',
    'Consolation Prize': '67af4c1d8c9482eca103e477'
  }

  Object.entries(questIdMapping).forEach(([questName, expectedId]) => {
    const foundQuest = questData.find(quest => quest.name === questName)
    if (foundQuest) {
      const isCorrect = foundQuest.id === expectedId
      console.log(`${isCorrect ? '✅' : '❌'} ${questName}: ${foundQuest.id} ${isCorrect ? '' : `(expected: ${expectedId})`}`)
    } else {
      console.log(`❌ ${questName}: Not found in API data`)
    }
  })

  // Test 8: Generate item ID list for barter/craft search
  console.log('\n🔍 Test 8: Item IDs for Barter/Craft Search')
  const allItemIds = questItems.map(item => item.id)
  const uniqueItemIds = [...new Set(allItemIds)]
  
  console.log(`Total item IDs: ${allItemIds.length}`)
  console.log(`Unique item IDs: ${uniqueItemIds.length}`)
  console.log('\nItem IDs for API queries:')
  uniqueItemIds.forEach((itemId, index) => {
    const item = questItems.find(qi => qi.id === itemId)
    console.log(`${index + 1}. ${itemId} - ${item.name}`)
  })

  // Test 9: Generate quest-item mapping for reference
  console.log('\n📋 Test 9: Quest-Item Mapping Reference')
  const questItemMapping = {}
  
  questItems.forEach(item => {
    if (!questItemMapping[item.category]) {
      questItemMapping[item.category] = {
        questId: item.questId,
        trader: item.trader,
        items: []
      }
    }
    questItemMapping[item.category].items.push({
      id: item.id,
      name: item.name,
      shortName: item.shortName,
      quantity: item.quantity
    })
  })

  Object.entries(questItemMapping).forEach(([questName, data]) => {
    console.log(`\n${questName} (${data.questId} - ${data.trader}):`)
    data.items.forEach(item => {
      console.log(`  - ${item.id}: ${item.name} (${item.quantity}x)`)
    })
  })

  return {
    totalQuests: questData.length,
    targetQuestsFound: targetQuests.length,
    missingQuests: missingQuests.length,
    questItemsExtracted: questItems.length,
    mappedQuestsFound: mappedQuests.length,
    uniqueItemIds: uniqueItemIds.length,
    questItemMapping: questItemMapping
  }
}

// Run the test
async function runQuestDataValidation() {
  console.log('🚀 Starting Quest Data Validation Test')
  console.log('======================================')
  
  const results = await testQuestDataValidation()
  
  console.log('\n📊 Test Summary')
  console.log('===============')
  console.log(`Total quests in API: ${results.totalQuests}`)
  console.log(`Target quests found: ${results.targetQuestsFound}/${TARGET_QUEST_IDS.length}`)
  console.log(`Missing quests: ${results.missingQuests}`)
  console.log(`Quest items extracted: ${results.questItemsExtracted}`)
  console.log(`Mapped quests found: ${results.mappedQuestsFound}/${Object.keys(QUEST_NAME_MAPPING).length}`)
  console.log(`Unique item IDs for barter/craft search: ${results.uniqueItemIds}`)
  
  if (results.missingQuests === 0 && results.targetQuestsFound === TARGET_QUEST_IDS.length) {
    console.log('\n✅ All quest data validation passed!')
    console.log('\n🎯 Ready for barter/craft integration!')
    console.log(`Use the ${results.uniqueItemIds} unique item IDs to fetch barter/craft data.`)
  } else {
    console.log('\n❌ Some quest data validation failed!')
  }
  
  return results
}

// Execute the test
runQuestDataValidation().catch(console.error) 