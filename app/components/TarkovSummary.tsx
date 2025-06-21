import React from 'react'
import { Package, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatCurrency } from '../utils/tarkov-utils'

interface TarkovSummaryProps {
  grandTotal: number
  categoryTotals: Record<string, number>
  totalItems: number
  restrictedItems: number
  loading?: boolean
}

export const TarkovSummary: React.FC<TarkovSummaryProps> = ({
  grandTotal,
  categoryTotals,
  totalItems,
  restrictedItems,
  loading = false
}) => {
  // Mock price change for demonstration (in real app, this would come from props)
  const overallPriceChange = 2.3 // +2.3% overall price increase

  const getPriceChangeBadge = (change: number) => {
    if (loading) {
      return (
        <div className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-full">
          <div className="h-3 w-3 bg-neutral-300 dark:bg-neutral-600 rounded animate-pulse"></div>
          <div className="h-4 w-12 bg-neutral-300 dark:bg-neutral-600 rounded animate-pulse"></div>
        </div>
      )
    }
    
    if (change > 0) {
      return (
        <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-full text-green-700 dark:text-green-300 text-sm font-medium">
          <TrendingUp className="h-3 w-3" />
          +{change.toFixed(1)}%
        </div>
      )
    }
    if (change < 0) {
      return (
        <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-full text-red-700 dark:text-red-300 text-sm font-medium">
          <TrendingDown className="h-3 w-3" />
          {change.toFixed(1)}%
        </div>
      )
    }
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-full text-neutral-600 dark:text-neutral-400 text-sm font-medium">
        <Minus className="h-3 w-3" />
        0.0%
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 sm:p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 sm:mb-6">
        <div className="mb-4 lg:mb-0">
          <div className="flex flex-col">
            <div className="flex justify-between sm:items-center gap-2 sm:gap-3 mb-2">
              {loading ? (
                <div className="h-12 sm:h-16 md:h-20 w-48 sm:w-56 md:w-64 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
              ) : (
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-neutral-900 dark:text-neutral-100">
                  {formatCurrency(grandTotal)}
                </div>
              )}
              {getPriceChangeBadge(overallPriceChange)}
            </div>
            <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 font-medium">
              Total Questline Investment
            </p>
          </div>
        </div>
        
        <div className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1">
                <Package className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                {loading ? (
                  <div className="h-6 sm:h-8 w-8 sm:w-12 bg-neutral-200 dark:bg-neutral-600 rounded animate-pulse"></div>
                ) : (
                  <span className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{totalItems}</span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-500 uppercase font-medium">
                Total Items
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1">
                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 dark:text-red-400" />
                {loading ? (
                  <div className="h-6 sm:h-8 w-8 sm:w-12 bg-neutral-200 dark:bg-neutral-600 rounded animate-pulse"></div>
                ) : (
                  <span className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">{restrictedItems}</span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-500 uppercase font-medium">
                Restricted
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-4">
        {loading ? (
          // Show skeleton cards when loading
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 sm:p-4">
              <div className="text-center">
                <div className="h-6 sm:h-7 w-20 sm:w-24 bg-neutral-200 dark:bg-neutral-600 rounded animate-pulse mb-1 mx-auto"></div>
                <div className="flex flex-col items-center justify-center gap-1 mb-1">
                  <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-600 rounded animate-pulse"></div>
                  <div className="h-3 w-8 bg-neutral-200 dark:bg-neutral-600 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          ))
        ) : (
          Object.entries(categoryTotals).map(([category, total]) => {
            const percentage = grandTotal > 0 ? (total / grandTotal) * 100 : 0
            return (
              <div key={category} className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 sm:p-4">
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                    {formatCurrency(total)}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:gap-2 items-center justify-center gap-1 mb-1">
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium truncate">
                      {category}
                    </p>
                    <span className="text-xs text-neutral-500 dark:text-neutral-500">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
} 