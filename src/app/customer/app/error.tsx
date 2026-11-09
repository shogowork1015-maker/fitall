'use client'

import { useEffect } from 'react'
import { ErrorState } from '@/ui/States'

export default function Error({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return <ErrorState onRetry={() => unstable_retry()} homeHref="/customer/app" />
}
