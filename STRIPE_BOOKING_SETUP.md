# Limitless App Stripe Booking Setup

Limitless App はトレーナー専用の管理アプリです。お客様はLINEからマイページを作成し、チケット購入・予約・通知確認を行います。公開ページでもチケットだけを購入し、その後マイページから日時を選んで予約します。

## 登録リンク / チケット購入リンク

トレーナー管理画面の `/trainer/invite` から、お客様用の登録リンクまたは購入リンクを共有します。

```txt
/book/{trainer_profiles.id}
```

## 必須環境変数

```bash
NEXT_PUBLIC_APP_URL=https://your-domain.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
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

## 現行の購入・予約フロー

1. `/book/{trainer_profiles.id}` または `/customer/app/tickets` でチケットを購入。
2. 署名検証済みの `checkout.session.completed` から顧客・トレーナーとの関連、`session_credit_purchases` と購入枚数分の `session_credits` を作成。
3. お客様が `/customer/app/bookings` で日時を選び、利用可能なチケット1枚を予約に紐付ける。
4. `/customer/app/bookings/list` で予約を確認。

現行のチケット単独購入では予約・`sales_records`・予約通知は作成しません。トレーナーの売上集計は支払済みの購入を参照します。予約時には再決済しません。トレーナーによる取消ではチケットを未使用に戻し、完了では使用済みにします。これらの実DBでの確認は別途必要です。

旧方式の `scheduled_at` 付きCheckoutを処理する互換コードは残っていますが、現在の購入フォームからは日時を送信しません。

## 公開前に閉じる課題

- 決済Webhookの並行再送：末尾の原子的発行RPCをローカル実装・検証済み。対象DBへの適用とStripe経由の再送確認は未実施です。
- 同時予約：時間帯の排他制約と予約/チケットの原子的処理をローカル実装・競合検証済み。対象DBと実機での検証は未実施です。
- 取消期限・期限切れ・返金の運用ルールと実装確認。チケット返却とStripe返金は別処理です。
- 購入レコードが存在する状態で、対象期間の旧Stripe売上と購入の対応を確認できない場合、売上集計は推測せず停止します。購入レコードがゼロの場合は旧Stripe売上を集計します。既存データを移す場合は照合が必要です。
- リマインド再実行時の重複送信防止は未確認です。テスト環境ではCronと実通知を有効化しないでください。

## DB準備

`supabase/migrations/` は既存の基本スキーマがあるDBを前提にした差分です。空のDBを完成させるセットとしては扱わないでください。適用履歴、テーブル、権限・RLSを対象DBで照合してから、隔離したテスト環境で検証します。初期化・データ削除・本番への一括適用は行いません。

## 前日リマインド

`vercel.json` に `/api/reminders` のスケジュールが定義されています。実際のデプロイ先での起動・認証・時刻は別途確認します。

```json
{
  "path": "/api/reminders",
  "schedule": "0 0 * * *"
}
```

この API は翌日の確定済み予約を見て、お客様とトレーナーへLINE優先で通知します。LINE未連携の場合はメールを送ります。

## PWA Push 通知の扱い

現行コードにはLINE通知とメールフォールバックがあります。到達確認と再送・失敗時の運用確認は未完了です。
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

## 本番移行の順序

1. 店舗・Stripe入金先・公開先の所有者を確定し、商品、期限、取消・返金ルールを決める。
2. 隔離DB、Stripeテスト環境、実ログインを使う検証URLを準備する。秘密値はホスティングの環境変数へ設定し、チャットやGitに保存しない。
3. 購入→Webhook→チケット→予約→管理画面→売上を通し、失敗・再送・同時操作も検証する。通知は承認済みのテスト宛先のみ。
4. クライアントのスマホで受入確認し、バックアップ・障害復旧・問い合わせ先を確認する。
5. 本番設定と公開対象を確認してリリースし、少人数で運用開始する。

Stripeテストはテストキーとテストカードを使用し、実課金を行わない：
https://docs.stripe.com/testing

`/trainer/settings` の準備チェックは主に環境変数の有無・形式の判定です。接続成功、Webhook到達、ログイン成功、本番稼働を証明するものではありません。

LINE Loginには利用する導線のcallbackを登録します：
- `/api/line/app/callback`：お客様マイページ入口
- `/api/line/customer-connect/callback`：顧客連携
- `/api/line/connect/callback`：決済情報からの連携

各パスには当該環境の公開オリジンを付けます。テスト環境と本番でURL・キー・DBを取り違えないでください。

## 二重発行・同時予約対策の適用（2026-11-03、未適用）

`20261103110747_atomic_tickets_and_booking_ranges.sql` とアプリ変更はセットです。

- チケット発行RPCは購入行をロックして不足分だけ発行。予約RPCはチケット行をロックし、予約作成と紐付けを一つのトランザクションで処理します。両RPCはservice_roleだけが実行でき、顧客の識別・受付枠はサーバー側で確認します。
- `bookings.occupied_range` に予約時間を保持し、pending/confirmed/completedの重複をDBの排他制約で拒否します。既存予約の長さは適用時点のトレーナー設定から補完されるため、過去の実際の時間と一致するか適用前に確認が必要です。以後、設定変更で既存予約の長さは変わりません。
- 対象DBのバックアップ・スキーマ・RLS・トリガー・既存予約の重複と所要時間を読み取り確認してから、まず隔離環境へ適用します。既存の重複がある場合はmigration全体がロールバックします。自動取消・自動削除はしません。補完UPDATEによる既存トリガーの副作用も対象DBで確認します。
- 旧アプリ/Webhookワーカーと同時稼働させないでください。メンテナンス中に書込みを止め、旧scheduled_at付きCheckoutの未処理分を確認し、DB適用→アプリ切替→接続テスト→受付再開の順に進めます。切替前後の決済通知の再送はStripe側で確認します。
- RPC/カラム未適用時は安全性の低い旧方式へフォールバックしません。実データで予約・購入する前にDB側の適用が必要です。現在はローカルの隔離PostgreSQLでのみ検証済みです。

競合テスト（外部DBへ接続せず、一時DBを起動）：

```sh
npm install --prefix /tmp/fitall-concurrency-db embedded-postgres pg
node scripts/test-booking-concurrency.mjs /tmp/fitall-concurrency-db/node_modules
node --test tests/*.test.mjs
```

テストはポート55439を使い、終了時にDBを停止します。本番の接続URLや `.env.local` を使用しません。
