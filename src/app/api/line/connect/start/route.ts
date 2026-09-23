import { NextRequest, NextResponse } from 'next/server'
import { buildLineConnectUrl } from '@/lib/line'
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
  const stripeSessionId = req.nextUrl.searchParams.get('session_id')
  if (!stripeSessionId) {
    return NextResponse.redirect(successUrl(req, 'missing-session'))
  }

  try {
    const session = await retrieveStripeCheckoutSession(stripeSessionId)
    if (session.payment_status !== 'paid') {
      return NextResponse.redirect(successUrl(req, 'not-paid'))
    }
    return NextResponse.redirect(
      buildLineConnectUrl({
        origin: appOrigin(req),
        stripeSessionId,
      })
    )
  } catch (error) {
    console.error('[line connect start]', error)
    return NextResponse.redirect(successUrl(req, 'setup-required'))
  }
}
