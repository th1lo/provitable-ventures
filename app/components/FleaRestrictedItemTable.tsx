import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Hammer, ArrowRightLeft, ChevronDown, Clock, AlertTriangle, ShoppingCart, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { ItemPrice } from '../types/tarkov'
import { 
  formatCurrency, 
  formatDuration, 
  calculateBitcoinFarmTime,
  getTraderResetTime,
  getAllAcquisitionMethods
} from '../utils/tarkov-utils'

interface FleaRestrictedItemTableProps {
  item: ItemPrice
  bitcoinFarmLevel: number
  itemPriceCache: Map<string, number>
}

const getPriceChangeBadge = (change: number | undefined) => {
  if (change === undefined || change === null) return null
  
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

const ItemTable = ({ requiredItems, itemPriceCache, itemDataCache }: {
  requiredItems: Array<{ item: { id: string; name: string; shortName: string; iconLink: string | null }; count: number }>
  itemPriceCache: Map<string, number>
  itemDataCache?: Map<string, { changeLast48hPercent?: number }> // For price change data
}) => (
  <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-neutral-50 dark:bg-neutral-800">
          <th className="text-left p-3 text-neutral-700 dark:text-neutral-300 font-medium w-16">Image</th>
          <th className="text-left p-3 text-neutral-700 dark:text-neutral-300 font-medium">Item</th>
          <th className="text-center p-3 text-neutral-700 dark:text-neutral-300 font-medium w-16">Qty</th>
          <th className="text-right p-3 text-neutral-700 dark:text-neutral-300 font-medium w-32">Unit</th>
          <th className="text-right p-3 text-neutral-700 dark:text-neutral-300 font-medium w-32">Total</th>
          <th className="text-center p-3 text-neutral-700 dark:text-neutral-300 font-medium w-24">Change</th>
        </tr>
      </thead>
      <tbody>
        {requiredItems.map((req, index) => {
          const unitPrice = itemPriceCache.get(req.item.id) || 0
          const totalPrice = unitPrice * req.count
          const itemData = itemDataCache?.get(req.item.id)
          
          return (
            <tr key={index} className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
              <td className="p-3">
                {req.item.iconLink && (
                  <div className="w-12 h-12 flex-shrink-0">
                    <Image 
                      src={req.item.iconLink} 
                      alt={req.item.name}
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
              <td className="p-3 text-neutral-900 dark:text-neutral-100 font-medium">{req.item.shortName}</td>
              <td className="p-3 text-center">
                <Badge variant="secondary">
                  {req.count}
                </Badge>
              </td>
              <td className="p-3 text-right font-mono text-neutral-700 dark:text-neutral-300">
                {formatCurrency(unitPrice)}
              </td>
              <td className="p-3 text-right font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                {formatCurrency(totalPrice)}
              </td>
              <td className="p-3 text-center">
                {getPriceChangeBadge(itemData?.changeLast48hPercent)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  </div>
)

export const FleaRestrictedItemTable: React.FC<FleaRestrictedItemTableProps> = ({
  item,
  bitcoinFarmLevel,
  itemPriceCache
}) => {
  const [acquisitionMethods, setAcquisitionMethods] = useState<Array<{
    type: 'craft' | 'barter' | 'trader'
    cost: number
    costInRubles: number
    currency: string
    details: string
    id: string
    data?: any
  }>>([])
  const [openMethods, setOpenMethods] = useState<Set<string>>(new Set())
  const [itemDataCache, setItemDataCache] = useState<Map<string, { changeLast48hPercent?: number }>>(new Map())

  useEffect(() => {
    const fetchMethods = async () => {
      const methods = await getAllAcquisitionMethods(item, itemPriceCache)
      setAcquisitionMethods(methods)
      
      // Collect all required item IDs to fetch their price change data
      const requiredItemIds = new Set<string>()
      methods.forEach(method => {
        if (method.data?.requiredItems) {
          method.data.requiredItems.forEach((req: any) => requiredItemIds.add(req.item.id))
        }
      })
      
      // Fetch price change data for required items (mock data for now)
      const dataCache = new Map<string, { changeLast48hPercent?: number }>()
      Array.from(requiredItemIds).forEach(id => {
        // In real app, this would come from API
        const mockChange = Math.random() * 20 - 10 // Random -10% to +10%
        dataCache.set(id, { changeLast48hPercent: mockChange })
      })
      setItemDataCache(dataCache)
    }
    fetchMethods()
  }, [item, itemPriceCache])

  const toggleMethod = (methodId: string) => {
    const newOpen = new Set(openMethods)
    if (newOpen.has(methodId)) {
      newOpen.delete(methodId)
    } else {
      newOpen.add(methodId)
    }
    setOpenMethods(newOpen)
  }

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'craft': return <Hammer className="h-4 w-4 text-blue-600" />
      case 'barter': return <ArrowRightLeft className="h-4 w-4 text-green-600" />
      case 'trader': return <ShoppingCart className="h-4 w-4 text-purple-600" />
      default: return null
    }
  }

  if (acquisitionMethods.length === 0) {
    return (
      <div className="text-center p-6 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800">
        <AlertTriangle className="h-8 w-8 text-neutral-500 dark:text-neutral-400 mx-auto mb-2" />
        <p className="text-neutral-700 dark:text-neutral-300 font-medium">No acquisition methods found</p>
        <p className="text-sm text-neutral-500 dark:text-neutral-500">This item may only be available through quest rewards or special events</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {acquisitionMethods.map((method) => {
        const isOpen = openMethods.has(method.id)
        const hasRequiredItems = method.data?.requiredItems && method.data.requiredItems.length > 0
        const shouldUseCollapsible = hasRequiredItems && method.data.requiredItems.length > 2

        // Craft/Barter with no required items
        if (!hasRequiredItems) {
          return (
            <div key={method.id} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getMethodIcon(method.type)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {method.type === 'craft' ? 
                          `${method.data.station.name} L${method.data.level}` :
                          `${method.data.trader.name} LL${method.data.level}`
                        }
                      </span>
                      {method.type === 'craft' && (
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDuration(method.data.duration)}
                        </Badge>
                      )}
                      {method.type === 'craft' && method.data?.station?.normalizedName === 'bitcoin-farm' && (
                        <Badge variant="secondary" className="text-xs bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-300">
                          BTC L{bitcoinFarmLevel}
                        </Badge>
                      )}
                      {method.type === 'barter' && method.data?.taskUnlock && (
                        <Badge variant="secondary" className="text-xs bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300">
                          Quest Required
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  {formatCurrency(method.costInRubles)}
                </div>
              </div>
            </div>
          )
        }

        // Show items directly for ≤2 items
        if (!shouldUseCollapsible) {
          return (
            <div key={method.id} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getMethodIcon(method.type)}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {method.type === 'craft' ? 
                          `${method.data.station.name} L${method.data.level}` :
                          `${method.data.trader.name} LL${method.data.level}`
                        }
                      </span>
                      {method.type === 'craft' && (
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDuration(method.data.duration)}
                        </Badge>
                      )}
                      {method.type === 'craft' && method.data?.station?.normalizedName === 'bitcoin-farm' && (
                        <Badge variant="secondary" className="text-xs bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-300">
                          BTC L{bitcoinFarmLevel}
                        </Badge>
                      )}
                      {method.type === 'barter' && method.data?.taskUnlock && (
                        <Badge variant="secondary" className="text-xs bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300">
                          Quest Required
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  {formatCurrency(method.costInRubles)}
                </div>
              </div>
              {method.type === 'barter' && method.data?.taskUnlock && (
                <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg">
                  <div className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                    ⚠️ Requires Quest: {method.data.taskUnlock.name}
                  </div>
                </div>
              )}
              <ItemTable 
                requiredItems={method.data.requiredItems} 
                itemPriceCache={itemPriceCache} 
                itemDataCache={itemDataCache}
              />
            </div>
          )
        }

        // Use collapsible for 3+ items
        return (
          <Collapsible key={method.id} open={isOpen} onOpenChange={() => toggleMethod(method.id)}>
            <CollapsibleTrigger className="w-full border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-left">
                  <ChevronDown className={`h-4 w-4 text-neutral-600 dark:text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  {getMethodIcon(method.type)}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {method.type === 'craft' ? 
                          `${method.data.station.name} L${method.data.level}` :
                          `${method.data.trader.name} LL${method.data.level}`
                        }
                      </span>
                      {method.type === 'craft' && (
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDuration(method.data.duration)}
                        </Badge>
                      )}
                      {method.type === 'craft' && method.data?.station?.normalizedName === 'bitcoin-farm' && (
                        <Badge variant="secondary" className="text-xs bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-300">
                          BTC L{bitcoinFarmLevel}
                        </Badge>
                      )}
                      {method.type === 'barter' && method.data?.taskUnlock && (
                        <Badge variant="secondary" className="text-xs bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300">
                          Quest Required
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  {formatCurrency(method.costInRubles)}
                </div>
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="mt-2">
                {method.type === 'barter' && method.data?.taskUnlock && (
                  <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700">
                    <div className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                      ⚠️ Requires Quest: {method.data.taskUnlock.name}
                    </div>
                  </div>
                )}
                <ItemTable 
                  requiredItems={method.data.requiredItems} 
                  itemPriceCache={itemPriceCache} 
                  itemDataCache={itemDataCache}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        )
      })}
    </div>
  )
} 