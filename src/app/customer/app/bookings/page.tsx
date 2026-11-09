import { loadCustomerAppData, loadCustomerAppEntryData } from '@/lib/customer-app'
import { createCustomerBookingAction } from './actions'
import { CustomerWeekCalendar } from './CustomerWeekCalendar'
import { Screen } from '@/ui/Screen'
import { Section, Row, Banner } from '@/ui/List'
import { Button, Buttons } from '@/ui/Button'

interface PageProps {
  searchParams?: Promise<{
    booked?: string
    trainer_id?: string
  }>
}

// 予約する画面（ホームの「予約する」から開く下の階層）
export default async function CustomerBookingsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const data = await loadCustomerAppData()
  const entryData = data ? null : await loadCustomerAppEntryData(params?.trainer_id)
  const availableTicketCount = data?.tickets.reduce((sum, ticket) => sum + ticket.remaining, 0) ?? 0

  if (!data) {
    return (
      <Screen title="日時を選ぶ" back={{ href: '/customer/app', label: 'ホーム' }}>
        <Section header="はじめての方" group footer="チケットを買うと、空いている日時から予約できます。">
          {entryData
            ? <Row title="担当トレーナー" value={`${entryData.trainer.name}さん`} />
            : <Row title="LINEの登録リンクから開き直してください" />}
        </Section>
        {entryData ? <Buttons><Button href={`/book/${entryData.trainer.profileId}`}>チケットを買う</Button></Buttons> : null}
      </Screen>
    )
  }

  return (
    <Screen title="日時を選ぶ" back={{ href: '/customer/app', label: 'ホーム' }}>
      {params?.booked === '1' ? <Banner>予約しました。チケットを1回使う予定にしました。</Banner> : null}
      <CustomerWeekCalendar
        availability={data.availability}
        availableTicketCount={availableTicketCount}
        bookingAction={data.preview ? undefined : createCustomerBookingAction}
        preview={data.preview}
      />
    </Screen>
  )
}
