'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Toast } from '@/components/Toast'
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

const BODY_PARTS = ['胸', '背中', '脚', '肩', '腕', '腹']

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
          className="w-14 h-16 flex items-center justify-center bg-[#F3F4F6] rounded-[14px] text-2xl font-bold text-[#6B7280] active:scale-[0.97] transition-transform"
        >
          −
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          className="w-24 h-16 text-center text-3xl font-black bg-[#F8F9FA] rounded-[14px] focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
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
  logId: initialLogId,
  initialPrMap,
  lastRoutine,
}: {
  traineeProfileId: string | null
  logId: string | null
  initialPrMap: Record<string, number>
  lastRoutine: { id: string; name: string }[]
}) {
  const supabase = createClient()

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
  }, [])

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

  const filteredExercises = exercises.filter((e) => e.body_part === selectedPart)
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
        /* ─── 種目選択ビュー ──────────────────────────────── */
        <div className="space-y-5">

          {/* セッション進行中：統計バー */}
          {sessionActive ? (
            <div className="bg-[#0A0A0A] rounded-[16px] px-5 py-4 text-white grid grid-cols-3 divide-x divide-[#262626]">
              <div className="pr-4">
                <p className="text-[10px] text-[#6B7280] font-medium mb-1">経過時間</p>
                <p className="text-xl font-black tracking-tight tabular-nums">
                  {formatTime(sessionSeconds)}
                </p>
              </div>
              <div className="px-4">
                <p className="text-[10px] text-[#6B7280] font-medium mb-1">総ボリューム</p>
                <p className="text-xl font-black tracking-tight">
                  {formatVolume(totalVolume)}
                </p>
              </div>
              <div className="pl-4">
                <p className="text-[10px] text-[#6B7280] font-medium mb-1">セット数</p>
                <p className="text-xl font-black tracking-tight">
                  {sets.length}
                  <span className="text-sm text-[#6B7280] font-normal ml-1">set</span>
                </p>
              </div>
            </div>
          ) : (
            /* セッション未開始：ヘッダー */
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#0066FF] mb-1">
                今日のセッション
              </p>
              <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[#0A0A0A]">種目を選ぶ</h1>
              <p className="text-sm text-[#6B7280] mt-1">
                部位から選んで、セットを入力していきます
              </p>
            </div>
          )}

          {/* 前回のメニュー（ルーティン） */}
          {lastRoutine.length > 0 && !sessionActive && (
            <div className="rounded-[16px] border border-[#E5E7EB] bg-white p-4">
              <p className="text-xs font-bold text-[#1D4ED8] mb-3">
                前回のメニューで始める
              </p>
              <div className="space-y-2">
                {lastRoutine.map((ex) => {
                  const pr = prMap[ex.id]
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => {
                        const found = exercises.find((e) => e.id === ex.id)
                        if (found) selectExercise(found)
                      }}
                      className="w-full flex items-center justify-between min-h-12 bg-white rounded-[12px] px-4 py-3 text-left border border-[#E5E7EB] active:scale-[0.99] transition-transform"
                    >
                      <span className="font-semibold text-[#0A0A0A]">{ex.name}</span>
                        <span className="text-xs text-[#6B7280] font-semibold">
                        {pr ? `PR ${pr}kg` : '→'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 部位タブ */}
          <div>
            <p className="text-xs font-semibold text-[#9CA3AF] mb-2">部位で選ぶ</p>
            <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-hide">
              {BODY_PARTS.map((part) => (
                <button
                  key={part}
                  type="button"
                  onClick={() => setSelectedPart(part)}
                  className={`flex-shrink-0 h-10 px-5 rounded-full text-sm font-semibold transition-colors ${
                    selectedPart === part
                      ? 'bg-[#111827] text-white'
                      : 'bg-white border border-[#E5E7EB] text-[#6B7280]'
                  }`}
                >
                  {part}
                </button>
              ))}
            </div>
          </div>

          {/* 種目リスト */}
          <div className="space-y-2">
            {filteredExercises.map((ex) => {
              const doneSets = sets.filter((s) => s.exercise_id === ex.id).length
              const pr = prMap[ex.id]
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => selectExercise(ex)}
                  className="w-full min-h-14 bg-white rounded-[16px] px-4 py-3.5 border border-[#E5E7EB] flex items-center justify-between text-left active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-[#0A0A0A] truncate">{ex.name}</span>
                    {doneSets > 0 && (
                      <span className="flex-shrink-0 text-xs bg-[#F3F4F6] text-[#6B7280] px-2 py-0.5 rounded-full">
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
            })}
          </div>
        </div>
      ) : (
        /* ─── セット入力ビュー ──────────────────────────────── */
        <div className="space-y-5">
          <button
            type="button"
            onClick={() => setView('exercise')}
            className="flex items-center gap-1 min-h-10 text-sm font-semibold text-[#0066FF]"
          >
            ← 種目に戻る
          </button>

          {/* 種目名 + PR バッジ */}
          <div>
            <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-[#0A0A0A]">
              {selectedExercise?.name}
            </h2>
            {currentPrForSelected > 0 && (
              <p className="text-sm text-[#9CA3AF] mt-1">
                🏆 PR: <span className="font-bold text-[#6B7280]">{currentPrForSelected}kg</span>
              </p>
            )}
          </div>

          {/* 前回の記録 + コピーボタン */}
          {prevSets.length > 0 && (
            <div className="rounded-[16px] border border-[#E5E7EB] bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#1D4ED8] mb-1">前回</p>
                  <p className="text-sm font-bold text-[#1E3A8A]">
                    {prevSets[0]!.weight_kg}kg × {prevSets[0]!.reps}rep × {prevSets.length}セット
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyPrevSet}
                  className="flex-shrink-0 px-4 h-10 bg-[#111827] text-white text-sm font-bold rounded-full active:scale-[0.98] transition-transform"
                >
                  コピー
                </button>
              </div>

              {prevSets.length > 1 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {prevSets.map((s) => (
                    <span
                      key={s.set_number}
                      className="text-xs text-[#6B7280] bg-[#F3F4F6] px-2.5 py-1 rounded-[6px] font-medium"
                    >
                      Set{s.set_number}: {s.weight_kg}kg×{s.reps}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 今日のセット一覧 */}
          {todaySetsForExercise.length > 0 && (
            <div>
              <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-[0.1em] mb-2">
                今日のセット — {todaySetsForExercise.length}セット完了
              </p>
              <div className="space-y-1.5">
                {todaySetsForExercise.map((s) => {
                  const isPrSet = s.weight_kg >= (prMap[s.exercise_id] ?? 0) && s.weight_kg > 0
                  return (
                    <div
                      key={s.set_number}
                      className="flex items-center justify-between bg-white rounded-[14px] px-4 py-3 border border-[#E5E7EB]"
                    >
                      <span className="text-sm font-medium text-[#9CA3AF]">
                        Set {s.set_number}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#0A0A0A] tabular-nums">
                          {s.weight_kg}kg × {s.reps}reps
                        </span>
                        {isPrSet && (
                          <span className="text-sm">🏆</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* セット入力 */}
          <div className="bg-white rounded-[16px] px-5 py-6 border border-[#E5E7EB]">
            <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-[0.1em] mb-5">
              Set {todaySetsForExercise.length + 1}
            </p>

            <div className="flex items-end justify-center gap-3 mb-6">
              <NumericStepper
                value={weight}
                onChange={setWeight}
                step={2.5}
                min={0}
                label="重量"
                unit="kg"
              />
              <span className="text-2xl text-[#E5E7EB] font-bold pb-8">×</span>
              <NumericStepper
                value={reps}
                onChange={setReps}
                step={1}
                min={0}
                label="回数"
                unit="reps"
              />
            </div>

            {error && (
              <div className="mb-4 bg-[#FEF2F2] border border-[#FECACA] rounded-[14px] px-3 py-2 text-sm text-[#EF4444]">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={addSet}
              disabled={saving || !weight || !reps}
              className="w-full h-14 bg-[#0A0A0A] text-white text-sm font-bold rounded-full disabled:opacity-40 active:scale-[0.98] transition-transform"
            >
              {saving
                ? '保存中...'
                : `+ Set ${todaySetsForExercise.length + 1} を追加`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
