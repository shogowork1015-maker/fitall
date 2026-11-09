import { loadCustomerAppData } from '@/lib/customer-app'
import { CustomerBookingList } from '../CustomerBookingList'
import { Screen } from '@/ui/Screen'
import { Section, Row } from '@/ui/List'

export default async function CustomerBookingListPage() {
  const data = await loadCustomerAppData()
  if (!data) {
    return (
      <Screen title="予約">
        <Section group footer="LINEの登録リンクからマイページを開くと、予約を確認できます。">
          <Row title="お客様情報が見つかりません" />
        </Section>
      </Screen>
    )
  }
  return <CustomerBookingList managementEnabled={!data.preview} upcomingBookings={data.upcomingBookings} pastBookings={data.pastBookings} sessionMinutes={data.sessionMinutes} />
}
