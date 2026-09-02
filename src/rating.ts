import { B, W } from "./constants.ts";
import type { QRLiteBitCanvas, QRLiteRating } from "./types.ts";

export class DefaultRating implements QRLiteRating {
  public calc(canvas: QRLiteBitCanvas) {
    const bitarray = canvas.getPixels();
    let point = 0;

    // 1.
    this.sameBitarrayLines(bitarray, canvas.width, canvas.height).forEach(
      (length) => {
        point += 3 + length - 5;
      },
    );

    // 2.
    point += this.count2x2Blocks(bitarray, canvas.width, canvas.height) * 3;

    // 3. http://bagpack.hatenablog.jp/entry/2016/12/06/173428
    point += this.countBadPatterns(bitarray, canvas.width, canvas.height) * 40;

    // 4.
    const black = this.countBitarray(bitarray, B);
    point += Math.floor(
      Math.abs(black * 20 - bitarray.length * 10) / bitarray.length,
    ) * 10;

    return point;
  }

  private sameBitarrayLines(
    bitarray: boolean[],
    width: number,
    height: number,
  ) {
    const lines: number[] = [];

    for (let y = 0; y < height; ++y) {
      let color = bitarray[y * width];
      let count = 1;
      for (let x = 1; x < width; ++x) {
        if (bitarray[y * width + x] === color) {
          ++count;
          continue;
        }
        if (5 <= count) lines.push(count);
        color = bitarray[y * width + x];
        count = 1;
      }
      if (5 <= count) lines.push(count);
    }

    for (let x = 0; x < width; ++x) {
      let color = bitarray[x];
      let count = 1;
      for (let y = 1; y < height; ++y) {
        if (bitarray[y * width + x] === color) {
          ++count;
          continue;
        }
        if (5 <= count) lines.push(count);
        color = bitarray[y * width + x];
        count = 1;
      }
      if (5 <= count) lines.push(count);
    }

    return lines;
  }

  private count2x2Blocks(bitarray: boolean[], width: number, height: number) {
    let count = 0;

    for (let y = 1; y < height; ++y) {
      for (let x = 1; x < width; ++x) {
        if (
          bitarray[y * width + x - 1] === bitarray[y * width + x] &&
          bitarray[(y - 1) * width + x] === bitarray[y * width + x] &&
          bitarray[(y - 1) * width + x - 1] === bitarray[y * width + x]
        ) {
          ++count;
        }
      }
    }

    return count;
  }

  private countBadPatterns(bitarray: boolean[], width: number, height: number) {
    const bad = [B, W, B, B, B, W, B];
    let count = 0;

    for (let y = 0; y < height; ++y) {
      for (let x = 0; x <= width - bad.length; ++x) {
        let matches = true;
        for (let i = 0; i < bad.length; ++i) {
          if (bitarray[y * width + x + i] !== bad[i]) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
        const before = 4 <= x && !bitarray[y * width + x - 1] &&
          !bitarray[y * width + x - 2] && !bitarray[y * width + x - 3] &&
          !bitarray[y * width + x - 4];
        const after = x + 10 < width && !bitarray[y * width + x + 7] &&
          !bitarray[y * width + x + 8] && !bitarray[y * width + x + 9] &&
          !bitarray[y * width + x + 10];
        if (before || after) ++count;
      }
    }

    for (let x = 0; x < width; ++x) {
      for (let y = 0; y <= height - bad.length; ++y) {
        let matches = true;
        for (let i = 0; i < bad.length; ++i) {
          if (bitarray[(y + i) * width + x] !== bad[i]) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
        const before = 4 <= y && !bitarray[(y - 1) * width + x] &&
          !bitarray[(y - 2) * width + x] && !bitarray[(y - 3) * width + x] &&
          !bitarray[(y - 4) * width + x];
        const after = y + 10 < height && !bitarray[(y + 7) * width + x] &&
          !bitarray[(y + 8) * width + x] && !bitarray[(y + 9) * width + x] &&
          !bitarray[(y + 10) * width + x];
        if (before || after) ++count;
      }
    }

    return count;
  }

  private countBitarray(bitarray: boolean[], target: boolean) {
    let count = 0;
    for (let i = 0; i < bitarray.length; ++i) {
      if (bitarray[i] === target) ++count;
    }
    return count;
  }
}
