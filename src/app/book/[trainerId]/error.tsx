'use client'

import { useEffect } from 'react'
import { ErrorScreen } from '@/components/ui/ScreenStates'

export default function Error({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return <ErrorScreen onRetry={() => unstable_retry()} homeHref="/" />
}
