'use client'

import React from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { ExternalLink } from 'lucide-react'
import { formatCurrency } from '@/app/utils/tarkov-utils'
import { ItemPrice } from '@/app/types/tarkov'

export interface TableItem {
  id: string
  image?: string
  name: string
  shortName?: string
  count: number
  unitPrice: number
  totalPrice: number
  changeLast48hPercent?: number
  changeLast48h?: number // for weapon parts 
  wikiLink?: string
  fleaPrice?: number // for weapon parts calculation
}

interface ItemTableProps {
  items: TableItem[]
  theme?: 'light' | 'dark'
  allItemPrices?: ItemPrice[]
  className?: string
  title?: string
  showExternalLinks?: boolean
}

export const ItemTable: React.FC<ItemTableProps> = ({
  items,
  theme = 'light',
  allItemPrices,
  className = '',
  title,
  showExternalLinks = true
}) => {
  const isDark = theme === 'dark'
  
  // Helper to get price change data
  const getPriceChangeData = (item: TableItem) => {
    // If item already has price change data, use it
    if (item.changeLast48hPercent !== undefined && item.changeLast48hPercent !== null) {
      return item.changeLast48hPercent
    }
    
    // For weapon parts, calculate from changeLast48h
    if (item.changeLast48h !== undefined && item.fleaPrice && item.fleaPrice > 0) {
      return (item.changeLast48h / item.fleaPrice) * 100
    }
    
    // Try to find from allItemPrices with comprehensive matching
    if (allItemPrices && allItemPrices.length > 0) {
      // Try multiple matching strategies
      const searchTerms = [
        item.id,
        item.name?.toLowerCase().trim(),
        item.shortName?.toLowerCase().trim(),
        item.name?.toLowerCase().replace(/\s+/g, ''),
        item.shortName?.toLowerCase().replace(/\s+/g, '')
      ].filter((term): term is string => Boolean(term))
      
      for (const searchTerm of searchTerms) {
        const itemData = allItemPrices.find(priceItem => {
          const compareTerms = [
            priceItem.id,
            priceItem.name?.toLowerCase().trim(),
            priceItem.shortName?.toLowerCase().trim(),
            priceItem.name?.toLowerCase().replace(/\s+/g, ''),
            priceItem.shortName?.toLowerCase().replace(/\s+/g, '')
          ].filter((term): term is string => Boolean(term))
          
          return compareTerms.includes(searchTerm)
        })
        
        if (itemData?.changeLast48hPercent !== undefined && itemData.changeLast48hPercent !== null) {
          return itemData.changeLast48hPercent
        }
      }
    }
    
    return undefined
  }

  // Theme classes
  const themeClasses = {
    container: isDark 
      ? 'border border-gray-600 rounded-lg overflow-hidden' 
      : 'border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden',
    header: isDark 
      ? 'bg-gray-700 border-b border-gray-600' 
      : 'bg-neutral-100 dark:bg-neutral-700',
    headerText: isDark 
      ? 'text-gray-300 font-medium' 
      : 'text-neutral-700 dark:text-neutral-300 font-medium',
    row: isDark 
      ? 'border-b border-gray-700 hover:bg-gray-750 transition-colors' 
      : 'border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors',
    cellText: isDark 
      ? 'text-white font-medium' 
      : 'text-neutral-900 dark:text-neutral-100 font-medium',
    cellTextSecondary: isDark 
      ? 'text-white font-medium' 
      : 'text-sm text-neutral-900 dark:text-neutral-100 font-medium',
    badge: isDark 
      ? 'px-2 py-1 bg-transparent border border-gray-600 rounded text-xs text-gray-300' 
      : 'text-xs',
    imageBg: isDark 
      ? 'w-8 h-8 rounded bg-gray-600 object-contain' 
      : 'w-8 h-8 rounded bg-neutral-200 dark:bg-neutral-600 object-contain'
  }

  return (
    <div className={className}>
      {title && (
        <h6 className={`text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-neutral-900 dark:text-neutral-100'}`}>
          {title}
        </h6>
      )}
      <div className={themeClasses.container}>
        <table className="w-full text-sm border-spacing-0">
          <thead>
            <tr className={themeClasses.header}>
              <th className={`text-left py-2 px-2 sm:py-3 sm:px-3 ${themeClasses.headerText} w-10 sm:w-12`}>Image</th>
              <th className={`text-left py-2 px-2 sm:py-3 sm:px-3 ${themeClasses.headerText}`}>Item</th>
              <th className={`text-center py-2 px-2 sm:py-3 sm:px-3 ${themeClasses.headerText} w-12 sm:w-16`}>Qty</th>
              <th className={`text-right py-2 px-2 sm:py-3 sm:px-3 ${themeClasses.headerText} w-20 sm:w-32 md:w-40`}>Price</th>
              <th className={`text-right py-2 px-2 sm:py-3 sm:px-3 ${themeClasses.headerText} w-20 sm:w-32 md:w-40`}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const priceChange = getPriceChangeData(item)
              
              return (
                <tr key={item.id || index} className={themeClasses.row}>
                  {/* Image */}
                  <td className="py-2 px-2 sm:py-2.5 sm:px-3">
                    {item.image ? (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 flex-shrink-0">
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={40}
                          height={40}
                          className="object-contain w-full h-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                          unoptimized={true}
                        />
                      </div>
                    ) : null}
                  </td>
                  
                  {/* Item Name + External Link */}
                  <td className="py-2 px-2 sm:py-2.5 sm:px-3">
                    <div className="flex items-center gap-1">
                      <span className={`${themeClasses.cellText} text-xs sm:text-sm truncate`} title={item.shortName || item.name}>
                        {item.shortName || item.name}
                      </span>
                      {showExternalLinks && item.wikiLink && (
                        <a
                          href={item.wikiLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors flex-shrink-0"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </td>
                  
                  {/* Quantity */}
                  <td className="py-2 px-2 sm:py-2.5 sm:px-3 text-center">
                    {isDark ? (
                      <span className="px-1.5 py-0.5 sm:px-2 sm:py-0.5 bg-gray-600 rounded text-xs text-gray-300">
                        {item.count}
                      </span>
                    ) : (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0.5 sm:px-2 sm:py-0.5">
                        {item.count}
                      </Badge>
                    )}
                  </td>
                  
                  {/* Price + Change % */}
                  <td className="py-2 px-2 sm:py-2.5 sm:px-3 text-right">
                    <div className={`${themeClasses.cellTextSecondary} text-xs`}>
                      <div>
                        {formatCurrency(item.unitPrice)}
                      </div>
                      {priceChange !== undefined && (
                        <div className={`text-xs ${priceChange > 0 ? 'text-green-600 dark:text-green-400' : priceChange < 0 ? 'text-red-600 dark:text-red-400' : 'text-neutral-500'}`}>
                          {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </td>
                  
                  {/* Total */}
                  <td className="py-2 px-2 sm:py-2.5 sm:px-3 text-right">
                    <div className={`${themeClasses.cellTextSecondary} text-xs`}>
                      {formatCurrency(item.totalPrice)}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ItemTable 