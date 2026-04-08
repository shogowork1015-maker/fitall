'use client'

import { useActionState, useState } from 'react'
import { saveBodyRecordAction, type BodyRecordState } from '@/app/trainee/dashboard/actions'
import { SubmitButton } from '@/components/SubmitButton'

export function BodyWeightInput() {
  const [open, setOpen] = useState(false)
  const [state, action] = useActionState<BodyRecordState, FormData>(
    saveBodyRecordAction,
    null
  )

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full h-12 rounded-full border-[1.5px] border-[#E5E7EB] bg-white text-sm font-semibold text-[#0A0A0A] active:bg-[#F8F9FA] transition-colors"
      >
        + 今日の体重を記録
      </button>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-[#0A0A0A]">体重を記録</p>
        <button
          onClick={() => setOpen(false)}
          className="text-sm font-medium text-[#6B7280]"
        >
          閉じる
        </button>
      </div>

      {'success' in (state ?? {}) ? (
        <p className="text-sm text-[#22C55E] text-center py-2 font-semibold">
          記録しました！
        </p>
      ) : (
        <form action={action} className="space-y-3">
          {state && 'error' in state && (
            <p className="text-sm text-[#EF4444]">{state.error}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#9CA3AF] block mb-1">
                体重 (kg)
              </label>
              <input
                name="weight_kg"
                type="number"
                step="0.1"
                min="0"
                placeholder="65.0"
                required
                inputMode="decimal"
                className="w-full h-14 text-center text-xl font-bold bg-[#F8F9FA] border-[1.5px] border-[#E5E7EB] rounded-[14px] focus:outline-none focus:border-[#0066FF] focus:ring-[3px] focus:ring-[#0066FF]/25"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#9CA3AF] block mb-1">
                体脂肪率 (%)
              </label>
              <input
                name="body_fat_pct"
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="20.0"
                inputMode="decimal"
                className="w-full h-14 text-center text-xl font-bold bg-[#F8F9FA] border-[1.5px] border-[#E5E7EB] rounded-[14px] focus:outline-none focus:border-[#0066FF] focus:ring-[3px] focus:ring-[#0066FF]/25"
              />
            </div>
          </div>
          <SubmitButton>記録する</SubmitButton>
        </form>
      )}
    </div>
  )
}
