import { NextRequest, NextResponse } from 'next/server'
import { getCustomerSessionUserId, setCustomerSessionCookie } from '@/lib/customer-session'
import { exchangeLineCodeForProfile, verifyLineCustomerConnectState } from '@/lib/line'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const redirectPath = '/api/line/customer-connect/callback'

function appOrigin(req: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? req.nextUrl.origin
}

function lineSettingsUrl(req: NextRequest, status: string) {
  const url = new URL('/customer/app/mypage', appOrigin(req))
  url.searchParams.set('line', status)
  return url
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const customerUserId = verifyLineCustomerConnectState(req.nextUrl.searchParams.get('state'))

  if (!code || !customerUserId) {
    return NextResponse.redirect(lineSettingsUrl(req, 'failed'))
  }

  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const customerSessionUserId = await getCustomerSessionUserId()

    if ((!user || user.id !== customerUserId) && customerSessionUserId !== customerUserId) {
      return NextResponse.redirect(lineSettingsUrl(req, 'login-required'))
    }

    const lookupClient = user?.id === customerUserId ? supabase : createAdminSupabaseClient()
    const { data: currentUser, error: selectError } = await lookupClient
      .from('users')
      .select('id, role')
      .eq('id', customerUserId)
      .maybeSingle()

    if (selectError) throw new Error(selectError.message)
    if (currentUser?.role !== 'trainee') {
      return NextResponse.redirect(lineSettingsUrl(req, 'customer-only'))
    }

    const lineProfile = await exchangeLineCodeForProfile({
      code,
      origin: appOrigin(req),
      redirectPath,
    })

    const adminSupabase = createAdminSupabaseClient()
    const { error: updateError } = await adminSupabase
      .from('users')
      .update({ line_user_id: lineProfile.userId })
      .eq('id', customerUserId)

    if (updateError) throw new Error(updateError.message)

    return setCustomerSessionCookie(
      NextResponse.redirect(lineSettingsUrl(req, 'connected')),
      customerUserId
    )
  } catch (error) {
    console.error('[line customer connect callback]', error)
    return NextResponse.redirect(lineSettingsUrl(req, 'failed'))
  }
}
