# QRLite

[![MIT License](http://img.shields.io/badge/license-MIT-blue.svg?style=flat)](LICENSE)
[![npm](https://img.shields.io/badge/npm-v1.1.0-blue.svg?style=flat)](https://www.npmjs.com/package/qrlite)
![browser](https://img.shields.io/badge/js-browser-blue.svg?style=flat "browser")
![nodejs](https://img.shields.io/badge/js-nodejs-blue.svg?style=flat "nodejs")

[日本語はこちら](README_ja.md)

QRLite is QRCode(8bit mode) generator written in TypeScript only.

QRlite can output QRLite bitmap canvas, text, and Monochrome bitmap.

# Install

```sh
npm i qrlite
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

## Browser sample

```html
<script src="./qrlite.js"></script>
<script>console.log(QRLite);</script>
```

## QRCode WebComponents(Browser sample2)

https://github.com/HirokiMiyaoka/QRCodeComponent

QRCodeComponent is QRCode generate and draw Webcomponents uses QRLite.

## TypeScript sample

```ts
import * as QRLite from 'qrlite';
```

# Debug

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

Black = `1` or `true`, White = `0` or `false`.

## QRLite.convert(data: string, option: QRLiteConvertOption): QRLiteBitCanvas

```
type QRLiteLevel = 'L' | 'M' | 'Q' | 'H';
interface QRLiteConvertOption {
    level?: QRLiteLevel;
    version?: number;
    mask?: number;
}
```

## QRLite.Generator

### convert(datastr: string, option?: QRLiteConvertOption): QRLiteBitCanvas

### get(): QRLiteBitCanvas

### getLevel(): QRLiteLevel

### setLevel(level: QRLiteLevel): QRLiteLevel

### getVersion() => number

### setRating(rating?: QRLiteRating): void

```
interface QRLiteRating {
    calc: (canvas: QRLiteBitCanvas) => number;
}
```

### setData( data: string | Uint8Array ) => UInt8Array

### createDataCode() => [ 0: UInt8Array, 1: UInt8Array ]

[ 0 ] ... Data code

[ 1 ] ... EC code.

### drawData( data: Uint8Array, ec: Uint8Array )

### createMaskedQRCode(): QRLiteBitCanvas[]

Return masked QR code.

Mask has 8 types.

### selectQRCode(qrcodes: QRLiteBitCanvas[]): number

### evaluateQRCode(qrcodes: QRLiteBitCanvas[]): number[]

## QRLiteBitCanvas

### clone() => QRLite.BitCanvas

### getPixel( x: number, y: number ) => boolean|undefined

### getPixels() => <boolean|undefined>[]

### drawPixel( x: number, y: number, black: boolean ) => this

### reverse( func: ( i: number, j: number ) => boolean, mask: boolean[] ) => this

### isTransparentPixel( x: number, y: number ) => boolean

### drawQRByte( byte: Uint8Array, cursor?: { x: number, y: number, up: boolean, right: boolean } ) => { x: number, y: number, up: boolean, right: boolean }

### sprint( option?: { white?: string, black?: string, none?: string, newline?: string } )

### print( white: string = '██', black: string = '  ', none: string = '--' )

### outputBitmapByte( frame: number = 4 ) => number[]

Write code `Buffer.from( canvas.outputBitmapByte( frame ) )` if you want to get Buffer.

# Test

## Build

``` sh
npm run build
```

## Run

All test.

``` sh
npm run test
```

Options.

``` sh
npm run test -- OPTION FILES...
```

* OPTION
  * `--binary`
  * `-b`
    * Binary mode.
  * `--debug`
  * `-d`
    * Text mode.
* FILES
  * Set test dir.
    * `npm run test -- 0000_1_H`

## Add

### Base

```text
test/
  NNNN_VERSION_LEVEL/ ... Test case
    test.txt          ... QRCode text.
    sample.png        ... Sample for human.
    sample.bmp        ... Binary mode sample.
    sample.txt        ... Text mode sample.
```

* NNNN
  * Test number. Start `0000`.
* VERSION
  * QRCode version. ( `1` ～ `40` )
* LEVEL
  * QRCode level. ( `L` `M` `Q` `H` )
* test.txt
  * QRCode data.
* sample.png
  * Only sample.

#### Binary

Binary mode test use Microsoft monochrome bitmap.
You create min QRCode and rename `sample.bmp` .

#### Text

Text mode test use `sample.txt` .

This answer set White = [`  `], Black = [`██`].

# Other
