import React, { useState, useEffect } from 'react'
import { Clock, RefreshCw, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import type { CacheStatus } from '../hooks/useTarkovData'

interface CacheStatusProps {
  cacheStatus: CacheStatus
  lastUpdated: Date | null
}

export const CacheStatusComponent: React.FC<CacheStatusProps> = ({
  cacheStatus,
  lastUpdated
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now())

  // Update current time every second for live countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const formatTimeUntilUpdate = (timeMs: number | null): string => {
    if (!timeMs || timeMs <= 0) {
      return 'Updating soon...'
    }

    const seconds = Math.ceil(timeMs / 1000)
    if (seconds < 60) {
      return `${seconds}s`
    }
    
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    
    if (minutes < 60) {
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
    }
    
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }



  const getFreshnessIcon = (freshness: CacheStatus['freshness']) => {
    switch (freshness) {
      case 'fresh':
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'stale':
        return <AlertCircle className="h-3 w-3 text-yellow-500" />
      case 'expired':
        return <XCircle className="h-3 w-3 text-red-500" />
      default:
        return <Clock className="h-3 w-3 text-neutral-500" />
    }
  }

  const getFreshnessColor = (freshness: CacheStatus['freshness']) => {
    switch (freshness) {
      case 'fresh':
        return 'text-green-600 dark:text-green-400'
      case 'stale':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'expired':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-neutral-500'
    }
  }

  // Calculate real-time countdown
  const realTimeCountdown = cacheStatus.nextUpdateTime 
    ? Math.max(0, cacheStatus.nextUpdateTime.getTime() - currentTime)
    : null

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString([], { 
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    })
  }



  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
      {/* Left side - Actual timestamp and freshness */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          {getFreshnessIcon(cacheStatus.freshness)}
          <span className={`font-medium ${getFreshnessColor(cacheStatus.freshness)}`}>
            {cacheStatus.freshness.charAt(0).toUpperCase() + cacheStatus.freshness.slice(1)}
          </span>
        </div>
        
        {lastUpdated && (
          <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
            <Clock className="h-3 w-3" />
            <span>{formatTimestamp(lastUpdated)}</span>
          </div>
        )}
      </div>

      {/* Right side - Next price update time and refresh button */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
            <RefreshCw className="h-3 w-3" />
            <span>
              {realTimeCountdown !== null && realTimeCountdown > 0 && (
                <span className="text-neutral-400">
                  in {formatTimeUntilUpdate(realTimeCountdown)}
                </span>
              )}
            </span>
        </div>
      </div>
    </div>
  )
} 