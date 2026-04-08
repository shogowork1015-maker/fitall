'use client'

import { useFormStatus } from 'react-dom'

interface SubmitButtonProps {
  children: React.ReactNode
  className?: string
}

export function SubmitButton({ children, className }: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className={
        className ??
        'w-full h-14 bg-[#0066FF] text-white text-sm font-bold rounded-full disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] transition-transform'
      }
    >
      {pending ? '処理中...' : children}
    </button>
  )
}
