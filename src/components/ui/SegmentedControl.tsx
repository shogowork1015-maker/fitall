'use client'

import type { CSSProperties } from 'react'

// 日／週／月のような排他選択。選択の背景が滑って移動する
export function SegmentedControl<T extends string>({ options, value, onChange, label }: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
}) {
  const index = Math.max(0, options.findIndex(option => option.value === value))
  const style = { '--fitall-segment-count': options.length } as CSSProperties

  return (
    <div role="group" aria-label={label} className="fitall-segmented" style={style}>
      <span aria-hidden="true" className="fitall-segmented-thumb" style={{ transform: `translateX(${index * 100}%)` }} />
      {options.map(option => (
        <button key={option.value} type="button" aria-pressed={option.value === value} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  )
}
