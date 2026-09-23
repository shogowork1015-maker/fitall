'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Toast } from '@/components/Toast'
import { HumanBodySelector } from '@/components/HumanBodySelector'
import { RestTimer } from './RestTimer'

// デフォルト種目（DBが空のときシード）
const DEFAULT_EXERCISES = [
  { name: 'ベンチプレス', body_part: '胸' },
  { name: 'ダンベルフライ', body_part: '胸' },
  { name: 'インクラインプレス', body_part: '胸' },
  { name: 'プッシュアップ', body_part: '胸' },
  { name: 'デッドリフト', body_part: '背中' },
  { name: 'ラットプルダウン', body_part: '背中' },
  { name: 'ベントオーバーロウ', body_part: '背中' },
  { name: 'チンアップ', body_part: '背中' },
  { name: 'スクワット', body_part: '脚' },
  { name: 'レッグプレス', body_part: '脚' },
  { name: 'ランジ', body_part: '脚' },
  { name: 'レッグカール', body_part: '脚' },
  { name: 'ショルダープレス', body_part: '肩' },
  { name: 'サイドレイズ', body_part: '肩' },
  { name: 'フロントレイズ', body_part: '肩' },
  { name: 'バーベルカール', body_part: '腕' },
  { name: 'ハンマーカール', body_part: '腕' },
  { name: 'トライセップスプレスダウン', body_part: '腕' },
  { name: 'クランチ', body_part: '腹' },
  { name: 'レッグレイズ', body_part: '腹' },
  { name: 'プランク', body_part: '腹' },
]

interface Exercise {
  id: string
  name: string
  body_part: string
}

interface WorkSet {
  id?: string
  exercise_id: string
  exercise_name: string
  set_number: number
  weight_kg: number
  reps: number
  saved: boolean
}

interface PrevSet {
  set_number: number
  weight_kg: number
  reps: number
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatVolume(kg: number): string {
  if (kg >= 10000) return `${(kg / 1000).toFixed(0)}t`
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
  return `${kg.toLocaleString()}kg`
}

// +/- ステッパー入力コンポーネント
function NumericStepper({
  value,
  onChange,
  step,
  min,
  label,
  unit,
}: {
  value: string
  onChange: (v: string) => void
  step: number
  min: number
  label: string
  unit: string
}) {
  function dec() {
    const v = parseFloat(value || '0')
    const next = Math.max(min, parseFloat((v - step).toFixed(2)))
    onChange(String(next))
  }
  function inc() {
    const v = parseFloat(value || '0')
    onChange(String(parseFloat((v + step).toFixed(2))))
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <label className="text-xs font-semibold text-[#9CA3AF]">{label}</label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={dec}
          className="w-14 h-16 flex items-center justify-center bg-[#F5F5F5] border border-gray-200 rounded-[14px] text-2xl font-bold text-[#666666] active:scale-[0.97] transition-transform"
        >
          −
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          className="w-24 h-16 text-center text-3xl font-black bg-[#F5F5F5] rounded-[14px] focus:outline-none focus:ring-2 focus:ring-[#0A0A0A]"
        />
        <button
          type="button"
          onClick={inc}
          className="w-14 h-16 flex items-center justify-center bg-[#0066FF] text-white rounded-[14px] text-2xl font-bold active:scale-[0.97] transition-transform"
        >
          +
        </button>
      </div>
      <p className="text-xs text-[#9CA3AF]">{unit}</p>
    </div>
  )
}

export function WorkoutLogger({
  traineeProfileId,
  traineeName,
  logId: initialLogId,
  initialPrMap,
  lastRoutine,
}: {
  traineeProfileId: string | null
  traineeName?: string
  logId: string | null
  initialPrMap: Record<string, number>
  lastRoutine: { id: string; name: string }[]
}) {
  const supabase = useMemo(() => createClient(), [])

  // 基本ステート
  const [logId, setLogId] = useState<string | null>(initialLogId)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedPart, setSelectedPart] = useState<string>('胸')
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [sets, setSets] = useState<WorkSet[]>([])
  const [prevSets, setPrevSets] = useState<PrevSet[]>([])
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [view, setView] = useState<'exercise' | 'log'>('exercise')

  // セッション計測
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [totalVolume, setTotalVolume] = useState(0)
  const initialLoadDone = useRef(false)

  // PR
  const [prMap, setPrMap] = useState<Record<string, number>>(initialPrMap)

  // インターバルタイマー（key でリセット）
  const [restTimerKey, setRestTimerKey] = useState<number | null>(null)
  const REST_DURATION = 90

  // セッション経過タイマー
  useEffect(() => {
    if (!sessionStartTime) return
    const interval = setInterval(() => {
      setSessionSeconds(Math.floor((Date.now() - sessionStartTime.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [sessionStartTime])

  // 種目一覧を読み込み（なければデフォルトをシード）
  useEffect(() => {
    async function loadExercises() {
      const { data } = await supabase
        .from('exercises')
        .select('id, name, body_part')
        .order('body_part')

      if (data && data.length > 0) {
        setExercises(data)
      } else {
        const { data: inserted } = await supabase
          .from('exercises')
          .insert(DEFAULT_EXERCISES)
          .select('id, name, body_part')
        if (inserted) setExercises(inserted)
      }
    }
    loadExercises()
  }, [supabase])

  // 今日のセットを初期ロード
  useEffect(() => {
    if (!logId || initialLoadDone.current) return

    async function loadSets() {
      const { data: savedSets } = await supabase
        .from('workout_sets')
        .select('id, exercise_id, set_number, weight_kg, reps')
        .eq('log_id', logId!)
        .order('set_number')

      if (!savedSets?.length) return

      const exIds = [...new Set(savedSets.map((s) => s.exercise_id))]
      const { data: exData } = await supabase
        .from('exercises')
        .select('id, name')
        .in('id', exIds)
      const exMap = Object.fromEntries((exData ?? []).map((e) => [e.id, e.name]))

      const loaded = savedSets.map((s) => ({
        id: s.id,
        exercise_id: s.exercise_id,
        exercise_name: exMap[s.exercise_id] ?? '不明',
        set_number: s.set_number,
        weight_kg: s.weight_kg,
        reps: s.reps,
        saved: true,
      }))

      setSets(loaded)
      setTotalVolume(loaded.reduce((sum, s) => sum + s.weight_kg * s.reps, 0))
      setSessionStartTime(new Date())
      initialLoadDone.current = true
    }

    loadSets()
  }, [logId, supabase])

  // 今日のログを作成または取得
  const ensureLog = useCallback(async () => {
    if (logId) return logId
    if (!traineeProfileId) return null

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: existing } = await supabase
      .from('workout_logs')
      .select('id')
      .eq('trainee_id', traineeProfileId)
      .gte('logged_at', since)
      .order('logged_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) { setLogId(existing.id); return existing.id }

    const { data: created, error: insertError } = await supabase
      .from('workout_logs')
      .insert({ trainee_id: traineeProfileId, logged_at: new Date().toISOString() })
      .select('id')
      .maybeSingle()

    if (created) { setLogId(created.id); return created.id }

    if (insertError) {
      const { data: retry } = await supabase
        .from('workout_logs')
        .select('id')
        .eq('trainee_id', traineeProfileId)
        .gte('logged_at', since)
        .order('logged_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (retry) { setLogId(retry.id); return retry.id }
      console.error('[ensureLog] insert error:', JSON.stringify(insertError))
    }

    return null
  }, [logId, traineeProfileId, supabase])

  // 種目を選択してログビューへ
  async function selectExercise(exercise: Exercise) {
    setSelectedExercise(exercise)
    setWeight('')
    setReps('')
    setView('log')

    if (!traineeProfileId) { setPrevSets([]); return }

    // 前回セッションのセットを取得
    const todayMidnight = new Date()
    todayMidnight.setHours(0, 0, 0, 0)
    const { data: prevLog } = await supabase
      .from('workout_logs')
      .select('id')
      .eq('trainee_id', traineeProfileId)
      .lt('logged_at', todayMidnight.toISOString())
      .order('logged_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (prevLog) {
      const { data: prev } = await supabase
        .from('workout_sets')
        .select('set_number, weight_kg, reps')
        .eq('log_id', prevLog.id)
        .eq('exercise_id', exercise.id)
        .order('set_number')
      setPrevSets(prev ?? [])
    } else {
      setPrevSets([])
    }
  }

  // 前回のセットをコピー
  function copyPrevSet() {
    const idx = todaySetsForExercise.length
    const target = prevSets[idx] ?? prevSets[prevSets.length - 1]
    if (!target) return
    setWeight(String(target.weight_kg))
    setReps(String(target.reps))
  }

  const todaySetsForExercise = sets.filter(
    (s) => s.exercise_id === selectedExercise?.id
  )

  // セットを追加
  async function addSet() {
    if (!selectedExercise || !weight || !reps) return
    setError(null)
    setSaving(true)

    if (!traineeProfileId) {
      setError('プロフィールが見つかりません。ページを再読み込みしてください。')
      setSaving(false)
      return
    }

    const currentLogId = await ensureLog()
    if (!currentLogId) {
      setError('トレーニングログの作成に失敗しました。ページを再読み込みしてください。')
      setSaving(false)
      return
    }

    const setNumber = todaySetsForExercise.length + 1
    const weightNum = parseFloat(weight)
    const repsNum = parseInt(reps, 10)

    const { data: saved, error: saveError } = await supabase
      .from('workout_sets')
      .insert({
        log_id: currentLogId,
        exercise_id: selectedExercise.id,
        set_number: setNumber,
        weight_kg: weightNum,
        reps: repsNum,
      })
      .select('id')
      .maybeSingle()

    if (saveError || !saved) {
      console.error('[addSet] error:', JSON.stringify(saveError))
      setError(`保存に失敗しました: ${saveError?.message ?? '不明なエラー'}`)
      setSaving(false)
      return
    }

    // セット追加
    const newSet: WorkSet = {
      id: saved.id,
      exercise_id: selectedExercise.id,
      exercise_name: selectedExercise.name,
      set_number: setNumber,
      weight_kg: weightNum,
      reps: repsNum,
      saved: true,
    }
    setSets((prev) => [...prev, newSet])
    setTotalVolume((v) => v + weightNum * repsNum)

    // セッションタイマー開始
    if (!sessionStartTime) setSessionStartTime(new Date())

    // PR判定
    const currentPr = prMap[selectedExercise.id] ?? 0
    if (weightNum > currentPr) {
      setPrMap((prev) => ({ ...prev, [selectedExercise.id]: weightNum }))
      setToast(`🏆 ${selectedExercise.name} 自己ベスト更新！ ${weightNum}kg`)
    } else {
      setToast(`Set ${setNumber} を保存しました`)
    }

    // インターバルタイマー起動
    setRestTimerKey((k) => (k ?? -1) + 1)

    // 回数リセット（重量は維持）
    setReps('')
    setSaving(false)
  }

  const lastRoutineOrder = useMemo(
    () => new Map(lastRoutine.map((exercise, index) => [exercise.id, index])),
    [lastRoutine]
  )
  const filteredExercises = exercises
    .filter((e) => e.body_part === selectedPart)
    .sort((a, b) => {
      const aOrder = lastRoutineOrder.get(a.id) ?? Number.POSITIVE_INFINITY
      const bOrder = lastRoutineOrder.get(b.id) ?? Number.POSITIVE_INFINITY
      if (aOrder !== bOrder) return aOrder - bOrder
      return a.name.localeCompare(b.name, 'ja')
    })
  const sessionActive = sessionStartTime !== null || sets.length > 0
  const currentPrForSelected = prMap[selectedExercise?.id ?? ''] ?? 0

  return (
    <div className="px-4 pt-6 pb-32">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {restTimerKey !== null && (
        <RestTimer
          key={restTimerKey}
          duration={REST_DURATION}
          onDone={() => setRestTimerKey(null)}
          onSkip={() => setRestTimerKey(null)}
        />
      )}

      {view === 'exercise' ? (
        /* ─── 種目選択ビュー (フルスクリーン人体模型) ──────────────────────────────── */
        <div className="fixed inset-0 bg-[#F8F9FA] z-30 flex flex-col">

          {/* Header placeholder if needed or relying on HumanBodySelector */}
          <div className="flex-1 overflow-hidden relative">
            <HumanBodySelector
              selectedPart={selectedPart}
              onSelectPart={setSelectedPart}
              traineeName={traineeName}
              exerciseMenu={
                filteredExercises.map((ex) => {
                  const doneSets = sets.filter((s) => s.exercise_id === ex.id).length
                  const pr = prMap[ex.id]
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => selectExercise(ex)}
                      className="w-full min-h-16 bg-white rounded-[1.25rem] px-5 py-3 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-between text-left active:scale-[0.98] transition-transform"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-base font-bold text-[#0A0A0A] truncate">{ex.name}</span>
                        {doneSets > 0 && (
                          <span className="flex-shrink-0 text-xs bg-[#DCFCE7] text-[#166534] px-2 py-0.5 rounded-full font-bold">
                            {doneSets}set済
                          </span>
                        )}
                      </div>
                      {pr && (
                        <span className="flex-shrink-0 text-xs text-[#9CA3AF] font-medium ml-2">
                          PR {pr}kg
                        </span>
                      )}
                    </button>
                  )
                })
              }
            />
          </div>

        </div>


      ) : (
        /* ─── セット入力ビュー (フルスクリーン記録画面) ──────────────────────────────── */
        <div className="fixed inset-0 bg-[#F8F9FA] z-50 overflow-y-auto pb-safe flex flex-col">
          {/* Header */}
          <div className="sticky top-0 z-40 bg-white px-4 py-4 flex items-center justify-between shadow-sm border-b border-gray-100">
            <button
              type="button"
              onClick={() => setView('exercise')}
              className="text-2xl font-bold text-[#0066FF] active:scale-95 transition-transform"
            >
              ‹
            </button>
            <h2 className="text-lg font-black tracking-[-0.02em] text-[#0A0A0A] truncate px-2">
              {selectedExercise?.name}
            </h2>
            <div className="w-8"></div>
          </div>

          <div className="p-4 space-y-6 flex-1 flex flex-col">

            {/* PR & Session Stopwatch */}
            <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-[#EBF3FF] text-[#0066FF] flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Elapsed Time</p>
                  <p className="text-xl font-black tabular-nums text-[#0A0A0A]">
                    {formatTime(sessionSeconds)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">PR (Max)</p>
                <p className="text-xl font-black tabular-nums text-[#0A0A0A]">
                  {currentPrForSelected > 0 ? `${currentPrForSelected}kg` : '-'}
                </p>
                {sessionActive && (
                  <p className="mt-1 text-[11px] font-bold text-[#0066FF]">
                    VOL {formatVolume(totalVolume)}
                  </p>
                )}
              </div>
            </div>

            {/* 前回の記録 + コピーボタン */}
            {prevSets.length > 0 && (
              <div className="rounded-[1.5rem] border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-[#0066FF] uppercase tracking-wider mb-1">Last Time</p>
                    <p className="text-xl font-black text-[#0A0A0A] tracking-tight">
                      {prevSets[0]!.weight_kg}kg × {prevSets[0]!.reps}rep
                      <span className="text-sm font-semibold text-gray-400 ml-1">× {prevSets.length}sets</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={copyPrevSet}
                    className="flex-shrink-0 px-5 h-12 bg-gray-100 text-[#0A0A0A] text-sm font-bold rounded-xl active:scale-[0.96] transition-transform"
                  >
                    コピー
                  </button>
                </div>
              </div>
            )}

            {/* 今日のセット一覧 */}
            {todaySetsForExercise.length > 0 && (
              <div>
                <p className="text-sm font-bold text-gray-400 mb-3 ml-2">
                  Today ({todaySetsForExercise.length} sets)
                </p>
                <div className="space-y-2">
                  {todaySetsForExercise.map((s) => {
                    const isPrSet = s.weight_kg >= (prMap[s.exercise_id] ?? 0) && s.weight_kg > 0
                    return (
                      <div
                        key={s.set_number}
                        className="flex items-center justify-between bg-white rounded-2xl px-5 py-4 border border-gray-100 shadow-sm"
                      >
                        <span className="text-base font-bold text-gray-400">
                          Set {s.set_number}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black text-[#0A0A0A] tabular-nums">
                            {s.weight_kg}kg × {s.reps}reps
                          </span>
                          {isPrSet && (
                            <span className="text-xl drop-shadow-sm">🏆</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* セット入力 (最下部に固定するか、そのまま並べるか) */}
            <div className="mt-auto bg-white rounded-[2rem] p-6 shadow-[0_-4px_24px_rgba(0,0,0,0.04)] border border-gray-100">
              <p className="text-center text-sm font-bold text-[#0066FF] uppercase tracking-[0.2em] mb-6">
                Next: Set {todaySetsForExercise.length + 1}
              </p>

              <div className="flex items-end justify-center gap-4 mb-8">
                <NumericStepper
                  value={weight}
                  onChange={setWeight}
                  step={2.5}
                  min={0}
                  label="WEIGHT"
                  unit="kg"
                />
                <span className="text-3xl text-gray-200 font-black pb-8">×</span>
                <NumericStepper
                  value={reps}
                  onChange={setReps}
                  step={1}
                  min={0}
                  label="REPS"
                  unit="reps"
                />
              </div>

              {error && (
                <div className="mb-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3 text-sm font-medium text-[#D4183D] text-center">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={addSet}
                disabled={saving || !weight || !reps || Number(reps) <= 0}
                className="w-full h-16 bg-[#0066FF] text-white text-lg font-black tracking-widest rounded-2xl disabled:opacity-40 active:scale-[0.98] transition-all shadow-lg shadow-[#0066FF]/30"
              >
                {saving
                  ? 'SAVING...'
                  : `SAVE`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
