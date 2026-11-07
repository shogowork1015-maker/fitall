'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { registerAction, type RegisterState } from './actions'
import { SubmitButton } from '@/components/SubmitButton'

export default function RegisterPage() {
  const [state, action] = useActionState<RegisterState, FormData>(
    registerAction,
    null
  )

  return (
    <div className="min-h-screen flex flex-col justify-center px-8 bg-gradient-to-b from-white to-[#F5F5F5] relative overflow-hidden pb-12">
      <div className="z-10 mb-8">
        <h1 className="text-4xl font-extrabold text-ink tracking-tight leading-tight text-center">
          アカウントを作成
        </h1>
        <p className="text-base text-ink-muted mt-3 font-medium text-center">
          お客様・予約・売上をまとめて管理
        </p>
      </div>

      <form action={action} className="space-y-4 z-10 w-full">
        {state?.error && (
          <div className="bg-danger-soft border border-danger-line rounded-card px-4 py-3 text-base text-danger">
            {state.error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-base font-medium text-ink-muted ml-1">お名前</label>
          <div className="relative">
            <input
              name="name"
              type="text"
              placeholder="山田 太郎"
              required
              autoComplete="name"
              className="w-full bg-white border border-line text-ink text-base rounded-control pl-11 pr-4 py-3.5 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all placeholder:text-gray-400"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-base font-medium text-ink-muted ml-1">メールアドレス</label>
          <div className="relative">
            <input
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              autoComplete="email"
              className="w-full bg-white border border-line text-ink text-base rounded-control pl-11 pr-4 py-3.5 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all placeholder:text-gray-400"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-base font-medium text-ink-muted ml-1">パスワード</label>
          <div className="relative">
            <input
              name="password"
              type="password"
              placeholder="8文字以上"
              required
              autoComplete="new-password"
              className="w-full bg-white border border-line text-ink text-base rounded-control pl-11 pr-4 py-3.5 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all placeholder:text-gray-400"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        </div>

        <SubmitButton className="w-full mt-6 bg-ink hover:bg-ink text-white font-bold text-base rounded-card py-4 transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          <span>登録する</span>
        </SubmitButton>
      </form>

      <div className="mt-8 z-10 bg-accent-soft border-l-4 border-accent p-4 rounded-control">
        <p className="text-base text-ink-muted leading-relaxed font-medium">
          <span className="font-bold text-ink">ご注意：</span>
          登録後、設定画面でStripe決済用のメニューを追加すると、お客様用マイページの登録リンクを共有できます。
        </p>
      </div>

      <p className="mt-6 text-center text-base text-ink-muted z-10">
        すでにアカウントをお持ちの方は{' '}
        <Link href="/auth/login" className="inline-flex min-h-14 items-center font-bold text-brand">
          ログイン
        </Link>
      </p>
    </div>
  )
}
