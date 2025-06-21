import React from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, Settings, Crosshair, Shield, Target } from 'lucide-react'

interface TarkovHeaderProps {
  loading: boolean
  lastUpdated: Date | null
  bitcoinFarmLevel: number
  onRefresh: () => void
  onBitcoinFarmLevelChange: (level: number) => void
}

export const TarkovHeader: React.FC<TarkovHeaderProps> = ({
  loading,
  lastUpdated,
  bitcoinFarmLevel,
  onRefresh,
  onBitcoinFarmLevelChange
}) => {
  return (
    <div className="relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-orange-600/20 via-transparent to-red-600/20"></div>
        <div className="absolute top-4 left-4 text-6xl opacity-10">⚠</div>
        <div className="absolute top-8 right-8 text-4xl opacity-10">🎯</div>
        <div className="absolute bottom-4 left-1/4 text-5xl opacity-10">💀</div>
      </div>

      {/* Tarkov Header Diagonal Stripes */}
      <div 
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(45deg, rgba(255, 120, 0, 0.1) 25%, transparent 25%, transparent 50%, rgba(255, 120, 0, 0.1) 50%, rgba(255, 120, 0, 0.1) 75%, transparent 75%, transparent 100%)`,
          backgroundSize: '32px 32px'
        }}
      ></div>

      {/* Main Header Content */}
      <div className="relative text-center py-8 md:py-12">
        {/* Title Section */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="h-6 w-6 md:h-8 md:w-8 text-orange-500" />
            <h1 
              className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-400 to-orange-500 tracking-wider uppercase"
              style={{ 
                textShadow: '0 0 30px rgba(249, 115, 22, 0.8), 0 0 60px rgba(220, 38, 38, 0.4)',
                fontFamily: 'Impact, "Arial Black", sans-serif'
              }}
            >
              ALL ON RED
            </h1>
            <Target className="h-6 w-6 md:h-8 md:w-8 text-red-500" />
          </div>
          
          {/* Tactical Line */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-orange-500"></div>
            <Crosshair className="h-4 w-4 text-orange-400" />
            <div className="h-px w-32 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500"></div>
            <Crosshair className="h-4 w-4 text-orange-400" />
            <div className="h-px w-16 bg-gradient-to-r from-orange-500 to-transparent"></div>
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-orange-300 mb-2 uppercase tracking-wider">
            SKIER TASKLINE COSTS
          </h2>
          <p className="text-base md:text-lg text-gray-300 mb-6 font-semibold">
            <span className="text-red-400">REAL-TIME</span> PRICING FOR{' '}
            <span className="text-orange-400">PROFITABLE VENTURES</span> QUESTLINE
          </p>
        </div>

        {/* Control Panel */}
        <div className="bg-black/60 border-2 border-orange-600/40 rounded-lg p-4 max-w-2xl mx-auto backdrop-blur-sm relative overflow-hidden">
          {/* Control Panel Diagonal Stripes */}
          <div 
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage: `linear-gradient(45deg, rgba(255, 120, 0, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 120, 0, 0.15) 50%, rgba(255, 120, 0, 0.15) 75%, transparent 75%, transparent 100%)`,
              backgroundSize: '14px 14px'
            }}
          ></div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Refresh Button */}
            <Button 
              onClick={onRefresh} 
              disabled={loading}
              size="lg"
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 border-2 border-orange-400/50 text-white font-bold uppercase tracking-wider shadow-lg hover:shadow-orange-500/25 transition-all duration-300 w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  UPDATING...
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5 mr-2" />
                  REFRESH DATA
                </>
              )}
            </Button>
            
            {/* Bitcoin Farm Level Selector */}
            <div className="flex items-center gap-3 bg-gray-900/80 border-2 border-orange-500/30 rounded-lg px-4 py-3 w-full sm:w-auto">
              <Settings className="h-5 w-5 text-orange-400" />
              <label className="text-orange-300 font-bold uppercase tracking-wide text-sm">
                BITCOIN FARM:
              </label>
              <select 
                value={bitcoinFarmLevel}
                onChange={(e) => onBitcoinFarmLevelChange(Number(e.target.value))}
                className="bg-black border-2 border-orange-500/50 rounded px-3 py-1 text-orange-200 font-bold text-sm focus:border-orange-400 focus:outline-none transition-colors"
              >
                {[1,2,3].map(level => (
                  <option key={level} value={level} className="bg-black">
                    LEVEL {level}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Last Updated */}
          {lastUpdated && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-400 font-mono">
                <span className="text-orange-400">LAST UPDATE:</span>{' '}
                {lastUpdated.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 