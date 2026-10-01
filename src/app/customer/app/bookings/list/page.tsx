import { loadCustomerAppData } from '@/lib/customer-app'
import { CustomerBookingList } from '../CustomerBookingList'

export default async function CustomerBookingListPage() {
  const data = await loadCustomerAppData()
  if (!data) return <main className="px-4 py-10">
    <h1 className="text-2xl font-black">予約一覧</h1>
    <p className="mt-4 text-sm leading-relaxed">LINEの登録リンクからマイページを開いて、予約をご確認ください。</p>
  </main>
  return <CustomerBookingList upcomingBookings={data.upcomingBookings} pastBookings={data.pastBookings} />
}
