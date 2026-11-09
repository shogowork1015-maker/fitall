'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Screen, IconLink, Note } from '@/ui/Screen'
import { Section, Empty } from '@/ui/List'
import { Button, Buttons } from '@/ui/Button'
import { Card, CardTop, CardList, CardItem } from '@/ui/Card'
import { Plus, Search } from '@/ui/icons'
import s from '@/ui/ui.module.css'

export type ClientRow = {
  id: string
  name: string
  last: string
  sessions: number
  credits: number
  /** 最近買ったチケットの名前（例：4回チケット） */
  ticketName?: string | null
  /** 最後に来た日（例：11/2）。黒い面に出す */
  lastDate?: string
}

function reminderUrl(name: string) {
  const text = `${name}さん、いつもありがとうございます。チケットの残りが少なくなりました。次回のご予約の前に、チケットのご購入をお願いします。`
  return `https://social-plugins.line.me/lineit/share?text=${encodeURIComponent(text)}`
}

// お客様タブ（A案）。
// 主役：声をかけるべき人（チケットが残り少ない）を黒い面に。一覧は残り回数を右に大きく
export function ClientList({ clients, preview = false }: { clients: ClientRow[]; preview?: boolean }) {
  const [query, setQuery] = useState('')
  const low = clients.filter((client) => client.credits <= 1)
  const shown = query.trim() ? clients.filter((client) => client.name.includes(query.trim())) : clients

  return (
    <Screen
      caption={clients.length ? `${clients.length}名` : undefined}
      title="お客様"
      actions={<IconLink href="/trainer/clients/new" label="お客様を追加"><Plus /></IconLink>}
    >
      {clients.length ? (
        <label className={s.search}>
          <Search />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="名前で探す" aria-label="名前で探す" />
        </label>
      ) : null}

      {low.length && !query ? (
        <Card label="チケットが残り少ない">
          <CardTop left="チケットが残り少ない" right={`${low.length}名`} />
          <CardList>
            {low.map((client) => (
              <CardItem
                key={client.id}
                title={`${client.name}`}
                subtitle={`${client.ticketName || `残り${client.credits}回`} ・ 最終 ${client.lastDate ?? client.last}`}
                trailing={<Button variant="aqua" size="small" href={reminderUrl(client.name)} external>案内する</Button>}
              />
            ))}
          </CardList>
        </Card>
      ) : null}

      {clients.length ? (
        <Section title={query ? `「${query}」` : 'すべて'} action={query ? `${shown.length}名` : '最近来た順'}>
          {shown.length ? (
            <div className={s.people}>
              {shown.map((client) => (
                <Link key={client.id} href={`/trainer/clients/${client.id}`} className={s.person}>
                  <span className={s.personMain}>
                    <b>{client.name}</b>
                    <span>{client.last} ・ 今月 {client.sessions}回</span>
                  </span>
                  <span className={s.personCount}>{client.credits}<small>回</small></span>
                </Link>
              ))}
            </div>
          ) : <Empty>見つかりませんでした</Empty>}
        </Section>
      ) : (
        <Section>
          <Empty>まだお客様がいません。仮登録して、LINEで登録リンクを送れます。</Empty>
          <Buttons><Button href="/trainer/clients/new">お客様を追加</Button></Buttons>
        </Section>
      )}

      {preview ? <Note>確認モード（サンプル表示）</Note> : null}
    </Screen>
  )
}
