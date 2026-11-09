import { CustomerTabNav } from './CustomerTabNav'
import s from '@/ui/ui.module.css'

// お客様アプリの枠。どの画面も下部タブの上に収める
export default function CustomerAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <div className={s.appFrame}>{children}</div>
      <CustomerTabNav />
    </>
  )
}
