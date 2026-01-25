import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { saveProjections } from '@/lib/projections'
import type { PlayerProjection } from '@/lib/projections/types'

interface CSVRow {
  player_id?: string
  full_name?: string
  position?: string
  projected_points?: string
}

interface ValidationWarning {
  row: number
  reason: string
}

interface UploadResponse {
  success: boolean
  count: number
  warnings: ValidationWarning[]
  error?: string
}

const ACCEPTED_MIME_TYPES = [
  'text/csv',
  'text/plain',
  'application/csv',
  'application/vnd.ms-excel',
]

/**
 * Parse CSV content into rows
 * Simple implementation: split by newlines, parse headers, map to objects
 */
function parseCSV(content: string): CSVRow[] {
  const lines = content.trim().split('\n')
  if (lines.length < 2) {
    return []
  }

  const headerLine = lines[0]
  const headers = headerLine.split(',').map((h) => h.trim().toLowerCase())

  const rows: CSVRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = line.split(',').map((v) => v.trim())
    const row: CSVRow = {}

    headers.forEach((header, index) => {
      if (values[index] !== undefined) {
        row[header as keyof CSVRow] = values[index]
      }
    })

    rows.push(row)
  }

  return rows
}

/**
 * Validate a single CSV row
 */
function validateRow(
  row: CSVRow,
  rowNumber: number
): { valid: boolean; warning?: ValidationWarning; projection?: PlayerProjection } {
  // Check required fields
  if (!row.player_id) {
    return {
      valid: false,
      warning: {
        row: rowNumber,
        reason: 'missing player_id',
      },
    }
  }

  if (!row.projected_points) {
    return {
      valid: false,
      warning: {
        row: rowNumber,
        reason: 'missing projected_points',
      },
    }
  }

  // Validate player_id is numeric
  if (!/^\d+$/.test(row.player_id)) {
    return {
      valid: false,
      warning: {
        row: rowNumber,
        reason: `invalid player_id format: ${row.player_id}`,
      },
    }
  }

  // Validate projected_points is numeric
  const projectedPoints = parseFloat(row.projected_points)
  if (isNaN(projectedPoints)) {
    return {
      valid: false,
      warning: {
        row: rowNumber,
        reason: `invalid projected_points: ${row.projected_points}`,
      },
    }
  }

  // Build projection object
  const projection: PlayerProjection = {
    playerId: row.player_id,
    fullName: row.full_name || '',
    position: row.position || '',
    projectedPoints,
    source: 'manual_csv',
    updatedAt: new Date().toISOString(),
  }

  return {
    valid: true,
    projection,
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          count: 0,
          warnings: [],
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }

    // 2. Parse multipart/form-data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          count: 0,
          warnings: [],
          error: 'No file provided',
        },
        { status: 400 }
      )
    }

    // 3. Validate file (MIME type + extension)
    const fileName = file.name.toLowerCase()
    const isValidExtension = fileName.endsWith('.csv')
    const isValidMimeType = ACCEPTED_MIME_TYPES.includes(file.type)

    if (!isValidExtension && !isValidMimeType) {
      return NextResponse.json(
        {
          success: false,
          count: 0,
          warnings: [],
          error: `Invalid file type. Expected CSV file, got ${file.type || 'unknown'}`,
        },
        { status: 400 }
      )
    }

    // 4. Parse CSV (simple split, no library)
    const content = await file.text()
    const csvRows = parseCSV(content)

    if (csvRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          count: 0,
          warnings: [],
          error: 'CSV file is empty or invalid',
        },
        { status: 400 }
      )
    }

    // 5. Validate rows (player_id, projected_points)
    const warnings: ValidationWarning[] = []
    const validProjections: PlayerProjection[] = []

    csvRows.forEach((row, index) => {
      const rowNumber = index + 2 // +2 because row 1 is header, 0-indexed
      const validation = validateRow(row, rowNumber)

      if (!validation.valid && validation.warning) {
        warnings.push(validation.warning)
      } else if (validation.projection) {
        validProjections.push(validation.projection)
      }
    })

    // If no valid projections, return early
    if (validProjections.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        warnings,
      })
    }

    // 6. Call saveProjections()
    const result = await saveProjections(validProjections)

    // 7. Return success count + warnings
    return NextResponse.json({
      success: true,
      count: result.success,
      warnings,
    })
  } catch (error) {
    console.error('[API] Projection upload error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        success: false,
        count: 0,
        warnings: [],
        error: `Failed to upload projections: ${errorMessage}`,
      },
      { status: 500 }
    )
  }
}
