'use client'

import { useEffect } from 'react'

export function Toast({
  message,
  onDone,
}: {
  message: string
  onDone: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[#0A0A0A] text-white px-5 py-3 rounded-full text-sm font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.16)] animate-fade-in whitespace-nowrap">
      <span className="text-[#22C55E]">✓</span>
      {message}
    </div>
  )
}
