'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { loginAction, type LoginState } from './actions'
import s from '@/ui/ui.module.css'
import { SubmitButton } from '@/ui/SubmitButton'
import { Button } from '@/ui/Button'

// トレーナーのログイン。
// 来る理由：管理画面に入る。主役：入力欄。主な操作：ログイン
export function LoginForm({
  trainerOnly,
  devAuthBypass,
}: {
  trainerOnly: boolean
  devAuthBypass: boolean
}) {
  const [state, action] = useActionState<LoginState, FormData>(loginAction, null)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className={s.screen}>
      <main className={s.entry}>
        <span className={s.wordmark}>Limitless</span>
        <h1 className={s.entryTitle}>ログイン</h1>
        <p className={s.entryLead}>トレーナー用の管理画面です</p>

        <form action={action} style={{ marginTop: 32 }}>
          <div className={s.group}>
            <div className={s.field}>
              <label htmlFor="login-email">メール</label>
              <input id="login-email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="name@example.com" required />
            </div>
            <div className={s.field}>
              <label htmlFor="login-password">パスワード</label>
              <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="必須" required />
              <button type="button" className={s.fieldAction} onClick={() => setShowPassword((value) => !value)} aria-pressed={showPassword}>
                {showPassword ? '隠す' : '表示'}
              </button>
            </div>
          </div>

          {trainerOnly ? <p className={s.formError} style={{ color: 'var(--ui-label-2)' }}>管理画面はトレーナー専用です。お客様はLINEから届くリンクで開いてください。</p> : null}
          {state?.error ? <p role="alert" className={s.formError}>{state.error}</p> : null}

          <div style={{ marginTop: 24 }}>
            <SubmitButton pendingLabel="ログインしています…">ログイン</SubmitButton>
          </div>
        </form>

        <p className={s.entryLinks}>
          はじめての方は<Link href="/auth/register">新規登録</Link>
        </p>

        {devAuthBypass ? (
          <div style={{ marginTop: 8 }}>
            <Button variant="secondary" href="/trainer/dashboard">ログインせずに確認する（開発用）</Button>
          </div>
        ) : null}

        <p className={s.entryFoot}>お客様は、トレーナーからLINEで届くリンクから開いてください。</p>
      </main>
    </div>
  )
}
