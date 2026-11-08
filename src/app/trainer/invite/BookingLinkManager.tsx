'use client'

import { useState } from 'react'
import { Toast } from '@/components/Toast'
import { LinkIcon } from '@/components/ui/Icons'

export function BookingLinkManager({ trainerProfileId }: { trainerProfileId: string }) {
  const [toast, setToast] = useState<string | null>(null)
  const bookingPath = `/book/${trainerProfileId}`

  function bookingUrl() {
    return `${window.location.origin}${bookingPath}`
  }

  function message() {
    return `Limitless Appでメニュー購入と予約ができます。\n購入後はLINE通知も連携できます。\nこちらから開いてください。\n${bookingUrl()}`
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(bookingUrl())
    setToast('アプリ入口をコピーしました')
  }

  async function copyMessage() {
    await navigator.clipboard.writeText(message())
    setToast('LINE招待文をコピーしました')
  }

  function shareLine() {
    const text = encodeURIComponent(message())
    window.open(`https://social-plugins.line.me/lineit/share?text=${text}`, '_blank')
  }

  return (
    <div className="space-y-7">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <section>
        <h2 className="fitall-group-label">送られるメッセージ</h2>
        <div className="fitall-card p-4">
          {/* LINEの吹き出しに近い見た目で、お客様に届く文面を確認できるようにする */}
          <div className="rounded-[18px] rounded-tl-md bg-surface-soft px-4 py-3">
            <p className="whitespace-pre-line text-base leading-relaxed text-ink">
              Limitless Appでメニュー購入と予約ができます。{'\n'}
              購入後はLINE通知も連携できます。{'\n'}
              こちらから開いてください。
            </p>
            <p className="mt-1 break-all text-base font-medium text-brand">{bookingPath}</p>
          </div>
          <button type="button" onClick={shareLine} className="fitall-aqua-action mt-4">
            LINEで招待を送る
          </button>
        </div>
      </section>

      <section className="fitall-group">
        <button type="button" onClick={copyUrl} className="fitall-row w-full text-left">
          <span className="fitall-icon-tile"><LinkIcon /></span>
          <span className="fitall-row-main fitall-row-title">リンクだけコピー</span>
          <span className="text-base font-semibold text-brand">コピー</span>
        </button>
        <button type="button" onClick={copyMessage} className="fitall-row w-full text-left">
          <span className="fitall-icon-tile"><CopyIcon /></span>
          <span className="fitall-row-main fitall-row-title">招待文をまとめてコピー</span>
          <span className="text-base font-semibold text-brand">コピー</span>
        </button>
      </section>
    </div>
  )
}

function CopyIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="12" height="12" rx="2.5" />
      <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
    </svg>
  )
}
