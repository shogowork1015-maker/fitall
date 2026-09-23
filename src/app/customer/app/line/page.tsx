import { redirect } from 'next/navigation'

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function LegacyCustomerLinePage({ searchParams }: PageProps) {
  const params = await searchParams
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params ?? {})) {
    if (Array.isArray(value)) {
      for (const item of value) query.append(key, item)
      continue
    }
    if (value) query.set(key, value)
  }

  redirect(`/customer/app/mypage${query.size ? `?${query.toString()}` : ''}`)
}
