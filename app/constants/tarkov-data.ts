// REMOVED: All hardcoded quest items now fetched dynamically from Tarkov.dev API
// The system now automatically detects Red Achievement quests by:
// 1. Trader: Skier 
// 2. Quest names: Profitable Venture, Safety Guarantee, etc.
// 3. Special cases: Labs keycard for Consolation Prize (extraction quest)

// REMOVED: Hardcoded bundled items - now using dynamic GraphQL containsItems detection

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
  'Profitable Venture': 'https://escapefromtarkov.fandom.com/wiki/Profitable_Venture',
  'Safety Guarantee': 'https://escapefromtarkov.fandom.com/wiki/Safety_Guarantee',
  'Never Too Late To Learn': 'https://escapefromtarkov.fandom.com/wiki/Never_Too_Late_To_Learn',
  'Get a Foothold': 'https://escapefromtarkov.fandom.com/wiki/Get_a_Foothold',
  'Profit Retention': 'https://escapefromtarkov.fandom.com/wiki/Profit_Retention',
  'A Life Lesson': 'https://escapefromtarkov.fandom.com/wiki/A_Life_Lesson',
  'Consolation Prize': 'https://escapefromtarkov.fandom.com/wiki/Consolation_Prize'
} 