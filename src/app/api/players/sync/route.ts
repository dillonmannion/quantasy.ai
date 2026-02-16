import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncAllPlayers, shouldSyncPlayers } from '@/lib/sleeper'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const needsSync = await shouldSyncPlayers()

    if (!needsSync) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'Players are up to date',
      })
    }

    const count = await syncAllPlayers()

    return NextResponse.json({
      success: true,
      count,
      message: `Synced ${count} players`,
    })
  } catch (error) {
    console.error('[API] Player sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync players' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const needsSync = await shouldSyncPlayers()

    return NextResponse.json({
      needsSync,
      message: needsSync ? 'Players need syncing' : 'Players are current',
    })
  } catch (error) {
    console.error('[API] Player check error:', error)
    return NextResponse.json(
      { error: 'Failed to check player status' },
      { status: 500 }
    )
  }
}
