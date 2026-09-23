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
      className={
        className ??
        'w-full h-14 bg-[#0A0A0A] text-white text-sm font-bold rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] transition-transform'
      }
    >
      {pending ? '処理中...' : children}
    </button>
  )
}
