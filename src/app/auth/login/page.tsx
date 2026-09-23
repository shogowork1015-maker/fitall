import { LoginForm } from './LoginForm'
import { isDevAuthBypassEnabled } from '@/lib/dev-preview'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ trainerOnly?: string }> | { trainerOnly?: string }
}) {
  const resolvedSearchParams = await searchParams
  return (
    <LoginForm
      trainerOnly={resolvedSearchParams.trainerOnly === '1'}
      devAuthBypass={isDevAuthBypassEnabled()}
    />
  )
}
