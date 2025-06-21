import React from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
// Collapsible components not needed for quest tables - using external state
import { ChevronDown, ExternalLink, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { ItemPrice } from '../types/tarkov'
import { formatCurrency, isFleaMarketRestricted, getTotalValue } from '../utils/tarkov-utils'
import { FleaRestrictedItemTable } from './FleaRestrictedItemTable'
import { QUEST_WIKI_LINKS } from '../constants/tarkov-data'

interface QuestTableProps {
  questName: string
  items: ItemPrice[]
  isExpanded: boolean
  bitcoinFarmLevel: number
  itemPriceCache: Map<string, number>
  onToggleExpansion: (questName: string) => void
}

const getPriceChangeBadge = (change: number | undefined) => {
  if (change === undefined) return null
  
  if (change > 0) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-full text-green-700 dark:text-green-300 text-xs font-medium">
        <TrendingUp className="h-3 w-3" />
        +{change.toFixed(1)}%
      </div>
    )
  }
  if (change < 0) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-full text-red-700 dark:text-red-300 text-xs font-medium">
        <TrendingDown className="h-3 w-3" />
        {change.toFixed(1)}%
      </div>
    )
  }
  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-full text-neutral-600 dark:text-neutral-400 text-xs font-medium">
      <Minus className="h-3 w-3" />
      0.0%
    </div>
  )
}

export const QuestTable: React.FC<QuestTableProps> = ({
  questName,
  items,
  isExpanded,
  bitcoinFarmLevel,
  itemPriceCache,
  onToggleExpansion
}) => {
  const totalCost = items.reduce((sum, item) => sum + getTotalValue(item), 0)
  const fleaRestrictedItems = items.filter(item => isFleaMarketRestricted(item))
  const fleaAvailableItems = items.filter(item => !isFleaMarketRestricted(item))

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
      {/* Header */}
      <button 
        className="w-full bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
        onClick={() => onToggleExpansion(questName)}
      >
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <ChevronDown className={`h-5 w-5 text-neutral-600 dark:text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                  {questName}
                </h3>
                {QUEST_WIKI_LINKS[questName] && (
                  <a
                    href={QUEST_WIKI_LINKS[questName]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {items.length} items • {fleaRestrictedItems.length} restricted
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {formatCurrency(totalCost)}
              </div>
            </div>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div>
          <div className="border-t border-neutral-200 dark:border-neutral-700">
            {/* Flea Market Available Items */}
            {fleaAvailableItems.length > 0 && (
              <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
                <h4 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                  Flea Market Available
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-neutral-50 dark:bg-neutral-800">
                        <th className="text-left p-3 text-neutral-700 dark:text-neutral-300 font-medium w-16">Image</th>
                        <th className="text-left p-3 text-neutral-700 dark:text-neutral-300 font-medium">Item</th>
                        <th className="text-center p-3 text-neutral-700 dark:text-neutral-300 font-medium w-16">Qty</th>
                        <th className="text-right p-3 text-neutral-700 dark:text-neutral-300 font-medium w-32">Unit Price</th>
                        <th className="text-right p-3 text-neutral-700 dark:text-neutral-300 font-medium w-32">Total</th>
                        <th className="text-center p-3 text-neutral-700 dark:text-neutral-300 font-medium w-24">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fleaAvailableItems.map((item) => (
                        <tr key={item.id} className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                          <td className="p-3">
                            {item.iconLink && (
                              <div className="w-12 h-12 flex-shrink-0">
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
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-neutral-900 dark:text-neutral-100">
                                  {item.shortName}
                                </div>
                                {item.wikiLink && (
                                  <a
                                    href={item.wikiLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="secondary">
                              {item.quantity}
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-mono text-neutral-700 dark:text-neutral-300">
                            {formatCurrency(item.avg24hPrice || 0)}
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                            {formatCurrency((item.avg24hPrice || 0) * item.quantity)}
                          </td>
                          <td className="p-3 text-center">
                            {getPriceChangeBadge(item.changeLast48hPercent)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Flea Market Restricted Items */}
            {fleaRestrictedItems.length > 0 && (
              <div className="p-6 space-y-6">
                <h4 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  Flea Market Restricted Items
                </h4>
                
                {fleaRestrictedItems.map((item) => (
                  <div key={item.id} className="space-y-4">
                    {/* Simple Item Header */}
                    <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-center gap-3">
                        {item.iconLink && (
                          <div className="w-12 h-12 flex-shrink-0">
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
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-neutral-900 dark:text-neutral-100">
                                {item.shortName}
                              </div>
                              {item.wikiLink && (
                                <a 
                                  href={item.wikiLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                                  title="View on Wiki"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                            {getPriceChangeBadge(item.changeLast48hPercent)}
                          </div>
                          <div className="text-sm text-neutral-500 dark:text-neutral-500">
                            Quantity: {item.quantity} • Flea Market Restricted
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                            {formatCurrency(getTotalValue(item))}
                          </div>
                          <div className="text-sm text-neutral-600 dark:text-neutral-400">
                            Total Cost
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* All Acquisition Methods */}
                    <FleaRestrictedItemTable
                      item={item}
                      bitcoinFarmLevel={bitcoinFarmLevel}
                      itemPriceCache={itemPriceCache}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 