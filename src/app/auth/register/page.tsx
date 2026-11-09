'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { registerAction, type RegisterState } from './actions'
import s from '@/ui/ui.module.css'
import { SubmitButton } from '@/ui/SubmitButton'

// トレーナーの新規登録。ログインと同じ形で、入力欄を1つのまとまりにする
export default function RegisterPage() {
  const [state, action] = useActionState<RegisterState, FormData>(registerAction, null)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className={s.screen}>
      <main className={s.entry}>
        <span className={s.wordmark}>Limitless</span>
        <h1 className={s.entryTitle}>新規登録</h1>
        <p className={s.entryLead}>お客様・予約・売上をまとめて管理できます</p>

        <form action={action} style={{ marginTop: 32 }}>
          <div className={s.group}>
            <div className={s.field}>
              <label htmlFor="register-name">お名前</label>
              <input id="register-name" name="name" type="text" autoComplete="name" placeholder="山田 太郎" required />
            </div>
            <div className={s.field}>
              <label htmlFor="register-email">メール</label>
              <input id="register-email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="name@example.com" required />
            </div>
            <div className={s.field}>
              <label htmlFor="register-password">パスワード</label>
              <input id="register-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="8文字以上" required />
              <button type="button" className={s.fieldAction} onClick={() => setShowPassword((value) => !value)} aria-pressed={showPassword}>
                {showPassword ? '隠す' : '表示'}
              </button>
            </div>
          </div>

          {state?.error ? <p role="alert" className={s.formError}>{state.error}</p> : null}

          <div style={{ marginTop: 24 }}>
            <SubmitButton pendingLabel="登録しています…">登録する</SubmitButton>
          </div>
        </form>

        <p className={s.entryLinks}>
          アカウントをお持ちの方は<Link href="/auth/login">ログイン</Link>
        </p>

        <p className={s.entryFoot}>登録後、設定から販売メニューを作ると、お客様用の登録リンクを送れます。</p>
      </main>
    </div>
  )
}
