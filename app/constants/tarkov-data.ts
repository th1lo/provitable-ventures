export const TARKOV_ITEMS = [
  // Profitable Ventures
  { name: 'Trijicon REAP-IR thermal imaging riflescope', searchTerm: 'REAP-IR', quantity: 15, category: 'Profitable Ventures', questOrder: 1 },
  
  // Safety Guarantee
  { name: 'BNTI Zhuk body armor (EMR)', searchTerm: 'BNTI Zhuk', quantity: 15, category: 'Safety Guarantee', questOrder: 2 },
  { name: 'Vulkan-5 LShZ-5 bulletproof helmet', searchTerm: 'LShZ-5', quantity: 12, category: 'Safety Guarantee', questOrder: 2 },
  { name: 'Maska-1SCh face shield', searchTerm: 'Maska-1SCh', quantity: 3, category: 'Safety Guarantee', questOrder: 2 },
  
  // Never Too Late To Learn
  { name: 'HK 416A5 5.56x45 assault rifle', searchTerm: '416A5', quantity: 15, category: 'Never Too Late To Learn', questOrder: 3 },
  { name: '5.56x45mm MK 318 Mod 0 (SOST)', searchTerm: 'MK 318', quantity: 4500, category: 'Never Too Late To Learn', questOrder: 3 },
  { name: 'UVSR Taiga-1 survival machete', searchTerm: 'Taiga-1', quantity: 8, category: 'Never Too Late To Learn', questOrder: 3 },
  
  // Get a Foothold - Stimulants
  { name: 'SJ6 TGLabs combat stimulant injector', searchTerm: 'SJ6', quantity: 30, category: 'Get a Foothold', questOrder: 4 },
  { name: 'Obdolbos 2 cocktail injector', searchTerm: 'Obdolbos', quantity: 30, category: 'Get a Foothold', questOrder: 4 },
  { name: 'Propital regenerative stimulant injector', searchTerm: 'Propital', quantity: 30, category: 'Get a Foothold', questOrder: 4 },
  { name: 'M.U.L.E. stimulant injector', searchTerm: 'M.U.L.E.', quantity: 30, category: 'Get a Foothold', questOrder: 4 },
  { name: 'ETG-change regenerative stimulant injector', searchTerm: 'ETG-change', quantity: 30, category: 'Get a Foothold', questOrder: 4 },
  { name: 'SJ9 TGLabs combat stimulant injector', searchTerm: 'SJ9', quantity: 30, category: 'Get a Foothold', questOrder: 4 },
  { name: 'SJ12 TGLabs combat stimulant injector', searchTerm: 'SJ12', quantity: 30, category: 'Get a Foothold', questOrder: 4 },
  { name: 'Meldonin injector', searchTerm: 'Meldonin', quantity: 30, category: 'Get a Foothold', questOrder: 4 },
  
  // Profit Retention
  { name: 'Graphics card', searchTerm: 'Graphics card', quantity: 30, category: 'Profit Retention', questOrder: 5 },
  { name: 'Physical bitcoin', searchTerm: 'Physical bitcoin', quantity: 15, category: 'Profit Retention', questOrder: 5 },
  
  // A Life Lesson
  { name: 'Bottle of Tarkovskaya vodka', searchTerm: 'Tarkovskaya', quantity: 8, category: 'A Life Lesson', questOrder: 6 },
  { name: 'Bottle of Dan Jackiel whiskey', searchTerm: 'Dan Jackiel', quantity: 15, category: 'A Life Lesson', questOrder: 6 },
  { name: 'Bottle of Fierce Hatchling moonshine', searchTerm: 'Fierce Hatchling', quantity: 15, category: 'A Life Lesson', questOrder: 6 },
]

// Quest IDs for the quests we want to track
export const TARGET_QUEST_IDS = [
  '67af4c1405c58dc6f7056667',  // Profitable Venture
  '67af4c169d95ad16e004fd86', // Safety Guarantee
  '67af4c17f4f1fb58a907f8f6', // Never Too Late To Learn
  '67af4c1991ee75c6d7060a16', // Get a Foothold
  '67af4c1a6c3ebfd8e6034916', // Profit Retention
  '7af4c1cc0e59d55e2010b97' // A Life Lesson
]

// Quest names mapping for our quest order
export const QUEST_NAME_MAPPING: Record<string, number> = {
  'Profitable Venture': 1,
  'Safety Guarantee': 2,
  'Never Too Late To Learn': 3,
  'Get a Foothold': 4,
  'Profit Retention': 5,
  'A Life Lesson': 6
}

// Bundled items mapping - items that can be obtained as part of larger items
export const BUNDLED_ITEMS = {
  'REAP-IR': {
    bundledItemName: 'Colt M4A1 5.56x45 assault rifle REAP-IR',
    bundledSearchTerm: 'Colt M4A1 5.56x45 assault rifle REAP-IR',
    description: 'M4A1 rifle with REAP-IR scope that can be stripped for the scope'
  }
  // Add more bundled items here as needed
}

// GraphQL query to fetch quest data from Tarkov Dev API
export const QUEST_DATA_QUERY = `
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

export const EXTENDED_GRAPHQL_QUERY = `
  query GetItemsWithCraftsAndBarters($names: [String!]!) {
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

export const ITEM_PRICES_QUERY = `
  query GetItemPrices($ids: [ID!]!) {
    items(ids: $ids) {
      id
      name
      shortName
      avg24hPrice
      lastLowPrice
      changeLast48h
      changeLast48hPercent
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
  }
`

// Trader reset times in hours
export const TRADER_RESET_TIMES: Record<string, number> = {
  'prapor': 3,
  'therapist': 3,
  'skier': 3,
  'peacekeeper': 3,
  'mechanic': 3,
  'ragman': 3,
  'jaeger': 3,
  'fence': 0.5 // 30 minutes
}

// Quest wiki links
export const QUEST_WIKI_LINKS: Record<string, string> = {
  'Profitable Ventures': 'https://escapefromtarkov.fandom.com/wiki/Profitable_Venture',
  'Profitable Venture': 'https://escapefromtarkov.fandom.com/wiki/Profitable_Venture',
  'Safety Guarantee': 'https://escapefromtarkov.fandom.com/wiki/Safety_Guarantee',
  'Never Too Late To Learn': 'https://escapefromtarkov.fandom.com/wiki/Never_Too_Late_To_Learn',
  'Get a Foothold': 'https://escapefromtarkov.fandom.com/wiki/Get_a_Foothold',
  'Profit Retention': 'https://escapefromtarkov.fandom.com/wiki/Profit_Retention',
  'A Life Lesson': 'https://escapefromtarkov.fandom.com/wiki/A_Life_Lesson'
} 