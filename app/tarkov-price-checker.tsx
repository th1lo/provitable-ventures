'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/button'
import { Loader2, RefreshCw, Settings } from 'lucide-react'
import { GameMode } from './types/tarkov'

// Import our modular components
import { useTarkovData } from './hooks/useTarkovData'
import { TarkovSummary } from './components/TarkovSummary'
import { QuestTable } from './components/QuestTable'
import { isFleaMarketRestricted } from './utils/tarkov-utils'

export default function TarkovPriceChecker() {
  const [expandedQuests, setExpandedQuests] = useState<Set<string>>(new Set())
  const [bitcoinFarmLevel, setBitcoinFarmLevel] = useState(1)
  const [gameMode, setGameMode] = useState<GameMode>('pvp')

  const {
    itemPrices,
    loading,
    error,
    lastUpdated,
    itemPriceCache,
    requiredItemsData,
    grandTotal,
    categoryTotals,
    fetchPrices,
    groupItemsByQuest
  } = useTarkovData(gameMode)

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
      <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-8">
        
        {/* Header */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Left side - Logo and Title */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0">
                <Image 
                  src="/logo.png" 
                  alt="All On Red Logo"
                  width={64}
                  height={64}
                  className="object-contain w-full h-full"
                />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                  All On Red
                </h1>
                <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400">
                  Real-Time Questline Costs
                </p>
              </div>
            </div>

            {/* Right side - Controls */}
            <div className="flex items-stretch sm:items-center gap-3 sm:gap-4">
              {/* Game Mode Toggle */}
              <div className="flex items-center gap-3">
                <ToggleGroup value={gameMode} onValueChange={(value) => setGameMode(value as GameMode)}>
                  <ToggleGroupItem value="pvp">
                    PvP
                  </ToggleGroupItem>
                  <ToggleGroupItem value="pve">
                    PvE
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              
              {/* Refresh Button */}
              <Button 
                onClick={fetchPrices} 
                disabled={loading}
                className="bg-neutral-900 hover:bg-neutral-800 text-white w-full sm:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">Loading...</span>
                    <span className="sm:hidden">Loading</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Refresh</span>
                    <span className="sm:hidden">Refresh</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Status Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-3">
              <Settings className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Bitcoin Farm Level:
              </label>
              <select 
                value={bitcoinFarmLevel} 
                onChange={(e) => setBitcoinFarmLevel(Number(e.target.value))}
                className="bg-transparent border border-neutral-300 dark:border-neutral-600 rounded px-2 py-1 text-sm font-medium text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
              >
                <option value={1}>Level 1</option>
                <option value={2}>Level 2</option>
                <option value={3}>Level 3</option>
              </select>
            </div>
            
            {lastUpdated && (
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-500">
                Last updated: {lastUpdated.toLocaleTimeString()} • {gameMode.toUpperCase()} Mode
              </p>
            )}
          </div>
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
          <div className="space-y-4 sm:space-y-6">
            {/* Header */}
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 px-1">
              Quest Breakdown
            </h2>
            
            {/* Quest Tables */}
            <div className="space-y-3 sm:space-y-4">
              {groupItemsByQuest().map(([questName, items]) => (
                <QuestTable
                  key={questName}
                  questName={questName}
                  items={items}
                  isExpanded={expandedQuests.has(questName)}
                  bitcoinFarmLevel={bitcoinFarmLevel}
                  itemPriceCache={itemPriceCache}
                  gameMode={gameMode}
                  onToggleExpansion={toggleQuestExpansion}
                  allItemPrices={itemPrices}
                  requiredItemsData={requiredItemsData}
                />
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 sm:p-4 text-center">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-1 sm:gap-2 text-xs sm:text-sm">
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
              <span className="font-medium">Trader reset tracking</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 