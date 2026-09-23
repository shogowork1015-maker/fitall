import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import type { NextResponse } from 'next/server'

const CUSTOMER_SESSION_COOKIE = 'fitall_customer'
const CUSTOMER_SESSION_MAX_AGE = 60 * 60 * 24 * 180

function getCustomerSessionSecret() {
  return (
    process.env.CUSTOMER_APP_SESSION_SECRET ??
    process.env.LINE_LOGIN_STATE_SECRET ??
    process.env.LINE_LOGIN_CHANNEL_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function signCustomerUserId(userId: string) {
  const secret = getCustomerSessionSecret()
  if (!secret) throw new Error('CUSTOMER_APP_SESSION_SECRET または LINE_LOGIN_CHANNEL_SECRET が未設定です')
  return createHmac('sha256', secret).update(userId).digest('base64url')
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer)
}

function serializeCustomerSession(userId: string) {
  return `${userId}.${signCustomerUserId(userId)}`
}

function verifyCustomerSession(value: string | undefined) {
  if (!value) return null
  const [userId, signature] = value.split('.')
  if (!userId || !signature) return null
  return safeEqual(signCustomerUserId(userId), signature) ? userId : null
}

export function setCustomerSessionCookie(response: NextResponse, customerUserId: string) {
  response.cookies.set(CUSTOMER_SESSION_COOKIE, serializeCustomerSession(customerUserId), {
    httpOnly: true,
    maxAge: CUSTOMER_SESSION_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}

export async function setCustomerSessionCookieValue(customerUserId: string) {
  const cookieStore = await cookies()
  cookieStore.set(CUSTOMER_SESSION_COOKIE, serializeCustomerSession(customerUserId), {
    httpOnly: true,
    maxAge: CUSTOMER_SESSION_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function getCustomerSessionUserId() {
  try {
    const cookieStore = await cookies()
    return verifyCustomerSession(cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value)
  } catch {
    return null
  }
}
