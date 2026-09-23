type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => {
      in: (column: string, values: string[]) => Promise<{ data: Record<string, string>[] | null }>
    }
  }
}

export async function loadTraineeNameMap(supabase: unknown, ids: string[]) {
  const client = supabase as SupabaseLike
  const uniqueIds = [...new Set(ids.filter(Boolean))]
  if (uniqueIds.length === 0) return {}

  const { data: directUsers } = await client.from('users').select('id, name').in('id', uniqueIds)
  const directMap = Object.fromEntries((directUsers ?? []).map((u) => [u.id, u.name]))

  const missingIds = uniqueIds.filter((id) => !directMap[id])
  if (missingIds.length === 0) return directMap

  const { data: profiles } = await client
    .from('trainee_profiles')
    .select('id, user_id')
    .in('id', missingIds)
  const userIds = [...new Set((profiles ?? []).map((p) => p.user_id).filter(Boolean))]
  const { data: profileUsers } = userIds.length
    ? await client.from('users').select('id, name').in('id', userIds)
    : { data: [] }

  const userNameMap = Object.fromEntries((profileUsers ?? []).map((u) => [u.id, u.name]))
  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, userNameMap[p.user_id] ?? 'お客さん']))

  return { ...directMap, ...profileMap }
}
