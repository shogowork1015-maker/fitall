'use client'

import { useFormStatus } from 'react-dom'

interface SubmitButtonProps {
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

export function SubmitButton({ children, className, disabled = false }: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={`${className ?? 'fitall-primary-action'} gap-2 disabled:opacity-50`}
    >
      {pending && <span aria-hidden="true" className="fitall-spinner" />}
      {pending ? '処理中…' : children}
    </button>
  )
}
