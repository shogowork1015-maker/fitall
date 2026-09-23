import { formatBookingDateTime, sendEmail, yen } from './email'
import { pushLineText } from './line'

interface NotificationUser {
  name?: string | null
  email?: string | null
  line_user_id?: string | null
}

interface BookingConfirmationInput {
  scheduledAt: string
  customer: NotificationUser
  trainer?: NotificationUser | null
  planName: string
  quantity: number
  amount: number
  customerPhone?: string
  requiresTrainerAdjustment?: boolean
}

interface ReminderInput {
  scheduledAt: string
  customer?: NotificationUser | null
  trainer?: NotificationUser | null
}

interface TicketDepletedInput {
  customer?: NotificationUser | null
  trainer?: NotificationUser | null
  trainerName?: string | null
}

interface TicketBookingConfirmationInput {
  scheduledAt: string
  customer: NotificationUser
  trainer?: NotificationUser | null
}

async function sendLineThenEmail(input: {
  user?: NotificationUser | null
  lineText: string
  emailSubject: string
  emailHtml: string
  logLabel: string
}) {
  const lineResult = await pushLineText({
    to: input.user?.line_user_id,
    text: input.lineText,
  })

  if (lineResult.ok) return { sent: true, channel: 'line' as const }
  if (!lineResult.skipped) {
    console.error(`[${input.logLabel}] LINE notification failed:`, lineResult.reason)
  }

  if (!input.user?.email) return { sent: false, channel: null }

  try {
    await sendEmail({
      to: input.user.email,
      subject: input.emailSubject,
      html: input.emailHtml,
    })
    return { sent: true, channel: 'email' as const }
  } catch (error) {
    console.error(`[${input.logLabel}] email notification failed:`, error)
    return { sent: false, channel: null }
  }
}

export async function sendBookingConfirmationNotifications(input: BookingConfirmationInput) {
  const { date, time } = formatBookingDateTime(input.scheduledAt)
  let sent = 0

  const customerName = input.customer.name ?? 'お客さま'
  const customerHeadline = input.requiresTrainerAdjustment
    ? '決済が完了しました。予約日時はトレーナーが確認して調整します。'
    : 'ご予約と決済が完了しました。'
  const trainerHeadline = input.requiresTrainerAdjustment
    ? 'Stripe決済済みの予約が入りましたが、希望日時が既存予約と重なっています。日時調整が必要です。'
    : 'Stripe決済済みの新しい予約が入りました。'
  const customerResult = await sendLineThenEmail({
    user: input.customer,
    logLabel: 'booking confirmation customer',
    lineText: [
      '【Limitless App】予約完了',
      `${customerName} さん`,
      customerHeadline,
      '',
      `日時  ${date} ${time}`,
      `メニュー  ${input.planName}`,
      `チケット  ${input.quantity}回分`,
      `決済金額  ${yen(input.amount)}`,
      '',
      '変更が必要な場合は、トレーナーへLINEでご連絡ください。',
    ].join('\n'),
    emailSubject: '【Limitless App】ご予約ありがとうございます',
    emailHtml: `
      <p>${customerName} さん</p>
      <p>${customerHeadline}</p>
      <p><strong>${date} ${time}</strong></p>
      <p>メニュー: <strong>${input.planName}</strong></p>
      <p>チケット: <strong>${input.quantity}回分</strong></p>
      <p>決済金額: <strong>${yen(input.amount)}</strong></p>
      <p>ご不明な点があればトレーナーへ直接ご連絡ください。</p>
      <br>
      <p>Limitless App</p>
    `,
  })
  if (customerResult.sent) sent += 1

  if (input.trainer) {
    const trainerName = input.trainer.name ?? 'トレーナー'
    const trainerResult = await sendLineThenEmail({
      user: input.trainer,
      logLabel: 'booking confirmation trainer',
      lineText: [
        '【Limitless App】新規予約',
        `${trainerName} さん`,
        trainerHeadline,
        '',
        `お客さん  ${customerName}`,
        `日時  ${date} ${time}`,
        `メニュー  ${input.planName}`,
        `チケット  ${input.quantity}回分`,
        `決済金額  ${yen(input.amount)}`,
        input.customerPhone ? `電話番号  ${input.customerPhone}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      emailSubject: `【Limitless App】新しい予約が入りました: ${customerName} さん`,
      emailHtml: `
        <p>${trainerName} さん</p>
        <p>${trainerHeadline}</p>
        <p>お客さん: <strong>${customerName}</strong></p>
        <p>日時: <strong>${date} ${time}</strong></p>
        <p>メニュー: <strong>${input.planName}</strong></p>
        <p>チケット: <strong>${input.quantity}回分</strong></p>
        <p>決済金額: <strong>${yen(input.amount)}</strong></p>
        ${input.customerPhone ? `<p>電話番号: <strong>${input.customerPhone}</strong></p>` : ''}
        <br>
        <p>Limitless App</p>
      `,
    })
    if (trainerResult.sent) sent += 1
  }

  return { sent }
}

export async function sendBookingReminderNotifications(input: ReminderInput) {
  const { date, time } = formatBookingDateTime(input.scheduledAt)
  let sent = 0

  if (input.customer) {
    const customerName = input.customer.name ?? 'お客さま'
    const customerResult = await sendLineThenEmail({
      user: input.customer,
      logLabel: 'booking reminder customer',
      lineText: [
        '【Limitless App】明日の予約',
        `${customerName} さん`,
        '明日のパーソナルトレーニングのお知らせです。',
        '',
        `日時  ${date} ${time}`,
        '',
        '変更や確認がある場合は、トレーナーへLINEでご連絡ください。',
      ].join('\n'),
      emailSubject: '【Limitless App】明日のパーソナルトレーニングのお知らせ',
      emailHtml: `
        <p>${customerName} さん</p>
        <p>明日のパーソナルトレーニングのお知らせです。</p>
        <p><strong>${date} ${time}</strong> にセッションが予定されています。</p>
        <p>ご不明な点はトレーナーにご連絡ください。</p>
        <br>
        <p>Limitless App</p>
      `,
    })
    if (customerResult.sent) sent += 1
  }

  if (input.trainer && input.customer) {
    const trainerName = input.trainer.name ?? 'トレーナー'
    const customerName = input.customer.name ?? 'お客さま'
    const trainerResult = await sendLineThenEmail({
      user: input.trainer,
      logLabel: 'booking reminder trainer',
      lineText: [
        '【Limitless App】明日のセッション',
        `${trainerName} さん`,
        '明日のセッションのお知らせです。',
        '',
        `お客さん  ${customerName}`,
        `日時  ${date} ${time}`,
      ].join('\n'),
      emailSubject: `【Limitless App】明日のセッション: ${customerName} さん`,
      emailHtml: `
        <p>${trainerName} さん</p>
        <p>明日のセッションのお知らせです。</p>
        <p>お客さん: <strong>${customerName}</strong></p>
        <p>日時: <strong>${date} ${time}</strong></p>
        <br>
        <p>Limitless App</p>
      `,
    })
    if (trainerResult.sent) sent += 1
  }

  return { sent }
}

export async function sendTicketBookingConfirmationNotifications(input: TicketBookingConfirmationInput) {
  const { date, time } = formatBookingDateTime(input.scheduledAt)
  let sent = 0
  const customerName = input.customer.name ?? 'お客さま'

  const customerResult = await sendLineThenEmail({
    user: input.customer,
    logLabel: 'ticket booking confirmation customer',
    lineText: [
      '【Limitless App】予約完了',
      `${customerName} さん`,
      'チケットを使って予約が確定しました。',
      '',
      `日時  ${date} ${time}`,
      '',
      '変更が必要な場合は、トレーナーへLINEでご連絡ください。',
    ].join('\n'),
    emailSubject: '【Limitless App】予約が完了しました',
    emailHtml: `
      <p>${customerName} さん</p>
      <p>チケットを使って予約が確定しました。</p>
      <p><strong>${date} ${time}</strong></p>
      <p>変更が必要な場合は、トレーナーへ直接ご連絡ください。</p>
      <br>
      <p>Limitless App</p>
    `,
  })
  if (customerResult.sent) sent += 1

  if (input.trainer) {
    const trainerName = input.trainer.name ?? 'トレーナー'
    const trainerResult = await sendLineThenEmail({
      user: input.trainer,
      logLabel: 'ticket booking confirmation trainer',
      lineText: [
        '【Limitless App】新規予約',
        `${trainerName} さん`,
        'チケット利用の予約が入りました。',
        '',
        `お客さん  ${customerName}`,
        `日時  ${date} ${time}`,
      ].join('\n'),
      emailSubject: `【Limitless App】新しい予約が入りました: ${customerName} さん`,
      emailHtml: `
        <p>${trainerName} さん</p>
        <p>チケット利用の予約が入りました。</p>
        <p>お客さん: <strong>${customerName}</strong></p>
        <p>日時: <strong>${date} ${time}</strong></p>
        <br>
        <p>Limitless App</p>
      `,
    })
    if (trainerResult.sent) sent += 1
  }

  return { sent }
}

export async function sendTicketDepletedNotification(input: TicketDepletedInput) {
  let sent = 0
  const customerName = input.customer?.name ?? 'お客さま'
  const trainerName = input.trainerName ?? input.trainer?.name ?? 'トレーナー'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  const ticketUrl = appUrl ? `${appUrl}/customer/app/tickets` : null

  if (input.customer) {
    const customerResult = await sendLineThenEmail({
      user: input.customer,
      logLabel: 'ticket depleted customer',
      lineText: [
        '【Limitless App】チケット残数',
        `${customerName} さん`,
        '使えるチケットが0枚になりました。',
        '',
        '次回予約の前に、追加購入またはトレーナーへの相談をお願いします。',
        ticketUrl ? `チケット画面  ${ticketUrl}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      emailSubject: '【Limitless App】チケット残数が0枚になりました',
      emailHtml: `
        <p>${customerName} さん</p>
        <p>使えるチケットが0枚になりました。</p>
        <p>次回予約の前に、追加購入またはトレーナーへの相談をお願いします。</p>
        ${ticketUrl ? `<p><a href="${ticketUrl}">チケット画面を開く</a></p>` : ''}
        <br>
        <p>Limitless App</p>
      `,
    })
    if (customerResult.sent) sent += 1
  }

  if (input.trainer) {
    const trainerResult = await sendLineThenEmail({
      user: input.trainer,
      logLabel: 'ticket depleted trainer',
      lineText: [
        '【Limitless App】チケット残数',
        `${trainerName} さん`,
        `${customerName} さんの使えるチケットが0枚になりました。`,
        '',
        '次回購入または繰越対応が必要か確認してください。',
      ].join('\n'),
      emailSubject: `【Limitless App】${customerName} さんのチケット残数が0枚です`,
      emailHtml: `
        <p>${trainerName} さん</p>
        <p>${customerName} さんの使えるチケットが0枚になりました。</p>
        <p>次回購入または繰越対応が必要か確認してください。</p>
        <br>
        <p>Limitless App</p>
      `,
    })
    if (trainerResult.sent) sent += 1
  }

  return { sent }
}
