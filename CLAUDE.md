# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev       # Start dev server (Turbopack, default)
npm run build     # Production build (Turbopack, default)
npm run start     # Start production server
npm run lint      # Run ESLint
```

No test runner is configured yet.

## Stack

- **Next.js 16.2** with App Router (`src/app/`)
- **React 19.2**
- **TypeScript 5**
- **Tailwind CSS v4** — uses `@import "tailwindcss"` and `@theme inline {}` in CSS; no `tailwind.config.js`
- **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`) — not yet wired up

## Next.js 16 breaking changes to keep in mind

- **Turbopack is the default** for both `next dev` and `next build`. Webpack requires the `--webpack` flag. Turbopack config moves from `experimental.turbopack` to top-level `turbopack` in `next.config.ts`.
- **Async Request APIs only** — `cookies()`, `headers()`, `draftMode()`, `params`, and `searchParams` are now fully async. Synchronous access was removed. Always `await` them.
- `params` / `searchParams` in `page.tsx`, `layout.tsx`, `route.ts`, OG image files, and `sitemap.ts` are all `Promise`s now.
- `next build` no longer runs the linter automatically; use `npm run lint` separately.
- `middleware.ts` convention replaced by `proxy` — read `node_modules/next/dist/docs/` before touching routing middleware.

## Conventions

- Import alias `@/*` maps to `src/*` (configured in `tsconfig.json`).
- Route handlers go in `src/app/api/`.
- Before writing any Next.js-specific code, read the relevant guide in `node_modules/next/dist/docs/01-app/` to verify current API shapes.


## Project: Limitless App

### アプリ概要
Limitless Appは、パーソナルトレーナーがお客様・予約・売上・チケットをまとめて管理するトレーナー専用アプリ。

### 重要なルール
- 常に日本語で返答する
- コメントも日本語で書く
- スマホファーストで実装する
- ボタンは最低56px、フォントは最小16px
- ローディング・エラー状態を必ず実装する
- あとでデザイン差し替えができるようスタイルはコンポーネントに閉じ込める

### 環境変数
NEXT_PUBLIC_SUPABASE_URL=https://twobwwufaphtmejyxfon.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3b2J3d3VmYXBodG1lanl4Zm9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzODU5MDEsImV4cCI6MjA5MDk2MTkwMX0.zjUg7i3BqUQ01yFzoOzGGXH5MVWOZCyvxsgWHmYA-qM

### DBテーブル（Supabase作成済み）
- users: id, name, email, role(trainer/trainee), line_user_id, created_at
- trainer_profiles: id, user_id, bio, price_per_session, created_at
- trainee_profiles: id, user_id, height, weight, goal, created_at
- trainer_trainee: id, trainer_id, trainee_id, status(pending/active/inactive), invite_token, created_at
- bookings: id, trainer_id, trainee_id, scheduled_at, status(pending/confirmed/cancelled/completed), price, created_at
- exercises: id, name, body_part, created_at
- workout_logs: id, trainee_id, booking_id, logged_at, memo, created_at
- workout_sets: id, log_id, exercise_id, set_number, weight_kg, reps, created_at
- sales_records: id, trainer_id, booking_id, amount, payment_method, paid_at
- plans: id, trainer_id, name, sessions, price, created_at

### ユーザー種別
**トレーナー（B2B）**
- メールアドレスで新規登録
- ダッシュボード・顧客管理・予約管理・売上管理・招待リンク生成

**トレーニー（B2C）**
- トレーナーが発行した招待リンクからのみ登録可能
- invite_tokenで自動的にトレーナーと紐付き

### 画面構成

#### 認証系
- /auth/login：ログイン（role判定で自動リダイレクト）
- /auth/register：トレーナー新規登録
- /invite/[token]：トレーニー招待登録

#### トレーナー側
- /trainer/dashboard：今日の予約・今月売上・お客さん総数
- /trainer/clients：顧客一覧
- /trainer/clients/[id]：顧客詳細（筋トレ履歴・体重推移）
- /trainer/bookings：予約承認・拒否
- /trainer/sales：売上管理
- /trainer/invite：招待リンク生成・LINE共有

#### トレーニー側
- /trainee/dashboard：今日のログ入力・次回予約確認
- /trainee/workout：筋トレノート（種目・重量・セット・レップス）
- /trainee/history：過去のトレーニング履歴
- /trainee/booking：予約リクエスト送信

### タブナビゲーション（底部固定）
**トレーナー**: ホーム / お客さん / 予約 / 売上
**トレーニー**: ホーム / トレーニング / 履歴 / 予約
