import { createHmac, timingSafeEqual } from 'crypto'

const LINE_AUTH_URL = 'https://access.line.me/oauth2/v2.1/authorize'
const LINE_TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token'
const LINE_PROFILE_URL = 'https://api.line.me/v2/profile'
const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push'
const LINE_CONNECT_STATE_TTL_MS = 30 * 60 * 1000

export interface LineProfile {
  userId: string
  displayName: string
  pictureUrl?: string
}

export interface LinePushResult {
  ok: boolean
  skipped?: boolean
  reason?: string
}

type LineStateKind = 'stripe' | 'customer' | 'app'

interface LineAppEntryState {
  trainerId: string
  nextPath: string
}

function getLineLoginChannelId() {
  const value = process.env.LINE_LOGIN_CHANNEL_ID
  if (!value) throw new Error('LINE_LOGIN_CHANNEL_ID が未設定です')
  return value
}

function getLineLoginChannelSecret() {
  const value = process.env.LINE_LOGIN_CHANNEL_SECRET
  if (!value) throw new Error('LINE_LOGIN_CHANNEL_SECRET が未設定です')
  return value
}

function getLineStateSecret() {
  const value = process.env.LINE_LOGIN_STATE_SECRET ?? process.env.LINE_LOGIN_CHANNEL_SECRET
  if (!value) throw new Error('LINE_LOGIN_STATE_SECRET または LINE_LOGIN_CHANNEL_SECRET が未設定です')
  return value
}

function getLineMessagingToken() {
  return process.env.LINE_CHANNEL_ACCESS_TOKEN
}

function signPayload(payload: string) {
  return createHmac('sha256', getLineStateSecret()).update(payload).digest('base64url')
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer)
}

function buildSignedState(kind: LineStateKind, id: string) {
  const payload = Buffer.from(`${kind}:${id}:${Date.now()}`).toString('base64url')
  return `${payload}.${signPayload(payload)}`
}

function verifySignedState(state: string | null, expectedKind: LineStateKind) {
  if (!state) return null
  const [payload, signature] = state.split('.')
  if (!payload || !signature || !safeEqual(signPayload(payload), signature)) return null
  const decoded = Buffer.from(payload, 'base64url').toString('utf8')
  const [kind, id, createdAtRaw] = decoded.split(':')
  const createdAt = Number(createdAtRaw)
  if (kind !== expectedKind || !id || !Number.isFinite(createdAt)) return null
  if (Date.now() - createdAt > LINE_CONNECT_STATE_TTL_MS) return null
  return id
}

function buildLineOAuthUrl(input: { origin: string; redirectPath: string; state: string }) {
  const redirectUri = `${input.origin}${input.redirectPath}`
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: getLineLoginChannelId(),
    redirect_uri: redirectUri,
    state: input.state,
    scope: 'profile openid',
    bot_prompt: 'aggressive',
  })
  return `${LINE_AUTH_URL}?${params.toString()}`
}

export function buildLineConnectUrl(input: { origin: string; stripeSessionId: string }) {
  return buildLineOAuthUrl({
    origin: input.origin,
    redirectPath: '/api/line/connect/callback',
    state: buildSignedState('stripe', input.stripeSessionId),
  })
}

export function buildLineCustomerConnectUrl(input: { origin: string; customerUserId: string }) {
  return buildLineOAuthUrl({
    origin: input.origin,
    redirectPath: '/api/line/customer-connect/callback',
    state: buildSignedState('customer', input.customerUserId),
  })
}

export function buildLineAppEntryUrl(input: { origin: string; trainerId: string; nextPath: string }) {
  const stateValue = Buffer.from(
    JSON.stringify({
      trainerId: input.trainerId,
      nextPath: input.nextPath,
    } satisfies LineAppEntryState)
  ).toString('base64url')

  return buildLineOAuthUrl({
    origin: input.origin,
    redirectPath: '/api/line/app/callback',
    state: buildSignedState('app', stateValue),
  })
}

export function verifyLineConnectState(state: string | null) {
  return verifySignedState(state, 'stripe')
}

export function verifyLineCustomerConnectState(state: string | null) {
  return verifySignedState(state, 'customer')
}

export function verifyLineAppEntryState(state: string | null): LineAppEntryState | null {
  const value = verifySignedState(state, 'app')
  if (!value) return null

  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<LineAppEntryState>
    if (!parsed.trainerId || !parsed.nextPath?.startsWith('/customer/app')) return null
    return {
      trainerId: parsed.trainerId,
      nextPath: parsed.nextPath,
    }
  } catch {
    return null
  }
}

export async function exchangeLineCodeForProfile(input: {
  code: string
  origin: string
  redirectPath?: string
}): Promise<LineProfile> {
  const redirectUri = `${input.origin}${input.redirectPath ?? '/api/line/connect/callback'}`
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: input.code,
    redirect_uri: redirectUri,
    client_id: getLineLoginChannelId(),
    client_secret: getLineLoginChannelSecret(),
  })

  const tokenResponse = await fetch(LINE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })
  const tokenJson = (await tokenResponse.json()) as { access_token?: string; error_description?: string }
  if (!tokenResponse.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error_description ?? 'LINEアクセストークンの取得に失敗しました')
  }

  const profileResponse = await fetch(LINE_PROFILE_URL, {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  })
  const profile = (await profileResponse.json()) as LineProfile & { message?: string }
  if (!profileResponse.ok || !profile.userId) {
    throw new Error(profile.message ?? 'LINEプロフィールの取得に失敗しました')
  }
  return profile
}

export async function pushLineText(input: { to?: string | null; text: string }): Promise<LinePushResult> {
  const token = getLineMessagingToken()
  if (!token) return { ok: false, skipped: true, reason: 'LINE_CHANNEL_ACCESS_TOKEN is missing' }
  if (!input.to) return { ok: false, skipped: true, reason: 'LINE userId is missing' }

  const response = await fetch(LINE_PUSH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: input.to,
      messages: [{ type: 'text', text: input.text }],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    return { ok: false, reason: body || `LINE push failed: ${response.status}` }
  }
  return { ok: true }
}
