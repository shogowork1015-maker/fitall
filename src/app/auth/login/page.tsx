'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { loginAction, type LoginState } from './actions'
import { SubmitButton } from '@/components/SubmitButton'

export default function LoginPage() {
  const [state, action] = useActionState<LoginState, FormData>(
    loginAction,
    null
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#F8F9FA]">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-[-0.04em] text-[#0A0A0A]">
            FIT<span className="text-[#0066FF]">ALL</span>
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">
            トレーナーとトレーニーをつなぐアプリ
          </p>
        </div>

        <form action={action} className="space-y-4">
          {state?.error && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[14px] px-4 py-3 text-sm text-[#EF4444]">
              {state.error}
            </div>
          )}

          <div className="space-y-3">
            <input
              name="email"
              type="email"
              placeholder="メールアドレス"
              required
              autoComplete="email"
              className="w-full h-14 px-4 text-base bg-[#F8F9FA] border-[1.5px] border-[#E5E7EB] rounded-[14px] text-[#0A0A0A] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#0066FF] focus:ring-[3px] focus:ring-[#0066FF]/25"
            />
            <input
              name="password"
              type="password"
              placeholder="パスワード"
              required
              autoComplete="current-password"
              className="w-full h-14 px-4 text-base bg-[#F8F9FA] border-[1.5px] border-[#E5E7EB] rounded-[14px] text-[#0A0A0A] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#0066FF] focus:ring-[3px] focus:ring-[#0066FF]/25"
            />
          </div>

          <SubmitButton>ログイン</SubmitButton>
        </form>

        <div className="mt-6 space-y-2 text-center text-sm text-[#6B7280]">
          <p>
            トレーナーの方は{' '}
            <Link
              href="/auth/register"
              className="text-[#0066FF] font-semibold"
            >
              新規登録
            </Link>
          </p>
          <p>
            トレーニーの方は{' '}
            <Link
              href="/auth/register-trainee"
              className="text-[#0066FF] font-semibold"
            >
              新規登録
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
