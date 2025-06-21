import React from 'react'
import { Package, AlertTriangle, TrendingUp } from 'lucide-react'
import { formatCurrency } from '../utils/tarkov-utils'

interface TarkovSummaryProps {
  grandTotal: number
  categoryTotals: Record<string, number>
  totalItems: number
  restrictedItems: number
}

export const TarkovSummary: React.FC<TarkovSummaryProps> = ({
  grandTotal,
  categoryTotals,
  totalItems,
  restrictedItems
}) => {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div className="mb-4 lg:mb-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-4xl md:text-5xl font-bold text-neutral-900 dark:text-neutral-100">
              {formatCurrency(grandTotal)}
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 font-medium">
            Total Questline Investment
          </p>
        </div>
        
        <div className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalItems}</span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-500 uppercase font-medium">
                Total Items
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">{restrictedItems}</span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-500 uppercase font-medium">
                Restricted
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Object.entries(categoryTotals).map(([category, total]) => (
          <div key={category} className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
            <div className="text-center">
              <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                {formatCurrency(total)}
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                {category}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 