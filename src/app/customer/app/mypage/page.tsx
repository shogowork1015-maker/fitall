import { loadCustomerAppData } from '@/lib/customer-app'
import { Screen, Note } from '@/ui/Screen'
import ui from '@/ui/ui.module.css'
import { Section, Row, Banner } from '@/ui/List'

interface PageProps {
  searchParams?: Promise<{
    line?: string
  }>
}

function statusMessage(status?: string): { tone: 'info' | 'error'; text: string } | null {
  if (status === 'connected') return { tone: 'info', text: 'LINE通知を連携しました。' }
  if (status === 'setup-required') return { tone: 'error', text: 'LINE連携の設定がまだ完了していません。' }
  if (status === 'failed') return { tone: 'error', text: 'LINE連携に失敗しました。もう一度お試しください。' }
  if (status === 'login-required') return { tone: 'error', text: 'LINEの登録リンクからマイページを開くと連携できます。' }
  if (status === 'customer-only') return { tone: 'error', text: 'LINE通知はお客様本人のマイページで連携します。' }
  return null
}

// マイページ。設定アプリと同じく、項目を意味ごとのまとまりに分けて並べる
export default async function CustomerMyPage({ searchParams }: PageProps) {
  const params = await searchParams
  const data = await loadCustomerAppData()
  const message = statusMessage(params?.line)

  if (!data) {
    return (
      <Screen title="マイページ">
        <Section group footer="LINEの登録リンクからマイページを開いてください。">
          <Row title="お客様情報が見つかりません" />
        </Section>
      </Screen>
    )
  }

  const connected = Boolean(data.customer.lineUserId)
  const consult = `https://social-plugins.line.me/lineit/share?text=${encodeURIComponent(`${data.trainer.name}さん、相談したいことがあります。\n${data.customer.name}`)}`

  return (
    <Screen title="マイページ">
      {message ? <Banner tone={message.tone}>{message.text}</Banner> : null}

      <div style={{ padding: '8px 22px 0' }}>
        <p style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.01em' }}>{data.customer.name}</p>
        {data.customer.email ? <p style={{ color: 'var(--ui-label-2)', fontSize: 15, marginTop: 2 }}>{data.customer.email}</p> : null}
      </div>

      <Section header="トレーニング" group>
        <Row title="担当トレーナー" value={data.trainer.name} />
        {data.customer.goal ? <Row title="目標" value={data.customer.goal} /> : null}
      </Section>

      <Section
        header="通知"
        group
        footer={!connected && !data.viewer.canConnectLine ? 'LINEの登録リンクからマイページを開くと連携できます。' : undefined}
      >
        {connected || !data.viewer.canConnectLine ? (
          <Row
            title="LINEで受け取る"
            subtitle="予約の確定・前日のお知らせ"
            trailing={<span className={ui.switch} data-on={connected} role="img" aria-label={connected ? 'オン' : 'オフ'} />}
          />
        ) : (
          <Row href="/api/line/customer-connect/start" title="LINEと連携する" subtitle="予約の確定・前日のお知らせが届きます" />
        )}
      </Section>

      <Section header="そのほか" group>
        <Row href={consult} external title="トレーナーに相談する" />
        <Row title="ホーム画面に追加する方法" subtitle="Safariの共有ボタンから「ホーム画面に追加」" />
      </Section>

      {data.preview ? <Note>確認モード（サンプル表示）</Note> : null}
    </Screen>
  )
}
