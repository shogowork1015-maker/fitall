'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import type { PublicBookingState } from './actions'
import type { PublicBookingData } from '@/lib/public-booking'
import styles from './PublicBookingForm.module.css'

type CheckoutAction = (state: PublicBookingState, data: FormData) => Promise<PublicBookingState>

export function PublicBookingForm({ data, checkoutAction }: {
  data: PublicBookingData
  // Omitted only on the isolated development preview: no server action is imported here.
  checkoutAction?: CheckoutAction
}) {
  const menus = data.menus.filter(menu => menu.billing_type === 'ticket' && menu.price > 0)
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
  const selectedMenu = menus.find(menu => menu.id === menuId)
  const error = state && 'error' in state ? state.error : null

  useEffect(() => {
    if (state && 'checkoutUrl' in state) window.location.assign(state.checkoutUrl)
    if (state && 'error' in state) errorRef.current?.focus()
  }, [state])

  return (
    <form className={styles.form} action={checkoutAction ? formAction : undefined} onChange={() => setPreviewChecked(false)}
      onSubmit={event => {
        if (!selectedMenu || submitting.current) {
          event.preventDefault()
          return
        }
        if (!checkoutAction) {
          event.preventDefault()
          setPreviewChecked(true)
          return
        }
        submitting.current = true
      }} aria-busy={locked}>
      <input type="hidden" name="trainer_id" value={data.trainer.profileId} />
      <input type="hidden" name="plan_id" value={selectedMenu?.id ?? ''} />

      <fieldset disabled={locked} className={styles.section}>
        <legend><span>1</span>メニューを選ぶ</legend>
        {menus.length ? <div className={styles.menus}>
          {menus.map(menu => <button type="button" key={menu.id} aria-pressed={menuId === menu.id}
            className={styles.menu} onClick={() => { setMenuId(menu.id); setPreviewChecked(false) }}>
            <span><strong>{menu.name}</strong><small>{menu.sessions}回分のチケット</small>
              {menu.description && <small>{menu.description}</small>}</span>
            <span className={styles.price}>¥{menu.price.toLocaleString('ja-JP')}<small>合計</small></span>
          </button>)}
        </div> : <p className={styles.empty}>現在、購入できるメニューがありません。トレーナーへお問い合わせください。</p>}
      </fieldset>

      <fieldset disabled={locked} className={styles.section}>
        <legend><span>2</span>購入者情報</legend>
        <label className={styles.label} htmlFor="booking-name">お名前
          <input id="booking-name" name="customer_name" autoComplete="name" required maxLength={80}
            value={name} onChange={event => setName(event.target.value)} />
        </label>
        <label className={styles.label} htmlFor="booking-email">メールアドレス
          <input id="booking-email" name="customer_email" type="email" autoComplete="email" required maxLength={254}
            value={email} onChange={event => setEmail(event.target.value)} aria-describedby="booking-email-help" />
        </label>
        <p id="booking-email-help" className={styles.hint}>購入内容のご案内に使用します。</p>
      </fieldset>

      <section className={styles.summary} aria-label="お支払い内容">
        <h2>購入内容の確認</h2>
        <dl>
          <div><dt>メニュー</dt><dd>{selectedMenu?.name ?? '選択できるメニューがありません'}</dd></div>
          <div className={styles.total}><dt>お支払い合計</dt><dd>{selectedMenu ? `¥${selectedMenu.price.toLocaleString('ja-JP')}` : '—'}</dd></div>
        </dl>
        {selectedMenu && <p className={styles.hint}>{selectedMenu.sessions}回分のチケットが追加されます。予約日時は購入後に選べます。</p>}
      </section>
      {error && <p ref={errorRef} tabIndex={-1} role="alert" className={styles.error}>{error}</p>}
      {previewChecked && <p role="status" className={styles.notice}>入力内容を確認しました。開発プレビューのため、予約・決済・通知は行いません。</p>}
      <button type="submit" className={styles.submit} disabled={locked || !selectedMenu}>
        {locked ? '決済画面を開いています…' : checkoutAction ? 'この内容で決済へ進む' : '入力内容を確認する'}
      </button>
      <p className={styles.footnote}>{checkoutAction ? '次の画面でStripeによるお支払いに進みます。' : '開発プレビュー · 外部への送信はありません'}</p>
    </form>
  )
}
