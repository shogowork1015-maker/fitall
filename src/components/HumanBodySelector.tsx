'use client'

import { useMemo, useState, ReactNode } from 'react'

const OUTLINE = '#D1D5DB' // Gray-300
const ACTIVE_COLOR = '#0066FF'

// 各部位のノード（点）の座標
const NODES = {
  '肩': { cx: 62, cy: 55 },
  '腕': { cx: 40, cy: 110 },
  '胸': { cx: 100, cy: 80 },
  '腹': { cx: 100, cy: 125 },
  '背中': { cx: 100, cy: 100 },
  '脚': { cx: 80, cy: 210 },
}

export function HumanBodySelector({
  selectedPart,
  onSelectPart,
  traineeName,
  exerciseMenu,
}: {
  selectedPart: string
  onSelectPart: (part: string) => void
  traineeName?: string
  exerciseMenu?: ReactNode
}) {
  const [isBack, setIsBack] = useState(false)

  // 選択されたパーツの座標から、メニュー上部へ線を引くアニメーションパスを生成
  const linePath = useMemo(() => {
    if (!selectedPart || !NODES[selectedPart as keyof typeof NODES]) return ''

    const { cx, cy } = NODES[selectedPart as keyof typeof NODES]

    // スムーズなベジェ曲線を計算 (点から少し横に出た後、画面下部中央へ向かう)
    const endX = 100
    const endY = 320 // The very bottom of the SVG viewBox (anchor for menu)

    const controlPointY = cy + (endY - cy) / 2
    const controlPoint1 = `${cx < 100 ? cx - 20 : cx + 20}, ${cy}`
    const controlPoint2 = `${endX}, ${controlPointY}`

    return `M ${cx} ${cy} C ${controlPoint1} ${controlPoint2} ${endX} ${endY}`
  }, [selectedPart])

  return (
    <div className="relative w-full h-[65vh] min-h-[500px] flex flex-col items-center p-4 overflow-visible">

      {/* Trainee Name / Header */}
      <div className="absolute top-4 left-4 z-10 drop-shadow-sm">
        <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase mb-1">Session Target</p>
        <h2 className="text-3xl font-black text-[#0A0A0A] tracking-tighter">
          {traineeName ?? 'Personal'} <span className="text-[#0066FF]">.</span>
        </h2>
      </div>

      {/* View Toggle */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => { setIsBack(false); onSelectPart('胸') }}
          className={`w-12 h-12 flex items-center justify-center rounded-full text-xs font-bold transition-all shadow-sm ${
            !isBack ? 'bg-[#0A0A0A] text-white scale-110 shadow-lg' : 'bg-white text-gray-400 border border-gray-100'
          }`}
        >
          前
        </button>
        <button
          type="button"
          onClick={() => { setIsBack(true); onSelectPart('背中') }}
          className={`w-12 h-12 flex items-center justify-center rounded-full text-xs font-bold transition-all shadow-sm ${
            isBack ? 'bg-[#0A0A0A] text-white scale-110 shadow-lg' : 'bg-white text-gray-400 border border-gray-100'
          }`}
        >
          後
        </button>
      </div>

      {/* Main SVG Map */}
      <div className="relative w-full max-w-[360px] aspect-[2/3] mt-12 mb-4">
        {/*
          SVG内の線を描画. viewBoxをはみ出しても大丈夫なように overflow="visible"
          下方向(Y=320)までリーダーラインが伸びるように少し高さを足す
        */}
        <svg viewBox="0 0 200 320" className="w-full h-full overflow-visible drop-shadow-md">

          {/* Human Body Background Image */}
          <image
            href="/human-body-silhouette.svg"
            x="0"
            y="0"
            width="200"
            height="320"
            preserveAspectRatio="xMidYMid meet"
            className="opacity-95"
          />

          <g className="opacity-80">

          {/* --- Interactive Nodes --- */}
          {Object.entries(NODES).map(([partName, { cx, cy }]) => {
            if (isBack && partName !== '背中' && partName !== '肩' && partName !== '腕' && partName !== '脚') return null
            if (!isBack && partName === '背中') return null

            const isSelected = selectedPart === partName

            return (
              <g
                key={partName}
                className="cursor-pointer"
                onClick={() => onSelectPart(partName)}
              >
                {/* Action Area (invisible, bigger hit target) */}
                <circle cx={cx} cy={cy} r="20" fill="transparent" />

                {isSelected && (
                  <>
                    <circle cx={cx} cy={cy} r="14" fill={ACTIVE_COLOR} opacity="0.15" className="animate-ping" style={{ transformOrigin: `${cx}px ${cy}px` }} />
                    <circle cx={cx} cy={cy} r="8" fill={ACTIVE_COLOR} opacity="0.3" />
                  </>
                )}

                <circle
                  cx={cx}
                  cy={cy}
                  r="5"
                  fill={isSelected ? ACTIVE_COLOR : '#FFF'}
                  stroke={isSelected ? ACTIVE_COLOR : OUTLINE}
                  strokeWidth="2.5"
                  className="transition-colors"
                />
              </g>
            )
          })}
          </g>

          {/* --- Leader Line (Animated callout wire) --- */}
          {linePath && (
            <path
              d={linePath}
              fill="transparent"
              stroke={ACTIVE_COLOR}
              strokeWidth="2"
              strokeDasharray="400"
              strokeDashoffset="400"
              className="line-draw-animation pointer-events-none"
            />
          )}

          <style jsx>{`
            .line-draw-animation {
              animation: draw 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            @keyframes draw {
              to {
                stroke-dashoffset: 0;
              }
            }
          `}</style>
        </svg>

        {/* The Callout Menu (rendered conditionally when exerciseMenu is provided) */}
        {exerciseMenu && linePath && (
          <div className="absolute top-[102%] inset-x-0 mx-auto w-[90%] max-w-[340px] animate-fade-in-up z-20">
            {/* Pointing triangle to connect visually with the line ending at x=100 (center) */}
            <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[10px] border-l-transparent border-r-transparent border-b-white mx-auto drop-shadow-sm mb-[-1px]"></div>

            <div className="w-full bg-white/90 backdrop-blur-xl rounded-[1.5rem] border border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.08)] px-4 py-4 mb-10 overflow-hidden">
              <div className="flex items-center gap-2 mb-3 px-2">
                <span className="w-2 h-2 rounded-full bg-[#0066FF] animate-pulse"></span>
                <span className="text-sm font-bold tracking-widest text-[#0066FF] uppercase">{selectedPart}</span>
              </div>
              <div className="max-h-[35vh] overflow-y-auto scrollbar-hide space-y-2">
                {exerciseMenu}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
