import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const DEV_TEST_EMAIL = 'admin.skip@qai.com'

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 })
  }

  const { email } = await request.json()

  if (email !== DEV_TEST_EMAIL) {
    return NextResponse.json({ error: 'Invalid test email' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
  const userExists = existingUsers?.users?.some(u => u.email === email)

  if (!userExists) {
    const { error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
    })
    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }
  }

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (linkError || !linkData?.properties?.hashed_token) {
    return NextResponse.json({ error: linkError?.message || 'Failed to generate link' }, { status: 500 })
  }

  const verifyUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify?token=${linkData.properties.hashed_token}&type=magiclink&redirect_to=${encodeURIComponent(`${request.headers.get('origin')}/auth/callback`)}`

  return NextResponse.json({ redirectUrl: verifyUrl })
}
