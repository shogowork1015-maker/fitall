'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import type { CustomerAvailabilityDay } from '@/lib/customer-app'
import { createCustomerBookingAction, type CustomerBookingActionState } from './actions'

const displayHours = ['09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20']

export function CustomerWeekCalendar({
  availability,
  availableTicketCount,
}: {
  availability: CustomerAvailabilityDay[]
  availableTicketCount: number
}) {
  const [state, action] = useActionState<CustomerBookingActionState, FormData>(
    createCustomerBookingAction,
    null
  )
  const weekAvailability = availability.slice(0, 7)

  return (
    <form action={action} className="p-3">
      {state && (
        <div
          className={`mb-3 border-2 px-3 py-3 text-sm font-black ${
            state.status === 'success'
              ? 'border-[#12C7BE] bg-[#E8FBFA] text-[#087D78]'
              : 'border-[#D4183D] bg-[#FEF2F2] text-[#D4183D]'
          }`}
        >
          <p>{state.message}</p>
          {state.status === 'error' && state.needsPurchase && (
            <Link href="/customer/app/tickets" className="mt-2 inline-flex font-black underline">
              チケットを購入する
            </Link>
          )}
        </div>
      )}

      <div className="overflow-hidden border-2 border-[#DDE8E8] bg-white">
        <div className="grid grid-cols-[46px_repeat(7,minmax(0,1fr))] border-b-2 border-[#DDE8E8]">
          <div className="border-r-2 border-[#DDE8E8] bg-[#0A0A0A]" />
          {weekAvailability.map((day) => (
            <div
              key={day.dateKey}
              className={`border-r border-[#DDE8E8] px-1 py-2 text-center last:border-r-0 ${
                day.openCount ? 'bg-[#E8FBFA]' : 'bg-[#F4F7F7]'
              }`}
            >
              <p className="text-[10px] font-black leading-tight text-[#0A0A0A]">{day.dateLabel}</p>
              <p className="mt-0.5 text-[9px] font-black leading-tight text-[#087D78]">{day.weekday}</p>
            </div>
          ))}
        </div>

        <div className="max-h-[356px] overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-[46px_repeat(7,minmax(0,1fr))]">
            {displayHours.map((hour) => (
              <div key={`row-${hour}`} className="contents">
                <div className="flex h-12 items-center justify-center border-b border-r-2 border-[#DDE8E8] bg-[#F4F7F7]">
                  <p className="text-[10px] font-black text-[#555555]">{hour}:00</p>
                </div>
                {weekAvailability.map((day) => {
                  const openCell = day.cells.find(
                    (cell) => cell.time.slice(0, 2) === hour && cell.status === 'open'
                  )

                  if (!openCell?.value) {
                    return (
                      <div
                        key={`${day.dateKey}-${hour}`}
                        className="flex h-12 flex-col items-center justify-center border-b border-r border-[#DDE8E8] bg-[#F4F7F7] text-[#A8B2B2] last:border-r-0"
                      >
                        <span className="text-[9px] font-black leading-none">{hour}:00</span>
                        <span className="mt-0.5 text-sm font-black leading-none">×</span>
                      </div>
                    )
                  }

                  if (availableTicketCount <= 0) {
                    return (
                      <div
                        key={`${day.dateKey}-${hour}`}
                        className="flex h-12 flex-col items-center justify-center border-b border-r border-[#DDE8E8] bg-[#E8FBFA] text-[#087D78] last:border-r-0"
                      >
                        <span className="text-[9px] font-black leading-none">{openCell.availableLabel}</span>
                        <span className="mt-0.5 text-sm font-black leading-none">○</span>
                      </div>
                    )
                  }

                  return (
                    <button
                      key={`${day.dateKey}-${hour}`}
                      type="submit"
                      name="scheduled_at"
                      value={openCell.value}
                      className="fitall-tap flex h-12 flex-col items-center justify-center border-b border-r border-[#DDE8E8] bg-[#12C7BE] text-white last:border-r-0"
                    >
                      <span className="text-[9px] font-black leading-none">{openCell.availableLabel}</span>
                      <span className="mt-0.5 text-sm font-black leading-none">○</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-2 border-[#DDE8E8] bg-[#F4F7F7] px-3 py-2">
        <p className="text-[11px] font-black text-[#555555]">時間だけスクロール</p>
        <p className="text-[11px] font-black text-[#087D78]">
          {availableTicketCount > 0 ? '○で予約確定' : 'チケット購入が必要'}
        </p>
      </div>

      {availableTicketCount <= 0 && (
        <div className="mt-3 border-2 border-[#0A0A0A] bg-white p-3">
          <p className="text-sm font-black text-[#0A0A0A]">予約するにはチケットが必要です</p>
          <p className="mt-1 text-xs font-bold leading-relaxed text-[#555555]">
            空いている時間を確認してから、チケットを購入してください。
          </p>
          <Link href="/customer/app/tickets" className="fitall-primary-action fitall-tap mt-3 h-11 text-xs">
            チケットを購入する
          </Link>
        </div>
      )}
    </form>
  )
}
