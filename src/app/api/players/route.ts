import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const
const ALLOWED_FIELDS = [
  'id',
  'full_name',
  'first_name',
  'last_name',
  'team',
  'position',
  'age',
  'years_exp',
  'status',
  'injury_status',
  'projected_points',
  'projection_source',
] as const

const DEFAULT_LIMIT = 200
const MAX_LIMIT = 500

interface Cursor {
  lastPoints: number | null
  lastId: string
}

interface PlayerRecord {
  id: string
  projected_points?: number | null
  [key: string]: unknown
}

function decodeBase64(str: string): string {
  return Buffer.from(str, 'base64').toString('utf-8')
}

function encodeBase64(str: string): string {
  return Buffer.from(str, 'utf-8').toString('base64')
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams

  const parsedLimit = parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10)
  const limit = Math.min(Math.max(isNaN(parsedLimit) ? DEFAULT_LIMIT : parsedLimit, 1), MAX_LIMIT)

  const position = searchParams.get('position')
  const positionFilter = position && VALID_POSITIONS.includes(position as typeof VALID_POSITIONS[number])
    ? position
    : null

  const search = searchParams.get('search')
  const searchFilter = search?.trim() || null

  const requestedFields = searchParams.get('fields')?.split(',').filter(f => ALLOWED_FIELDS.includes(f as typeof ALLOWED_FIELDS[number]))
  const selectFields = requestedFields?.length ? requestedFields.join(', ') : ALLOWED_FIELDS.join(', ')

  let parsedCursor: Cursor | null = null
  const cursorParam = searchParams.get('cursor')
  if (cursorParam) {
    try {
      parsedCursor = JSON.parse(decodeBase64(cursorParam))
      if (typeof parsedCursor?.lastId !== 'string') {
        return NextResponse.json({ error: 'Invalid cursor format' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid cursor format' }, { status: 400 })
    }
  }

  let query = supabase
    .from('players')
    .select(selectFields, { count: 'exact' })
    .order('projected_points', { ascending: false, nullsFirst: false })
    .order('id', { ascending: true })
    .limit(limit)

  if (positionFilter) {
    query = query.eq('position', positionFilter)
  }

  if (searchFilter) {
    query = query.ilike('full_name', `%${searchFilter}%`)
  }

  if (parsedCursor) {
    const { lastPoints, lastId } = parsedCursor
    
    if (lastPoints !== null) {
      query = query.or(
        `projected_points.lt.${lastPoints},` +
        `and(projected_points.eq.${lastPoints},id.gt.${lastId}),` +
        `projected_points.is.null`
      )
    } else {
      query = query
        .is('projected_points', null)
        .gt('id', lastId)
    }
  }

  const { data: players, error, count } = await query

  if (error) {
    console.error('[PlayersAPI] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 })
  }

  let nextCursor: string | null = null
  
  if (players && players.length === limit && players.length > 0) {
    const lastPlayer = players[players.length - 1] as unknown as PlayerRecord
    const lastId = lastPlayer.id
    const lastPoints = lastPlayer.projected_points ?? null
    
    nextCursor = encodeBase64(JSON.stringify({ lastPoints, lastId }))
  }

  return NextResponse.json({
    players: players ?? [],
    nextCursor,
    total: count ?? 0
  })
}
