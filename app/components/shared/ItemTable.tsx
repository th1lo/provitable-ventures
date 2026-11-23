'use client'

import React from 'react'
import Image from 'next/image'
import { ExternalLink } from 'lucide-react'
import { formatCount, formatCurrency } from '@/app/utils/tarkov-utils'

export interface TableItem {
  id: string
  image?: string
  name: string
  shortName?: string
  count: number
  unitPrice: number
  totalPrice: number
  changeLast48hPercent?: number
  wikiLink?: string
  // Small line under the name: where the price comes from or where to sell
  sourceLabel?: string
  // The price is a guess (trader sell value) or missing
  uncertain?: boolean
}

interface ItemTableProps {
  items: TableItem[]
  className?: string
  title?: string
  priceHeader?: string
  totalHeader?: string
}

export const ItemTable: React.FC<ItemTableProps> = ({
  items,
  className = '',
  title,
  priceHeader = 'Price',
  totalHeader = 'Total'
}) => {
  const headerText = 'text-neutral-700 dark:text-neutral-300 font-medium'
  const cellText = 'text-neutral-900 dark:text-neutral-100 font-medium'

  return (
    <div className={className}>
      {title && (
        <h6 className="text-sm font-medium mb-2 text-neutral-900 dark:text-neutral-100">{title}</h6>
      )}
      <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm border-spacing-0">
          <thead>
            <tr className="bg-neutral-100 dark:bg-neutral-700">
              <th className={`text-left py-2 px-2 sm:py-3 sm:px-3 ${headerText} w-10 sm:w-12`}>
                <span className="sr-only">Image</span>
              </th>
              <th className={`text-left py-2 px-2 sm:py-3 sm:px-3 ${headerText}`}>Item</th>
              <th className={`text-center py-2 px-2 sm:py-3 sm:px-3 ${headerText} w-12 sm:w-16`}>Qty</th>
              <th className={`text-right py-2 px-2 sm:py-3 sm:px-3 ${headerText} w-20 sm:w-32 md:w-40`}>{priceHeader}</th>
              <th className={`text-right py-2 px-2 sm:py-3 sm:px-3 ${headerText} w-20 sm:w-32 md:w-40`}>{totalHeader}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const priceChange = item.changeLast48hPercent
              const hasChange = typeof priceChange === 'number' && Number.isFinite(priceChange)

              return (
                <tr
                  key={`${item.id}-${index}`}
                  className="border-b last:border-b-0 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                >
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
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                          unoptimized={true}
                        />
                      </div>
                    ) : null}
                  </td>

                  <td className="py-2 px-2 sm:py-2.5 sm:px-3">
                    <div className="flex items-center gap-1">
                      <span className={`${cellText} text-xs sm:text-sm truncate`} title={item.name}>
                        {item.shortName || item.name}
                      </span>
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
                    {item.sourceLabel && (
                      <div
                        className={`text-xs ${
                          item.uncertain
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-neutral-500 dark:text-neutral-400'
                        }`}
                      >
                        {item.sourceLabel}
                      </div>
                    )}
                  </td>

                  <td className="py-2 px-2 sm:py-2.5 sm:px-3 text-center">
                    <span className="inline-flex items-center rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-600/10 px-1.5 py-0.5 sm:px-2 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      {formatCount(item.count)}
                    </span>
                  </td>

                  <td className="py-2 px-2 sm:py-2.5 sm:px-3 text-right">
                    <div className={`${cellText} text-xs`}>
                      <div>{formatCurrency(item.unitPrice)}</div>
                      {hasChange && (
                        <div
                          className={`text-xs ${
                            priceChange > 0
                              ? 'text-green-600 dark:text-green-400'
                              : priceChange < 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-neutral-500'
                          }`}
                        >
                          {priceChange > 0 ? '+' : ''}
                          {priceChange.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="py-2 px-2 sm:py-2.5 sm:px-3 text-right">
                    <div className={`${cellText} text-xs`}>{formatCurrency(item.totalPrice)}</div>
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
