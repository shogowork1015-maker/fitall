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
        <h1 className="text-4xl font-extrabold text-[#0A0A0A] tracking-tight leading-tight text-center">
          アカウントを作成
        </h1>
        <p className="text-sm text-[#666666] mt-3 font-medium text-center">
          お客様・予約・売上をまとめて管理
        </p>
      </div>

      <form action={action} className="space-y-4 z-10 w-full">
        {state?.error && (
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl px-4 py-3 text-sm text-[#D4183D]">
            {state.error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-bold text-[#666666] ml-1">お名前</label>
          <div className="relative">
            <input
              name="name"
              type="text"
              placeholder="山田 太郎"
              required
              autoComplete="name"
              className="w-full bg-white border border-gray-200 text-[#0A0A0A] text-base rounded-xl pl-11 pr-4 py-3.5 focus:ring-2 focus:ring-[#0A0A0A] focus:border-transparent outline-none transition-all placeholder:text-gray-400"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-[#666666] ml-1">メールアドレス</label>
          <div className="relative">
            <input
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              autoComplete="email"
              className="w-full bg-white border border-gray-200 text-[#0A0A0A] text-base rounded-xl pl-11 pr-4 py-3.5 focus:ring-2 focus:ring-[#0A0A0A] focus:border-transparent outline-none transition-all placeholder:text-gray-400"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-[#666666] ml-1">パスワード</label>
          <div className="relative">
            <input
              name="password"
              type="password"
              placeholder="8文字以上"
              required
              autoComplete="new-password"
              className="w-full bg-white border border-gray-200 text-[#0A0A0A] text-base rounded-xl pl-11 pr-4 py-3.5 focus:ring-2 focus:ring-[#0A0A0A] focus:border-transparent outline-none transition-all placeholder:text-gray-400"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        </div>

        <SubmitButton className="w-full mt-6 bg-[#0A0A0A] hover:bg-[#2A2A4A] text-white font-bold text-base rounded-2xl py-4 transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          <span>登録する</span>
        </SubmitButton>
      </form>

      <div className="mt-8 z-10 bg-[#FFF9F5] border-l-4 border-[#0066FF] p-4 rounded-lg">
        <p className="text-[11px] text-[#666666] leading-relaxed font-medium">
          <span className="font-bold text-[#0A0A0A]">ご注意：</span>
          登録後、設定画面でStripe決済用のメニューを追加すると、お客様用マイページの登録リンクを共有できます。
        </p>
      </div>

      <p className="mt-6 text-center text-sm text-[#666666] z-10">
        すでにアカウントをお持ちの方は{' '}
        <Link href="/auth/login" className="text-[#0066FF] font-bold">
          ログイン
        </Link>
      </p>
    </div>
  )
}
