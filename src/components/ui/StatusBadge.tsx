// 予約の状態を色付きの小さな印で示す。色の意味は全画面で揃える
const STATUS: Record<string, { label: string; tone?: 'accent' | 'warn' | 'ink' }> = {
  confirmed: { label: '確定', tone: 'accent' },
  pending: { label: '承認待ち', tone: 'warn' },
  completed: { label: '完了', tone: 'ink' },
  cancelled: { label: 'キャンセル' },
  rejected: { label: 'キャンセル' },
}

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS[status] ?? { label: '状態確認中' }
  return (
    <span className="fitall-badge" data-tone={meta.tone}>
      {meta.label}
    </span>
  )
}
