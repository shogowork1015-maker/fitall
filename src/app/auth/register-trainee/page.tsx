'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { registerTraineeAction, type RegisterTraineeState } from './actions'
import { SubmitButton } from '@/components/SubmitButton'

export default function RegisterTraineePage() {
  const [state, action] = useActionState<RegisterTraineeState, FormData>(
    registerTraineeAction,
    null
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#F8F9FA]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-[-0.04em] text-[#0A0A0A]">
            FIT<span className="text-[#0066FF]">ALL</span>
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">トレーニー新規登録</p>
        </div>

        <div className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-[14px] px-4 py-3 text-sm text-[#1E40AF] mb-4">
          トレーナーから招待リンクを受け取った方は、そちらから登録してください。ここでは単体利用（筋トレノート・履歴のみ）で登録できます。
        </div>

        <form action={action} className="space-y-4">
          {state?.error && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[14px] px-4 py-3 text-sm text-[#EF4444]">
              {state.error}
            </div>
          )}

          <div className="space-y-3">
            <input
              name="name"
              type="text"
              placeholder="お名前"
              required
              autoComplete="name"
              className="w-full h-14 px-4 text-base bg-[#F8F9FA] border-[1.5px] border-[#E5E7EB] rounded-[14px] text-[#0A0A0A] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#0066FF] focus:ring-[3px] focus:ring-[#0066FF]/25"
            />
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
              placeholder="パスワード（8文字以上）"
              required
              autoComplete="new-password"
              className="w-full h-14 px-4 text-base bg-[#F8F9FA] border-[1.5px] border-[#E5E7EB] rounded-[14px] text-[#0A0A0A] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#0066FF] focus:ring-[3px] focus:ring-[#0066FF]/25"
            />
          </div>

          <SubmitButton>登録する</SubmitButton>
        </form>

        <p className="mt-6 text-center text-sm text-[#6B7280]">
          すでにアカウントをお持ちの方は{' '}
          <Link href="/auth/login" className="text-[#0066FF] font-semibold">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  )
}
