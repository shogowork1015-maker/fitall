# Limitless App 改善提案

現在のデータベース構成（トレーナー/トレーニーのセッション管理・予約・売上管理・ワークアウト記録）や、`DESIGN.md` で定義されているモダンでストイックなUI方針（Nike Training ClubやStravaに近いアプローチ）を踏まえ、**アプリの価値をさらに高めるための改善点・追加機能**を以下の3つのレイヤーで提案します。

---

## 1. コア機能の拡張 (機能・データモデル面)

現在のシステムは「予約」と「セッション（ワークアウト）の記録」、そして「売上」の管理が中心ですが、実際のパーソナルトレーニング業務やトレーニーのモチベーション維持に直結する機能がいくつか不足しています。

### 1-1. 回数券（チケット）・サブスクリプション管理
*   **現状:** `Plan` テーブルは存在しますが、実際の消費ロジックや残り回数の追跡が不足している可能性があります。
*   **改善案:** トレーニーが「10回券」などを購入し、`Booking` が完了（Completed）になった段階でチケット残数を自動で1減らす仕組み。トレーニー側からも「あと何回残っているか」がダッシュボードでひと目で分かるようにします。

### 1-2. ワークアウトテンプレート（メニュー作成機能）
*   **現状:** トレーナーが毎回のセッションでゼロから `WorkoutSet` を登録するのは手間です。
*   **改善案:** 「上半身メニューA」「脚・ヒップアップメニューB」などの**テンプレートを事前作成**し、予約されたセッションにワンタップで適用できる機能。これにより、セッション中のスマートフォン操作時間を減らし、指導に集中できます。

### 1-3. 食事管理（Diet/Nutrition連携）または進捗写真共有
*   **現状:** 体重・身長などの基本情報はありますが、日々の変化を追う機能が弱いです。
*   **改善案:** トレーニーがその日の食事の写真や、定期的な「体型写真（Progress Photo）」をアップロードしてトレーナーに共有・フィードバックをもらう機能。`WorkoutLog` に画像アタッチメントテーブルを追加することで実現可能です。

### 1-4. アプリ内チャット / メッセージング
*   **現状:** `line_user_id` があるためLINEでの連携を想定していますが、セッションごとのフィードバックや質問がLINEのタイムラインに埋もれがちです。
*   **改善案:** アプリ内でトレーナーとトレーニーが連絡を取り合えるスレッド型チャット、あるいは `WorkoutLog` 自体にコメントを残せる「フィードバック機能」を追加します。

---

## 2. UI/UXの強化（デザイン・体験面）

`DESIGN.md` のコンセプト（Performance Clarity）をさらに際立たせるためのアイデアです。

### 2-1. リッチなデータビジュアライゼーション（グラフ化）
*   **現状:** `recharts` は導入されていますが、トレーニーが自分の成長を実感できる見せ方が重要です。
*   **改善案:**
    *   **部位別ヒートマップ:** 今月は「胸」より「脚」を多く鍛えられている、といった筋肉の部位ごとのボリュームをヒートマップ化。
    *   **1RM（最大挙上重量）の推移グラフ:** ベンチプレスなどの主要種目の推定1RMの成長曲線をグラフ化し、モチベーションを喚起。

### 2-2. ワークアウト中の「セッションモード」の強化
*   **現状:** ダークなセッションバナー（`#0A0A0A`）の構想があります。
*   **改善案:** セッション進行中は、スマホのスリープ（自動ロック）を無効化する `Wake Lock API` の導入。また、レストタイマー完了時にWeb Audio APIを利用して短いビープ音やバイブレーション（`navigator.vibrate`）を鳴らすことで、スマホの画面を見なくても休憩終了が分かるようにします。

### 2-3. マイクロインタラクションとゲーミフィケーション
*   **現状:** ストイックなデザインですが、目標達成時の喜びを演出するとより「Strava」感が出ます。
*   **改善案:**
    *   自己ベスト（PR）更新時に、画面全体に紙吹雪（Confetti）のアニメーションを表示。
    *   連続トレーニング日数（ストリーク）の達成バッジ（例：🔥3 Days Streak）。

---

## 3. プラットフォーム・システム面

### 3-1. LINE Bot連携（通知の自動化）
*   **現状:** `line_user_id` を保持できるスキーマ設計になっています。
*   **改善案:** LINE Messaging APIを本導入し、以下を自動化します。
    *   予約前日・当日の「リマインド通知」
    *   トレーナーからの「フィードバックが届きました」通知
    *   「最近記録がありません、今日の体重を入力しましょう」というエンゲージメント通知

### 3-2. PWA（Progressive Web App）対応
*   **現状:** 通常のWebアプリ。
*   **改善案:** `manifest.json` とService Workerを追加してPWA化し、ユーザーのスマホのホーム画面に「アプリ」としてインストールできるようにします。これにより、ネイティブアプリのような全画面表示（URLバーなし）が可能になり、Limitless Appの世界観（デザインシステム）により没入できるようになります。

---

## 次のステップのご提案

どの領域を優先して改善したいか教えていただけますか？

1.  📊 **機能拡張** （テンプレート機能、回数券、食事写真アップロードなど）の設計・実装
2.  🎨 **UI/UX向上** （グラフのリッチ化、アニメーション追加、セッションモードなど）の実働
3.  ⚙️ **システム改善** （PWA化、LINE Bot通知の組み込みなど）の基盤構築

ご希望の方向性に合わせて、具体的な実装プランを作成いたします！

## 2026-09-24 ローカルUI操作改善

- 対象: main `8e0aaec` 上のホームの操作ボタンと予約入力。既存の白・黒・アクア配色を維持。
- 参考: https://ui.shadcn.com/docs/components/base/dialog （2026-09-24、Open Dialog実物を1280×720で確認）。入力ラベル、背景を操作対象から外す構造、入力に移るフォーカス、下部のキャンセル/主要操作を採用。参考のモノクロ配色・プロフィール文言は採用しない。
- 実装: native dialog、顧客/メニュー等のラベル、Escで閉じて起点にフォーカスを戻す、必須時刻/終了日の検証、保存中操作防止、通信例外の表示。プレビューは「入力を確認する」と明示。ホームCTAの圧縮改行を修正。
- 実画面: http://127.0.0.1:3107/trainer/dashboard と /trainer/bookings。1280×720で参考と修正版を確認。ホームCTAが1行表示、予約フォームの顧客・メニュー・日付・操作ボタンが視認可能。参考より大きな入力高は既存のタッチ操作向け設計を維持。
- 操作確認: 開く→顧客へフォーカス、Esc→起点へ復帰、繰返し終了日欄、開始日より前の終了日をブラウザが拒否、有効な入力のプレビュー通知を確認。
- 検証: npm run lint、npm run build成功。ビルド後の保存成功時ロック維持修正にはlintとtsc --noEmitを実施し成功。git diff --check成功。
- 未確認: ブラウザのviewport指定が反映されず実寸1280×720のままだったためスマホ実寸は未検証。実ログイン、DB保存、Stripe、LINE接続も未検証。環境変数の値は出力せず、DB初期化・削除・外部通知は行っていない。

## 2026-09-24 実用化に向けた次期改善案（未実装）

- 依頼: Astraでskillsを使った改善・アニメーションを再検討。human-ui-guardrails / reference-driven-vibe-coding / object-led-designを適用し、Astraの独立批評と実画面観察を組み合わせた。
- 最優先候補: 予約承認の失敗が成功Toastに見える経路の修正、予約→セッション記録→完了の接続。現状sessionの3ルートはdashboardへredirectする。実データでの再現操作は未実施。
- UI候補: 顧客一覧上部の説明・集計を圧縮して顧客を主役にする。予約保存後に画面全体をreloadせず、選択日・スクロールを保って対象予約を更新する。
- 動き候補: 押下の即時反応、予約詳細の開閉、日/週/月の選択表示移動、保存成功した対象行の一度だけの強調。時間は試作時に調整する仮値150–220ms。常時動く＋/売上装飾を整理し、reduced-motion時は移動を省く。
- 参考: https://transitions.dev/ のPanel revealを開閉操作し表示状態を確認（同日、1280×720）。パネルと元の一覧の関係を維持する構造参考。途中フレーム・正確な時間は未測定。参考の角丸・影・ダミー文字は採用しない。前回確認済みshadcn Dialogの入力構造と組み合わせる。
- Rare UIトップも調査したが、今回の業務操作にはTransitionsのパネル/状態切替を優先し、Rare UI部品は選定していない。
- 方向は既存配色を維持した操作改善を推奨。全体再デザイン・新規ライブラリ導入・公開は未決定。初回試作は予約一覧→詳細→完了の1往復を候補とし、実装は今回行わない。

## 2026-09-27 予約→記録→完了の操作試作（撤回済み）

- 実装範囲: 既存の開発プレビューで、確定予約を開く→種目/重量/回数/メモ→完了前の確認→完了→一覧/記録の再確認。SessionPreviewはDBクライアント・Server Actionを持たず、予約ID別のReact状態だけで保持する。ページ再読み込みで消える。実予約の記録保存や既存sessionルート接続は未実装。
- 実画面の方向: 前回のTransitions Panel revealを構造参考に、PCは右側560px、狭幅は全幅パネル。既存配色を維持。開200ms/閉180ms、セット追加180ms、押下100ms。カレンダーの＋と本日の常時アニメーションを外した。減動設定用CSSを追加したが設定ONの実画面は未検証。
- 予約操作の修正: approve/reject/completeが認証・更新失敗・更新0件でerrorを返す。売上/チケット/通知の部分失敗はwarningとして分離。BookingActionsはerror/warning時に成功Toastを出さず、例外時も入力可能な状態へ戻す。
- 検証: lint、build（TypeScript含む）、git diff --check。node --test tests/booking-actions.test.mjs の15件成功。実際のactionsソースをモッククエリで実行し、DB/通知へ実接続しない。
- ブラウザ確認: 1280×720と390×844。セット追加、0kgの自重入力、メモ入力、Esc→起点フォーカス復帰、閉じる→再開で下書き保持、確認→完了→一覧状態→記録再表示。入力途中セットがあれば完了前確認へ進まず案内する。狭幅でパネル・固定フッター・確認内容を視覚確認した。実機キーボードと減動ONは未検証。
- 証拠画像: /tmp/limitless-session-desktop.png（PC完了）、/tmp/limitless-session-mobile.png（390px確認）。開発URL: http://127.0.0.1:3107/trainer/bookings 。
- 未実施: DB初期化/削除/実データ保存、通知送信、実ログイン/Stripe/LINE検証、公開・commit・push。前回からのQuickReservationModalとdashboardの未commit差分は保持。

## 2026-09-27 本人による目的の修正（現在の方針）

- アプリの目的は「お客さんが簡単に予約できること」と「予約・売上の管理」。トレーニング結果の記録、追加の顧客情報入力は今回の対象外。上記の記録フロー提案は撤回する。
- 追加したSessionPreviewとカレンダーの記録導線・ローカル完了状態・専用CSSを撤去。予約入力改善、予約操作のerror/warning表示、常時動く＋の整理、減動設定は維持。既存顧客データ・DBは変更しない。
- 次の改善対象は顧客側の予約導線（空き枠→選択→予約確定）と、管理側の予約・売上の把握。新しい顧客管理機能やトレーニング記録機能は追加しない。

## 2026-09-30 顧客の初回予約・決済導線

- 目的: 顧客が日時と支払額を迷わず確認できる初回予約。顧客の追加情報やトレーニング記録は追加しない。連絡・売上管理の新規実装は今回の差分外。
- 実装: `/book/[trainerId]` をメニュー→日付/空き時間→名前/メール→日時/合計金額の確認に整理。正確な開始時刻をJST表示し、10:00と10:30を別々に保持。時間は明示選択とし、日/週を変えた際に別枠を自動選択しない。同じ日を再押下しても時刻は保持する。任意電話番号欄は外し、必須2項目は維持。
- 操作: 選択色150ms、押下100ms、時間一覧の切替160ms。減動設定では動きを無効にするCSSを実装。送信中は選択/入力を止め、エラー時は入力を保持してエラーへフォーカスし再試行可能にする。決済自体は既存Server Actionへ接続したまま、変更なし。
- 方針: human-ui-guardrails / jarvis-live-verificationを適用。前回確認済みshadcn Dialogの入力ラベル/主要操作、Transitionsの短い状態切替の方向を踏襲。今回新たな外観参考・デザインライブラリは追加していない。
- 安全な確認画面: `FITALL_BOOKING_PREVIEW=1 npm run dev -- --hostname 127.0.0.1 --port 3107` → `http://127.0.0.1:3107/dev-preview/booking`。開発モード・明示フラグ・loopback Hostのみ。サンプルデータを同じUIに渡し、実Server Actionを注入しない。`?empty=1` 空状態、`?cancelled=1` キャンセル表示、`?test=error`/`?test=exception` ローカル非同期失敗（実通信なし）を確認できる。
- 自動検証: lint成功、TypeScript成功、production build成功、node --test tests/*.test.mjs 21件成功（既存15+今回6）、git diff --check成功。新テストは同一時間帯の複数枠、空きなし日、暗黙の代替防止、枠消失、JST年越し、空/不正/重複を確認。
- 実画面確認: 390×844と1280×800。30分枠の選択、4回券の金額反映、次週→戻ると時間未選択/送信不可、同日再押下で選択維持、開発用入力確認、空状態、キャンセル表示、メール形式不正の拒否、送信中の操作抑止、模擬満席/通信例外の表示・入力保持・再操作・エラーフォーカス。390pxでページ全体の横溢れなし。メール保持はスクリーンショットでも確認。証拠: `/tmp/limitless-booking-mobile.png`、`/tmp/limitless-booking-error.png`、`/tmp/limitless-booking-empty.png`、`/tmp/limitless-booking-desktop.png`。
- 公開防止確認: ローカルproduction serverでプレビューフラグONでも `/dev-preview/booking` はHTTP 404。開発serverの非loopback Hostも404。production確認serverは停止済み、開発serverはloopback3107で稼働。
- 未確認: 実Stripe Checkout/決済後Webhook/DB予約確定/売上反映/LINE通知、決済先からブラウザBackで復帰した場合のBFCache状態、実機キーボード、減動設定ONの実表示。実決済・DB書込/初期化/削除・通知・公開・commit/pushは実施していない。

### 独立レビュー記録（2026-09-30 15:23 JST）

- 元依頼: 「進められるところは進めてください」。対象は顧客の初回予約・決済導線のローカル改善。担当 `/root/astra_ux_audit`（実装担当とは別、読み取り専用）の判定: **合格**。完了を妨げる指摘なし。
- 独立確認: 対象差分、上記4枚の画像、21テストとdiff checkを独立実行。lint/build/HTTP制限/操作経路は主担当の結果と照合。正確な時刻、選択解除と同日保持、金額、エラー復帰、preview分離を確認。実外部接続・BFCache・実機/減動ONは合格対象外。
- 対象版SHA256（この記録追記後もコード/テスト変更なし）:
  - `src/app/book/[trainerId]/PublicBookingForm.tsx`: `479cb46d2c9ccdbed378eb85286ccf297faa5c090b9e791cbbaafcfe61ccd1c9`
  - `src/app/book/[trainerId]/PublicBookingForm.module.css`: `a8d0b7652fe32768859cf33f4f5689cba36d646ac18aadd9fdcec7472c2edf50`
  - `src/app/book/[trainerId]/BookingPageContent.tsx`: `1fb7e9743b879d6c436cf7adb9816d73c8ef3d875cbfd0b850cc553468eae9cd`
  - `src/app/book/[trainerId]/page.tsx`: `6bf5a191a9261206f4d662b8b11f4832d6a144681f994da08e8e9ae530d1e3b4`
  - `src/lib/booking-selection.ts`: `956e1fa93ebee2322cd5cb92ce5c8cd957dd3d4c363f4901295bc1338fcfe701`
  - `src/app/dev-preview/booking/page.tsx`: `dd4b73af6d8f8bdb3dd1d8ce7c883565ed1c28b1ab34648385a7a96b4a32c390`
  - `src/app/dev-preview/booking/BookingFailurePreview.tsx`: `d3f113eb3e0a70876901f67885d8b89b7296256993b9314b58e6d2b10cc7b252`
  - `tests/booking-selection.test.mjs`: `7d6249e69aca3cb44810b75038b9912560152f5bc997ecce0fbc756a02bd1cc1`
- レビュー時の本記録ファイルSHA256: `c87a77a0d4b3807d367ca234c3616911cb18e376de02ab9aeb4825babbfc4c74`（本レビュー記録追記前）。

## 2026-09-30 チケット先払いへの方針修正（現行）

- 本人の確定仕様: 先にメニューを購入してチケットを保有し、予約するたびに1枚を使う。決済は購入/買い足し時のみ。前節の「初回購入と予約をセット」は撤回。ホームは残りチケット・次の予約・予約するを主役にする。
- 実装: 顧客ホームを共通CustomerHomeへ整理。予約画面は日時選択→1枚使用/予約後残数の確認→予約完了。購入金額・氏名/email再入力は予約画面にない。残高0は購入リンク。日/週移動は選択リセット、同日再押下は保持。公開 `/book/[trainerId]` は購入専用に変更し、日時入力/枠確保を行わず既存Stripeチケット専用経路へ渡す。購入済み顧客の購入formも既存Actionを明示注入する。
- データ処理: customer availabilityの時間内丸めと7日表示限定を撤去し、受付期間29日の正確な開始時刻を保持。予約Actionは1枚のavailable→scheduledへの割当成功後にsuccessを返す。通知例外が予約自体の失敗に見えないようにした。予約時の追加課金/売上書込みはなし。購入専用Webhookはチケット付与の失敗を成功扱いせず500を返す。
- 表示の正確さ: 次回予約はpending/confirmedに限定。券紐づきを確認できない既存予約へ「チケット使用」と断定しない。予約直後の成功欄は実Actionが割当確認済みなので1枚使用と表示する。
- 開発確認: 同じ `/dev-preview/booking` をチケット式ホーム/予約/購入のローカル状態プレビューへ置換。実Server Action未注入。親onClickCaptureで内部リンクを画面内遷移にし、Nextの実ルートへ遷移させない。`?empty=1`は0枚開始、`?test=error`は予約失敗の模擬、`?view=purchase`は初回チケット購入フォームの確認。再読込でサンプル状態が初期化される。
- 検証: node --test tests/*.test.mjs 33件成功。追加12件は購入に日時不要/価格をサーバーで決定、予約時1枚割当/追加売上なし、認証なし/残高なし/満席/券競合、通知失敗時の成功保持、29日の正確な枠、購入Webhookの付与成功とストレージ失敗500を、実ソース＋モックで確認。実ネットワーク/DBには接続していない。全lint、TypeScript、build、diff check成功。最終のpreview幅w-full調整にも対象lintを実施。
- 実画面: 390×844と1280×800。3枚→10:30予約→2枚/次回予約、0枚→購入画面で4枚追加mock→14:00予約→3枚を確認。日時変更で送信不可、送信中抑止、予約エラーで再操作可能/alertフォーカス、初回購入フォームに日時欄なし、予約フォームに氏名等のtextboxなし。内部遷移後もpreview URLを維持。390px横溢れなし。短い選択/時間切替アニメーションとreduced-motion CSSを維持。
- 証拠: `/tmp/limitless-ticket-home.png`、`/tmp/limitless-ticket-booking.png`、`/tmp/limitless-ticket-purchase.png`、`/tmp/limitless-ticket-error.png`、`/tmp/limitless-ticket-first-purchase.png`、`/tmp/limitless-ticket-desktop.png`。productionモードでpreview flag ONでも404、devの非loopback Hostも404を再確認。
- 未実施/未検証: 実Stripe支払い・Webhook到達・DB券付与/予約保存・実LINE/メール送信、実機キーボード/減動ON、決済先からBFCache復帰。DB初期化/削除/マイグレーション適用、公開、commit/pushなし。
- 既知の残件（本番前）: トレーナーの売上画面/ホームがsales_records中心のため、session_credit_purchasesにだけ記録されるチケット単独購入を集計しない。今回のUI修正では集計ロジックを変えていない。過去の購入＋予約の売上との二重計上を避ける対応が必要。本番で購入→売上反映まで完了したという判定はしない。
- 参照: human-ui-guardrailsの主役/次の行動/過剰説明を抑えるルール、既存の白黒アクア/短い状態切替方針を継承。Next同梱Formsドキュメント、Supabase changelog、Stripe Webhooks公式文書 https://docs.stripe.com/webhooks を確認。新規デザインライブラリ/外部サービス設定は追加なし。

### 独立レビュー確定（2026-09-30 16:02 JST）

- 担当 `/root/astra_ux_audit`。判定 **合格**：購入・予約分離のローカル実装として阻害なし。2指摘修正、33テスト独立成功、画面画像、最終記録を照合。実装担当でも21ファイルのハッシュ一致を再確認。
- manifest SHA256: `25e55d95061dad99ca4b3839f07077d3927bdd4bc7a9995f6375c3e81b4fee41`。レビュー時の記録SHA256: `2b8102907ad43e04a33675eb4a2f914d71b82993787cc6aaded79aef5a3a7dc3`（本追記前）。
- 合格対象外：チケット単独購入の売上集計漏れ、実決済/Webhook/DB保存/通知/BFCache/実機/減動ON。本番利用全体の完了判定ではない。
- 対象版:

```text
ad33deeff285069814d330ac8c8696ff4c50089150ee22f8290d32407f1e6553  src/components/BookingSlotPicker.tsx
64090e9360b80c963fa4cc2ace4c12ea36b251e82c2c3ea3c462d0686e89946e  src/components/BookingSlotPicker.module.css
6a0f48969a0826a3e461ec82c72e220f9e73fc2aa7493d99316e0133a8ecad9b  src/lib/customer-availability.ts
c90a8d17d34dc88bf2b49a5e198e44e60a332d181c7f528e19f74616efcf3c91  src/lib/customer-app.ts
a5499541e47fddfc95eec3428d3ec2be45c5623e57925d319c459aa25e7fa55c  src/app/customer/app/page.tsx
92ece812116c54c397b85e7a3d4a7308d09f5919e506ced36ddcc51c536c4d03  src/app/customer/app/CustomerHome.tsx
8bac88b72fab3de829043005f8f22b35cf98d3b97098d938f2ce4458043d9721  src/app/customer/app/bookings/page.tsx
894f7a92c43e91b7e5877635c418b572c312a448a1ab47fc530c702eb6765f45  src/app/customer/app/bookings/CustomerWeekCalendar.tsx
a686f5293fae2cf66e73dfe998bf88a723d4a1093dbe258501f4b230c12036a9  src/app/customer/app/bookings/actions.ts
314e27bbcf792db023a63545ea5efbe837e67c0ddcf9e775c546ea63dabe946f  src/app/customer/app/tickets/page.tsx
cefc7010958bb146256e0b4e9bcbd071de31dff152566f636f8640b198dccf8a  src/app/customer/app/tickets/TicketPurchaseForm.tsx
b39380c47cc393ac8b6d71cdbbdada833f9978ef33e54361fae4a1431c69f741  src/app/book/[trainerId]/PublicBookingForm.tsx
a37605baaa6ac3a25bc5b8657657166fe83de1b7baf2f91d3d7900e8277129fd  src/app/book/[trainerId]/PublicBookingForm.module.css
5486be0d8af8545cc4b2bc3426408f619e44a7e6e25a411d8ab02614f932710a  src/app/book/[trainerId]/BookingPageContent.tsx
ebc6e0351a8073d6f8c604e4c34eab5fd5152311238f7ade2033ce27d3d2dc10  src/app/book/[trainerId]/actions.ts
d46313dbc0744fa3660e5ef5b7ceb9ec8a6168d9397bc1c38685fa842f60c471  src/app/book/success/page.tsx
01e2145bf22722b942ed1da201be868df897882e2b3ed040815df38e83faed59  src/app/api/stripe/webhook/route.ts
7394bb4be8feb665673cb8baf72c2ffaef5402eec48a5d553b477622673f833b  src/app/dev-preview/booking/page.tsx
614c09c778e76494da37c522c43dafdcdef0e65096117f27a3fb936032df3ecd  src/app/dev-preview/booking/BookingFailurePreview.tsx
0f9bb34d8e8aa0c31b273498e45072a7810683a25fa2d7a41b1ec8202e10bf37  src/app/dev-preview/booking/TicketFlowPreview.tsx
a5895eb97edfdc517349fa3cb25fd21dd851d4661382e455373507c1fd718c7d  tests/ticket-flow.test.mjs
```

## 2026-09-30 予約一覧と新規予約の導線修正

- 本人報告: 「予約一覧を押すと予約画面に行く」。原因はHomeとpreviewの一覧リンクが新規予約と同じパス/viewへ接続され、previewには一覧viewがなかったこと。前回の一覧表示の説明は実導線を確認できていなかった。
- 修正: `/customer/app/bookings/list` と共通CustomerBookingListを追加。Homeの予約一覧・下部予約タブを一覧へ接続。一覧は今後の日時/状態/件数、既存の過去履歴、空状態を表示。「新しく予約する」で従来の日時選択画面へ進む。previewもlistとbookingを分離し同じ一覧コンポーネントを利用する。
- 対象: CustomerHome.tsx、CustomerTabNav.tsx、bookings/CustomerBookingList.tsx、bookings/list/page.tsx、dev-preview/booking/TicketFlowPreview.tsxの5ファイル。human-ui-guardrailsの操作名と遷移先を一致させる方針を適用。新しい顧客情報/通知/決済操作は追加なし。
- 検証: 対象eslint、tsc --noEmit、git diff --check成功。390px実画面で既存のサンプル10/1 10:30予約を保持し、Home→予約一覧で1件表示。新しく予約する→日時選択→下部予約タブ→一覧の往復、一覧に日時入力カレンダーがないこと、0件時の案内も確認。preview URLから外へ遷移しない。証拠 `/tmp/limitless-reservation-list.png`。元のブラウザは予約一覧を表示した状態で残す。
- 未確認: 実顧客のDB読み出し/ログイン状態での新規ルート。実予約保存/外部通知/決済/公開は今回も行っていない。既知の売上集計残件は前節どおり。

- buildも成功、新規一覧ルートの生成を確認。独立レビュー `/root/astra_ux_audit`：2026-09-30 16:24 JST **合格**。5ファイル、390px画像、操作/空状態報告、記録を照合。実装担当も対象hash一致を確認。実認証/DBは判定外。レビュー時記録SHA256 `fb58d32754e404ff0d7ffdcd117fe548b9d1c4f401c43e5a441f86ffcc339f23`。対象版:

```text
1d88c757b204e574d80f6730e6f8a85944df1ebd1a6c563fa97d1828ed62245d  src/app/customer/app/CustomerHome.tsx
fb74997aff5468dceac628172b46f2404a4140c70e1fbd74d68ee425b55d3fe6  src/app/customer/app/CustomerTabNav.tsx
44b4f0d01cf569f3bce7103336ad651960a7d23ee706233e2de9cf40462448d5  src/app/customer/app/bookings/CustomerBookingList.tsx
40aa517954ed6384c4f35b0ac580dfd0ebd8ca768f4435e5c200440bcde420fe  src/app/customer/app/bookings/list/page.tsx
963c6f54a46f861de9ab49df5c11e73678687811acdc60b8f61d123515f4ba66  src/app/dev-preview/booking/TicketFlowPreview.tsx
```

## 2026-09-30 予約・チケット保有状態のサンプル投入

- 本人依頼により開発previewの初期状態を残りチケット3枚・確定予約2件へ変更。購入8枚=残り3枚+予約中2枚+使用済み3枚。予約は生成済み未来枠から明日10:30と4日後14:00を使用する。再読込でもこの初期状態が表示される。empty=1は0枚/予約0件のまま。
- 変更はdev-preview/booking/TicketFlowPreview.tsxのみ。実顧客・DB・決済・通知への書込みはなし。
- eslint、tsc --noEmit、diff check成功。390px実画面でホーム残3枚/使用中2枚/次回予約、一覧の2件（今回10/1 10:30・10/4 14:00）を確認。証拠 `/tmp/limitless-seeded-home.png`、`/tmp/limitless-seeded-list.png`。
- 独立レビュー: `/root/astra_ux_audit`、2026-09-30 16:59 JST **合格**。コード/画像を独立確認し、eslint/tsc/diff checkの成功報告と照合。対象SHA256 `607ff174d30869caf427ebe3632505564241b26fb049e11ef260d8ee126e092e`。本番のデータ変更ではない。


## 2026-10-01 Resumed local work: ticket purchase revenue

- Both trainer home and sales pages use loadTrainerRevenue: paid ticket purchases count once on the purchase date, with purchase quantity and trainee name. Credit-linked legacy booking sales are excluded, including when the purchase was in an earlier month. Non-paid purchases and zero-value redemption rows are excluded. Unlinked non-Stripe legacy sales remain.
- Trainer-scoped read queries paginate at 500 rows; credit lookup batches 100 booking IDs. Both report boundaries apply before merging, including before ambiguity checks. Failed reads never produce partial totals.
- Remaining limitation: sales_records has no durable payment ID; cancellation clears session_credits.booking_id. An unmatched nonzero legacy Stripe sale with purchases present stops the report rather than guessing. Dashboard hides only the sales amount (em dash + explanation), preserving bookings, clients and pending counts. Sales page shows an explicit status instead of false zero, counts or a chart. Historical reconciliation remains unimplemented.
- Validation: trainer-revenue tests 14/14 with synthetic fixtures, actual page functions and React SSR; tsc --noEmit --incremental false; targeted ESLint all exit0. Existing unrelated suites not repeated. No real DB/schema/RLS verification, personal data, credentials, Stripe/notifications, migration execution, live UI, device checks, or build.
- Independent reviewer /root/fitall_revenue_review: initial future-period stopping finding fixed; 14/14 independently rerun; accepted as local implementation including conservative stopping. Ownership and unchanged baseline were checked before applying only these files. No commit/push/deploy. Reviewed source SHA-256:

```text
f8736f6305f465b030a45d9cfc8b5111c7a17bb3de09f6abecef7db82a8d4540  src/lib/trainer-revenue.ts
b7d3822195da50ac81edf2dfb334365fb10d7dc76c8e9ca3dc4b1613cc746c1c  src/app/trainer/sales/page.tsx
60e3b15eae3a439a8307efa114620cb47596f0ac525ec9944d49a84de026dd54  src/app/trainer/dashboard/page.tsx
63ce7f74208060f1362c554c47e79e472b1565e45374a16dab60354f4fe15a9d  tests/trainer-revenue.test.mjs
```

## 2026-11-03 本番移行の準備確認

- 本人依頼「このアプリを本番でできるようにしたい」。店舗数・Stripe入金先は確認待ち。外部への公開・通知・実課金・DB変更は未実施。
- Node v24.19.0。既存47テスト、全体eslint、tsc --noEmit --incremental false、git diff --check成功。npm run buildはサンドボックス内のポートbind禁止でTurbopack失敗。npm run build -- --webpackは成功（33ページ生成）。本番接続や実機確認の証拠ではない。
- STRIPE_BOOKING_SETUP.mdを現行の購入/予約分離へ更新。旧同時予約と仮押さえ手順を現行仕様と区別し、callback、環境変数、公開前課題と段階を記載。実装コードは今回変更なし。
- コード上の優先課題：ensureCreditsForPurchaseの取得後INSERTは並行Webhookで過剰発行の可能性。原子的な発行と再送・並行テストが必要。予約時間重複の並行実行、取消/期限/返金、リマインド重複防止、実認証/RLS、歴史的売上照合は公開前確認事項。
- 対象DBの実スキーマ・適用履歴・ホスティング/Stripe/LINEの所有者と接続は未確認。開発プレビューを本番完了として扱わない。
- 独立レビュー：/root/release_readiness_review に手順書のコード照合を依頼。
- 独立レビュー最終判定：2026-11-03 JST /root/release_readiness_review、文書更新の範囲で合格。売上停止条件の指摘を修正後に再確認。手順書SHA256 fd7b715c1a595b9c35fa1d1b13f4201f7ad350a94186e33f9c661adb33a5f28a。台帳レビュー時SHA256 73daf70673cbfc9bb0039802eaabfcb5f73ad95542c53b2c6c76e567f9e7d726（本行追記前）。本番公開・実DB・決済・通知・実機は合格対象外。

## 2026-11-03 二重発行・同時予約対策（ローカル実装、対象DB未適用）

- 本人合意：1店舗・ジム自身のStripe。今回依頼は二重発行/同時予約対策を進められる範囲で実装。既存変更を保持、実DB/Stripe/通知/公開は操作なし。
- 購入行ロックの発行RPC、service_role限定の予約+チケット更新RPC、全booking書込みへの時間帯排他制約を追加。旧チケット紐付けも条件付き更新で上書きを防ぐ。RPC未適用時は旧非原子的処理へ戻さない。
- occupied_rangeは既存予約の所要時間を適用時設定から補完。既存重複ではmigration全体がrollback。既存duration・トリガー・スキーマ・RLS・バックアップの確認、旧writer停止とDB→アプリの順序が必要。実環境には未適用。
- 独立レビューのduration読取り不整合を修正：空き枠/重複判定は保存済み時間帯、移動は元の所要時間を使用。
- 検証：52/52 unit成功（レビュー担当も独立実行）、全体lint/tsc/diff check成功、最終webpack本番build33ページ成功。React SSR fixtureの既知key警告は残る。
- /tmpの隔離PostgreSQL18を起動し12項目成功：既存競合時のmigration rollback/データ保持、8並行発行=4枚、異なる開始時刻を含む並行予約=1件、隣接可、移動重複拒否、最後の1枚競合、更新失敗で予約rollback、anon/authenticated拒否、期限切れ拒否、消費後再送で枚数/紐付け保持、service_roleで発行/予約成功と返金済み拒否、取消で枠解放と時間snapshot保護/新設定反映。DB停止済み。本番URL/.envを読まない独立script。実Supabase/PostgREST/RLS構成やStripe配送は未検証。
- 独立レビュー /root/concurrency_review：コード/SQL/文書は合格。最終test scriptだけ追加のservice_role予約/tamper検証を再照合中。対象版:
4f7865b3396567b549fce9e81450b4a0da86afe15307cfc2fcafc9867edd13ff  supabase/migrations/20261103110747_atomic_tickets_and_booking_ranges.sql
c32bb3b7c3ce60234e6a19ad41c82f3cac16082056a77c55cc2e29f0fac54a2e  src/lib/session-credits.ts
025aa8a60a203ecccd5f7dcce10f27ab54897c575383df63c3523cf0a678a44f  src/app/customer/app/bookings/actions.ts
70dfaf892bae4ccec192ec05e35477299abb785411107894017bfc8b7208f92e  tests/ticket-flow.test.mjs
c6f3557fc69bd21c8ddf689b57feec5dba58d9f18560a0acbe0f2e032e5859a3  scripts/test-booking-concurrency.mjs
b7efff9df9cd979a7d639363a6bc06d7296168b4eda736be9510c074d8f7b29f  src/lib/booking-interval.ts
652696255708ed71a4a0bb97d70fddd39cab685a3ded11b9610752b9ed4126fe  src/lib/booking-overlap.ts
2c2b9c97a2b3d2a7ae9ae247b230ca978fb2f4fa31d96be98d6a4678f0dd45b4  src/lib/public-booking.ts
6f993d8405ba376167881381ed13e1e943699877f98ce74bc7ddcefdf34a59f7  tests/booking-concurrency.test.mjs
a16ab6b01893b4d160341407d1e09715ad84cf2d9827be8723c827b88c3dd302  STRIPE_BOOKING_SETUP.md
- 最終再レビュー合格：2026-11-03 /root/concurrency_review。追加2項目を確認、script SHA c6f3557fc69bd21c8ddf689b57feec5dba58d9f18560a0acbe0f2e032e5859a3、他9ファイルは前回合格維持。実装担当でも全hash照合済み。ローカル変更の合格であり実Supabase適用・決済・公開の合格ではない。

## 2026-11-03 DB接続とStripeテスト環境の読み取り確認

- 本人依頼：DB状態確認後、検証環境のStripe通し確認を進める。Supabaseスキル使用。秘密値の出力なし、.env変更なし。
- ローカル設定のSupabase refは twobwwufaphtmejyxfon。接続済みSupabaseのlist_projectsに対象なし。get_projectは権限拒否。設定済みservice roleによるREST接続もDNS ENOTFOUNDで到達不能（HTTP/認証以前の失敗）。停止・削除・URL変更のどれかは未判定。
- 既存スキーマ・RLS・データ件数・予約重複・migration適用履歴・バックアップは取得できていない。別案件の4プロジェクトは操作しない。ローカルSQLは既存基本スキーマ前提であり、実環境を推測で再構築しない。
- Stripe設定はtestキー。GET /v1/account HTTP200、account acct_1Tp4U1E6Ubl8IS9K、charges_enabled=false、payouts_enabled=false（観測値のみ、理由や本人確認状態は未判断）。GET /v1/webhook_endpoints?limit=20 HTTP200、data空、has_more=false。これは当該testキーで見える登録endpointの結果でありCLI listenerの有無を証明しない。
- Checkout作成/決済/Webhook登録/DB書込み/外部通知/公開は実施なし。実Stripe→署名Webhook→実Supabase→チケット→予約→売上のE2Eは未実施。
- 必要な本人確認：元のPCで利用したSupabaseアカウントで対象projectを開き、開ける/停止/所在不明を確認。別DBを無断採用、課金のあるbranch/project新規作成はしない。
- 記録の独立レビュー：2026-11-03 /root/concurrency_review 合格（提示証拠と記録の整合のみ、外部接続未実施）。追記前SHA256 95d556b23b5b90778adf1d628b12047ad9c42a8afa28a4a0296900e60ede47da。

## 2026-11-04 復元後の実DB読み取り・Stripe Checkout疎通

- Supabase REST HTTP200。bookingsにoccupied_range無し、fitall_ensure_purchase_credits / fitall_book_customer_ticket RPC無し。新migrationは未適用。
- service_roleで件数のみ確認：users19 / trainer_profiles2 / trainee_profiles17 / bookings97 / plans7 / session_credit_purchases2 / session_credits5。個人情報・秘密値は出力していない。
- 予約はconfirmed41 / pending6 / completed50。全97件取得、現行bioの所要時間によるactive時間帯重複は4組、未来重複0組。これはmigration補完時の前提での検査であり、過去の実所要時間を証明しない。既存重複により新排他制約の適用は停止する想定。自動取消・修正なし。
- 購入quantityと発行数の不一致0件。creditはscheduled4 / used1。匿名キーのusers/bookings/session_creditsのcountはHTTP200/0件。この限定検査だけで全RLS監査合格とはしない。
- 実アプリsrc/lib/stripe.tsのcreate/retrieveでtest Checkout1件作成成功。合成UUID/架空example.invalid顧客、1000円/4枚、scheduled_at無し、StripeホストURL、payment_status=unpaidを確認。その場でexpire HTTP200/status expired。支払い・チケット発行・実DB書込み・通知送信はなし。
- 管理ブラウザはbrowser.user unavailableで取得不能。RESTで得られない制約/トリガー/RLS定義/バックアップ/migration履歴は未確認。接続済みMCPには対象組織の管理権限なし（前回確認）。
- 検証環境の所在を本人へ質問。現在の既存データ入りDBを勝手にテスト環境扱いしない。有料環境作成や既存DBへのmigration、Webhook登録はなし。Stripe→Webhook→検証DB→予約→売上のE2Eはまだ未実施。
- 独立レビュー：2026-11-04 /root/concurrency_review、追記記録の整合性のみ合格。レビュー時SHA256 262ad0c8a07be4a2c9172c7fb2a7fee4e44b72c40bce45f122df8bb8a07089e3（本行前）。外部接続・E2Eの独立検証ではない。

## 2026-11-04 追加課金なしローカルStripe統合検証

- 本人依頼によりクラウドプロジェクトは作らず、scripts/local-verificationに隔離fixture/harnessを追加。公式PostgREST16.5/StripeCLI1.55.6、embeddedPG18.6を一時フォルダから使用。アプリ依存や.env.localは変更なし。
- 実ソースの公開購入action、Stripe helper、署名検証付きWebhook、チケット発行/予約RPC、予約action、空き枠判定、売上loaderをsupabase-js→PostgREST→PGで接続。LINE/SupabaseAuthの顧客contextとNext headers/cacheはテストadapter、通知はno-op。全Next画面・本番RLS/trigger/schema・実認証のE2Eではない。
- 初回テストカード入力は自動レビューが金融操作として拒否。本人から「実課金なしのテスト支払いを承認する」の明示回答後に再試行。Stripeサンドボックスで公式4242テストカード、1000円4枚を完了。Stripe API GETでlivemode=false/status=complete/payment_status=paid/amount1000/quantity4確認。実課金0、既存DB・LINE/メールへの書込みなし。テストStripe内には支払済みオブジェクトが残る。
- 結果stage=passed：購入1/発行4/予約0→同じ署名payload4並行再処理でも発行4→予約1/available3/scheduled1→同じ枠の再予約拒否→売上1000円1件/quantity4。外部通知は1回抑止（送信0）。結果 /var/folders/ql/x16hcqc517d_2gsy_nknc9gm0000gn/T/fitall-e2e-OZcLfO/result.json、画面 /tmp/fitall-local-stripe-passed.png。
- 独立レビューで起動失敗時の子プロセスerror未処理を指摘。managedSpawn/server errorと異常終了をcleanupへ接続、stopは再入を防止。上記決済統合試験はlifecycle修正前、修正後は別途missing binary/HTTPポート競合の異常終了テストを実施。業務処理ロジック変更なし。
- 既存の97予約は変更なし。クラウド課金0、ローカルサービスは確認後停止。ローカルfixtureは本番データをコピーしない。検証境界・再実行方法はscripts/local-verification/README.md。
- 独立レビュー最終合格：2026-11-04 /root/concurrency_review。保存result stage=passedと4検証項目を直接確認、終了処理指摘解消。実装担当でも対象hash照合済み。run.mjs 089b204db365b85b5ae39f9932e99375eadc60dc4646478c0c4f636ad85306d5 / schema.sql 3e630d188f935bbb547e967a78f5326f01ae8a39e810c1666c5c6213bbe596ce / README.md 36b37879fb6ad87843ee20b5ce438015a9bbc0518c75be5f247c29ac47c9133c / 台帳レビュー時 5a46ea081ae879472de26f57b88c22c2086ed9db508627817cb14d476c6baaf7（本行前）。構文/対象eslint/diff検査成功。異常終了テスト後も3117/55441/55442全停止を確認。

## 2026-11-04 顧客予約変更・キャンセル・チケット返却（ローカル）

- 本人決定：顧客自身の変更/キャンセルは開始24時間前まで。変更先も開始まで24時間以上ある空き枠に限定。期限後はトレーナーへの連絡を案内。購入代金の返金は行わず、有効期限を延長しない。
- CLI生成migration 20261104010941_customer_booking_changes.sql。service_role限定RPCが所有者/active関係/旧日時/予約状態を検査。booking→ticketの順にロック取得後、DB時計で期限判定。キャンセル＋同じcreditの返却は一括、期限切れはexpired。二重キャンセルは書込みなし。移動は予約ID/credit/所要時間を保持、排他制約違反なら元予約を維持。
- 顧客予約一覧に日時変更/キャンセル確認UI、共通日付picker、失敗時の再選択、更新後も残す成功通知を追加。空き枠取得は本人予約を確認し、その予約のみ除外、保存済み所要時間で判定。偽装trainer/customer IDを受け取らない。
- 独立レビューで既存trainer move/approve/completeが顧客cancelを上書きする競合を発見。移動に元状態/日時CASとaffected-row確認、承認pending/完了confirmed/取消activeの更新条件を追加。
- 検証：eslint/tsc成功、unit65/65、webpack本番build成功。隔離PG18で8並行cancelの返却1回、他人拒否、期限後拒否、期限切れ返却、移動競合rollback、ticket不変、古い日時拒否、move/cancel競合、返却障害rollback、anon/authenticated実行拒否/service_role成功、cancel後stale trainer更新0件を確認。ログ /tmp/fitall-tests-latest.log /tmp/fitall-concurrency-latest.log /tmp/fitall-build-latest.log。
- 390×844の実ブラウザでサンプルの日時選択→変更（残数3維持）→キャンセル確認→返却（残数4）と期限後操作非表示を確認。画像 /tmp/fitall-booking-change-mobile.png /tmp/fitall-booking-cancel-mobile.png。再現URL /dev-preview/booking?view=manage。UI試験の操作はメモリ内サンプルであり実DB保存試験ではない。
- 本番DB/migration/実予約/決済/外部送信/公開は未操作。実認証→本番相当スキーマ/RLS→画面操作の通し確認は残る。新しい変更/取消の自動LINE・メール通知および期限後の直接連絡リンクは未実装（連絡案内のみ）。既存trainer取消/完了のticket更新は従来の別処理・警告方式のまま、原子化は別途必要。
- Supabase公式関数docs/changelogを参照。2026-09-25のbtree_gist float/NaN再index変更は今回のuuid/range制約に該当しない。対象実環境全体のadvisor検査は未実施。
- 独立最終レビュー依頼中：/root/concurrency_review。最終合格/版情報は後段に追記。

- 最終独立レビュー合格：2026-11-04 /root/concurrency_review。本人依頼の顧客変更/取消/返却についてローカル実装・隔離検証の範囲で合格。独立実行unit65/65、DB/buildログ、390px画像を確認。実装担当でも下記13ファイルのSHA256一致を確認。本番・実認証通し・通知は対象外。

```text
8769003bdfbbe3313696f56382a19f46daf75609de3283b1724949ee15ca53ee  supabase/migrations/20261104010941_customer_booking_changes.sql
4eaca45ccbe0b76b39749cd4d0c332177a9c16d791ff209fcc248e517b94db46  src/app/customer/app/bookings/manage-actions.ts
fd82218f7a0d4519479a8a59dc4845dfdbb51839880e8d052d63202b1d0a21c7  src/app/customer/app/bookings/BookingManagement.tsx
0db6e62d597e292964c87ab3d4a96fe770e25d664dd5fc6b5b4c0058e23708bd  src/app/customer/app/bookings/CustomerBookingList.tsx
aa9810380ab8ca7ebc5bbb009a706c7ba6d83f9e8d1fcd5dff783a06f478016e  src/app/customer/app/bookings/list/page.tsx
067c469548d52bfe41f228a82b392570edc3ef5f7e2eab141b9799d098de69ee  src/lib/public-booking.ts
5a855a984580b8548b10c1975b5c637bf499c664ece2de81b2e0c9e8bdbdab6c  scripts/test-customer-booking-changes.mjs
0510ec8660569b9a78fa475a70697020c76cba194aea6c2c7ec69d5e9799f75f  scripts/test-booking-concurrency.mjs
03083a0527239220a3960ef2ead1da893869f15ea1f922f99d897e84ac265afd  src/app/trainer/bookings/actions.ts
162827c5635af1c9d2aaf35427a6050cb48fbb725f0650002ba8c020cdb2d38a  tests/booking-actions.test.mjs
ac79e3ec832262d203dc4eeca395328851220e92676c9aea8bf1c448368cb5dd  tests/customer-booking-changes.test.mjs
27991205e12994e2b0d06d7e377bb0fd174a39a221b0b4f14a22fc3796a8463b  src/app/dev-preview/booking/BookingManagementPreview.tsx
41c4cb67fa8b83c8d7fb9c21936b62edac331b01810d43627cd2ac4798fcdded  src/app/dev-preview/booking/page.tsx
```

## 2026-11-04 登録リンクの実セッションから変更・取消・返却までのUI通し検証

- 本人依頼：実ログインから検証環境で通し確認。顧客の実装上の入口は登録リンク/LINEであり、メールpassword画面はtrainer用。今回は登録リンク→既存onboarding actionによる実署名cookie→既存顧客loader/ServerAction→PostgREST→隔離PGの経路を確認。LINE OAuth/Supabase Auth本人認証は実施していない。検証専用LINEログインチャネルの有無は本人確認待ち。
- 追加ファイル scripts/local-verification/customer-ui.mjs、既存README追記。元アプリソースをtmpへコピー、.envを読まない/コピーしない、dev bypass/preview無効、ローカル独立秘密値、外部server fetch禁止、LINE/Stripe/mail鍵なし。業務アプリソースは今回変更なし。
- 初回run /var/folders/ql/x16hcqc517d_2gsy_nknc9gm0000gn/T/fitall-customer-ui-iy0p2f。架空顧客1・trainer1・購入fixture4枚・予約1（使える3/予約済1）。購入はseedであり今回Stripe決済なし。fixture最小schemaとRLS有効/anon権限なし/service_role利用で、本番全RLS/schemaの再現ではない。
- UI確認：未認証の予約一覧は登録案内のみ→登録フォーム送信→LINE設定未完了のマイページ/本人表示→予約一覧1件→11/11 14時を11/6 14時へ変更→reload後も新日時維持→キャンセル確定→予約0件/返却成功文維持→チケット画面使える4/予約済0。DB読取も同一bookingID・変更保存、3/1/total4→cancelled・4/0/total4を確認。
- 証拠 /tmp/fitall-ui-after-move.json /tmp/fitall-ui-after-cancel.json /tmp/fitall-ui-moved.png /tmp/fitall-ui-cancelled.png /tmp/fitall-ui-returned-tickets.png。本人認証cookieの手動注入やcustomer contextのmockは使わず、既存onboardingから発行。ただしLINEログイン成功とは報告しない。
- 独立レビューでlauncherの起動途中child異常時の後続サービス残留経路を指摘。fatalError/check/ready、cleanup中start禁止、readiness必須、運転中異常exit1へ修正。業務経路のUI試験はlifecycle修正前。修正後はPostgREST=/usr/bin/falseの異常終了試験で後続起動無し、正常起動(jJ0nJn)→Ctrl-C exit0→3118/55443/55444/55445 LISTEN0を確認。node --check/対象eslint/diff検査成功。
- 実DB/実予約/課金/通知/公開/既存.envは変更なし。ローカル検証サービス停止済み。LINE本人認証、Supabase Auth、公開環境callback、通知、実本番RLS/完全スキーマは未検証。
- 最終独立レビュー：2026-11-04 /root/concurrency_review、ローカル署名付き顧客セッションのUI通し検証として合格。保存JSON/画像/構文を独立確認、新版起動停止は実装担当報告との照合。対象SHA256を実装担当も一致確認：customer-ui.mjs 11b555fd9f61b1d4339718f13c30d8fbd478cf43d4d1f2355750b69af403cf0f、README.md 93db67bf701b1740fcba6ae141f233ff76960f1fb0d145718647e4667fad5534。LINE OAuth/Supabase Auth/本番RLS/外部通知は合格範囲外。
