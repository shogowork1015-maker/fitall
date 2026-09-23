import { NextRequest, NextResponse } from 'next/server'
import { getCustomerSessionUserId } from '@/lib/customer-session'
import { buildLineCustomerConnectUrl } from '@/lib/line'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { createServerSupabaseClient } from '@/lib/supabase-server'

function appOrigin(req: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? req.nextUrl.origin
}

function lineSettingsUrl(req: NextRequest, status: string) {
  const url = new URL('/customer/app/mypage', appOrigin(req))
  url.searchParams.set('line', status)
  return url
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const customerSessionUserId = await getCustomerSessionUserId()
    const effectiveUserId = customerSessionUserId ?? user?.id

    if (!effectiveUserId) {
      return NextResponse.redirect(lineSettingsUrl(req, 'login-required'))
    }

    const lookupClient = user?.id === effectiveUserId ? supabase : createAdminSupabaseClient()
    const { data: currentUser, error } = await lookupClient
      .from('users')
      .select('id, role')
      .eq('id', effectiveUserId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (currentUser?.role !== 'trainee') {
      return NextResponse.redirect(lineSettingsUrl(req, 'customer-only'))
    }

    return NextResponse.redirect(
      buildLineCustomerConnectUrl({
        origin: appOrigin(req),
        customerUserId: effectiveUserId,
      })
    )
  } catch (error) {
    console.error('[line customer connect start]', error)
    return NextResponse.redirect(lineSettingsUrl(req, 'setup-required'))
  }
}
