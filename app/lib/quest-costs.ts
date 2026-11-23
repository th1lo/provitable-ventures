// Turns the raw tarkov.dev data of one game mode into the costs shown on the page.
// Pure functions only, so the numbers can be checked without a server.

import type {
  AcquisitionMethod,
  CostLine,
  GameMode,
  PriceSource,
  Quest,
  QuestItem,
  ResaleLine,
  TarkovData
} from '../types/tarkov'
import { GP_COIN_ID, LABS_KEYCARD_ID, LABS_MAP_ID, RED_QUEST_IDS } from '../constants/tarkov-data'
import type { RawBarter, RawCountedItem, RawData, RawItem, RawTraderOffer } from './tarkov-api'

interface IngredientPrice {
  unitPrice: number
  source: PriceSource
  label: string
  change?: number
}

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

// Flea market fee as the game calculates it:
// https://escapefromtarkov.fandom.com/wiki/Trading#Flea_Market
// No hideout discount is assumed, so the real fee can be up to 30% lower.
export function fleaMarketFee(basePrice: number, sellPrice: number, offerRate: number, requirementRate: number): number {
  if (!(basePrice > 0) || !(sellPrice > 0)) return 0

  let offerPower = Math.log10(basePrice / sellPrice)
  let requirementPower = Math.log10(sellPrice / basePrice)
  if (sellPrice < basePrice) {
    offerPower = Math.pow(offerPower, 1.08)
  } else {
    requirementPower = Math.pow(requirementPower, 1.08)
  }

  return Math.ceil(
    basePrice * offerRate * Math.pow(4, offerPower) + sellPrice * requirementRate * Math.pow(4, requirementPower)
  )
}

// Change of a sum whose parts moved by different percentages.
// Each part is { now, change }; parts without a change count as unchanged.
function combinedChange(parts: { now: number; change?: number }[]): number | undefined {
  if (!parts.some(part => isNumber(part.change))) return undefined

  let now = 0
  let before = 0
  for (const part of parts) {
    const factor = 1 + (part.change ?? 0) / 100
    now += part.now
    // A price that rose from nothing has no meaningful "before"
    before += factor > 0 ? part.now / factor : part.now
  }

  if (!(before > 0)) return undefined
  return ((now - before) / before) * 100
}

const formatCount = (count: number) => (Number.isInteger(count) ? String(count) : count.toFixed(2))

export function buildTarkovData(raw: RawData, gameMode: GameMode, now: number): TarkovData {
  const { items, tasks, traders, stations, texts } = raw
  const text = (key: string | undefined, fallback = '') => (key ? texts[key] ?? fallback : fallback)
  const itemName = (item: RawItem) => text(item.name, item.id)
  const itemShortName = (item: RawItem) => text(item.shortName, itemName(item))
  const traderName = (id: string) => text(traders[id]?.name, 'Trader')

  const offerRate = raw.fleaMarket.sellOfferFeeRate ?? 0.03
  const requirementRate = raw.fleaMarket.sellRequirementFeeRate ?? 0.03
  const fleaEnabled = raw.fleaMarket.enabled !== false
  const gpCoinValue = raw.settings.gpCoinValue ?? 0

  const canUseFlea = (item: RawItem) => fleaEnabled && !item.types.includes('noFlea')

  // What one unit costs to buy on the flea market right now
  const fleaBuyPrice = (item: RawItem): number => {
    if (!canUseFlea(item)) return 0
    return item.avg24hPrice || item.lastLowPrice || 0
  }

  const cheapestTraderOffer = (item: RawItem): RawTraderOffer | undefined => {
    const offers = (item.buyFromTrader ?? []).filter(offer => offer.priceRUB > 0)
    if (offers.length === 0) return undefined
    return offers.reduce((best, offer) => (offer.priceRUB < best.priceRUB ? offer : best))
  }

  const bestTraderSale = (item: RawItem) => {
    const sales = (item.sellToTrader ?? []).filter(sale => sale.priceRUB > 0)
    if (sales.length === 0) return undefined
    return sales.reduce((best, sale) => (sale.priceRUB > best.priceRUB ? sale : best))
  }

  // Price of something that is handed over in a barter or used up in a craft
  const ingredientPrice = (item: RawItem): IngredientPrice => {
    const flea = fleaBuyPrice(item)
    const offer = cheapestTraderOffer(item)

    if (offer && (flea === 0 || offer.priceRUB <= flea)) {
      return {
        unitPrice: offer.priceRUB,
        source: 'trader',
        label: `${traderName(offer.trader)} LL${offer.minTraderLevel ?? 1}`,
        change: 0
      }
    }
    if (flea > 0) {
      return {
        unitPrice: flea,
        source: 'flea',
        label: 'Flea',
        change: isNumber(item.changeLast48hPercent) ? item.changeLast48hPercent : undefined
      }
    }
    if (item.id === GP_COIN_ID && gpCoinValue > 0) {
      return { unitPrice: gpCoinValue, source: 'gp', label: 'GP coin value' }
    }

    // Nothing sells it: value it at what a trader would pay you for it
    const sale = bestTraderSale(item)
    if (sale) {
      return { unitPrice: sale.priceRUB, source: 'estimate', label: 'Trader sell value' }
    }
    return { unitPrice: 0, source: 'unknown', label: 'No price' }
  }

  const costLine = (counted: RawCountedItem): CostLine | undefined => {
    const item = items[counted.item]
    if (!item) return undefined
    const price = ingredientPrice(item)
    return {
      id: item.id,
      name: itemName(item),
      shortName: itemShortName(item),
      iconLink: item.iconLink ?? '',
      wikiLink: item.wikiLink,
      count: counted.count,
      unitPrice: price.unitPrice,
      totalPrice: price.unitPrice * counted.count,
      priceSource: price.source,
      priceLabel: price.label,
      changeLast48hPercent: price.change
    }
  }

  // Splits the required items of a barter or craft into what is used up and what is only needed as a tool
  const splitRequired = (required: RawCountedItem[]) => {
    const consumed: CostLine[] = []
    const tools: CostLine[] = []
    const unknownItems: string[] = []
    let approximate = false

    for (const counted of required) {
      const line = costLine(counted)
      if (!line) {
        approximate = true
        unknownItems.push(counted.item)
        continue
      }
      if (counted.attributes?.tool) {
        tools.push(line)
        continue
      }
      consumed.push(line)
      if (line.priceSource === 'estimate' || line.priceSource === 'unknown') {
        approximate = true
        unknownItems.push(line.shortName)
      }
    }

    const batchCost = consumed.reduce((sum, line) => sum + line.totalPrice, 0)
    const change = combinedChange(consumed.map(line => ({ now: line.totalPrice, change: line.changeLast48hPercent })))
    return { consumed, tools, unknownItems, approximate, batchCost, change }
  }

  const taskUnlock = (taskId: string | null | undefined) => {
    if (!taskId) return undefined
    const task = tasks[taskId]
    return { id: taskId, name: task ? text(task.name, 'a task') : 'a task', wikiLink: task?.wikiLink }
  }

  const requiredSignature = (required: RawCountedItem[]) =>
    required
      .map(counted => `${counted.item}:${counted.count}`)
      .sort()
      .join(',')

  const barterSignature = (barter: RawBarter) =>
    `${barter.trader}|${barter.minTraderLevel}|${requiredSignature(barter.requiredItems)}`

  // The API lists some barters twice; keep one of each
  const uniqueBarters = (list: RawBarter[]) => {
    const seen = new Set<string>()
    return list.filter(barter => {
      const key = `${barterSignature(barter)}|${barter.offeredItem.count}|${barter.taskUnlock ?? ''}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  const bartersByOffered = new Map<string, RawBarter[]>()
  for (const barter of raw.barters) {
    const list = bartersByOffered.get(barter.offeredItem.item)
    if (list) list.push(barter)
    else bartersByOffered.set(barter.offeredItem.item, [barter])
  }

  // Where to sell a part you do not need: flea market (after the fee) or the best trader
  const resaleLine = (counted: RawCountedItem): ResaleLine | undefined => {
    const item = items[counted.item]
    if (!item) return undefined

    const sale = bestTraderSale(item)
    const traderValue = sale?.priceRUB ?? 0

    // Use the lower of the two flea prices: a part only sells fast when it undercuts
    const fleaPrices = canUseFlea(item) ? [item.avg24hPrice, item.lastLowPrice].filter((p): p is number => !!p && p > 0) : []
    const fleaPrice = fleaPrices.length > 0 ? Math.min(...fleaPrices) : 0
    const fleaValue =
      fleaPrice > 0 ? fleaPrice - fleaMarketFee(item.basePrice ?? 0, fleaPrice, offerRate, requirementRate) : 0

    const base = {
      id: item.id,
      name: itemName(item),
      shortName: itemShortName(item),
      iconLink: item.iconLink ?? '',
      wikiLink: item.wikiLink,
      count: counted.count
    }

    if (fleaValue > traderValue) {
      return {
        ...base,
        sellTo: 'flea',
        sellToLabel: 'Flea (after fee)',
        unitValue: fleaValue,
        totalValue: fleaValue * counted.count,
        changeLast48hPercent: isNumber(item.changeLast48hPercent) ? item.changeLast48hPercent : undefined
      }
    }
    if (sale) {
      return {
        ...base,
        sellTo: 'trader',
        sellToLabel: traderName(sale.trader),
        unitValue: traderValue,
        totalValue: traderValue * counted.count
      }
    }
    return { ...base, sellTo: 'none', sellToLabel: 'Not sellable', unitValue: 0, totalValue: 0 }
  }

  // Presets and packs that contain the item, keyed by the item inside
  const containersByContent = new Map<string, RawItem[]>()
  for (const container of Object.values(items)) {
    for (const counted of container.containsItems ?? []) {
      if (counted.item === container.id) continue
      const list = containersByContent.get(counted.item)
      if (list) list.push(container)
      else containersByContent.set(counted.item, [container])
    }
  }

  const methodsFor = (item: RawItem): AcquisitionMethod[] => {
    const methods: AcquisitionMethod[] = []

    // 1. Flea market
    const flea = fleaBuyPrice(item)
    if (flea > 0) {
      methods.push({
        id: 'flea',
        type: 'flea',
        label: 'Flea Market',
        unitCost: flea,
        batchCost: flea,
        outputCount: 1,
        approximate: false,
        unknownItems: [],
        changeLast48hPercent: isNumber(item.changeLast48hPercent) ? item.changeLast48hPercent : undefined,
        requiredItems: [],
        tools: []
      })
    }

    // 2. Bought from a trader for money
    ;(item.buyFromTrader ?? []).forEach((offer, index) => {
      if (!(offer.priceRUB > 0)) return
      methods.push({
        id: `trader-${offer.trader}-${offer.minTraderLevel ?? 1}-${index}`,
        type: 'trader',
        label: `${traderName(offer.trader)} LL${offer.minTraderLevel ?? 1}`,
        imageLink: traders[offer.trader]?.imageLink,
        unitCost: offer.priceRUB,
        batchCost: offer.priceRUB,
        outputCount: 1,
        approximate: false,
        unknownItems: [],
        traderLevel: offer.minTraderLevel ?? 1,
        buyLimit: offer.buyLimit || undefined,
        taskUnlock: taskUnlock(offer.taskUnlock),
        currencyPrice: offer.currency && offer.currency !== 'RUB' ? { amount: offer.price, currency: offer.currency } : undefined,
        requiredItems: [],
        tools: []
      })
    })

    // 3. Barters
    const directBarters = uniqueBarters(bartersByOffered.get(item.id) ?? [])
    for (const barter of directBarters) {
      const outputCount = barter.offeredItem.count || 1
      const required = splitRequired(barter.requiredItems)
      if (!(required.batchCost > 0)) continue
      methods.push({
        id: `barter-${barter.id}`,
        type: 'barter',
        label: `${traderName(barter.trader)} LL${barter.minTraderLevel}`,
        imageLink: traders[barter.trader]?.imageLink,
        unitCost: required.batchCost / outputCount,
        batchCost: required.batchCost,
        outputCount,
        approximate: required.approximate,
        unknownItems: required.unknownItems,
        traderLevel: barter.minTraderLevel,
        buyLimit: barter.buyLimit || undefined,
        taskUnlock: taskUnlock(barter.taskUnlock),
        changeLast48hPercent: required.change,
        requiredItems: required.consumed,
        tools: required.tools
      })
    }

    // 4. Hideout crafts
    for (const craft of raw.crafts) {
      if (craft.productItem.item !== item.id) continue
      const outputCount = craft.productItem.count || 1
      const required = splitRequired(craft.requiredItems)
      // Crafts without ingredients (the Bitcoin farm) cost time, not money, and are left out
      if (!(required.batchCost > 0)) continue
      const station = stations[craft.station]
      methods.push({
        id: `craft-${craft.id}`,
        type: 'craft',
        label: `${text(station?.name, 'Hideout')} level ${craft.level}`,
        imageLink: station?.imageLink,
        unitCost: required.batchCost / outputCount,
        batchCost: required.batchCost,
        outputCount,
        approximate: required.approximate,
        unknownItems: required.unknownItems,
        taskUnlock: taskUnlock(craft.taskUnlock),
        duration: craft.duration,
        changeLast48hPercent: required.change,
        requiredItems: required.consumed,
        tools: required.tools
      })
    }

    // 5. Presets and packs that contain the item: buy the whole thing, keep the item, sell the rest
    const directSignatures = new Set(directBarters.map(barterSignature))
    for (const container of containersByContent.get(item.id) ?? []) {
      const contents = container.containsItems ?? []
      const countInBundle = contents.filter(c => c.item === item.id).reduce((sum, c) => sum + c.count, 0)
      if (!(countInBundle > 0)) continue

      const parts = contents
        .filter(c => c.item !== item.id)
        .map(resaleLine)
        .filter((line): line is ResaleLine => !!line)
      const resaleValue = parts.reduce((sum, part) => sum + part.totalValue, 0)
      const fleaResale = parts.filter(p => p.sellTo === 'flea').reduce((sum, part) => sum + part.totalValue, 0)
      const traderResale = parts.filter(p => p.sellTo === 'trader').reduce((sum, part) => sum + part.totalValue, 0)

      const bundleInfo = (grossCost: number) => ({
        id: container.id,
        name: itemName(container),
        shortName: itemShortName(container),
        iconLink: container.iconLink ?? '',
        countInBundle,
        grossCost,
        resaleValue,
        fleaResale,
        traderResale,
        parts
      })

      // Selling parts on the flea market lowers the cost, so a price rise there lowers it further
      const netChange = (costParts: { now: number; change?: number }[]) =>
        combinedChange([
          ...costParts,
          ...parts.map(part => ({ now: -part.totalValue, change: part.changeLast48hPercent }))
        ])

      // A preset on the flea market is the same listing as its base item, so only packs count here
      const containerFlea = container.types.includes('preset') ? 0 : fleaBuyPrice(container)
      if (containerFlea > 0) {
        const change = isNumber(container.changeLast48hPercent) ? container.changeLast48hPercent : undefined
        methods.push({
          id: `bundle-${container.id}-flea`,
          type: 'bundle',
          label: 'Flea Market',
          unitCost: (containerFlea - resaleValue) / countInBundle,
          batchCost: containerFlea - resaleValue,
          outputCount: countInBundle,
          approximate: false,
          unknownItems: [],
          changeLast48hPercent: netChange([{ now: containerFlea, change }]),
          requiredItems: [],
          tools: [],
          bundle: bundleInfo(containerFlea)
        })
      }

      ;(container.buyFromTrader ?? []).forEach((offer, index) => {
        if (!(offer.priceRUB > 0)) return
        methods.push({
          id: `bundle-${container.id}-trader-${offer.trader}-${index}`,
          type: 'bundle',
          label: `${traderName(offer.trader)} LL${offer.minTraderLevel ?? 1}`,
          imageLink: traders[offer.trader]?.imageLink,
          unitCost: (offer.priceRUB - resaleValue) / countInBundle,
          batchCost: offer.priceRUB - resaleValue,
          outputCount: countInBundle,
          approximate: false,
          unknownItems: [],
          traderLevel: offer.minTraderLevel ?? 1,
          buyLimit: offer.buyLimit || undefined,
          taskUnlock: taskUnlock(offer.taskUnlock),
          currencyPrice: offer.currency && offer.currency !== 'RUB' ? { amount: offer.price, currency: offer.currency } : undefined,
          changeLast48hPercent: netChange([{ now: offer.priceRUB, change: 0 }]),
          requiredItems: [],
          tools: [],
          bundle: bundleInfo(offer.priceRUB)
        })
      })

      for (const barter of uniqueBarters(bartersByOffered.get(container.id) ?? [])) {
        // The same trade is already listed as a barter for the loose item (ammo packs)
        if (directSignatures.has(barterSignature(barter))) continue
        const required = splitRequired(barter.requiredItems)
        if (!(required.batchCost > 0)) continue
        const bundlesPerTrade = barter.offeredItem.count || 1
        const outputCount = countInBundle * bundlesPerTrade
        const netCost = required.batchCost - resaleValue * bundlesPerTrade
        methods.push({
          id: `bundle-${container.id}-barter-${barter.id}`,
          type: 'bundle',
          label: `${traderName(barter.trader)} LL${barter.minTraderLevel}`,
          imageLink: traders[barter.trader]?.imageLink,
          unitCost: netCost / outputCount,
          batchCost: netCost,
          outputCount,
          approximate: required.approximate,
          unknownItems: required.unknownItems,
          traderLevel: barter.minTraderLevel,
          buyLimit: barter.buyLimit || undefined,
          taskUnlock: taskUnlock(barter.taskUnlock),
          changeLast48hPercent: netChange(
            required.consumed.map(line => ({ now: line.totalPrice, change: line.changeLast48hPercent }))
          ),
          requiredItems: required.consumed,
          tools: required.tools,
          bundle: bundleInfo(required.batchCost)
        })
      }
    }

    // Exact prices first, then cheapest first
    return methods.sort((a, b) => {
      if (a.approximate !== b.approximate) return a.approximate ? 1 : -1
      return a.unitCost - b.unitCost
    })
  }

  const questItem = (itemId: string, quantity: number, foundInRaid: boolean, note?: string): QuestItem | undefined => {
    const item = items[itemId]
    if (!item) return undefined
    const methods = methodsFor(item)
    const best = methods[0]
    const unitCost = best?.unitCost ?? 0
    return {
      id: item.id,
      name: itemName(item),
      shortName: itemShortName(item),
      iconLink: item.iconLink ?? '',
      wikiLink: item.wikiLink,
      quantity,
      foundInRaid,
      fleaBanned: !canUseFlea(item),
      note,
      methods,
      unitCost,
      totalCost: unitCost * quantity,
      changeLast48hPercent: best?.changeLast48hPercent
    }
  }

  const quests: Quest[] = []
  RED_QUEST_IDS.forEach((questId, index) => {
    const task = tasks[questId]
    if (!task) return

    const questItems: QuestItem[] = []
    const otherObjectives: string[] = []

    for (const objective of task.objectives ?? []) {
      const count = objective.count ?? 1

      if (objective.type === 'giveItem' && objective.items?.length) {
        // When several items are accepted, plan with the cheapest one
        const candidates = objective.items
          .map(id => questItem(id, count, !!objective.foundInRaid))
          .filter((candidate): candidate is QuestItem => !!candidate)
        if (candidates.length === 0) continue
        const priced = candidates.filter(candidate => candidate.methods.length > 0)
        const pool = priced.length > 0 ? priced : candidates
        questItems.push(pool.reduce((best, candidate) => (candidate.unitCost < best.unitCost ? candidate : best)))
        continue
      }

      const description = text(objective.description)
      if (description) {
        otherObjectives.push(objective.count && objective.count > 1 ? `${description} (${formatCount(count)}x)` : description)
      }

      if (objective.type === 'extract' && objective.maps?.includes(LABS_MAP_ID)) {
        const keycard = questItem(
          LABS_KEYCARD_ID,
          count,
          false,
          `One keycard is used up per Labs raid. ${formatCount(count)} is the minimum: every raid you do not survive costs one more.`
        )
        if (keycard) questItems.push(keycard)
      }
    }

    if (questItems.length === 0 && otherObjectives.length === 0) return

    quests.push({
      id: task.id,
      name: text(task.name, 'Unknown task'),
      wikiLink: task.wikiLink,
      imageLink: task.taskImageLink,
      minPlayerLevel: task.minPlayerLevel,
      order: index + 1,
      otherObjectives,
      items: questItems,
      totalCost: questItems.reduce((sum, item) => sum + item.totalCost, 0),
      changeLast48hPercent: combinedChange(
        questItems.map(item => ({ now: item.totalCost, change: item.changeLast48hPercent }))
      )
    })
  })

  const allItems = quests.flatMap(quest => quest.items)

  return {
    gameMode,
    quests,
    grandTotal: quests.reduce((sum, quest) => sum + quest.totalCost, 0),
    overallPriceChange:
      combinedChange(allItems.map(item => ({ now: item.totalCost, change: item.changeLast48hPercent }))) ?? 0,
    totalItems: allItems.length,
    restrictedItems: allItems.filter(item => item.fleaBanned).length,
    gpCoinValue,
    season: raw.season
      ? { name: text(raw.season.name, 'Season'), start: raw.season.start, end: raw.season.end }
      : undefined,
    pricesUpdated: raw.itemsLastModified ?? now,
    timestamp: now
  }
}
