# QRLite Development

QRLiteの開発者向けドキュメントです。

## 必要環境

- Deno 2.x
- Git

## ファイル構成

```text
mod.ts                 公開エントリーポイント
browser.ts             ブラウザ向けバンドルのエントリーポイント
src/
  generator.ts         QRコード生成工程
  bit_canvas.ts        ビットキャンバスとQRパターン描画
  bitmap.ts            1bit BMP出力
  rating.ts            マスク評価
  byte.ts              ビット列構築
  bit_reader.ts        ビット読み取り
  constants.ts         公開定数と内部定数
  info.ts              QRコード情報の初期化
  info_builder.ts      座標・容量・GF(256)テーブルの構築
  rs_blocks.ts         RSブロックの規格値
  types.ts             公開型定義
scripts/
  check_release.ts     リリース可否の確認
test/
  all.test.ts          Deno回帰テスト
  info.test.ts         QRコード情報の導出テスト
  qrprint.test.ts      qrprintの引数・表示テスト
tools/
  qrprint.ts           ターミナル表示コマンド
```

Denoパッケージのエントリーポイントは`deno.json`の`exports`で`./mod.ts`に設定されています。`./qrprint`サブパスからコマンドも公開します。

## QRコード情報

Versionと誤り訂正レベルごとのRSブロック構成のみを`src/rs_blocks.ts`に規格値として保持しています。`DataCode`、`ECCode`、Byte容量、アライメントパターン座標、GF(256)対数表、Reed–Solomon生成多項式は`src/info_builder.ts`で導出します。

`src/info.ts`の`Info`初期化時に一度だけ全情報を構築します。ESモジュールは同じプロセス内でキャッシュされるため、`Generator`の生成ごとに再計算されることはありません。公開される`Info`の構造は従来と同じです。

## ブラウザ向けビルド

ブラウザ向けバンドルを`docs/qrlite.js`へ生成します。

```sh
deno task build
```

生成されたスクリプトは、ブラウザの`window.QRLite`に`mod.ts`と同じAPIを公開します。

```html
<script src="./docs/qrlite.js"></script>
<script>
const canvas = QRLite.convert("https://example.com");
</script>
```

## 型検査とテスト

型検査:

```sh
deno task check
```

テスト:

```sh
deno task test
```

型検査とテストをまとめて実行:

```sh
deno task verify
```

現在の回帰テストには、UTF-8、マスク式、Reed–Solomon誤り訂正、容量境界、Version情報、Version
10以上の文字数フィールド、`qrprint`の引数とターミナル表示が含まれます。

## リリース準備

リモートのタグを取得してから、リリース準備タスクを実行します。

```sh
git fetch --tags
deno task release:check
```

`release:check`は型検査とテストに加え、`src/constants.ts`の`Version`がSemVer形式であること、ローカルの最新Gitタグより新しいこと、同じバージョンのタグが存在しないことを確認します。タグは`1.2.3`と`v1.2.3`の両形式に対応し、条件を満たさない場合は終了コード1を返します。
