'use client'

import { useState } from 'react'
import { createInviteAction } from './actions'
import { Toast } from '@/components/Toast'

interface InviteLink {
  id: string
  invite_token: string
  status: string
  created_at: string
}

export function InviteManager({ initialLinks }: { initialLinks: InviteLink[] }) {
  const [links, setLinks] = useState(initialLinks)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  async function handleCreate() {
    setLoading(true)
    setError(null)
    try {
      const result = await createInviteAction()

      if ('error' in result) {
        setError(result.error)
        return
      }

      // 成功時：reloadせずにstateを直接更新
      setLinks((prev) => [result, ...prev])
    } catch {
      // サーバーは 200 でもクライアント側で例外になることがある（ネットワーク切断など）
      setError('通信に失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  function getInviteUrl(token: string) {
    return `${window.location.origin}/invite/${token}`
  }

  async function handleCopy(token: string) {
    await navigator.clipboard.writeText(getInviteUrl(token))
    setToast('URLをコピーしました')
  }

  function handleLineShare(token: string) {
    const url = encodeURIComponent(getInviteUrl(token))
    const text = encodeURIComponent(
      `FITALLアプリの招待リンクです。タップして登録してください！\n`
    )
    window.open(
      `https://social-plugins.line.me/lineit/share?url=${url}&text=${text}`,
      '_blank'
    )
  }

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* 新規生成ボタン */}
      <button
        onClick={handleCreate}
        disabled={loading}
        className="w-full h-14 bg-[#0066FF] text-white text-sm font-bold rounded-full disabled:opacity-40 active:scale-[0.97] transition-transform"
      >
        {loading ? '作成中...' : '+ 新しい招待リンクを作成'}
      </button>

      {/* エラー表示 */}
      {error && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[14px] px-4 py-3 text-sm text-[#EF4444]">
          {error}
        </div>
      )}

      {/* 既存の招待リンク */}
      {links.length === 0 ? (
        <div className="bg-white rounded-[20px] p-6 text-center text-sm text-[#9CA3AF] border border-[#E5E7EB]">
          招待リンクがありません。上のボタンで作成してください
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div
              key={link.id}
              className="bg-white rounded-[20px] p-4 border border-[#E5E7EB] shadow-[0px_1px_3px_rgba(0,0,0,0.04),0px_1px_2px_rgba(0,0,0,0.06)]"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-[#9CA3AF]">
                  {new Date(link.created_at).toLocaleDateString('ja-JP')}
                </p>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    link.status === 'active'
                      ? 'bg-[#DCFCE7] text-[#166534]'
                      : 'bg-[#FEF3C7] text-[#92400E]'
                  }`}
                >
                  {link.status === 'active' ? '登録済み' : '未使用'}
                </span>
              </div>

              <p className="text-xs text-[#6B7280] break-all bg-[#F8F9FA] rounded-[10px] px-3 py-2 font-mono">
                /invite/{link.invite_token.slice(0, 16)}...
              </p>

              {link.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleCopy(link.invite_token)}
                    className="flex-1 h-11 bg-[#F8F9FA] text-[#0A0A0A] text-sm font-semibold rounded-full border border-[#E5E7EB] active:scale-[0.97] transition-transform"
                  >
                    URLをコピー
                  </button>
                  <button
                    onClick={() => handleLineShare(link.invite_token)}
                    className="flex-1 h-11 bg-[#06C755] text-white text-sm font-semibold rounded-full active:scale-[0.97] transition-transform"
                  >
                    LINEで送る
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
