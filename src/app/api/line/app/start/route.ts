import { NextRequest, NextResponse } from 'next/server'
import { buildLineAppEntryUrl } from '@/lib/line'

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/

function appOrigin(req: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? req.nextUrl.origin
}

function safeNextPath(value: string | null) {
  if (!value?.startsWith('/customer/app')) return '/customer/app'
  if (value.startsWith('//')) return '/customer/app'
  return value
}

export async function GET(req: NextRequest) {
  const trainerId = req.nextUrl.searchParams.get('trainer_id') ?? ''
  const nextPath = safeNextPath(req.nextUrl.searchParams.get('next'))

  if (!SAFE_ID_PATTERN.test(trainerId)) {
    return NextResponse.redirect(new URL(`/customer/app?entry=missing-trainer`, appOrigin(req)))
  }

  try {
    return NextResponse.redirect(
      buildLineAppEntryUrl({
        origin: appOrigin(req),
        trainerId,
        nextPath,
      })
    )
  } catch (error) {
    console.error('[line app start]', error)
    return NextResponse.redirect(new URL(`/book/${trainerId}?line=setup-required`, appOrigin(req)))
  }
}
