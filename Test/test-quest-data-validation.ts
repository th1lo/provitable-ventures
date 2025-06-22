import { QUEST_DATA_QUERY, TARGET_QUEST_IDS, QUEST_NAME_MAPPING } from '../app/constants/tarkov-data'

// Test the actual quest data collection process
export const testQuestDataValidation = async () => {
  console.log('🔍 Testing Quest Data Collection & Validation')
  console.log('=============================================')

  // Test 1: Fetch quest data from Tarkov Dev API
  console.log('\n📡 Test 1: Fetching Quest Data from API')
  const questData = await fetchQuestData()
  console.log(`Fetched ${questData.length} total quests from API`)

  // Test 2: Validate our target quest IDs exist
  console.log('\n🎯 Test 2: Validating Target Quest IDs')
    const targetQuests = questData.filter((quest: any) =>
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

  // Test 5: Extract and validate quest items
  console.log('\n📦 Test 5: Quest Items Extraction')
  const questItems = extractQuestItems(questData)
  console.log(`Extracted ${questItems.length} quest items`)

  // Group items by quest
  const itemsByQuest = questItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, typeof questItems>)

  Object.entries(itemsByQuest).forEach(([questName, items]) => {
    console.log(`\n${questName}:`)
    items.forEach(item => {
      console.log(`  - ${item.name} (${item.quantity}x)`)
    })
  })

  // Test 6: Validate quest objectives
  console.log('\n🎯 Test 6: Quest Objectives Validation')
  targetQuests.forEach(quest => {
    console.log(`\n${quest.name} (${quest.trader.name}):`)
    const itemObjectives = quest.objectives.filter(obj => obj.type === 'giveItem')
    console.log(`  Item objectives: ${itemObjectives.length}`)
    
    itemObjectives.forEach(obj => {
      if (obj.item) {
        console.log(`    - ${obj.item.name} (${obj.count}x)`)
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

  return {
    totalQuests: questData.length,
    targetQuestsFound: targetQuests.length,
    missingQuests: missingQuests.length,
    questItemsExtracted: questItems.length,
    mappedQuestsFound: mappedQuests.length
  }
}

// Function to fetch quest data from Tarkov Dev API
async function fetchQuestData() {
  try {
    console.log('Fetching quest data from Tarkov Dev API...')
    
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

// Function to extract quest items from API data
function extractQuestItems(quests: any[]) {
  const questItems: any[] = []
  
  // Filter for our target quests
  const targetQuests = quests.filter(quest => 
    Object.keys(QUEST_NAME_MAPPING).includes(quest.name)
  )
  
  targetQuests.forEach(quest => {
    const questOrder = QUEST_NAME_MAPPING[quest.name]
    if (!questOrder) return
    
    quest.objectives.forEach((objective: any) => {
      if (objective.type === 'giveItem' && objective.item && objective.count) {
        questItems.push({
          id: objective.item.id,
          name: objective.item.name,
          shortName: objective.item.shortName,
          quantity: objective.count,
          category: quest.name,
          questOrder: questOrder
        })
      }
    })
  })
  
  return questItems
}

// Run the test
export const runQuestDataValidation = async () => {
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
  
  if (results.missingQuests === 0 && results.targetQuestsFound === TARGET_QUEST_IDS.length) {
    console.log('\n✅ All quest data validation passed!')
  } else {
    console.log('\n❌ Some quest data validation failed!')
  }
  
  return results
}

// Export for use in other files
export default runQuestDataValidation 