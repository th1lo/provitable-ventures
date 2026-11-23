import { NextRequest, NextResponse } from 'next/server'
import { parseGameMode } from '../../constants/tarkov-data'
import { getTarkovData } from '../../lib/tarkov-api'

// The item file of one game mode is about 17 MB of JSON, so give the first load some room
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const startTime = performance.now()
  // Old links used "pvp"; parseGameMode maps anything unknown to the regular PvP mode
  const gameMode = parseGameMode(request.nextUrl.searchParams.get('gameMode'))

  try {
    const data = await getTarkovData(gameMode)

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
        'X-Processing-Time': `${(performance.now() - startTime).toFixed(0)}ms`
      }
    })
  } catch (error) {
    console.error(`Quest cost calculation failed for ${gameMode}:`, error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Quest cost calculation failed',
        gameMode,
        timestamp: Date.now()
      },
      {
        status: 502,
        headers: { 'Cache-Control': 'no-store' }
      }
    )
  }
}
