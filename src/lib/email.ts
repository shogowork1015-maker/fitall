import { formatJstDate, formatJstTime } from './datetime'

export interface EmailMessage {
  to: string
  subject: string
  html: string
}

function maskEmailAddress(value: string) {
  const [local = '', domain = ''] = value.split('@')
  if (!domain) return 'unknown'
  const visible = local.slice(0, 2)
  return `${visible}${local.length > 2 ? '***' : '*'}@${domain}`
}

function sanitizeProviderError(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/(sk|pk|rk)_(test|live)_[A-Za-z0-9_*]+/g, '$1_$2_********')
    .slice(0, 500)
}

export async function sendEmail({ to, subject, html }: EmailMessage) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL ?? 'Limitless App <noreply@limitless-app.local>'

  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(
        `[email skipped] to=${maskEmailAddress(to)} subjectLength=${subject.length} htmlLength=${html.length}`
      )
    }
    return { skipped: true }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`メール送信に失敗しました: ${response.status} ${sanitizeProviderError(body)}`)
  }

  return { skipped: false }
}

export function formatBookingDateTime(scheduledAt: string) {
  return {
    date: formatJstDate(scheduledAt, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    }),
    time: formatJstTime(scheduledAt, {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }
}

export function yen(amount: number) {
  return `¥${amount.toLocaleString('ja-JP')}`
}
