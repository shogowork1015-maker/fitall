'use client'

import { useState } from 'react'
import type { CustomerMenu } from '@/lib/customer-app'
import { Section, Row, Empty } from '@/ui/List'
import { Sheet } from '@/ui/Sheet'
import s from '@/ui/ui.module.css'
import { createCustomerTicketCheckoutAction } from './actions'
import { TicketPurchaseForm } from './TicketPurchaseForm'

function yen(amount: number) {
  return `¥${amount.toLocaleString()}`
}

function perSession(menu: CustomerMenu) {
  return menu.sessions > 0 ? yen(Math.round(menu.price / menu.sessions)) : null
}

// 買い足すチケット（A案）。2つ並べた面で回数と金額を見せ、押すと下から確認シートが出る
export function PlanList({ menus, preview }: { menus: CustomerMenu[]; preview: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const opened = menus.find((menu) => menu.id === openId)

  return (
    <>
      <Section title="買い足す" action="カード決済">
        {menus.length ? (
          <div className={s.plans}>
            {menus.map((menu) => (
              <button key={menu.id} type="button" className={s.plan} onClick={() => setOpenId(menu.id)}>
                <p className={s.planCount}>{menu.sessions}<small>回</small></p>
                <p className={s.planName}>{menu.name}</p>
                <p className={s.planPrice}>{yen(menu.price)}{menu.billing_type === 'monthly' ? '/月' : ''}</p>
                {perSession(menu) ? <p className={s.planPer}>1回あたり {perSession(menu)}</p> : null}
              </button>
            ))}
          </div>
        ) : <Empty>いま買えるチケットはありません</Empty>}
      </Section>

      <Sheet open={Boolean(opened)} onClose={() => setOpenId(null)} title={opened?.name ?? 'チケット'}>
        {opened ? (
          <>
            <div className={s.sheetPrice}>
              <p>お支払い</p>
              <p>{yen(opened.price)}{opened.billing_type === 'monthly' ? <small style={{ fontSize: 20 }}>/月</small> : null}</p>
            </div>
            <div style={{ marginTop: 18 }}>
              <Section group>
                <Row title="回数" value={opened.billing_type === 'monthly' ? `毎月${opened.sessions}回` : `${opened.sessions}回`} strongValue />
                {perSession(opened) ? <Row title="1回あたり" value={perSession(opened)} strongValue /> : null}
                {opened.description ? <Row title={opened.description} /> : null}
              </Section>
            </div>
            <Section footer="カード決済（Stripe）に進みます。購入後すぐに予約できます。">
              <div style={{ margin: '0 16px' }}>
                <TicketPurchaseForm planId={opened.id} checkoutAction={createCustomerTicketCheckoutAction} preview={preview} label={`${yen(opened.price)}を支払う`} />
              </div>
            </Section>
          </>
        ) : null}
      </Sheet>
    </>
  )
}
