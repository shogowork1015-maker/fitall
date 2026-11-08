'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { loginAction, type LoginState } from './actions'
import { SubmitButton } from '@/components/SubmitButton'

// ログイン画面。iPhoneのアプリのサインイン画面と同じく、アイコン・題名・入力のまとまりを中央に置く
export function LoginForm({
  trainerOnly,
  devAuthBypass,
}: {
  trainerOnly: boolean
  devAuthBypass: boolean
}) {
  const [state, action] = useActionState<LoginState, FormData>(
    loginAction,
    null
  )

  return (
    <main className="flex min-h-dvh flex-col bg-background px-4 pb-[calc(24px+var(--fitall-safe-bottom))] pt-[calc(56px+var(--fitall-safe-top))]">
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col">
        <div className="flex flex-col items-center text-center">
          <span aria-hidden="true" className="fitall-app-icon">L</span>
          <h1 className="mt-5 text-title1 font-bold text-ink">Limitless</h1>
          <p className="mt-1 text-subhead text-ink-muted">トレーナーのためのお客様管理アプリ</p>
        </div>

        <form action={action} className="mt-9 space-y-4">
          {trainerOnly && (
            <p role="note" className="rounded-control bg-accent-soft px-4 py-3 text-subhead text-brand">
              管理画面はトレーナー専用です。お客様はLINEから開くマイページで予約とチケット確認を行います。
            </p>
          )}

          {state?.error && (
            <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-subhead font-semibold text-danger">
              {state.error}
            </p>
          )}

          <div className="fitall-group">
            <div className="fitall-field">
              <label htmlFor="login-email">メール</label>
              <input
                id="login-email"
                name="email"
                type="email"
                placeholder="name@example.com"
                required
                autoComplete="email"
                inputMode="email"
              />
            </div>
            <div className="fitall-field">
              <label htmlFor="login-password">パスワード</label>
              <input
                id="login-password"
                name="password"
                type="password"
                placeholder="必須"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <SubmitButton className="fitall-primary-action">ログイン</SubmitButton>

          {devAuthBypass && (
            <Link href="/trainer/dashboard" className="fitall-tinted-action w-full">
              ログインせずに管理画面を確認する
            </Link>
          )}
        </form>

        <p className="mt-6 text-center text-subhead text-ink-muted">
          トレーナーの方は
          <Link href="/auth/register" className="ml-1 inline-flex min-h-11 items-center font-semibold text-brand">
            新規登録
          </Link>
        </p>

        <p className="mt-auto pt-10 text-center text-footnote text-ink-muted">
          お客様はLINEからマイページを作成し、チケット購入と予約を行います。
        </p>
      </div>
    </main>
  )
}
