import { B, W } from "./constants.ts";
import { BitReader } from "./bit_reader.ts";
import { MonochromeBitmap } from "./bitmap.ts";
import type { QRLiteBitCanvas, QRLiteLevel } from "./types.ts";

export class BitCanvas implements QRLiteBitCanvas {
  public width: number;
  public height: number;
  private bitarray: boolean[]; // true = black, false = white, undefined = transpart.

  constructor(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.bitarray = new Array<boolean>(w * h);
  }

  public clone(): QRLiteBitCanvas {
    const canvas = new BitCanvas(this.width, this.height);
    canvas.drawFromBitarray(this.bitarray);

    return canvas;
  }

  public reverse(func: (i: number, j: number) => boolean, mask: boolean[]) {
    for (let i = 0; i < this.bitarray.length; ++i) {
      if (!mask[i] || !func(i % this.width, Math.floor(i / this.width))) {
        continue;
      }
      this.bitarray[i] = !this.bitarray[i];
    }
    return this;
  }

  public getPixel(x: number, y: number) {
    if (x < 0 || this.width <= x || y < 0 || this.height <= y) {
      return <boolean> <any> undefined;
    }
    return this.bitarray[y * this.width + x];
  }

  public getPixels() {
    return this.bitarray;
  }

  public drawPixel(x: number, y: number, black: boolean) {
    if (x < 0 || this.width <= x || y < 0 || this.height <= y) return this;
    this.bitarray[y * this.width + x] = !!black;
    return this;
  }

  public drawFromBitarray(bitarray: boolean[]) {
    for (let i = 0; i < bitarray.length && i < this.bitarray.length; ++i) {
      this.bitarray[i] = !!bitarray[i];
    }
    return this;
  }

  public isTransparentPixel(x: number, y: number) {
    if (x < 0 || this.width <= x || y < 0 || this.height <= y) return false;
    return this.bitarray[y * this.width + x] === undefined;
  }

  public drawTimingPattern() {
    for (let x = 0; x < this.width; ++x) this.drawPixel(x, 6, !(x % 2));
    for (let y = 0; y < this.height; ++y) this.drawPixel(6, y, !(y % 2));
    return this;
  }

  public drawQRInfo(level?: QRLiteLevel, mask?: number) {
    const data: boolean[] = [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B];

    switch (level) {
      case "L":
        data[0] = W;
        data[1] = B;
        break;
      case "M":
        data[0] = W;
        data[1] = W;
        break;
      case "Q":
        data[0] = B;
        data[1] = B;
        break;
      case "H":
        data[0] = B;
        data[1] = W;
        break;
    }

    switch (mask) {
      case 0:
        data[2] = W;
        data[3] = W;
        data[4] = W;
        break;
      case 1:
        data[2] = W;
        data[3] = W;
        data[4] = B;
        break;
      case 2:
        data[2] = W;
        data[3] = B;
        data[4] = W;
        break;
      case 3:
        data[2] = W;
        data[3] = B;
        data[4] = B;
        break;
      case 4:
        data[2] = B;
        data[3] = W;
        data[4] = W;
        break;
      case 5:
        data[2] = B;
        data[3] = W;
        data[4] = B;
        break;
      case 6:
        data[2] = B;
        data[3] = B;
        data[4] = W;
        break;
      case 7:
        data[2] = B;
        data[3] = B;
        data[4] = B;
        break;
    }

    if (level !== undefined && mask !== undefined) {
      const k = [
        data[0],
        data[1],
        data[2],
        data[3],
        data[4],
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
        W,
      ];
      let a = 0;
      if (data[0]) a = 4;
      else if (data[1]) a = 3;
      else if (data[2]) a = 2;
      else if (data[3]) a = 1;
      else if (data[4]) a = 0;

      const g = [B, W, B, W, W, B, B, W, B, B, B];

      for (let i = 0; i < 5; ++i) {
        if (!k[i]) continue;
        for (let j = 0; j < g.length; ++j) {
          k[i + j] = k[i + j] !== g[j];
        }
      }
      for (let i = 5; i < data.length; ++i) data[i] = k[i];
      data[0] = data[0] !== B; // 1
      data[1] = data[1] !== W; // 0
      data[2] = data[2] !== B; // 1
      data[3] = data[3] !== W; // 0
      data[4] = data[4] !== B; // 1
      data[5] = data[5] !== W; // 0
      data[6] = data[6] !== W; // 0
      data[7] = data[7] !== W; // 0
      data[8] = data[8] !== W; // 0
      data[9] = data[9] !== W; // 0
      data[10] = data[10] !== B; // 1
      data[11] = data[11] !== W; // 0
      data[12] = data[12] !== W; // 0
      data[13] = data[13] !== B; // 1
      data[14] = data[14] !== W; // 0
    }

    this.drawPixel(8, 0, data[14]);
    this.drawPixel(8, 1, data[13]);
    this.drawPixel(8, 2, data[12]);
    this.drawPixel(8, 3, data[11]);
    this.drawPixel(8, 4, data[10]);
    this.drawPixel(8, 5, data[9]);

    this.drawPixel(8, 7, data[8]);
    this.drawPixel(8, 8, data[7]);
    this.drawPixel(7, 8, data[6]);

    this.drawPixel(5, 8, data[5]);
    this.drawPixel(4, 8, data[4]);
    this.drawPixel(3, 8, data[3]);
    this.drawPixel(2, 8, data[2]);
    this.drawPixel(1, 8, data[1]);
    this.drawPixel(0, 8, data[0]);

    this.drawPixel(this.width - 8, 8, data[7]);
    this.drawPixel(this.width - 7, 8, data[8]);
    this.drawPixel(this.width - 6, 8, data[9]);
    this.drawPixel(this.width - 5, 8, data[10]);
    this.drawPixel(this.width - 4, 8, data[11]);
    this.drawPixel(this.width - 3, 8, data[12]);
    this.drawPixel(this.width - 2, 8, data[13]);
    this.drawPixel(this.width - 1, 8, data[14]);

    this.drawPixel(8, this.height - 8, B); // Fix

    this.drawPixel(8, this.height - 7, data[6]);
    this.drawPixel(8, this.height - 6, data[5]);
    this.drawPixel(8, this.height - 5, data[4]);
    this.drawPixel(8, this.height - 4, data[3]);
    this.drawPixel(8, this.height - 3, data[2]);
    this.drawPixel(8, this.height - 2, data[1]);
    this.drawPixel(8, this.height - 1, data[0]);

    return this;
  }

  public drawVersionInfo(version: number) {
    if (version < 7) return this;

    let remainder = version;
    for (let i = 0; i < 12; ++i) {
      remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1F25);
    }
    const data = (version << 12) | remainder;

    for (let i = 0; i < 18; ++i) {
      const black = ((data >>> i) & 1) !== 0;
      const a = this.width - 11 + i % 3;
      const b = Math.floor(i / 3);
      this.drawPixel(a, b, black);
      this.drawPixel(b, a, black);
    }

    return this;
  }

  public drawFinderPattern(x: number, y: number) {
    const pattern = [
      W,
      W,
      W,
      W,
      W,
      W,
      W,
      W,
      W,
      W,
      B,
      B,
      B,
      B,
      B,
      B,
      B,
      W,
      W,
      B,
      W,
      W,
      W,
      W,
      W,
      B,
      W,
      W,
      B,
      W,
      B,
      B,
      B,
      W,
      B,
      W,
      W,
      B,
      W,
      B,
      B,
      B,
      W,
      B,
      W,
      W,
      B,
      W,
      B,
      B,
      B,
      W,
      B,
      W,
      W,
      B,
      W,
      W,
      W,
      W,
      W,
      B,
      W,
      W,
      B,
      B,
      B,
      B,
      B,
      B,
      B,
      W,
      W,
      W,
      W,
      W,
      W,
      W,
      W,
      W,
      W,
    ];
    this.drawPattern(pattern, x, y, 9, 9);

    return this;
  }

  public drawAlignmentPattern(x: number, y: number) {
    const pattern = [
      B,
      B,
      B,
      B,
      B,
      B,
      W,
      W,
      W,
      B,
      B,
      W,
      B,
      W,
      B,
      B,
      W,
      W,
      W,
      B,
      B,
      B,
      B,
      B,
      B,
    ];
    this.drawPattern(pattern, x, y, 5, 5);

    return this;
  }

  public drawPattern(
    pattern: (number | boolean)[],
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    for (let b = 0; b < h; ++b) {
      for (let a = 0; a < w; ++a) {
        this.drawPixel(x + a, y + b, !!pattern[b * w + a]);
      }
    }
    this.drawPixel(8, this.height - 8, W);

    return this;
  }

  public drawQRByte(
    byte: Uint8Array,
    cursor?: { x: number; y: number; up: boolean; right: boolean },
  ) {
    if (!cursor) {
      cursor = { x: this.width - 1, y: this.height - 1, up: true, right: true };
    }

    const reader = new BitReader(byte);
    while (reader.hasNext()) {
      // Bit reverse.
      this.drawPixel(
        cursor.x - (cursor.right ? 0 : 1),
        cursor.y,
        reader.getNext(),
      );

      // Search next cursor.
      if (cursor.right) {
        // Right side.

        // Move.left.
        if (this.isTransparentPixel(cursor.x - 1, cursor.y)) {
          cursor.right = false;
          continue;
        }
        // Move up/down.
        let nexty = this.existsEmpty(cursor.x, cursor.y, cursor.up);
        // Check up/down right
        while (nexty < 0) {
          // Check left line;
          if (this.noEmptyLine(cursor.x - 2)) --cursor.x;
          // Move left line.
          cursor.right = true;
          cursor.up = !cursor.up;
          cursor.y = cursor.up ? this.height - 1 : 0;
          cursor.x -= 2;
          if (cursor.x < 0) break;
          nexty = this.existsEmpty(cursor.x, cursor.y, cursor.up);
        }
        if (cursor.x < 0) break;
        cursor.y = nexty;
      } else {
        // Left side.

        // Move right.
        cursor.right = true;

        // Move up/down.
        let nexty = this.existsEmpty(cursor.x, cursor.y, cursor.up);
        // Check up/down right
        while (nexty < 0) {
          // Check left line;
          if (this.noEmptyLine(cursor.x - 2)) --cursor.x;
          // Move left line.
          cursor.right = true;
          cursor.up = !cursor.up;
          cursor.y = cursor.up ? this.height - 1 : 0;
          cursor.x -= 2;
          if (cursor.x < 0) break;
          nexty = this.existsEmpty(cursor.x, cursor.y, cursor.up);
        }
        if (cursor.x < 0) break;
        cursor.y = nexty;

        if (this.isTransparentPixel(cursor.x, cursor.y)) {
          // Right side.
          continue;
        }
        // Left side.
        // Move left.
        cursor.right = false;
      }
    }

    if (reader.hasNext()) console.log("Error: Data overflow!");

    return cursor;
  }

  public fillEmpty(color = W) {
    const length = this.width * this.height;
    let count = 0;
    for (let i = 0; i < length; ++i) {
      if (this.bitarray[i] === undefined) {
        this.bitarray[i] = color;
        ++count;
      }
    }
    return count;
  }

  private existsEmpty(rx: number, y: number, up: boolean) {
    if (up) {
      for (; 0 <= y; --y) {
        if (
          this.isTransparentPixel(rx, y) || this.isTransparentPixel(rx - 1, y)
        ) return y;
      }
      return -1;
    }
    for (; y < this.height; ++y) {
      if (
        this.isTransparentPixel(rx, y) || this.isTransparentPixel(rx - 1, y)
      ) return y;
    }
    return -1;
  }

  private noEmptyLine(x: number) {
    for (let y = 0; y < this.height; ++y) {
      if (this.isTransparentPixel(x, y)) return false;
    }
    return true;
  }

  public sprint(
    option?: {
      white?: string;
      black?: string;
      none?: string;
      newline?: string;
    },
  ) {
    const white = option && option.white !== undefined ? option.white : "██";
    const black = option && option.black !== undefined ? option.black : "  ";
    const none = option && option.none !== undefined ? option.none : "--";
    const newline = option && option.newline !== undefined
      ? option.newline
      : "\n";
    const lines: string[] = [];
    for (let y = 0; y < this.height; ++y) {
      const line: string[] = [];
      for (let x = 0; x < this.width; ++x) {
        line.push(
          this.bitarray[y * this.height + x] === undefined
            ? none
            : (this.bitarray[y * this.height + x] ? black : white),
        );
      }
      lines.push(line.join(""));
    }
    return lines.join(newline);
  }

  public print(
    white: string = "██",
    black: string = "  ",
    none: string = "--",
  ) {
    console.log(this.sprint({ white: white, black: black, none: none }));
  }

  public outputBitmapByte(frame: number = 4): number[] {
    const bitmap = new MonochromeBitmap();
    return bitmap.output(this, frame);
  }
}
