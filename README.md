# QRLite

QRLiteは、外部ライブラリに依存しないDeno向けのTypeScript製QRコード生成ライブラリです。

Byteモード、誤り訂正レベルL/M/Q/H、Version
1～40、8種類のマスクに対応しています。
文字列はUTF-8へ変換して格納します。生成途中のデータコード、誤り訂正コード、マスク適用前後のビット列も取得できます。

## 必要環境

- Deno 2.x

## 使い方

公開APIはルートの`mod.ts`に集約されています。

```ts
import {
  convert,
  Generator,
  type QRLiteBitCanvas,
  type QRLiteConvertOption,
} from "./mod.ts";
```

### QRコードを生成する

```ts
import { convert } from "./mod.ts";

const canvas = convert("https://example.com", {
  level: "Q",
});

console.log(canvas.width, canvas.height);
canvas.print();
```

`level`を省略した場合は`Q`、`version`と`mask`を省略した場合は入力データから自動選択されます。

### 生成オプション

```ts
type QRLiteLevel = "L" | "M" | "Q" | "H";
type QRLiteMask = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface QRLiteConvertOption {
  level?: QRLiteLevel;
  version?: QRLiteVersion;
  mask?: QRLiteMask;
}
```

`QRLiteVersion`は1～40の整数リテラル型です。正確な型定義は[`src/types.ts`](./src/types.ts)を参照してください。

入力がVersion 40の容量を超えた場合、`convert()`は`RangeError`を送出します。
指定したVersionが入力データに対して小さすぎる場合は、格納可能な最小Versionが使用されます。

### BMPファイルとして保存する

```ts
import { convert } from "./mod.ts";

const canvas = convert("Deno");
const bitmap = new Uint8Array(canvas.outputBitmapByte());

await Deno.writeFile("qrcode.bmp", bitmap);
```

実行には書き込み権限が必要です。

```sh
deno run --allow-write example.ts
```

`outputBitmapByte(frame)`の`frame`は周囲の白枠幅です。省略時はQRコードの仕様に沿った4モジュールになります。
出力は1モジュール1ピクセルの1bit BMPです。表示用途では整数倍で拡大してください。

## Generator

生成工程を個別に操作する場合は`Generator`を使用します。

```ts
import { Generator } from "./mod.ts";

const generator = new Generator();

generator.setLevel("Q");
generator.setData("test");

const [dataCode, errorCorrectionCode] = generator.createDataCode();

generator.drawData(dataCode, errorCorrectionCode);

const candidates = generator.createMaskedQRCode();
const mask = generator.selectQRCode(candidates);
const canvas = candidates[mask];

console.log({
  version: generator.getVersion(),
  level: generator.getLevel(),
  mask,
});

canvas.print();
```

主なメソッドは次のとおりです。

- `setLevel(level)`: 誤り訂正レベルを設定します。
- `setData(data)`:
  `string`または`Uint8Array`を設定し、Versionを決定します。容量超過時は`null`を返します。
- `setVersion(version)`: Versionを指定します。0または省略時は自動選択です。
- `createDataCode()`:
  インターリーブ済みのデータコードと誤り訂正コードを返します。
- `drawData(data, ec)`: キャンバスへコード語を書き込みます。
- `createMaskedQRCode()`: マスク0～7を適用した8個の候補を返します。
- `evaluateQRCode(candidates)`:
  各候補のペナルティ値を返します。小さい値ほど良い候補です。
- `selectQRCode(candidates)`: 最小ペナルティのマスク番号を返します。
- `convert(data, option)`: 上記工程をまとめて実行します。
- `get()`: 現在のキャンバスを返します。
- `getVersion()`、`getLevel()`、`getLastMask()`: 現在の設定値を返します。
- `setRating(rating)`:
  カスタム評価器を設定します。省略すると標準評価器へ戻ります。

## QRLiteBitCanvas

QRコードの各モジュールは一次元のビット配列で管理されます。

- `true`: 黒
- `false`: 白
- `undefined`: 生成途中の未設定領域

主なメソッド:

- `getPixel(x, y)`: 指定座標の値を取得します。
- `getPixels()`: 全モジュールを一次元配列で取得します。
- `clone()`: キャンバスを複製します。
- `sprint(option)`: テキスト表現を返します。
- `print(white, black, none)`: テキスト表現をコンソールへ出力します。
- `outputBitmapByte(frame)`: 1bit BMPのバイト配列を返します。

`sprint()`と`print()`の既定表示は、白が`██`、黒が半角スペース2文字、未設定が`--`です。
背景が黒いターミナルでの表示を想定しています。

## 公開API

`mod.ts`から次の値をexportします。

- `convert`
- `Generator`
- `Info`
- `Version`
- `White`
- `Black`

関連する型もすべて`mod.ts`から`export type`されています。
`Info`は容量、RSブロック、生成多項式、マスク式などの内部テーブルを調査する高度な用途向けです。

## qrprint

Unicodeの半ブロック文字を使い、QRコードをターミナルへ表示できます。既定では黒背景・白文字のターミナル向けに、仕様推奨の4モジュール分の余白を付けて出力します。

```sh
deno task qrprint "https://example.com"
```

白背景・黒文字のターミナルでは`--invert`（`-i`）、余白を変更する場合は`--margin`（`-m`）を指定します。

```sh
deno task qrprint --invert --margin 2 "Hello, Deno!"
```

ローカルコマンドとしてインストールする場合:

```sh
deno install --global --name qrprint ./tools/qrprint.ts
qrprint "https://example.com"
```

利用可能なオプションは`qrprint --help`で確認できます。ハイフンから始まる文字列を変換する場合は、`qrprint -- "-text"`のように`--`でオプションの終端を指定します。

## 開発

開発環境、ファイル構成、テスト、リリース準備については[DEVELOPMENT.md](./DEVELOPMENT.md)を参照してください。

## License

MIT
