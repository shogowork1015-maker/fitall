'use client'

import { useFormStatus } from 'react-dom'
import type { ReactNode } from 'react'
import { Button } from './Button'

// フォームの送信ボタン。送信中は文言を変えて二重送信を防ぐ
export function SubmitButton({ children, pendingLabel = '処理しています…' }: { children: ReactNode; pendingLabel?: string }) {
  const { pending } = useFormStatus()
  return <Button type="submit" disabled={pending}>{pending ? pendingLabel : children}</Button>
}
