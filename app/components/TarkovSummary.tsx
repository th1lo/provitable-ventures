import React from 'react'
import { Package, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatCurrency } from '../utils/tarkov-utils'

interface TarkovSummaryProps {
  grandTotal: number
  totalItems: number
  restrictedItems: number
  overallPriceChange: number
  loading?: boolean
}

export const TarkovSummary: React.FC<TarkovSummaryProps> = ({
  grandTotal,
  totalItems,
  restrictedItems,
  overallPriceChange,
  loading = false
}) => {
  const getPriceChangeDisplay = (change: number) => {
    if (loading) {
      return (
        <div className="h-4 w-16 bg-neutral-300 dark:bg-neutral-600 rounded animate-pulse"></div>
      )
    }
    
    if (change > 0) {
      return (
        <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium">
          <TrendingUp className="h-3 w-3" />
          +{change.toFixed(1)}%
        </div>
      )
    }
    if (change < 0) {
      return (
        <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm font-medium">
          <TrendingDown className="h-3 w-3" />
          {change.toFixed(1)}%
        </div>
      )
    }
    return (
      <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-500 text-sm font-medium">
        <Minus className="h-3 w-3" />
        0.0%
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 font-medium">
          Total Questline Costs
        </p>
        {loading ? (
          <div className="h-12 sm:h-16 w-48 sm:w-56 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2"></div>
        ) : (
          <div className="flex items-center gap-2 mb-2">
            <div className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-neutral-100">
              {formatCurrency(grandTotal)}
            </div>
            {getPriceChangeDisplay(overallPriceChange)}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          {loading ? (
            <div className="h-8 w-12 bg-neutral-200 dark:bg-neutral-600 rounded animate-pulse"></div>
          ) : (
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalItems}</span>
          )}
          <span className="text-sm text-neutral-500 dark:text-neutral-500 uppercase font-medium">
            Items
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          {loading ? (
            <div className="h-8 w-12 bg-neutral-200 dark:bg-neutral-600 rounded animate-pulse"></div>
          ) : (
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">{restrictedItems}</span>
          )}
          <span className="text-sm text-neutral-500 dark:text-neutral-500 uppercase font-medium">
            Restricted
          </span>
        </div>
      </div>
    </div>
  )
} 