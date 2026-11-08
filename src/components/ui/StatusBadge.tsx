// 予約の状態を色付きの小さな印で示す。色の意味は全画面で揃える
const STATUS: Record<string, { label: string; tone?: 'accent' | 'warn' | 'ink' }> = {
  confirmed: { label: '確定', tone: 'accent' },
  pending: { label: '承認待ち', tone: 'warn' },
  completed: { label: '完了', tone: 'ink' },
  cancelled: { label: 'キャンセル' },
  rejected: { label: 'キャンセル' },
}

// カシカリ帳の「貸」「借」にならった1文字の札
const TAG: Record<string, string> = {
  confirmed: '確',
  pending: '待',
  completed: '完',
  cancelled: '消',
  rejected: '消',
}

// 状態の日本語名（右側の小さな説明などに使う）
export function statusLabel(status: string) {
  return STATUS[status]?.label ?? '状態確認中'
}

export function StatusTag({ status }: { status: string }) {
  return (
    <span className="fitall-tag" data-status={status} aria-label={statusLabel(status)}>
      {TAG[status] ?? '?'}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS[status] ?? { label: '状態確認中' }
  return (
    <span className="fitall-badge" data-tone={meta.tone}>
      {meta.label}
    </span>
  )
}
