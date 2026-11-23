'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import type { GameMode } from './types/tarkov'
import { DEFAULT_GAME_MODE, GAME_MODES } from './constants/tarkov-data'

import { useTarkovData } from './hooks/useTarkovData'
import { TarkovSummary } from './components/TarkovSummary'
import { QuestTable } from './components/QuestTable'
import { CacheStatusComponent } from './components/CacheStatus'

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })

export default function TarkovPriceChecker() {
  const [expandedQuests, setExpandedQuests] = useState<Set<string>>(new Set())
  const [gameMode, setGameMode] = useState<GameMode>(DEFAULT_GAME_MODE)

  const { data, loading, error, pricesUpdated, nextUpdateTime } = useTarkovData(gameMode)

  const toggleQuestExpansion = (questId: string) => {
    const newExpanded = new Set(expandedQuests)
    if (newExpanded.has(questId)) {
      newExpanded.delete(questId)
    } else {
      newExpanded.add(questId)
    }
    setExpandedQuests(newExpanded)
  }

  const modeInfo = GAME_MODES.find(mode => mode.id === gameMode)

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-8 md:max-w-5xl">

        {/* Header */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
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

            {/* Game mode */}
            <div className="flex flex-col items-start lg:items-end gap-1">
              <ToggleGroup value={gameMode} onValueChange={(value) => setGameMode(value as GameMode)}>
                {GAME_MODES.map(mode => (
                  <ToggleGroupItem key={mode.id} value={mode.id}>
                    {mode.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {data?.season
                  ? `Season "${data.season.name}" • ends ${formatDate(data.season.end)}`
                  : modeInfo?.description}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <CacheStatusComponent
              pricesUpdated={pricesUpdated}
              nextUpdateTime={nextUpdateTime}
              loading={loading}
            />
          </div>
        </div>

        {/* Summary */}
        {data && (
          <TarkovSummary
            grandTotal={data.grandTotal}
            totalItems={data.totalItems}
            restrictedItems={data.restrictedItems}
            overallPriceChange={data.overallPriceChange}
          />
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-300 font-medium">
              {data ? 'Could not refresh the prices, showing the last ones' : 'Could not load the prices'}: {error}
            </p>
          </div>
        )}

        {/* Loading: only while there is nothing to show yet */}
        {!data && !error && (
          <div className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-neutral-600 dark:text-neutral-400" />
            <p className="text-neutral-700 dark:text-neutral-300 font-medium mb-2">
              Loading {modeInfo?.label} prices...
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-500">
              Fetching data from tarkov.dev
            </p>
          </div>
        )}

        {/* Quests */}
        {data && (
          <div className="space-y-3 sm:space-y-4">
            {data.quests.map(quest => (
              <QuestTable
                key={quest.id}
                quest={quest}
                isExpanded={expandedQuests.has(quest.id)}
                onToggleExpansion={toggleQuestExpansion}
              />
            ))}
            <p className="text-xs text-neutral-500 dark:text-neutral-500 px-1">
              Every item is priced at the cheapest way to get it: flea market, trader, barter, hideout craft, or a
              preset bought for its parts. Barter and craft ingredients are priced at the cheaper of flea market
              and trader. Trader levels, task unlocks and restock limits are shown but not filtered.
            </p>
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
