'use client'

import { useTarkovData } from '@/app/hooks/useTarkovData'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { useState } from 'react'
import Image from 'next/image'
import { ItemPrice, GameMode } from '../types/tarkov'
import { getTotalValue, analyzeWeaponParts } from '../utils/tarkov-utils'
import { ItemTable, type TableItem } from './shared'

interface FleaRestrictedItemTableProps {
  gameMode: GameMode
}

export default function FleaRestrictedItemTable({ gameMode }: FleaRestrictedItemTableProps) {
  const { itemPrices, loading, itemPriceCache, groupItemsByQuest } = useTarkovData(gameMode)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }))
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center text-gray-400">Loading quest data...</div>
      </div>
    )
  }

  if (!itemPrices || itemPrices.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        No item data available.
      </div>
    )
  }

  try {
    // Safely process the data from useTarkovData hook
    const questGroups = groupItemsByQuest()
    if (!questGroups || questGroups.length === 0) {
      return (
        <div className="text-center text-gray-400 py-8">
          No quest data available.
        </div>
      )
    }

    const processedQuests = questGroups.map(([questName, items]) => {
      const processedItems = items.map((item: ItemPrice) => {
        const totalValue = getTotalValue(item, gameMode)
        const unitPrice = item.quantity > 0 ? totalValue / item.quantity : 0
        
        return {
          name: item.name || 'Unknown Item',
          searchTerm: item.shortName || item.name || 'unknown',
          imageUrl: item.iconLink || '',
          quantity: item.quantity || 1,
          unitPrice: unitPrice,
          totalValue: totalValue,
          canSellOnFlea: !(item.pvpPrice === 0 && item.pvePrice === 0 && (item.avg24hPrice || 0) > 0) && !item.cheapestAcquisitionMethod,
          change: item.changeLast48hPercent ? `${item.changeLast48hPercent > 0 ? '+' : ''}${item.changeLast48hPercent.toFixed(1)}%` : undefined,
          acquisitionMethod: item.cheapestAcquisitionMethod?.details
        }
      }).filter(item => item !== null)
      
      const totalCost = processedItems.reduce((sum, item) => sum + (item.totalValue || 0), 0)
      
      return {
        name: questName || 'Unknown Quest',
        items: processedItems,
        totalCost: totalCost
      }
    }).filter(quest => quest.items.length > 0)

    // Process bundled items data safely
    const bundledItems = itemPrices
      .filter(item => item.bundledItem && item.cheapestAcquisitionMethod?.type === 'bundled')
      .map((item: ItemPrice) => {
        try {
          if (!item.bundledItem || !item.cheapestAcquisitionMethod?.bundledItemDetails) {
            return null
          }
          
          const weaponPartsAnalysis = analyzeWeaponParts(item.bundledItem)
          const bundledDetails = item.cheapestAcquisitionMethod.bundledItemDetails
          
          return {
            targetItemId: item.shortName || item.name || 'unknown',
            netCostPerItem: item.cheapestAcquisitionMethod.costInRubles || 0,
            barterCost: bundledDetails.barterCost || 0,
            sellValue: weaponPartsAnalysis?.totalSellValue || 0,
            traderTotal: weaponPartsAnalysis?.traderSellValue || 0,
            requiredItems: (bundledDetails.requiredItems || []).map((req: { item?: { id?: string; name?: string; iconLink?: string }; count?: number }) => {
              const itemData = itemPrices.find(item => item.id === req.item?.id)
              return {
                item: { 
                  name: req.item?.name || 'Unknown Item',
                  image: req.item?.iconLink || ''
                },
                count: req.count || 0,
                totalPrice: ((itemPriceCache?.get(req.item?.id || '') || 0) * (req.count || 0)),
                changeLast48hPercent: itemData?.changeLast48hPercent
              }
            }),
            fleaMarketParts: (weaponPartsAnalysis?.weaponParts || [])
              .filter((part: { recommendFlea?: boolean; isKeepForQuest?: boolean }) => part.recommendFlea && !part.isKeepForQuest)
              .map((part: { name?: string; iconLink?: string; count?: number; fleaPrice?: number; sellValue?: number; changeLast48h?: number }) => ({
                item: {
                  name: part.name || 'Unknown Part',
                  image: part.iconLink || ''
                },
                count: part.count || 0,
                fleaPrice: part.fleaPrice || 0,
                sellValue: part.sellValue || 0,
                changeLast48h: part.changeLast48h
              }))
          }
        } catch (error) {
          console.error('Error processing bundled item:', error)
          return null
        }
      })
      .filter(item => item !== null)

    const fleaRestrictedQuests = processedQuests.filter(quest => 
      quest.items.some(item => !item.canSellOnFlea)
    )

    if (fleaRestrictedQuests.length === 0) {
      return (
        <div className="text-center text-gray-400 py-8">
          No flea market restricted items found.
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {fleaRestrictedQuests.map((quest) => (
          <div key={quest.name} className="bg-gray-800 rounded-lg p-4 sm:p-6">
            {/* Quest Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">{quest.name}</h2>
                <p className="text-gray-400 text-sm sm:text-base">
                  {quest.items.filter(item => !item.canSellOnFlea).length} flea restricted item(s)
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-bold text-white">
                  ₽ {quest.totalCost.toLocaleString()}
                </div>
                <div className="text-gray-400 text-sm">Total Cost ({gameMode.toUpperCase()})</div>
              </div>
            </div>

            {/* Items Grid */}
            <div className="space-y-4">
              {quest.items
                .filter(item => !item.canSellOnFlea)
                .map((item) => {
                  const bundledItem = bundledItems.find(b => b?.targetItemId === item.searchTerm)
                  const isExpanded = expandedItems[item.name] || false

                  return (
                    <div key={item.name} className="bg-gray-700 rounded-lg overflow-hidden">
                      {/* Item Header */}
                      <div className="p-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                          {/* Item Image & Info */}
                          <div className="flex items-center gap-3 flex-1">
                            {item.imageUrl && (
                              <Image 
                                src={item.imageUrl} 
                                alt={item.name}
                                width={64}
                                height={64}
                                className="w-12 h-12 sm:w-16 sm:h-16 rounded bg-gray-600 object-contain"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-white text-lg truncate">{item.name}</h3>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-gray-300 text-sm">Qty: {item.quantity}</span>
                                <Badge variant="destructive" className="text-xs">Flea Restricted</Badge>
                                {item.change && (
                                  <Badge 
                                    variant={item.change.startsWith('+') ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {item.change}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Price Info */}
                          <div className="flex flex-col sm:items-end gap-2">
                            <div className="text-xl sm:text-2xl font-bold text-white">
                              ₽ {item.totalValue.toLocaleString()}
                            </div>
                            <div className="text-gray-400 text-sm">
                              ₽ {item.unitPrice.toLocaleString()} each
                            </div>
                          </div>
                        </div>

                        {/* Acquisition Method */}
                        {item.acquisitionMethod && (
                          <div className="mt-4 p-3 bg-gray-600 rounded">
                            <div className="text-green-400 font-medium text-sm mb-1">Best Method:</div>
                            <div className="text-white text-sm">{item.acquisitionMethod}</div>
                          </div>
                        )}

                        {/* Bundled Item Toggle */}
                        {bundledItem && (
                          <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(item.name)}>
                            <CollapsibleTrigger className="w-full mt-4 p-3 bg-orange-600 hover:bg-orange-700 rounded flex items-center justify-between text-white font-medium transition-colors">
                              <span>🔧 Bundled Item Strategy - ₽ {bundledItem.netCostPerItem.toLocaleString()} per {item.name}</span>
                              {isExpanded ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
                            </CollapsibleTrigger>
                            
                            <CollapsibleContent className="mt-4">
                              <BundledItemBreakdown bundledItem={bundledItem} allItemPrices={itemPrices} />
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        ))}
      </div>
    )
  } catch (error) {
    console.error('Error rendering FleaRestrictedItemTable:', error)
    return (
      <div className="text-center text-red-400 py-8">
        Error loading data. Please check console for details.
      </div>
    )
  }
}

// Separate component for bundled item breakdown
function BundledItemBreakdown({ bundledItem, allItemPrices }: { 
  bundledItem: {
    barterCost?: number;
    sellValue?: number;
    netCostPerItem?: number;
    traderTotal?: number;
    requiredItems?: Array<{
      item?: { name?: string; image?: string };
      count?: number;
      totalPrice?: number;
      changeLast48hPercent?: number;
    }>;
    fleaMarketParts?: Array<{
      item?: { name?: string; image?: string };
      count?: number;
      fleaPrice?: number;
      sellValue?: number;
      changeLast48h?: number;
    }>;
  }, 
  allItemPrices: ItemPrice[] 
}) {
  if (!bundledItem) {
    return <div className="text-gray-400">No bundled item data available.</div>
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      {/* Strategy Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <div className="bg-blue-600 rounded p-3">
          <div className="text-white font-medium">Barter Cost</div>
          <div className="text-xl font-bold text-white">₽ {(bundledItem.barterCost || 0).toLocaleString()}</div>
        </div>
        <div className="bg-green-600 rounded p-3">
          <div className="text-white font-medium">Sell Parts</div>
          <div className="text-xl font-bold text-white">+ ₽ {(bundledItem.sellValue || 0).toLocaleString()}</div>
        </div>
        <div className="bg-orange-600 rounded p-3">
          <div className="text-white font-medium">Net Cost</div>
          <div className="text-xl font-bold text-white">₽ {(bundledItem.netCostPerItem || 0).toLocaleString()}</div>
        </div>
      </div>

      {/* Required Items */}
      {bundledItem.requiredItems?.length && bundledItem.requiredItems.length > 0 && (
        <div>
          <h4 className="font-semibold text-white mb-3">Required Items:</h4>
          <ItemTable
            items={bundledItem.requiredItems.map((reqItem): TableItem => ({
              id: `bundled-req-${reqItem.item?.name || 'unknown'}`,
              image: reqItem.item?.image,
              name: reqItem.item?.name || 'Unknown Item',
              shortName: reqItem.item?.name,
              count: reqItem.count || 0,
              unitPrice: (reqItem.totalPrice || 0) / (reqItem.count || 1),
              totalPrice: reqItem.totalPrice || 0,
              changeLast48hPercent: reqItem.changeLast48hPercent
            }))}
            theme="dark"
            allItemPrices={allItemPrices}
            title="Required Items"
          />
        </div>
      )}

      {/* Flea Market Items */}
      {bundledItem.fleaMarketParts?.length && bundledItem.fleaMarketParts.length > 0 && (
        <div>
          <h4 className="font-semibold text-white mb-3">Sell on Flea Market:</h4>
          <ItemTable
            items={bundledItem.fleaMarketParts.map((part): TableItem => ({
              id: `bundled-part-${part.item?.name || 'unknown'}`,
              image: part.item?.image,
              name: part.item?.name || 'Unknown Part',
              shortName: part.item?.name,
              count: part.count || 0,
              unitPrice: part.fleaPrice || 0,
              totalPrice: part.sellValue || 0,
              changeLast48h: part.changeLast48h,
              fleaPrice: part.fleaPrice
            }))}
            theme="dark"
            allItemPrices={allItemPrices}
            title="Sell on Flea Market"
          />
        </div>
      )}

      {/* Trader Items Summary */}
      {bundledItem.traderTotal && bundledItem.traderTotal > 0 && (
        <div className="bg-gray-700 rounded p-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Remaining parts to traders:</span>
            <span className="text-white font-medium">₽ {(bundledItem.traderTotal || 0).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  )
}