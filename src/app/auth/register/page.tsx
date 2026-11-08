'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { registerAction, type RegisterState } from './actions'
import { SubmitButton } from '@/components/SubmitButton'

// トレーナーの新規登録。ログイン画面と同じく、設定アプリのような入力のまとまりで組む
export default function RegisterPage() {
  const [state, action] = useActionState<RegisterState, FormData>(
    registerAction,
    null
  )

  return (
    <main className="flex min-h-dvh flex-col bg-background px-4 pb-[calc(24px+var(--fitall-safe-bottom))] pt-[calc(56px+var(--fitall-safe-top))]">
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col">
        <div className="flex flex-col items-center text-center">
          <span aria-hidden="true" className="fitall-app-icon">L</span>
          <h1 className="mt-5 text-title1 font-bold text-ink">アカウントを作成</h1>
          <p className="mt-1 text-subhead text-ink-muted">お客様・予約・売上をまとめて管理</p>
        </div>

        <form action={action} className="mt-9 space-y-4">
          {state?.error && (
            <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-subhead font-semibold text-danger">
              {state.error}
            </p>
          )}

          <div className="fitall-group">
            <div className="fitall-field">
              <label htmlFor="register-name">お名前</label>
              <input id="register-name" name="name" type="text" placeholder="山田 太郎" required autoComplete="name" />
            </div>
            <div className="fitall-field">
              <label htmlFor="register-email">メール</label>
              <input
                id="register-email"
                name="email"
                type="email"
                placeholder="name@example.com"
                required
                autoComplete="email"
                inputMode="email"
              />
            </div>
            <div className="fitall-field">
              <label htmlFor="register-password">パスワード</label>
              <input
                id="register-password"
                name="password"
                type="password"
                placeholder="8文字以上"
                required
                autoComplete="new-password"
              />
            </div>
          </div>
          <p className="fitall-group-note !mt-2">
            登録後、設定画面で販売メニューを追加すると、お客様用マイページの登録リンクを共有できます。
          </p>

          <SubmitButton className="fitall-primary-action">登録する</SubmitButton>
        </form>

        <p className="mt-6 text-center text-subhead text-ink-muted">
          すでにアカウントをお持ちの方は
          <Link href="/auth/login" className="ml-1 inline-flex min-h-11 items-center font-semibold text-brand">
            ログイン
          </Link>
        </p>
      </div>
    </main>
  )
}
