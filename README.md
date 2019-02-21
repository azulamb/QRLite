# QRLite

QRコードの勉強を兼ねてTypeScriptのみで作成したQRコード生成機です。他モジュールへの依存も型定義の`@types/node`を除いてありません。
（簡易版ということでとりあえず半角英数の文字列のみOKな8bit版を生成可能。）

勉強も兼ねているので、マスク処理前、マスク処理した8種類のデータも取得できるようにしている他、モノクロビットマップのバイナリデータを出力可能です。
（実際にファイルとして出力する場合、fsなどで出力してください。）

# Install

```sh
npm i HirokiMiyaoka/QRLite
```

# Sample

## Output Bitmap(Node.js sample)

``` js
const QRLite = require( 'qrlite' );
function OutputBitmapFile( name, canvas, frame ) {
	if ( frame === undefined ) { frame = 4; }
	var fs = require('fs');
	var buf = Buffer.from( canvas.outputBitmapByte( frame ) );
	fs.writeFileSync( name, buf );
}
OutputBitmapFile( 'test.bmp', QRLite.convert( 'test' ) );
```

## QRCode WebComponents(Browser sample)

https://github.com/HirokiMiyaoka/QRCodeComponent

QRコードを生成するWebComponentsです。

QRコードの生成部分はこのQRLiteを使い、WebComponentsを使って実際のViewと連携しています。

# Debug

以下のようにしてQRコードのビットデータを作成しています。（中身はほぼ`QRLite.Generator.convert`でやっていること。）
途中で結果を出力などしていけばいろいろ見れるはず。

``` js
const qr = new QRLite.Generator();

// Set level.
qr.setLevel( 'Q' );

// Set data.
qr.setData( 'test' );

// datacode[ 0 ] = Data block, datacode[ 1 ] = EC Block
const datacode = qr.createDataCode();

// Raw QR Code.
qr.drawData( datacode[ 0 ], datacode[ 1 ] );
const rawcanvas = qr.get();

// Get masked canvases.(masked[ 0-7 ] = QRLite.Canvas)
const masked = qr.createMaskedQRCode();

// Print QRCode points.
// console.log( qr.evaluateQRCode( masked ) );

// Select mask number.
const masknum = qr.selectQRCode( masked );

// QR Code.
const canvas = masked[ masknum ];

// Output to console.
canvas.print();
```

なお、QRコードは黒=1という扱いらしいので、それに従って黒は `1` や `true` で、白は `0` や `false`にします。

一応仕様上存在しないのですが、生成中のQRコードには透明な部分もあるので、そこは `undefined` として扱います。

## QRLite.convert( data: string, level: 'L' | 'M' | 'Q' | 'H' = 'Q' ) => QRLite.BitCanvas

とりあえず文字列を与えるとQRコードを生成して `QRLite.BitCanvas` を返します。

レベルを省略すると `Q` が指定されます。

## QRLite.Generator

QRコードを生成するクラスです。
主な演算周りを行います。

BitやByte周りの操作は別クラスで行い、QRコードの画像としてのBit列は `QRLite.BitCanvas` を使って出力しています。

初めにあるように丁寧に出力した場合、データのバイト列、誤り訂正コードのバイト列の他、マスク処理を行う前のQRコードやマスク処理を行った結果の8種類のQRコードも `QRLite.BitCanvas` で受け取ることが可能です。

（例えば最後の評価部分だけ自分でやるとか、データや誤り訂正コードだけ自作とかも可能。）

### convert( datastr: string, level?: Level ) => QRLite.BitCanvas

データを与えることで一番良いQRコードを返します。レベルの指定も可能です。

`QRLite.convert` は `new QRLite.Generator()` してこのメソッドを呼び出しているだけです。

### get() => QRLite.BitCanvas

現在のQRコードの状態を返します。

### getLevel() => 'L' | 'M' | 'Q' | 'H'

現在のレベルを返します。

### setLevel( level: Level )

レベルを設定します。
なおデータをいろいろ入れた後に入れても意味がないので、`setData` の前に行うか `setData` をもう一度実行しましょう。

### getVersion() => number

現在のバージョンを知ることができますが、`setData` の後でないと正確な情報は出てきません。

バージョンは現在のレベルとデータ量に応じて変化します。

### setRating( rating?: Rating )

`interface QRLite.Rating { calc: ( canvas: BitCanvas ) => number; }` を継承したクラスのインスタンスを渡すと、その評価器を使ってQRコードを評価します。

`QRLite.Rating` は `calc: ( canvas: BitCanvas ) => number` さえ実装していれば良いです。

ちなみに、返す値が大きければ大きいほど減点が大きく悪いQRコードとなります。

引数に何も与えない場合はデフォルトの評価器を再設定します。

### setData( data: string | Uint8Array ) => UInt8Array

QRコードのデータをセットします。

この時点でバージョンが設定され、 `QRLite.BitCanvas` が最低限準備されます。

また返り値である文字列をバイト配列にしたデータが保持されることになります。

### createDataCode() => [ 0: UInt8Array, 1: UInt8Array ]

すでにセットされたレベル、バージョン、データを元に、QRコードに書き込める状態のバイト列([0])と誤り訂正コード([1])を返します。

### drawData( data: Uint8Array, ec: Uint8Array )

データと誤り訂正コードのバイト列を与えることで、 `QRLite.BitCanvas` にデータを書き込みます。

この時点で生のQRコードが得られます。

### createMaskedQRCode() => QRLite.BitCanvas[]

マスク処理を行った `QRLite.BitCanvas` を8つ得られます。

### selectQRCode( qrcodes: BitCanvas[] ) => number

マスク処理を行った `QRLite.BitCanvas` の配列を与えると、その中で最も減点が低い `QRLite.BitCanvas` の番号が返されます。

基本的には `createMaskedQRCode()` で得られた結果をそのまま与えます。

### evaluateQRCode( qrcodes: BitCanvas[] ) => number[]

上で使われている、QRコードの評価です。

`QRLite.BitCanvas` の配列を与えると与えた順番に評価のポイントが返されます。

仕様では減点ですが、こちらでは加点を行うため、正の値となっています。
この結果、仕様では最も減点が少ないQRコードを採用することになっていますが、この場合は最もポイントが低いQRコードが評価の良いQRコードとなります。

## QRLite.BitCanvas

QRコードのBit列を管理するクラスです。

### clone() => QRLite.BitCanvas

今の自分の状態をコピーした `QRLite.BitCanvas` を生成します。
生のQRコードができた後マスク処理のためにコピーする際などに使います。

### reverse( func: ( i: number, j: number ) => boolean, mask: boolean[] ) => this

第一引数はx,y座標を与えられるとその場のドットを反転させる場合にtrueを返す関数を与えます。

なお、第二引数は全ドットに対応していて、falseの場合は処理をそもそも行いません。

QRコードのシンボルを避けてマスク処理を行う場合に使います。

### getPixel( x: number, y: number ) => boolean|undefined

指定座標における色を返します。

`true` が黒、 `false` が白、 `undefined` が透明です。

この情報を元に `HTMLCanvasElement` に描画したりします。

なお、処理が面倒なのでTypeScriptの型上ではundefinedはないものとして扱われています。

### isTransparentPixel( x: number, y: number ) => boolean

指定した座標が透明の場合 `true` を返します。

### getPixels() => <boolean|undefined>[]

全ての色を配列で取得します。

### drawPixel( x: number, y: number, black: boolean ) => this

指定した座標に黒(`true`)か白(`false`)を描画します。

範囲外は無視されます。

### drawQRByte( byte: Uint8Array, cursor?: { x: number, y: number, up: boolean, right: boolean } ) => { x: number, y: number, up: boolean, right: boolean }

QRコードのデータを書き込みます。

バイトの配列をビットにして書き込む際、現在透明なドットにのみ影響を与えます。

また、カーソルの概念があり、省略すれば開始点（右下）からで、次回以降このメソッドを呼び出す時にどこから開始するかのカーソルを返します。

カーソルは右の点を基準とし、今進んでいる方向(`up`=`true`なら上に進む)、今右を調べているかどうか(`right`=`true`)の情報も持っています。

基本的にはQRコードのシンボルなどを全て描画した後使うメソッドです。

### public sprint( option?: { white?: string, black?: string, none?: string, newline?: string } )

現在のQRコードを文字列にして返します。

初期設定では白を `██`、黒を `  `、空を `--`、改行を `\n` で表示します。

背景黒、文字色白のターミナルの場合、きれいなQRコードを出力するはずです。

白黒空改行はそれぞれ引数に与えれば変更可能です。

以下の `print()` は内部的にはこの `sprint()` を利用しています。

### print( white: string = '██', black: string = '  ', none: string = '--' )

`console.log` に現在のQRコードを出力します。

初期設定では白を `██`、黒を `  `、空を `--` で表示します。

背景黒、文字色白のターミナルの場合、きれいなQRコードを出力するはずです。

白黒空はそれぞれ引数に与えれば変更可能です。

### outputBitmapByte( frame: number = 1 ) => number[]

モノクロビットマップのバイトが入った数値の配列を返します。

Node.jsであれば `Buffer.from( canvas.outputBitmapByte( frame ) )` のようにしてBufferを作り、それをファイルに書き込めば良いです。

何も指定しない場合はQRコードの周りに1pxの白枠を追加します。
もし白枠を必要としない場合は0を与えてください。

# Test

## Build

一応ビルド済みです。

``` sh
npm run build
```

## Run

以下コマンドで普通の全テストが可能です。

``` sh
npm run test
```

以下のように個別対応やモード指定も可能です。

``` sh
npm run test -- OPTION FILES...
```

* OPTION
  * `--binary`
  * `-b`
    * バイナリモード（モノクロビットマップ）でテストします。
  * `--debug`
  * `-d`
    * デバッグモードでテストします。いつもより出力が多いです。
* FILES
  * テストするフォルダを指定すると、そのテストだけ行います。
    * `npm run test -- 0000_1_H`
  * 複数指定も可能です。指定がない場合は全てのテストを行います。

## Add

### Base

テストの追加はバイナリとテキスト両方可能です。

基本構造は以下のようになっています。

```text
test/
  NNNN_VERSION_LEVEL/ ... Test case
    test.txt          ... QRCode text.
    sample.png        ... Sample for human.
    sample.bmp        ... Binary mode sample.
    sample.txt        ... Text mode sample.
```

* NNNN
  * テストの番号を決めるだけのものです。とりあえず `0000` から始めています。
* VERSION
  * QRコードのバージョンで、`1` ～ `40`です。
* LEVEL
  * QRコードのレベルで、`L` `M` `Q` `H` のどれかです。
* test.txt
  * QRコードを生成するための文字列です。
* sample.png
  * テストの正解になるQRコードのサンプルです。テストには使われません。完全なサンプルです。

#### Binary

Windowsのモノクロビットマップでのテストを行います。
正解ファイルは `sample.bmp` です。

QRコードの余白を取り除き、1マス1pxにした最小QRコードが正解データとして使われます。

また、Microsoft ペイントでは、最小状態でモノクロビットマップに変換すると、QRコードが破壊されます。
そのため、一度2倍や4倍などの大きめのQRコードをモノクロビットマップに変換した後、リサイズしてください。

#### Text

テキスト出力したQRコードでテストを行います。改行コードは無視するような作りになっているはずです。
正解ファイルは `sample.txt` です。

QRコードの余白を取り除き、白は [`  `] 黒は [`██`] にした最小QRコードが正解データとして使われます。
注意事項として、デフォルトの設定で `print` した時と白黒が逆になっています。
（理由は後述するコンバーターで見やすくするのと、白黒入れ替えのテストも兼ねている。）

一応きれいなQRコードを最小のテキストQRコードに変換するプログラムも用意されています。
ブラウザで `docs/index.html` を開くか、https://hirokimiyaoka.github.io/QRLite/ にアクセスしてください。

# Other

## TODO

* mjs出力
  * できればES Moduleに対応したい。
* @types/qrlite
  * どうすればいいのか試行錯誤中。
