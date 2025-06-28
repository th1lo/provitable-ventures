import React, { useState } from 'react'
import Image from 'next/image'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ExternalLink, TrendingUp, TrendingDown, Minus, Hammer, ArrowRightLeft} from 'lucide-react'
import { ItemPrice, GameMode } from '../types/tarkov'
import { formatCurrency, isFleaMarketRestricted, getTotalValue, getAllAcquisitionMethods } from '../utils/tarkov-utils'
import { QUEST_WIKI_LINKS } from '../constants/tarkov-data'
import { ItemTable, type TableItem } from './shared'

interface QuestTableProps {
  questName: string
  items: ItemPrice[]
  isExpanded: boolean
  itemPriceCache: Map<string, number>
  gameMode: GameMode
  onToggleExpansion: (questName: string) => void
  allItemPrices: ItemPrice[]
  requiredItemsData?: Map<string, { changeLast48hPercent?: number; changeLast48h?: number; name?: string; shortName?: string }>
}

// Types for acquisition methods
interface RequiredItem {
  item: {
    id: string
    name: string
    shortName: string
    iconLink: string
    wikiLink?: string
  }
  count: number
}

interface WeaponPart {
  id: string
  name: string
  shortName: string
  iconLink: string
  count: number
  fleaPrice: number
  sellValue: number
  changeLast48h?: number
  recommendFlea: boolean
  isKeepForQuest: boolean
}

interface BundledItemDetails {
  trader: string
  bundledItemShortName: string
  netCost: number
  barterCost: number
  totalSellValue: number
  fleaSellValue: number
  traderSellValue: number
  requiredItems: RequiredItem[]
  weaponParts: WeaponPart[]
}

interface TraderData {
  name: string
  normalizedName: string
}

interface CraftData {
  duration: number
  requiredItems: RequiredItem[]
}

interface BarterData {
  trader: TraderData
  requiredItems: RequiredItem[]
  taskUnlock?: {
    name: string
  }
}

interface AcquisitionMethod {
  id: string
  type: 'bundled' | 'craft' | 'barter'
  details: string
  costInRubles: number
  bundledItemDetails?: BundledItemDetails
  data?: CraftData | BarterData
}

const getPriceChangeBadge = (change: number | undefined) => {
  if (change === undefined || change === null || isNaN(change)) {
    return null
  }

  if (change > 0) {
    return (
      <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium">
        <TrendingUp className="h-3 w-3" />
        +{change.toFixed(1)}%
      </div>
    )
  }
  if (change < 0) {
    return (
      <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-medium">
        <TrendingDown className="h-3 w-3" />
        {change.toFixed(1)}%
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-500 text-xs font-medium">
      <Minus className="h-3 w-3" />
      0.0%
    </div>
  )
}

// Component for detailed acquisition method analysis
const ItemAcquisitionAnalysis = ({ item, itemPriceCache, allItemPrices, requiredItemsData, gameMode }: {
  item: ItemPrice,
  itemPriceCache: Map<string, number>,
  allItemPrices?: ItemPrice[],
  requiredItemsData?: Map<string, { changeLast48hPercent?: number; changeLast48h?: number; name?: string; shortName?: string }>,
  gameMode: GameMode
}) => {
  const [acquisitionMethods, setAcquisitionMethods] = useState<AcquisitionMethod[]>([])
  const [openMethods, setOpenMethods] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  // Helper function to get the correct price based on game mode
  const getRequiredItemPrice = (itemId: string) => {
    // Try to find the item in allItemPrices to get game mode specific pricing
    if (allItemPrices && allItemPrices.length > 0) {
      const itemData = allItemPrices.find(priceItem => priceItem.id === itemId)
      if (itemData) {
        // For flea restricted items, use acquisition method cost
        if (isFleaMarketRestricted(itemData) && itemData.cheapestAcquisitionMethod?.costInRubles) {
          return itemData.cheapestAcquisitionMethod.costInRubles
        }
        // For flea available items, use game mode specific pricing
        return gameMode === 'pve' ? (itemData.pvePrice || 0) : (itemData.pvpPrice || 0)
      }
    }
    // Fallback to flea market price from cache
    return itemPriceCache.get(itemId) || 0
  }

  React.useEffect(() => {
    const fetchMethods = async () => {
      try {
        // Create a game mode specific price cache for acquisition methods
        const gameModePriceCache = new Map<string, number>()
        
        // Populate the cache with game mode specific prices
        if (allItemPrices && allItemPrices.length > 0) {
          allItemPrices.forEach(priceItem => {
            if (isFleaMarketRestricted(priceItem) && priceItem.cheapestAcquisitionMethod?.costInRubles) {
              gameModePriceCache.set(priceItem.id, priceItem.cheapestAcquisitionMethod.costInRubles)
            } else {
              const price = gameMode === 'pve' ? (priceItem.pvePrice || 0) : (priceItem.pvpPrice || 0)
              gameModePriceCache.set(priceItem.id, price)
            }
          })
        }
        
        // Fallback to original price cache for items not in allItemPrices
        itemPriceCache.forEach((price, itemId) => {
          if (!gameModePriceCache.has(itemId)) {
            gameModePriceCache.set(itemId, price)
          }
        })
        
        const methods = await getAllAcquisitionMethods(item, gameModePriceCache)
        setAcquisitionMethods(methods as AcquisitionMethod[])
              } catch {
          // Error fetching acquisition methods
        } finally {
        setLoading(false)
      }
    }
    fetchMethods()
  }, [item, itemPriceCache, gameMode, allItemPrices])

  const toggleMethod = (methodId: string) => {
    const newOpen = new Set(openMethods)
    if (newOpen.has(methodId)) {
      newOpen.delete(methodId)
    } else {
      newOpen.add(methodId)
    }
    setOpenMethods(newOpen)
  }

  if (loading) {
    return <div className="text-sm text-neutral-500">Loading acquisition methods...</div>
  }

  if (acquisitionMethods.length === 0) {
    return <div className="text-sm text-neutral-500">No acquisition methods available</div>
  }

  return (
    <div className="space-y-2">
      {acquisitionMethods.map((method: AcquisitionMethod) => {
        const isOpen = openMethods.has(method.id)

        // Bundled item collapsible
        if (method.type === 'bundled' && method.bundledItemDetails) {
          const bundled = method.bundledItemDetails

          return (
            <Collapsible key={method.id} open={isOpen} onOpenChange={() => toggleMethod(method.id)}>
              <CollapsibleTrigger className="w-full p-4 bg-neutral-50 dark:bg-neutral-800/70 hover:bg-neutral-100 dark:hover:bg-neutral-700/40 rounded-lg border border-neutral-200 dark:border-neutral-700 transition-colors">
                <div className="flex sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-4 sm:gap-3 min-w-0 flex-1">
                    <ChevronDown className={`h-5 w-5 text-neutral-600 dark:text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    {/* Trader portrait with icon overlay */}
                    <div className="flex md:flex-row items-center gap-3">
                      <div className="flex flex-col md:flex-row items-center gap-2">
                        <div className="w-12 h-12 rounded bg-neutral-200 dark:bg-neutral-600 flex items-center justify-center flex-shrink-0 relative">
                          <Image
                            src={`https://tarkov.dev/images/traders/${bundled.trader.toLowerCase()}-portrait.png`}
                            alt={bundled.trader}
                            width={48}
                            height={48}
                            className="w-full h-full rounded object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = `https://via.placeholder.com/48x48/374151/9CA3AF?text=${bundled.trader.charAt(0)}`
                            }}
                          />
                          {/* Barter icon in corner */}
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-neutral-800 dark:bg-neutral-700 rounded-full flex items-center justify-center border-2 border-white dark:border-neutral-800">
                            <ArrowRightLeft className="h-3 w-3 text-orange-500" />
                          </div>
                        </div>

                        {/* Bundled item image */}
                        <Image
                          src={bundled.bundledItemShortName === 'M4A1 REAP-IR'
                            ? 'https://assets.tarkov.dev/coltm4a1reapir0000000001-512.webp'
                            : item.iconLink || ''
                          }
                          alt={bundled.bundledItemShortName}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded bg-neutral-200 dark:bg-neutral-900 object-contain flex-shrink-0"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = item.iconLink || ''
                          }}
                        />
                      </div>

                      <div className="text-left min-w-0 flex-1 max-w-[240px]">
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm sm:text-base">
                          {bundled.bundledItemShortName}
                        </div>
                        <div className="text-xs sm:text-sm  text-neutral-600 dark:text-neutral-400">
                          <div className="flex flex-wrap gap-1">
                            <span>Net: {formatCurrency(bundled.netCost)}</span>
                            <span>•</span>
                            <span>Barter: {formatCurrency(bundled.barterCost)}</span>
                            <span>•</span>
                            <span>Sell: {formatCurrency(bundled.totalSellValue)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <div className="text-right">
                      <div className="font-bold text-neutral-900 dark:text-neutral-100 text-lg sm:text-xl">
                        {formatCurrency(bundled.netCost)}
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4 sm:px-0">
                  {/* Required Items */}
                  {bundled.requiredItems && bundled.requiredItems.length > 0 && (
                    <div>
                      <ItemTable
                        items={bundled.requiredItems.map((req: RequiredItem): TableItem => {
                          const unitPrice = getRequiredItemPrice(req.item.id)
                          const totalCost = unitPrice * req.count
                          // Get price change data from requiredItemsData
                          const requiredItemData = requiredItemsData?.get(req.item.id)
                          return {
                            id: req.item.id || `req-${req.item.name}`,
                            image: req.item.iconLink,
                            name: req.item.name,
                            shortName: req.item.shortName,
                            count: req.count,
                            unitPrice: unitPrice,
                            totalPrice: totalCost,
                            changeLast48hPercent: requiredItemData?.changeLast48hPercent,
                            wikiLink: req.item.wikiLink
                          }
                        })}
                        theme="light"
                        allItemPrices={allItemPrices}
                        title="Required Items"
                      />
                    </div>
                  )}

                  {/* Weapon Parts Strategy */}
                  {bundled.weaponParts && bundled.weaponParts.length > 0 && (
                    <div>
                      <h6 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2 px-1">
                        Weapon Parts Strategy
                      </h6>

                      {/* Flea Market Items */}
                      {bundled.weaponParts.filter((part: WeaponPart) => part.recommendFlea && !part.isKeepForQuest).length > 0 && (
                        <div className="mb-3">
                          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2 px-1">
                            Sell on Flea Market ({formatCurrency(bundled.fleaSellValue)})
                          </div>
                          <ItemTable
                            items={bundled.weaponParts.filter((part: WeaponPart) => part.recommendFlea && !part.isKeepForQuest).map((part: WeaponPart): TableItem => ({
                              id: part.id,
                              image: part.iconLink,
                              name: part.name,
                              shortName: part.shortName,
                              count: part.count,
                              unitPrice: part.fleaPrice,
                              totalPrice: part.sellValue,
                              changeLast48h: part.changeLast48h,
                              fleaPrice: part.fleaPrice
                            }))}
                            theme="light"
                            allItemPrices={allItemPrices}
                          />
                        </div>
                      )}

                      {/* Trader Items Summary */}
                      {bundled.traderSellValue > 0 && (
                        <div className="bg-white dark:bg-neutral-700 rounded p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                              Remaining parts to traders:
                            </span>
                            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                              {formatCurrency(bundled.traderSellValue)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )
        }

        // Regular craft/barter collapsible
        return (
          <Collapsible key={method.id} open={isOpen} onOpenChange={() => toggleMethod(method.id)}>
            <CollapsibleTrigger className="w-full p-4 bg-neutral-50 dark:bg-neutral-800/70 hover:bg-neutral-100 dark:hover:bg-neutral-700/40 rounded-lg border border-neutral-200 dark:border-neutral-700 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <ChevronDown className={`h-5 w-5 text-neutral-600 dark:text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  {/* Trader portrait with icon overlay */}
                  {method.data && 'trader' in method.data && method.data.trader && (
                    <div className="w-12 h-12 rounded bg-neutral-200 dark:bg-neutral-600 flex items-center justify-center flex-shrink-0 relative">
                      <Image
                        src={`https://tarkov.dev/images/traders/${method.data.trader.normalizedName.toLowerCase()}-portrait.png`}
                        alt={method.data.trader.name}
                        width={48}
                        height={48}
                        className="w-full h-full rounded object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = `https://via.placeholder.com/48x48/374151/9CA3AF?text=${method.data && 'trader' in method.data ? method.data.trader.name.charAt(0) : 'T'}`
                        }}
                      />
                      {/* Method icon in corner */}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-neutral-800 dark:bg-neutral-700 rounded-full flex items-center justify-center border-2 border-white dark:border-neutral-800">
                        <ArrowRightLeft className="h-3 w-3 text-green-500" />
                      </div>
                    </div>
                  )}

                  {/* Workbench image for crafts */}
                  {method.type === 'craft' && (
                    <div className="w-12 h-12 rounded bg-neutral-200 dark:bg-neutral-600 flex items-center justify-center flex-shrink-0 relative">
                      <Image
                        src="https://assets.tarkov.dev/station-workbench.png"
                        alt="Workbench"
                        width={48}
                        height={48}
                        className="w-full h-full rounded object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = `https://via.placeholder.com/48x48/374151/9CA3AF?text=W`
                        }}
                      />
                      {/* Craft icon in corner */}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-neutral-800 dark:bg-neutral-700 rounded-full flex items-center justify-center border-2 border-white dark:border-neutral-800">
                        <Hammer className="h-3 w-3 text-blue-500" />
                      </div>
                    </div>
                  )}

                  <div className="text-left min-w-0 flex-1">
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm sm:text-base">
                      {method.details}
                    </div>
                    <div className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                      {method.data?.requiredItems && method.data.requiredItems.length > 0 && (
                        <span>{method.data.requiredItems.length} required item{method.data.requiredItems.length > 1 ? 's' : ''}</span>
                      )}
                      {method.type === 'craft' && method.data && 'duration' in method.data && (
                        <span className="ml-2">• {Math.floor(method.data.duration / 60)}m duration</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <div className="text-right">
                    <div className="font-bold text-neutral-900 dark:text-neutral-100 text-lg sm:text-xl">
                      {formatCurrency(method.costInRubles)}
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="mt-3 sm:mt-4">
                {/* Quest unlock warning */}
                {method.type === 'barter' && method.data && 'taskUnlock' in method.data && method.data.taskUnlock && (
                  <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded">
                    <div className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                      ⚠️ Requires Quest: {method.data.taskUnlock.name}
                    </div>
                  </div>
                )}

                {/* Required items table */}
                {method.data?.requiredItems && method.data.requiredItems.length > 0 && (
                  <div>
                    <ItemTable
                      items={method.data.requiredItems.map((req: RequiredItem): TableItem => {
                        const unitPrice = getRequiredItemPrice(req.item.id)
                        const totalCost = unitPrice * req.count
                        // Get price change data from requiredItemsData
                        const requiredItemData = requiredItemsData?.get(req.item.id)
                        return {
                          id: req.item.id || `craft-req-${req.item.name}`,
                          image: req.item.iconLink,
                          name: req.item.name,
                          shortName: req.item.shortName,
                          count: req.count,
                          unitPrice: unitPrice,
                          totalPrice: totalCost,
                          changeLast48hPercent: requiredItemData?.changeLast48hPercent,
                          wikiLink: req.item.wikiLink
                        }
                      })}
                      theme="light"
                      allItemPrices={allItemPrices}
                      title="Required Items"
                    />
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )
      })}
    </div>
  )
}

export const QuestTable: React.FC<QuestTableProps> = ({
  questName,
  items,
  isExpanded,
  itemPriceCache,
  gameMode,
  onToggleExpansion,
  allItemPrices,
  requiredItemsData
}) => {
  const totalCost = items.reduce((sum, item) => sum + getTotalValue(item, gameMode), 0)
  const fleaRestrictedItems = items.filter(item => isFleaMarketRestricted(item))
  const fleaAvailableItems = items.filter(item => !isFleaMarketRestricted(item))

  // Helper function to get the correct price based on game mode
  const getItemPrice = (item: ItemPrice) => {
    // For flea restricted items, use acquisition method cost
    if (isFleaMarketRestricted(item) && item.cheapestAcquisitionMethod?.costInRubles) {
      return item.cheapestAcquisitionMethod.costInRubles
    }

    // For flea available items, use game mode specific pricing
    return gameMode === 'pve' ? (item.pvePrice || 0) : (item.pvpPrice || 0)
  }

  // Helper function to get required item prices for bundled calculations
  const getRequiredItemPrice = (itemId: string) => {
    // Try to find the item in allItemPrices to get game mode specific pricing
    if (allItemPrices && allItemPrices.length > 0) {
      const itemData = allItemPrices.find(priceItem => priceItem.id === itemId)
      if (itemData) {
        // For flea restricted items, use acquisition method cost
        if (isFleaMarketRestricted(itemData) && itemData.cheapestAcquisitionMethod?.costInRubles) {
          return itemData.cheapestAcquisitionMethod.costInRubles
        }
        // For flea available items, use game mode specific pricing
        return gameMode === 'pve' ? (itemData.pvePrice || 0) : (itemData.pvpPrice || 0)
      }
    }
    // Fallback to flea market price from cache
    return itemPriceCache.get(itemId) || 0
  }

  // Calculate overall price change for the quest
  const calculateQuestPriceChange = () => {
    let totalWeightedChange = 0
    let totalWeight = 0

    items.forEach(item => {
      const itemValue = getTotalValue(item, gameMode)
      let itemPriceChange: number | undefined

      // For bundled items (like REAP-IR), calculate based on underlying costs
      if (isFleaMarketRestricted(item) && item.cheapestAcquisitionMethod?.bundledItemDetails) {
        const bundled = item.cheapestAcquisitionMethod.bundledItemDetails
        let bundledWeightedChange = 0
        let bundledWeight = 0

        // Calculate change from required items (LEDX cost)
        bundled.requiredItems?.forEach(req => {
          let priceChangePercent: number | undefined
          
          // For PvE mode, prioritize requiredItemsData which has game mode-specific data
          if (gameMode === 'pve') {
            const reqItemData = requiredItemsData?.get(req.item.id)
            if (reqItemData?.changeLast48hPercent !== undefined) {
              priceChangePercent = reqItemData.changeLast48hPercent
            } else {
              // Fallback to allItemPrices for PvE if requiredItemsData doesn't have it
              const itemInAllPrices = allItemPrices?.find(item => item.id === req.item.id)
              priceChangePercent = itemInAllPrices?.changeLast48hPercent
            }
          } else {
            // For PvP mode, try allItemPrices first, then requiredItemsData
            const itemInAllPrices = allItemPrices?.find(item => item.id === req.item.id)
            if (itemInAllPrices?.changeLast48hPercent !== undefined) {
              priceChangePercent = itemInAllPrices.changeLast48hPercent
            } else {
              const reqItemData = requiredItemsData?.get(req.item.id)
              priceChangePercent = reqItemData?.changeLast48hPercent
            }
          }
          
          if (priceChangePercent !== undefined) {
            const reqPrice = getRequiredItemPrice(req.item.id)
            const reqTotalCost = reqPrice * req.count
            bundledWeightedChange += (priceChangePercent || 0) * reqTotalCost
            bundledWeight += reqTotalCost
          }
        })

        // Calculate change from weapon parts (money you get back - negative impact on net cost)
        bundled.weaponParts?.forEach(part => {
          let partPriceChange: number | undefined
          
          // For PvE mode, prioritize requiredItemsData which has game mode-specific data
          if (gameMode === 'pve') {
            const partItemData = requiredItemsData?.get(part.id)
            if (partItemData?.changeLast48hPercent !== undefined) {
              partPriceChange = partItemData.changeLast48hPercent
            } else {
              // Fallback to allItemPrices for PvE if requiredItemsData doesn't have it
              const partInAllPrices = allItemPrices?.find(item => item.id === part.id)
              if (partInAllPrices?.changeLast48hPercent !== undefined) {
                partPriceChange = partInAllPrices.changeLast48hPercent
              } else if (part.changeLast48h !== undefined && part.fleaPrice > 0) {
                // Calculate from changeLast48h and fleaPrice as final fallback
                partPriceChange = (part.changeLast48h / part.fleaPrice) * 100
              }
            }
          } else {
            // For PvP mode, try allItemPrices first, then requiredItemsData, then calculate
            const partInAllPrices = allItemPrices?.find(item => item.id === part.id)
            if (partInAllPrices?.changeLast48hPercent !== undefined) {
              partPriceChange = partInAllPrices.changeLast48hPercent
            } else {
              const partItemData = requiredItemsData?.get(part.id)
              if (partItemData?.changeLast48hPercent !== undefined) {
                partPriceChange = partItemData.changeLast48hPercent
              } else if (part.changeLast48h !== undefined && part.fleaPrice > 0) {
                // Calculate from changeLast48h and fleaPrice as final fallback
                partPriceChange = (part.changeLast48h / part.fleaPrice) * 100
              }
            }
          }
          
          if (partPriceChange !== undefined) {
            // Negative because selling parts reduces your net cost
            bundledWeightedChange -= partPriceChange * part.sellValue
            bundledWeight += part.sellValue
          }
        })

        if (bundledWeight > 0) {
          itemPriceChange = bundledWeightedChange / bundledWeight
        }
      } else if (isFleaMarketRestricted(item) && item.cheapestAcquisitionMethod) {
        // Handle craft/barter acquisition methods
        const acquisition = item.cheapestAcquisitionMethod as { 
          type: string; 
          data?: { 
            requiredItems?: Array<{ 
              item: { id: string; name: string }; 
              count: number 
            }> 
          } 
        }
        if (acquisition.type === 'craft' && acquisition.data?.requiredItems) {
          // Calculate price change based on craft required items
          let craftWeightedChange = 0
          let craftWeight = 0
          
          acquisition.data.requiredItems.forEach((req) => {
            const reqItemData = allItemPrices?.find(priceItem => priceItem.id === req.item.id)
            if (reqItemData?.changeLast48hPercent !== undefined) {
              const reqPrice = getRequiredItemPrice(req.item.id)
              const reqTotalCost = reqPrice * req.count
              craftWeightedChange += (reqItemData.changeLast48hPercent || 0) * reqTotalCost
              craftWeight += reqTotalCost
            }
          })
          
          if (craftWeight > 0) {
            itemPriceChange = craftWeightedChange / craftWeight
          }
        } else {
          // Fallback to direct price change
          itemPriceChange = item.changeLast48hPercent
        }
      } else {
        // For regular items, use their direct price change
        itemPriceChange = item.changeLast48hPercent
      }

      // Add to quest total if we have a price change
      if (itemPriceChange !== undefined) {
        const weight = itemValue / totalCost
        totalWeightedChange += itemPriceChange * weight
        totalWeight += weight
      }
    })

    return totalWeight > 0 ? totalWeightedChange / totalWeight : undefined
  }

  const questPriceChange = calculateQuestPriceChange()

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        className="w-full bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
        onClick={() => onToggleExpansion(questName)}
      >
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-neutral-600 dark:text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''} mt-0.5 flex-shrink-0`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 sm:gap-2 mb-1">
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-neutral-900 dark:text-neutral-100 truncate">
                      {questName}
                    </h3>
                    {QUEST_WIKI_LINKS[questName] && (
                      <a 
                        href={QUEST_WIKI_LINKS[questName]} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      title="View quest on Wiki"
                      >
                      <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                      </a>
                    )}
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  {items.length} items • {fleaRestrictedItems.length} restricted
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {formatCurrency(totalCost)}
              </div>
              <div className="flex justify-end mt-1">
                {getPriceChangeBadge(questPriceChange)}
              </div>
            </div>
          </div>
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-neutral-200 dark:border-neutral-700">
          {/* Flea Market Available Items */}
          {fleaAvailableItems.length > 0 && (
            <div className="p-4 sm:p-6">
              <h4 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3 sm:mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></span>
                <span className="truncate">Flea Market Available ({fleaAvailableItems.length})</span>
                  </h4>

              <ItemTable
                items={fleaAvailableItems.map((item): TableItem => ({
                  id: item.id,
                  image: item.iconLink,
                  name: item.name,
                  shortName: item.shortName,
                  count: item.quantity,
                  unitPrice: getItemPrice(item),
                  totalPrice: getItemPrice(item) * item.quantity,
                  changeLast48hPercent: item.changeLast48hPercent,
                  wikiLink: item.wikiLink
                }))}
                theme="light"
                allItemPrices={allItemPrices}
              />
                </div>
          )}

          {/* Flea Market Restricted Items */}
          {fleaRestrictedItems.length > 0 && (
            <div className={`p-4 sm:p-6 ${fleaAvailableItems.length > 0 ? 'border-t border-neutral-200 dark:border-neutral-700' : ''}`}>
              <h4 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2 flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0"></span>
                <span className="truncate">Flea Market Restricted ({fleaRestrictedItems.length})</span>
              </h4>

              <div className="space-y-4">
                {fleaRestrictedItems.map((item) => (
                  <div key={item.id} className="py-3 sm:py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 sm:mb-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                            {item.iconLink && (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                                <Image 
                                  src={item.iconLink} 
                                  alt={item.name}
                              width={48}
                              height={48}
                                  className="object-contain w-full h-full"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                              unoptimized={true}
                                />
                              </div>
                            )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-neutral-900 dark:text-neutral-100 text-sm sm:text-base truncate">
                                {item.shortName}
                              </div>
                              {item.wikiLink && (
                                <a 
                                  href={item.wikiLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors flex-shrink-0"
                                  title="View on Wiki"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                            {getPriceChangeBadge(item.changeLast48hPercent)}
                          </div>
                          <div className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-500">
                            Quantity: {item.quantity} • Flea Market Restricted
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="text-right">
                          <div className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100">
                            {formatCurrency(getTotalValue(item, gameMode))}
                          </div>
                          <div className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                            Total Cost ({gameMode.toUpperCase()})
                            </div>
                </div>
              </div>
                </div>
                
                    {/* Detailed acquisition method analysis */}
                    <ItemAcquisitionAnalysis
                    item={item}
                    itemPriceCache={itemPriceCache}
                      allItemPrices={allItemPrices}
                      requiredItemsData={requiredItemsData}
                      gameMode={gameMode}
                  />
                  </div>
                ))}
              </div>
              </div>
            )}
        </div>
      )}
    </div>
  )
} 