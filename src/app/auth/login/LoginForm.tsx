'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { loginAction, type LoginState } from './actions'
import { SubmitButton } from '@/components/SubmitButton'

export function LoginForm({
  trainerOnly,
  devAuthBypass,
}: {
  trainerOnly: boolean
  devAuthBypass: boolean
}) {
  const panelStyle = { width: 'min(420px, calc(100vw - 48px))' }
  const noteStyle = { width: 'min(320px, calc(100vw - 48px))' }
  const [state, action] = useActionState<LoginState, FormData>(
    loginAction,
    null
  )

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-white px-6 py-8">
      <div className="z-10 mb-10 mt-12" style={panelStyle}>
        <h1 className="text-4xl font-black tracking-tight leading-tight text-ink">
          Limitless<br />App.
        </h1>
        <p className="mt-3 text-base font-medium text-ink-muted">
          トレーナーのためのお客様管理アプリ。
        </p>
      </div>

      <form action={action} className="z-10 space-y-4" style={panelStyle}>
        {trainerOnly && (
          <div className="border border-line bg-accent-soft px-4 py-3 text-base font-bold text-brand">
            管理画面はトレーナー専用です。お客様はLINEから開くマイページで予約とチケット確認を行います。
          </div>
        )}

        {state?.error && (
          <div className="border border-danger bg-danger-soft px-4 py-3 text-base font-bold text-danger">
            {state.error}
          </div>
        )}

        {devAuthBypass && (
          <Link
            href="/trainer/bookings"
            className="fitall-secondary-action w-full bg-accent-soft font-bold text-brand"
          >
            ログインせずに管理画面を確認する
          </Link>
        )}

        <div className="space-y-1">
          <label className="text-base font-medium text-ink-muted ml-1">メールアドレス</label>
          <div className="relative">
            <input
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              autoComplete="email"
              className="w-full border border-line bg-white py-3.5 pl-11 pr-4 text-base font-bold text-ink outline-none transition-all placeholder:text-gray-400 focus:border-accent"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center ml-1">
            <label className="text-base font-medium text-ink-muted">パスワード</label>
          </div>
          <div className="relative">
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full border border-line bg-white py-3.5 pl-11 pr-4 text-base font-bold text-ink outline-none transition-all placeholder:text-gray-400 focus:border-accent"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        </div>

        <SubmitButton className="fitall-primary-action mt-6 justify-between bg-ink px-6 py-4 text-base font-black text-white transition-all active:scale-[0.98]">
          <span>ログイン</span>
          <svg className="w-5 h-5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </SubmitButton>
      </form>

      <div className="z-10 my-8 flex items-center" style={panelStyle}>
        <div className="h-px flex-1 bg-line" />
        <span className="px-4 text-base font-medium text-ink-faint">または</span>
        <div className="h-px flex-1 bg-line" />
      </div>

      <div className="z-10 space-y-3 text-center text-base text-ink-muted" style={panelStyle}>
        <p>
          トレーナーの方は{' '}
          <Link href="/auth/register" className="inline-flex min-h-14 items-center font-bold text-brand">
            新規登録
          </Link>
        </p>
      </div>

      <p className="z-10 mx-auto mt-10 break-words pb-12 text-center text-base font-medium leading-relaxed text-ink-faint" style={noteStyle}>
        お客さまはLINEからマイページを作成し、チケット購入と予約を行います。
      </p>
    </div>
  )
}
