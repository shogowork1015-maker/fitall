import { loadCustomerAppData, loadCustomerAppEntryData } from '@/lib/customer-app'
import { Screen, Note } from '@/ui/Screen'
import { Section, Row, Banner } from '@/ui/List'
import { Button, Buttons } from '@/ui/Button'
import { TicketCard } from '@/ui/TicketCard'
import { PlanList } from './PlanList'

interface PageProps {
  searchParams?: Promise<{
    purchase?: string
    trainer_id?: string
  }>
}

function lineShareUrl(message: string) {
  return `https://social-plugins.line.me/lineit/share?text=${encodeURIComponent(message)}`
}

function purchaseMessage(status?: string): { tone: 'info' | 'error'; text: string } | null {
  if (status === 'success') return { tone: 'info', text: 'チケットを購入しました。反映まで数秒かかる場合があります。' }
  if (status === 'cancelled') return { tone: 'info', text: '購入をキャンセルしました。' }
  if (status === 'failed') return { tone: 'error', text: '決済画面を開けませんでした。時間をおいてもう一度お試しください。' }
  if (status === 'missing-plan') return { tone: 'error', text: 'メニューが見つかりません。' }
  if (status === 'unavailable') return { tone: 'error', text: 'このメニューは現在購入できません。' }
  if (status === 'invalid') return { tone: 'error', text: 'メニュー情報が正しくありません。' }
  return null
}

// チケットタブ。
// 来る理由：残りを確かめる／足りなければ買う。主役：持っているチケット。主な操作：買う（一覧から選ぶ）
export default async function CustomerTicketsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const data = await loadCustomerAppData()
  const entryData = data ? null : await loadCustomerAppEntryData(params?.trainer_id)
  const message = purchaseMessage(params?.purchase)

  if (!data) {
    return (
      <Screen title="チケット">
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
    <Screen caption={`担当 ${data.trainer.name}`} title="チケット">
      {message ? <Banner tone={message.tone}>{message.text}</Banner> : null}

      {data.tickets.length ? data.tickets.map((ticket) => (
        <TicketCard
          key={ticket.id}
          title={ticket.title}
          right={ticket.expiresLabel}
          remaining={ticket.remaining}
          scheduled={ticket.scheduled}
          used={ticket.used}
          total={ticket.total}
          foot={[
            { label: '予約済み', value: `${ticket.scheduled}回` },
            { label: '使用済み', value: `${ticket.used}回` },
            ticket.purchasedLabel
              ? { label: '購入日', value: ticket.purchasedLabel }
              : { label: '種類', value: ticket.kind === 'monthly' ? '月謝' : '回数券' },
          ]}
        />
      )) : (
        <Section group footer="下から選ぶと、そのまま予約できるようになります。">
          <Row title="使えるチケットがありません" />
        </Section>
      )}

      <PlanList menus={data.menus} preview={data.preview} />

      <Section header="困ったとき" group>
        <Row
          href={lineShareUrl(`${data.trainer.name}さん、チケットの繰越について相談したいです。\n${data.customer.name}`)}
          external
          title="繰越をトレーナーに相談"
          subtitle="LINEで連絡します"
        />
      </Section>

      {data.preview ? <Note>確認モード（購入はできません）</Note> : null}
    </Screen>
  )
}
