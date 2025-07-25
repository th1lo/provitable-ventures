'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { GameMode } from './types/tarkov'

// Import our modular components
import { useTarkovData } from './hooks/useTarkovData'
import { TarkovSummary } from './components/TarkovSummary'
import { QuestTable } from './components/QuestTable'
import { CacheStatusComponent } from './components/CacheStatus'
import { isFleaMarketRestricted } from './utils/tarkov-utils'

export default function TarkovPriceChecker() {
  const [expandedQuests, setExpandedQuests] = useState<Set<string>>(new Set())
  const [gameMode, setGameMode] = useState<GameMode>('pvp')

  const {
    itemPrices,
    loading,
    error,
    lastUpdated,
    itemPriceCache,
    grandTotal,
    overallPriceChange,
    groupItemsByQuest,
    requiredItemsData,
    isInitialLoad,
    cacheStatus
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

  // Data availability helper
  const getDataStatus = () => {
    if (isInitialLoad && !lastUpdated) {
      return { 
        showData: false,
        isUpdating: false
      }
    }
    
    if (!lastUpdated) {
      return { 
        showData: false,
        isUpdating: false
      }
    }

    return {
      showData: true,
      isUpdating: loading
    }
  }

  const dataStatus = getDataStatus()

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-8 md:max-w-5xl">
        
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
              </div>
          </div>

          {/* Cache Status Row */}
          <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <CacheStatusComponent
              cacheStatus={cacheStatus}
              lastUpdated={lastUpdated}
            />
          </div>
        </div>
        
        {/* Summary - Show if we have data */}
        {dataStatus.showData && itemPrices.length > 0 && (
          <TarkovSummary
            grandTotal={grandTotal}
            totalItems={itemPrices.length}
            restrictedItems={itemPrices.filter(item => isFleaMarketRestricted(item)).length}
            overallPriceChange={overallPriceChange}
            loading={loading}
          />
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-300 font-medium">
              Error: {error}
            </p>
          </div>
        )}

        {/* Loading State - Only show when we have no data */}
        {!dataStatus.showData && (
          <div className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-neutral-600 dark:text-neutral-400" />
            <p className="text-neutral-700 dark:text-neutral-300 font-medium mb-2">
              {loading ? 'Loading initial data...' : 'No data available'}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-500">
              {loading ? 'Fetching data from Tarkov.dev API' : 'Unable to load price data'}
            </p>
          </div>
        )}

        {/* Quest Tables - Always show data if available */}
        {dataStatus.showData && itemPrices.length > 0 && (
          <div className="space-y-4 sm:space-y-6">
            
            {/* Quest Tables */}
            <div className="space-y-3 sm:space-y-4">
              {groupItemsByQuest().map(([questName, items]) => (
                <QuestTable
                  key={questName}
                  questName={questName}
                  items={items}
                  isExpanded={expandedQuests.has(questName)}
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
              <span className="font-medium">Real-time pricing</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 