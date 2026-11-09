'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import type { PublicBookingState } from './actions'
import type { PublicBookingData } from '@/lib/public-booking'
import { Section } from '@/ui/List'
import { Button } from '@/ui/Button'
import { Check } from '@/ui/icons'
import s from '@/ui/ui.module.css'

type CheckoutAction = (state: PublicBookingState, data: FormData) => Promise<PublicBookingState>

function yen(amount: number) {
  return `¥${amount.toLocaleString('ja-JP')}`
}

// はじめてのチケット購入。メニューを1つ選び、名前とメールを入れて決済へ進む
export function PublicBookingForm({ data, checkoutAction }: {
  data: PublicBookingData
  // 開発用プレビューでは省略する（サーバー処理を読み込まない）
  checkoutAction?: CheckoutAction
}) {
  const menus = data.menus.filter((menu) => menu.billing_type === 'ticket' && menu.price > 0)
  const [menuId, setMenuId] = useState(menus[0]?.id ?? '')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [previewChecked, setPreviewChecked] = useState(false)
  const submitting = useRef(false)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const [state, formAction, pending] = useActionState<PublicBookingState, FormData>(async (previous, values) => {
    try {
      const result = checkoutAction ? await checkoutAction(previous, values) : null
      if (!result || !('checkoutUrl' in result)) submitting.current = false
      return result
    } catch {
      submitting.current = false
      return { error: '決済画面を開けませんでした。通信状況を確認して、もう一度お試しください。' }
    }
  }, null)
  const redirecting = Boolean(state && 'checkoutUrl' in state)
  const locked = pending || redirecting
  const selectedMenu = menus.find((menu) => menu.id === menuId)
  const error = state && 'error' in state ? state.error : null

  useEffect(() => {
    if (state && 'checkoutUrl' in state) window.location.assign(state.checkoutUrl)
    if (state && 'error' in state) errorRef.current?.focus()
  }, [state])

  return (
    <form
      action={checkoutAction ? formAction : undefined}
      onChange={() => setPreviewChecked(false)}
      onSubmit={(event) => {
        if (!selectedMenu || submitting.current) { event.preventDefault(); return }
        if (!checkoutAction) { event.preventDefault(); setPreviewChecked(true); return }
        submitting.current = true
      }}
      aria-busy={locked}
    >
      <input type="hidden" name="trainer_id" value={data.trainer.profileId} />
      <input type="hidden" name="plan_id" value={selectedMenu?.id ?? ''} />

      <Section group header="チケットを選ぶ" label="チケットを選ぶ">
        {menus.length ? menus.map((menu) => (
          <button
            key={menu.id}
            type="button"
            className={s.row}
            aria-pressed={menuId === menu.id}
            disabled={locked}
            onClick={() => { setMenuId(menu.id); setPreviewChecked(false) }}
          >
            <span className={s.rowMain}>
              <span className={s.rowTitle} data-strong="true" style={{ display: 'block' }}>{menu.name}</span>
              <span className={s.rowSubtitle} style={{ display: 'block' }}>{menu.sessions}回分{menu.description ? `・${menu.description}` : ''}</span>
            </span>
            <span className={s.rowValue} data-tone="strong">{yen(menu.price)}</span>
            <span style={{ color: 'var(--ui-tint)', display: 'inline-flex', opacity: menuId === menu.id ? 1 : 0, width: 22 }}><Check size={20} /></span>
          </button>
        )) : <p className={s.empty}>購入できるチケットがありません。トレーナーへお問い合わせください。</p>}
      </Section>

      <Section group header="お客様" footer="メールアドレスは購入内容のご案内に使います。">
        <div className={s.field}>
          <label htmlFor="booking-name">お名前</label>
          <input id="booking-name" name="customer_name" autoComplete="name" required maxLength={80} placeholder="山田 花子" disabled={locked} value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className={s.field}>
          <label htmlFor="booking-email">メール</label>
          <input id="booking-email" name="customer_email" type="email" inputMode="email" autoComplete="email" required maxLength={254} placeholder="name@example.com" disabled={locked} value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
      </Section>

      {error ? <p ref={errorRef} tabIndex={-1} role="alert" className={s.formError}>{error}</p> : null}
      {previewChecked ? <p role="status" className={s.formError} style={{ color: 'var(--ui-label-2)' }}>入力内容を確認しました。開発プレビューのため、決済・通知は行いません。</p> : null}

      <Section footer={checkoutAction ? '次の画面でStripeのカード決済に進みます。購入後、空いている日時から予約できます。' : '開発プレビュー・外部への送信はありません'}>
        <Button type="submit" disabled={locked || !selectedMenu}>
          {locked ? '決済画面を開いています…' : selectedMenu ? `${yen(selectedMenu.price)}を支払う` : 'チケットを選んでください'}
        </Button>
      </Section>
    </form>
  )
}
