'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, Settings } from 'lucide-react'

// Import our modular components
import { useTarkovData } from './hooks/useTarkovData'
import { TarkovSummary } from './components/TarkovSummary'
import { QuestTable } from './components/QuestTable'
import { isFleaMarketRestricted } from './utils/tarkov-utils'

export default function TarkovPriceChecker() {
  const [expandedQuests, setExpandedQuests] = useState<Set<string>>(new Set())
  const [bitcoinFarmLevel, setBitcoinFarmLevel] = useState(1)

  const {
    itemPrices,
    loading,
    error,
    lastUpdated,
    itemPriceCache,
    grandTotal,
    categoryTotals,
    fetchPrices,
    groupItemsByQuest
  } = useTarkovData()

  const toggleQuestExpansion = (questName: string) => {
    const newExpanded = new Set(expandedQuests)
    if (newExpanded.has(questName)) {
      newExpanded.delete(questName)
    } else {
      newExpanded.add(questName)
    }
    setExpandedQuests(newExpanded)
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="container mx-auto p-6 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100">
            Tarkov Price Checker
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            Real-time pricing for Skier&apos;s Profitable Ventures questline
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              onClick={fetchPrices} 
              disabled={loading}
              className="bg-neutral-900 hover:bg-neutral-800 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </>
              )}
            </Button>
            
            <div className="flex items-center gap-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2">
              <Settings className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Bitcoin Farm Level:
              </label>
              <select 
                value={bitcoinFarmLevel} 
                onChange={(e) => setBitcoinFarmLevel(Number(e.target.value))}
                className="bg-transparent border-none text-sm font-medium text-neutral-900 dark:text-neutral-100 focus:outline-none"
              >
                <option value={1}>Level 1</option>
                <option value={2}>Level 2</option>
                <option value={3}>Level 3</option>
              </select>
            </div>
          </div>
          
          {lastUpdated && (
            <p className="text-sm text-neutral-500 dark:text-neutral-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        {/* Summary */}
        <TarkovSummary
          grandTotal={grandTotal}
          categoryTotals={categoryTotals}
          totalItems={itemPrices.length}
          restrictedItems={itemPrices.filter(item => isFleaMarketRestricted(item)).length}
        />

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-300 font-medium">
              Error: {error}
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-neutral-600 dark:text-neutral-400" />
            <p className="text-neutral-700 dark:text-neutral-300 font-medium mb-2">
              Loading price data...
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-500">
              Fetching data from Tarkov.dev API
            </p>
          </div>
        )}

        {/* Quest Tables */}
        {!loading && (
          <div className="space-y-6">
            {/* Header */}
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Quest Breakdown
            </h2>
            
            {/* Quest Tables */}
            <div className="space-y-4">
              {groupItemsByQuest().map(([questName, items]) => (
                <QuestTable
                  key={questName}
                  questName={questName}
                  items={items}
                  isExpanded={expandedQuests.has(questName)}
                  bitcoinFarmLevel={bitcoinFarmLevel}
                  itemPriceCache={itemPriceCache}
                  onToggleExpansion={toggleQuestExpansion}
                />
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 text-center">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 text-sm">
            <div className="text-neutral-600 dark:text-neutral-400">
              <span className="font-medium">Data provided by:</span>{' '}
              <a 
                href="https://tarkov.dev" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Tarkov.dev
              </a>
            </div>
            <div className="hidden sm:block text-neutral-400">•</div>
            <div className="text-neutral-600 dark:text-neutral-400">
              <span className="font-medium">Real-time pricing</span> • 
              <span className="font-medium"> Trader reset tracking</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 