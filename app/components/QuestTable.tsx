'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import {
  ChevronDown,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  Hammer,
  ArrowRightLeft,
  Store,
  Coins,
  Package
} from 'lucide-react'
import type { AcquisitionMethod, Quest, QuestItem } from '../types/tarkov'
import { formatCount, formatCurrency, formatDuration } from '../utils/tarkov-utils'
import { ItemTable, type TableItem } from './shared'

interface QuestTableProps {
  quest: Quest
  isExpanded: boolean
  onToggleExpansion: (questId: string) => void
}

const getPriceChangeBadge = (change: number | undefined) => {
  if (change === undefined || change === null || !Number.isFinite(change)) {
    return null
  }

  if (change > 0.05) {
    return (
      <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium">
        <TrendingUp className="h-3 w-3" />
        +{change.toFixed(1)}%
      </div>
    )
  }
  if (change < -0.05) {
    return (
      <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-medium">
        <TrendingDown className="h-3 w-3" />
        {change.toFixed(1)}%
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-500 text-xs font-medium">
      <Minus className="h-3 w-3" />
      0.0%
    </div>
  )
}

// A row that opens on click. Not a <button>, because it holds wiki links.
const RowToggle = ({
  expanded,
  onToggle,
  className,
  children
}: {
  expanded: boolean
  onToggle: () => void
  className: string
  children: React.ReactNode
}) => (
  <div
    role="button"
    tabIndex={0}
    aria-expanded={expanded}
    className={className}
    onClick={onToggle}
    onKeyDown={(e) => {
      if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        onToggle()
      }
    }}
  >
    {children}
  </div>
)

const METHOD_TYPE_LABEL: Record<AcquisitionMethod['type'], string> = {
  flea: 'Flea market',
  trader: 'Trader, for money',
  barter: 'Barter',
  craft: 'Hideout craft',
  bundle: 'Buy the set, sell the rest'
}

// Short text for the item row: where the best price comes from
const methodSource = (method: AcquisitionMethod) => {
  if (method.type === 'bundle' && method.bundle) {
    // A pack holds nothing but the item itself; a preset comes with parts to sell
    return method.bundle.parts.length === 0
      ? `Pack of ${formatCount(method.bundle.countInBundle)} from ${method.label}`
      : `${method.bundle.shortName} from ${method.label}`
  }
  if (method.type === 'craft') return `Craft: ${method.label}`
  if (method.type === 'barter') return `Barter: ${method.label}`
  return method.label
}

const MethodIcon = ({ method }: { method: AcquisitionMethod }) => {
  const corner =
    method.type === 'craft' ? (
      <Hammer className="h-3 w-3 text-blue-500" />
    ) : method.type === 'barter' ? (
      <ArrowRightLeft className="h-3 w-3 text-green-500" />
    ) : method.type === 'bundle' ? (
      <Package className="h-3 w-3 text-orange-500" />
    ) : method.type === 'trader' ? (
      <Coins className="h-3 w-3 text-yellow-500" />
    ) : null

  return (
    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-neutral-200 dark:bg-neutral-600 flex items-center justify-center flex-shrink-0 relative">
      {method.imageLink ? (
        <Image
          src={method.imageLink}
          alt={method.label}
          width={48}
          height={48}
          className="w-full h-full rounded object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
          }}
          unoptimized={true}
        />
      ) : (
        <Store className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
      )}
      {corner && (
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-neutral-800 dark:bg-neutral-700 rounded-full flex items-center justify-center border-2 border-white dark:border-neutral-800">
          {corner}
        </div>
      )}
    </div>
  )
}

// The facts under a method's name: limits, time, what a trade gives
const methodFacts = (method: AcquisitionMethod): string[] => {
  const isPack = method.type === 'bundle' && method.bundle?.parts.length === 0
  const facts: string[] = [isPack ? 'Unpack it' : METHOD_TYPE_LABEL[method.type]]
  if (method.currencyPrice) {
    facts.push(formatCurrency(method.currencyPrice.amount, method.currencyPrice.currency === 'EUR' ? 'EUR' : 'USD'))
  }
  if (method.outputCount > 1) {
    facts.push(`${formatCount(method.outputCount)} per ${method.type === 'craft' ? 'craft' : isPack ? 'pack' : 'trade'}`)
  }
  if (method.duration) facts.push(formatDuration(method.duration))
  if (method.buyLimit) facts.push(`limit ${formatCount(method.buyLimit)} per restock`)
  return facts
}

const MethodDetails = ({ method }: { method: AcquisitionMethod }) => {
  const bundle = method.bundle

  const requiredRows: TableItem[] = method.requiredItems.map(line => ({
    id: line.id,
    image: line.iconLink,
    name: line.name,
    shortName: line.shortName,
    count: line.count,
    unitPrice: line.unitPrice,
    totalPrice: line.totalPrice,
    changeLast48hPercent: line.priceSource === 'flea' ? line.changeLast48hPercent : undefined,
    wikiLink: line.wikiLink,
    sourceLabel: line.priceLabel,
    uncertain: line.priceSource === 'estimate' || line.priceSource === 'unknown'
  }))

  const partRows: TableItem[] = (bundle?.parts ?? [])
    .slice()
    .sort((a, b) => b.totalValue - a.totalValue)
    .map(part => ({
      id: part.id,
      image: part.iconLink,
      name: part.name,
      shortName: part.shortName,
      count: part.count,
      unitPrice: part.unitValue,
      totalPrice: part.totalValue,
      changeLast48hPercent: part.changeLast48hPercent,
      wikiLink: part.wikiLink,
      sourceLabel: part.sellTo === 'none' ? part.sellToLabel : `Sell: ${part.sellToLabel}`
    }))

  return (
    <div className="mt-3 space-y-3">
      {method.taskUnlock && (
        <div className="p-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded">
          <div className="text-xs text-amber-800 dark:text-amber-200 font-medium">
            Unlocked by the task:{' '}
            {method.taskUnlock.wikiLink ? (
              <a href={method.taskUnlock.wikiLink} target="_blank" rel="noopener noreferrer" className="underline">
                {method.taskUnlock.name}
              </a>
            ) : (
              method.taskUnlock.name
            )}
          </div>
        </div>
      )}

      {method.approximate && (
        <div className="p-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded">
          <div className="text-xs text-amber-800 dark:text-amber-200 font-medium">
            Rough price: {method.unknownItems.join(', ')} cannot be bought anywhere. It is counted at what a trader
            pays for it, so the real cost is higher.
          </div>
        </div>
      )}

      {requiredRows.length > 0 && (
        <ItemTable items={requiredRows} title={method.type === 'craft' ? 'Used up by the craft' : 'You hand over'} />
      )}

      {method.tools.length > 0 && (
        <div className="text-xs text-neutral-600 dark:text-neutral-400 px-1">
          Tools you need but keep: {method.tools.map(tool => tool.name).join(', ')}
        </div>
      )}

      {bundle && (
        <>
          {partRows.length > 0 && (
            <ItemTable
              items={partRows}
              title="Parts you sell again"
              priceHeader="Value"
              totalHeader="Total"
            />
          )}
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded p-3 text-xs sm:text-sm space-y-1">
            <div className="flex justify-between text-neutral-700 dark:text-neutral-300">
              <span>{bundle.name}</span>
              <span>{formatCurrency(bundle.grossCost)}</span>
            </div>
            {bundle.fleaResale > 0 && (
              <div className="flex justify-between text-neutral-700 dark:text-neutral-300">
                <span>Parts sold on the flea market, after fees</span>
                <span>- {formatCurrency(bundle.fleaResale)}</span>
              </div>
            )}
            {bundle.traderResale > 0 && (
              <div className="flex justify-between text-neutral-700 dark:text-neutral-300">
                <span>Parts sold to traders</span>
                <span>- {formatCurrency(bundle.traderResale)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-neutral-900 dark:text-neutral-100 pt-1 border-t border-neutral-200 dark:border-neutral-700">
              <span>
                Cost per item
                {bundle.countInBundle > 1 ? ` (${formatCount(bundle.countInBundle)} in one set)` : ''}
              </span>
              <span>{formatCurrency(method.unitCost)}</span>
            </div>
          </div>
        </>
      )}

      {!bundle && method.outputCount > 1 && (
        <div className="text-xs text-neutral-600 dark:text-neutral-400 px-1">
          {formatCurrency(method.batchCost)} for {formatCount(method.outputCount)} = {formatCurrency(method.unitCost)}{' '}
          each
        </div>
      )}
    </div>
  )
}

const MethodRow = ({ method, isBest }: { method: AcquisitionMethod; isBest: boolean }) => {
  const [isOpen, setIsOpen] = useState(false)
  const hasDetails =
    method.requiredItems.length > 0 ||
    method.tools.length > 0 ||
    !!method.bundle ||
    !!method.taskUnlock ||
    method.approximate

  const title = method.bundle ? method.bundle.name : method.label
  const facts = methodFacts(method)
  if (method.bundle) facts.unshift(method.label)

  const header = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-neutral-600 dark:text-neutral-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          } ${hasDetails ? '' : 'invisible'}`}
        />
        <MethodIcon method={method} />
        <div className="text-left min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm sm:text-base">{title}</span>
            {isBest && (
              <span className="rounded bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 px-1.5 py-0.5 text-[11px] font-semibold">
                Cheapest
              </span>
            )}
            {method.taskUnlock && (
              <span className="rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 text-[11px] font-semibold">
                Task unlock
              </span>
            )}
            {method.approximate && (
              <span className="rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 text-[11px] font-semibold">
                Rough price
              </span>
            )}
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{facts.join(' • ')}</div>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-bold text-neutral-900 dark:text-neutral-100 text-sm sm:text-lg">
          {method.approximate ? '~ ' : ''}
          {formatCurrency(method.unitCost)}
        </div>
        <div className="flex justify-end">{getPriceChangeBadge(method.changeLast48hPercent)}</div>
      </div>
    </div>
  )

  const frame =
    'w-full p-3 sm:p-4 bg-neutral-50 dark:bg-neutral-800/70 rounded-lg border border-neutral-200 dark:border-neutral-700'

  if (!hasDetails) {
    return <div className={frame}>{header}</div>
  }

  return (
    <div className={frame}>
      <button
        type="button"
        className="w-full text-left cursor-pointer"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(open => !open)}
      >
        {header}
      </button>
      {isOpen && <MethodDetails method={method} />}
    </div>
  )
}

const QuestItemRow = ({ item }: { item: QuestItem }) => {
  const [isOpen, setIsOpen] = useState(false)
  const best = item.methods[0]

  return (
    <div className="border-b last:border-b-0 border-neutral-200 dark:border-neutral-700">
      <RowToggle
        expanded={isOpen}
        onToggle={() => setIsOpen(open => !open)}
        className="w-full text-left px-4 sm:px-6 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <ChevronDown
            className={`h-4 w-4 flex-shrink-0 text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
          <div className="w-9 h-9 sm:w-11 sm:h-11 flex-shrink-0">
            {item.iconLink && (
              <Image
                src={item.iconLink}
                alt={item.name}
                width={44}
                height={44}
                className="object-contain w-full h-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
                unoptimized={true}
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span
                className="font-medium text-neutral-900 dark:text-neutral-100 text-sm sm:text-base truncate"
                title={item.name}
              >
                {formatCount(item.quantity)} x {item.shortName}
              </span>
              {item.wikiLink && (
                <a
                  href={item.wikiLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors flex-shrink-0"
                  title="View on Wiki"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {item.fleaBanned && (
                <span className="rounded bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 px-1.5 py-0.5 text-[11px] font-semibold">
                  No flea
                </span>
              )}
              {item.foundInRaid && (
                <span className="rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 text-[11px] font-semibold">
                  Found in raid
                </span>
              )}
            </div>
            <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 truncate">
              {best ? (
                <>
                  {best.approximate ? '~ ' : ''}
                  {formatCurrency(item.unitCost)} each • {methodSource(best)}
                  {item.methods.length > 1 ? ` • ${item.methods.length} ways to get it` : ''}
                </>
              ) : (
                'No price found: not on the flea market, no trader, barter or craft'
              )}
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <div className="text-sm sm:text-lg font-bold text-neutral-900 dark:text-neutral-100">
              {best?.approximate ? '~ ' : ''}
              {formatCurrency(item.totalCost)}
            </div>
            <div className="flex justify-end">{getPriceChangeBadge(item.changeLast48hPercent)}</div>
          </div>
        </div>
      </RowToggle>

      {isOpen && (
        <div className="px-4 sm:px-6 pb-4 space-y-2">
          {item.note && (
            <div className="text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded p-2">
              {item.note}
            </div>
          )}
          {item.methods.length === 0 && (
            <div className="text-sm text-neutral-500">This item has to be found in raid.</div>
          )}
          {item.methods.map((method, index) => (
            <MethodRow key={method.id} method={method} isBest={index === 0 && item.methods.length > 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export const QuestTable: React.FC<QuestTableProps> = ({ quest, isExpanded, onToggleExpansion }) => {
  const restrictedCount = quest.items.filter(item => item.fleaBanned).length

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
      <RowToggle
        expanded={isExpanded}
        onToggle={() => onToggleExpansion(quest.id)}
        className="w-full bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left cursor-pointer"
      >
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <ChevronDown
                className={`h-4 w-4 sm:h-5 sm:w-5 text-neutral-600 dark:text-neutral-400 transition-transform ${
                  isExpanded ? 'rotate-180' : ''
                } mt-0.5 flex-shrink-0`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 sm:gap-2 mb-1">
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-neutral-900 dark:text-neutral-100 truncate">
                    {quest.name}
                  </h3>
                  {quest.wikiLink && (
                    <a
                      href={quest.wikiLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                      title="View quest on Wiki"
                    >
                      <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                    </a>
                  )}
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  {quest.items.length} {quest.items.length === 1 ? 'item' : 'items'}
                  {restrictedCount > 0 ? ` • ${restrictedCount} not on the flea market` : ''}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {formatCurrency(quest.totalCost)}
              </div>
              <div className="flex justify-end mt-1">{getPriceChangeBadge(quest.changeLast48hPercent)}</div>
            </div>
          </div>
        </div>
      </RowToggle>

      {isExpanded && (
        <div className="border-t border-neutral-200 dark:border-neutral-700">
          {quest.otherObjectives.length > 0 && (
            <div className="px-4 sm:px-6 py-3 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-700">
              <span className="font-medium text-neutral-800 dark:text-neutral-200">Also needed: </span>
              {quest.otherObjectives.join(' • ')}
            </div>
          )}
          {quest.items.map(item => (
            <QuestItemRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
