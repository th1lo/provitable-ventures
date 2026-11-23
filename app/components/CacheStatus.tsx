import React, { useState, useEffect } from 'react'
import { Clock, RefreshCw, CheckCircle, AlertCircle, XCircle, Loader2 } from 'lucide-react'

interface CacheStatusProps {
  // When tarkov.dev last changed its prices
  pricesUpdated: Date | null
  // When this page asks for new prices again
  nextUpdateTime: Date | null
  loading: boolean
}

type Freshness = 'fresh' | 'stale' | 'expired'

// tarkov.dev scans the flea market every few minutes; prices older than this are worth a warning
const STALE_AFTER_MS = 20 * 60 * 1000
const EXPIRED_AFTER_MS = 60 * 60 * 1000

const formatCountdown = (timeMs: number): string => {
  const seconds = Math.ceil(timeMs / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
}

const formatTimestamp = (date: Date): string =>
  date.toLocaleTimeString([], {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

const FRESHNESS_STYLE: Record<Freshness, { label: string; color: string; icon: React.ReactNode }> = {
  fresh: {
    label: 'Fresh',
    color: 'text-green-600 dark:text-green-400',
    icon: <CheckCircle className="h-3 w-3 text-green-500" />
  },
  stale: {
    label: 'Stale',
    color: 'text-yellow-600 dark:text-yellow-400',
    icon: <AlertCircle className="h-3 w-3 text-yellow-500" />
  },
  expired: {
    label: 'Outdated',
    color: 'text-red-600 dark:text-red-400',
    icon: <XCircle className="h-3 w-3 text-red-500" />
  }
}

export const CacheStatusComponent: React.FC<CacheStatusProps> = ({ pricesUpdated, nextUpdateTime, loading }) => {
  const [currentTime, setCurrentTime] = useState(() => Date.now())

  // Tick every second for the countdown
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const age = pricesUpdated ? currentTime - pricesUpdated.getTime() : null
  const freshness: Freshness | null =
    age === null ? null : age > EXPIRED_AFTER_MS ? 'expired' : age > STALE_AFTER_MS ? 'stale' : 'fresh'
  const style = freshness ? FRESHNESS_STYLE[freshness] : null

  const countdown = nextUpdateTime ? nextUpdateTime.getTime() - currentTime : null

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
      <div className="flex items-center gap-3">
        {style && (
          <div className="flex items-center gap-1.5">
            {style.icon}
            <span className={`font-medium ${style.color}`}>{style.label}</span>
          </div>
        )}

        {pricesUpdated && (
          <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
            <Clock className="h-3 w-3" />
            <span>Prices from {formatTimestamp(pricesUpdated)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
        {loading ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Loading prices...</span>
          </>
        ) : (
          countdown !== null && (
            <>
              <RefreshCw className="h-3 w-3" />
              <span>{countdown > 0 ? `Next check in ${formatCountdown(countdown)}` : 'Checking soon...'}</span>
            </>
          )
        )}
      </div>
    </div>
  )
}
