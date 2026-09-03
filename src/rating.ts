import { Black as B, White as W } from "./constants.ts";
import type { QRLiteBitCanvas, QRLiteRating } from "./types.ts";

export class DefaultRating implements QRLiteRating {
  public calc(canvas: QRLiteBitCanvas) {
    const bitArray = canvas.getPixels();
    let point = 0;

    // 1.
    this.sameBitArrayLines(bitArray, canvas.width, canvas.height).forEach(
      (length) => {
        point += 3 + length - 5;
      },
    );

    // 2.
    point += this.count2x2Blocks(bitArray, canvas.width, canvas.height) * 3;

    // 3. http://bagpack.hatenablog.jp/entry/2016/12/06/173428
    point += this.countBadPatterns(bitArray, canvas.width, canvas.height) * 40;

    // 4.
    const black = this.countBitArray(bitArray, B);
    point += Math.floor(
      Math.abs(black * 20 - bitArray.length * 10) / bitArray.length,
    ) * 10;

    return point;
  }

  private sameBitArrayLines(
    bitArray: boolean[],
    width: number,
    height: number,
  ) {
    const lines: number[] = [];

    for (let y = 0; y < height; ++y) {
      let color = bitArray[y * width];
      let count = 1;
      for (let x = 1; x < width; ++x) {
        if (bitArray[y * width + x] === color) {
          ++count;
          continue;
        }
        if (5 <= count) lines.push(count);
        color = bitArray[y * width + x];
        count = 1;
      }
      if (5 <= count) lines.push(count);
    }

    for (let x = 0; x < width; ++x) {
      let color = bitArray[x];
      let count = 1;
      for (let y = 1; y < height; ++y) {
        if (bitArray[y * width + x] === color) {
          ++count;
          continue;
        }
        if (5 <= count) lines.push(count);
        color = bitArray[y * width + x];
        count = 1;
      }
      if (5 <= count) lines.push(count);
    }

    return lines;
  }

  private count2x2Blocks(bitArray: boolean[], width: number, height: number) {
    let count = 0;

    for (let y = 1; y < height; ++y) {
      for (let x = 1; x < width; ++x) {
        if (
          bitArray[y * width + x - 1] === bitArray[y * width + x] &&
          bitArray[(y - 1) * width + x] === bitArray[y * width + x] &&
          bitArray[(y - 1) * width + x - 1] === bitArray[y * width + x]
        ) {
          ++count;
        }
      }
    }

    return count;
  }

  private countBadPatterns(bitArray: boolean[], width: number, height: number) {
    const bad = [B, W, B, B, B, W, B];
    let count = 0;

    for (let y = 0; y < height; ++y) {
      for (let x = 0; x <= width - bad.length; ++x) {
        let matches = true;
        for (let i = 0; i < bad.length; ++i) {
          if (bitArray[y * width + x + i] !== bad[i]) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
        const before = 4 <= x && !bitArray[y * width + x - 1] &&
          !bitArray[y * width + x - 2] && !bitArray[y * width + x - 3] &&
          !bitArray[y * width + x - 4];
        const after = x + 10 < width && !bitArray[y * width + x + 7] &&
          !bitArray[y * width + x + 8] && !bitArray[y * width + x + 9] &&
          !bitArray[y * width + x + 10];
        if (before || after) ++count;
      }
    }

    for (let x = 0; x < width; ++x) {
      for (let y = 0; y <= height - bad.length; ++y) {
        let matches = true;
        for (let i = 0; i < bad.length; ++i) {
          if (bitArray[(y + i) * width + x] !== bad[i]) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
        const before = 4 <= y && !bitArray[(y - 1) * width + x] &&
          !bitArray[(y - 2) * width + x] && !bitArray[(y - 3) * width + x] &&
          !bitArray[(y - 4) * width + x];
        const after = y + 10 < height && !bitArray[(y + 7) * width + x] &&
          !bitArray[(y + 8) * width + x] && !bitArray[(y + 9) * width + x] &&
          !bitArray[(y + 10) * width + x];
        if (before || after) ++count;
      }
    }

    return count;
  }

  private countBitArray(bitArray: boolean[], target: boolean) {
    let count = 0;
    for (let i = 0; i < bitArray.length; ++i) {
      if (bitArray[i] === target) ++count;
    }
    return count;
  }
}
