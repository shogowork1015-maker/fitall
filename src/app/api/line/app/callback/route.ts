import { NextRequest, NextResponse } from 'next/server'
import { setCustomerSessionCookie } from '@/lib/customer-session'
import { exchangeLineCodeForProfile, verifyLineAppEntryState } from '@/lib/line'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

const redirectPath = '/api/line/app/callback'

function appOrigin(req: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? req.nextUrl.origin
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const entry = verifyLineAppEntryState(req.nextUrl.searchParams.get('state'))

  if (!code || !entry) {
    return NextResponse.redirect(new URL('/customer/app?entry=failed', appOrigin(req)))
  }

  try {
    const lineProfile = await exchangeLineCodeForProfile({
      code,
      origin: appOrigin(req),
      redirectPath,
    })

    const supabase = createAdminSupabaseClient()
    const { data: customerUser, error } = await supabase
      .from('users')
      .select('id, role')
      .eq('line_user_id', lineProfile.userId)
      .maybeSingle()

    if (error) throw new Error(error.message)

    if (customerUser?.id && customerUser.role === 'trainee') {
      return setCustomerSessionCookie(
        NextResponse.redirect(new URL(entry.nextPath, appOrigin(req))),
        customerUser.id
      )
    }

    return NextResponse.redirect(new URL(`/book/${entry.trainerId}?line=first-time`, appOrigin(req)))
  } catch (error) {
    console.error('[line app callback]', error)
    return NextResponse.redirect(new URL(`/book/${entry.trainerId}?line=failed`, appOrigin(req)))
  }
}
