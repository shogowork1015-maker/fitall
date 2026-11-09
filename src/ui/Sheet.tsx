'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import s from './ui.module.css'

// 下から出るシート。確認や詳細はページを移らずにここで見せる
export function Sheet({ open, onClose, title, children }: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // 閉じるボタンに枠が出ないよう、シート自体に焦点を置く
      dialog.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  // 閉じるときは下へ滑らせてから閉じる
  function requestClose() {
    setClosing(true)
    window.setTimeout(() => {
      setClosing(false)
      onClose()
    }, 280)
  }

  return (
    <dialog
      ref={ref}
      tabIndex={-1}
      className={s.sheet}
      data-closing={closing}
      aria-label={title}
      onCancel={(event) => { event.preventDefault(); requestClose() }}
      onClick={(event) => { if (event.target === ref.current) requestClose() }}
    >
      <div className={s.sheetHead}>
        <h2 className={s.sheetTitle}>{title}</h2>
        <button type="button" className={s.sheetClose} onClick={requestClose}>閉じる</button>
      </div>
      <div className={s.sheetBody}>{children}</div>
    </dialog>
  )
}
