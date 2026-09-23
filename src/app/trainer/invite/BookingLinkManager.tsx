'use client'

import { useState } from 'react'
import { Toast } from '@/components/Toast'

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
    <div className="space-y-4">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <section className="fitall-card-strong overflow-hidden">
        <div className="fitall-table-head px-4 py-3">
          <p className="text-[10px] font-black tracking-[0.12em] text-white/70">LINE INVITE</p>
          <h2 className="mt-1 text-base font-black text-white">お客様アプリへ招待</h2>
        </div>
        <div className="space-y-3 p-4">
          <button type="button" onClick={shareLine} className="fitall-aqua-action fitall-tap">
            LINEでアプリ招待を送る
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={copyUrl} className="fitall-secondary-action fitall-tap">
              入口コピー
            </button>
            <button type="button" onClick={copyMessage} className="fitall-secondary-action fitall-tap">
              招待文コピー
            </button>
          </div>
        </div>
      </section>

      <section className="fitall-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="fitall-section-title">アプリ入口</p>
          <span className="fitall-pill fitall-pill-aqua">LINE共有用</span>
        </div>
        <p className="break-all rounded-[6px] bg-[#F4F7F7] px-3 py-3 font-mono text-xs font-bold leading-relaxed text-[#0A0A0A]">
          {bookingPath}
        </p>
      </section>

      <section className="fitall-card p-4">
        <p className="fitall-section-title">LINE用テンプレ</p>
        <div className="mt-3 rounded-[6px] border border-[#DDE8E8] bg-white px-3 py-3">
          <p className="whitespace-pre-line text-sm font-bold leading-relaxed text-[#0A0A0A]">
            Limitless Appでメニュー購入と予約ができます。{'\n'}
            購入後はLINE通知も連携できます。{'\n'}
            こちらから開いてください。{'\n'}
            {bookingPath}
          </p>
        </div>
      </section>
    </div>
  )
}
