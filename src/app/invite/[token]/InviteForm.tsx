'use client'

import { useActionState } from 'react'
import { inviteRegisterAction, type InviteRegisterState } from './actions'
import { SubmitButton } from '@/components/SubmitButton'

export function InviteForm({ token }: { token: string }) {
  const boundAction = inviteRegisterAction.bind(null, token)
  const [state, action] = useActionState<InviteRegisterState, FormData>(
    boundAction,
    null
  )

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          {state.error}
        </div>
      )}

      <p className="text-sm text-gray-600 text-center">
        名前・メール・パスワードを設定して登録完了です
      </p>

      <div className="space-y-3">
        <input
          name="name"
          type="text"
          placeholder="お名前"
          required
          autoComplete="name"
          className="w-full h-14 px-4 text-base bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <input
          name="email"
          type="email"
          placeholder="メールアドレス"
          required
          autoComplete="email"
          className="w-full h-14 px-4 text-base bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <input
          name="password"
          type="password"
          placeholder="パスワード（8文字以上）"
          required
          autoComplete="new-password"
          className="w-full h-14 px-4 text-base bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <SubmitButton>登録して始める</SubmitButton>
    </form>
  )
}
