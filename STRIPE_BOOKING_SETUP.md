# Limitless App Stripe Booking Setup

Limitless App はトレーナー専用の管理アプリです。お客様はLINEからマイページを作成し、チケット購入・予約・通知確認を行います。初回だけ公開予約ページからチケット購入と初回予約を同時に行えます。

## 登録リンク / 初回予約リンク

トレーナー管理画面の `/trainer/invite` から、お客様用の登録リンクまたは初回予約リンクを共有します。

```txt
/book/{trainer_profiles.id}
```

## 必須環境変数

```bash
NEXT_PUBLIC_APP_URL=https://your-domain.example
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
CUSTOMER_APP_SESSION_SECRET=long-random-string
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=Limitless App <noreply@your-domain.example>
CRON_SECRET=long-random-string
```

`SUPABASE_SERVICE_ROLE_KEY` は Stripe webhook が顧客・予約・売上を作成するために使います。ブラウザには絶対に出さないでください。
`CUSTOMER_APP_SESSION_SECRET` はお客様マイページ用Cookieの署名に使います。
`RESEND_API_KEY` が未設定の場合、メール送信はスキップされます。メール本文はサーバーログに出力しません。

## LINE通知の環境変数

LINE通知を使う場合は、LINE Developers で LINE Login channel と Messaging API channel を用意して、以下を追加します。

```bash
LINE_LOGIN_CHANNEL_ID=2000000000
LINE_LOGIN_CHANNEL_SECRET=xxx
LINE_LOGIN_STATE_SECRET=long-random-string
LINE_CHANNEL_ACCESS_TOKEN=xxx
```

LINE Login の callback URL:

```txt
https://your-domain.example/api/line/connect/callback
```

決済完了画面の「LINE通知を受け取る」からお客様の LINE userId を `users.line_user_id` に保存します。
通知送信は LINE を優先し、LINE未連携またはLINE送信失敗時はメールへフォールバックします。
LINE Login channel に LINE公式アカウントをリンクしておくと、連携時に友だち追加も促せます。

## Stripe webhook

Stripe Dashboard で webhook endpoint を追加します。

```txt
https://your-domain.example/api/stripe/webhook
```

受信イベント:

```txt
checkout.session.completed
```

## 決済後に作られるデータ

`checkout.session.completed` を受け取ると、以下を作成します。

- `users`: お客様の名前・メール・role=`trainee`
- `trainee_profiles`: お客様プロフィール
- `trainer_trainee`: トレーナーとの active 関係
- `bookings`: status=`confirmed`
- `sales_records`: payment_method=`stripe`
- `session_credit_purchases`: Stripe 決済に対応するチケット購入
- `session_credits`: 購入回数分のチケット

同時に以下の通知を送信します。

- お客様: 予約・決済完了通知
- トレーナー: 新規予約通知

LINE連携済みの場合はLINE通知、未連携の場合はメール通知になります。

## 二重予約対策

公開予約では以下の2段階で二重予約を防ぎます。

- Stripe Checkout 作成後、`booking_holds` に15分間の仮押さえを作成
- Stripe webhook で決済完了時に、既存予約とセッション時間が重なるか最終チェック

もし決済完了時点で希望日時が既存予約と重なっていた場合は、予約を `pending` で作成します。
この場合、チケットと売上は残しつつ、トレーナー側で日時を移動して調整できます。

本番前に以下の migration を適用してください。

```txt
supabase/migrations/20260702_production_booking_hardening.sql
```

## チケット方式

Stripe 決済は「予約枠の購入」ではなく「チケットの購入」として扱います。

- 1回メニューは1枚のチケットを発行
- 回数券メニューは `plans.sessions` の枚数分チケットを発行
- 最初に選んだ日時の予約へ1枚だけ紐付け
- トレーナーが予約日時を移動しても、同じ予約に紐付いたチケットは維持
- 予約をキャンセルした場合、紐付いたチケットは未使用に戻る
- 予約を完了した場合、紐付いたチケットは使用済みになる

このため、お客様とのやり取りで「こっちで日付を移動しておきますね」という運用ができます。

## 前日リマインド

`vercel.json` で毎日 9:00 に `/api/reminders` を実行します。

```json
{
  "path": "/api/reminders",
  "schedule": "0 9 * * *"
}
```

この API は翌日の確定済み予約を見て、お客様とトレーナーへLINE優先で通知します。LINE未連携の場合はメールを送ります。

## PWA Push 通知の扱い

現時点では、LINE通知とメールフォールバックを確実な通知手段にしています。
次の段階で、トレーナー管理画面だけに PWA Push 通知を追加できます。

想定する Push 通知:

- 新しい予約が入った
- Stripe 決済が完了した
- 予約変更・キャンセルがあった
- 明日の予約がある

## 事前に必要な設定

- `/trainer/settings` でメニュー名と料金を登録する
- `/trainer/availability` で予約受付枠を登録する
- Stripe の本番キーまたはテストキーを環境変数に設定する
- `/trainer/settings` の「本番準備チェック」で不足している環境変数を確認する
