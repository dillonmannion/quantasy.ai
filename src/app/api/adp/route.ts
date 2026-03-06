import { NextRequest, NextResponse } from 'next/server'
import { fetchADP } from '@/lib/adp/ffc-client'

const VALID_FORMATS = ['ppr', 'half-ppr', 'standard'] as const
type Format = (typeof VALID_FORMATS)[number]

/**
 * Public ADP proxy — server-side fetch to FantasyFootballCalculator
 * bypasses browser CORS restrictions. Used by sandbox (public route).
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const format = searchParams.get('format') as Format | null
  if (!format || !VALID_FORMATS.includes(format)) {
    return NextResponse.json(
      { error: `Invalid format. Must be one of: ${VALID_FORMATS.join(', ')}` },
      { status: 400 }
    )
  }

  const teamsParam = searchParams.get('teams')
  const teams = teamsParam ? parseInt(teamsParam, 10) : NaN
  if (isNaN(teams) || teams < 4 || teams > 32) {
    return NextResponse.json(
      { error: 'Invalid teams. Must be a number between 4 and 32.' },
      { status: 400 }
    )
  }

  const yearParam = searchParams.get('year')
  const year = yearParam ? parseInt(yearParam, 10) : NaN
  if (isNaN(year) || year < 2020 || year > 2030) {
    return NextResponse.json(
      { error: 'Invalid year. Must be a number between 2020 and 2030.' },
      { status: 400 }
    )
  }

  try {
    const adpMap = await fetchADP(format, teams, year)
    return NextResponse.json({ adp: adpMap })
  } catch (error) {
    console.error('[ADP API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ADP data' },
      { status: 502 }
    )
  }
}
