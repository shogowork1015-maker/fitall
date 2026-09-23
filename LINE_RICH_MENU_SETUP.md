# LINEリッチメニュー設定

本番運用では、トレーナー専用のLINE公式アカウントにこのリッチメニューを登録します。

## 事前に必要なもの

- `LINE_CHANNEL_ACCESS_TOKEN`
- スマホのLINEから開ける公開URL
- トレーナーID

LINE LoginのCallback URLには、以下も追加します。

```text
https://example.com/api/line/app/callback
```

`localhost` はスマホのLINEから開けないため、Vercel Preview、本番URL、またはngrokなどの公開URLを使います。

## 実行例

```bash
npm run line:rich-menu -- \
  --app-url=https://example.com \
  --trainer-id=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

既存の `NEXT_PUBLIC_APP_URL` と `LINE_RICH_MENU_TRAINER_ID` を使う場合:

```bash
LINE_RICH_MENU_TRAINER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx npm run line:rich-menu
```

## メニュー構成

- 予約する: LINE認証後、`/customer/app/bookings` を開く
- チケット: LINE認証後、`/customer/app/tickets` を開く
- 次回予約: LINE認証後、`/customer/app/bookings` を開く
- 相談する: 「トレーナーに相談したいです。」をLINEに送る
