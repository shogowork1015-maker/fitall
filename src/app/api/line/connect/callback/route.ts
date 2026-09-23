import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { setCustomerSessionCookie } from '@/lib/customer-session'
import { exchangeLineCodeForProfile, verifyLineConnectState } from '@/lib/line'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { retrieveStripeCheckoutSession } from '@/lib/stripe'

function appOrigin(req: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? req.nextUrl.origin
}

function successUrl(req: NextRequest, status: string) {
  const url = new URL('/book/success', appOrigin(req))
  url.searchParams.set('line', status)
  return url
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const stripeSessionId = verifyLineConnectState(req.nextUrl.searchParams.get('state'))
  if (!code || !stripeSessionId) {
    return NextResponse.redirect(successUrl(req, 'failed'))
  }

  try {
    const [lineProfile, stripeSession] = await Promise.all([
      exchangeLineCodeForProfile({ code, origin: appOrigin(req) }),
      retrieveStripeCheckoutSession(stripeSessionId),
    ])
    const customerEmail = (
      stripeSession.metadata?.customer_email ??
      stripeSession.customer_email ??
      ''
    )
      .trim()
      .toLowerCase()
    if (stripeSession.payment_status !== 'paid') {
      return NextResponse.redirect(successUrl(req, 'not-paid'))
    }
    if (!customerEmail) {
      return NextResponse.redirect(successUrl(req, 'missing-email'))
    }

    const supabase = createAdminSupabaseClient()
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id')
      .eq('email', customerEmail)
      .maybeSingle()

    if (selectError) throw new Error(selectError.message)

    let customerUserId = existingUser?.id
    if (existingUser) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ line_user_id: lineProfile.userId })
        .eq('id', existingUser.id)
      if (updateError) throw new Error(updateError.message)
    } else {
      customerUserId = randomUUID()
      const { error: insertError } = await supabase.from('users').insert({
        id: customerUserId,
        name: stripeSession.metadata?.customer_name ?? lineProfile.displayName,
        email: customerEmail,
        role: 'trainee',
        line_user_id: lineProfile.userId,
      })
      if (insertError) throw new Error(insertError.message)
    }

    if (!customerUserId) throw new Error('customer user id is missing')

    return setCustomerSessionCookie(
      NextResponse.redirect(successUrl(req, 'connected')),
      customerUserId
    )
  } catch (error) {
    console.error('[line connect callback]', error)
    return NextResponse.redirect(successUrl(req, 'failed'))
  }
}
