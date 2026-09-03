import type { QRLiteBitCanvas } from "./types.ts";

export class MonochromeBitmap {
  public output(canvas: QRLiteBitCanvas, frame: number) {
    const width = canvas.width;
    const height = canvas.height;
    const bitArray = canvas.getPixels();
    const byte: number[] = [];

    if (!frame || frame <= 0) frame = 0;

    // BMP header.
    byte.push(0x42, 0x4D);
    // File size.(After set.)
    byte.push(0, 0, 0, 0);
    // Empty
    byte.push(0, 0, 0, 0);
    // Offset.(after)
    byte.push(0, 0, 0, 0);

    // Header size.
    byte.push(...this.numberToLE4Byte(40));
    // Width.
    byte.push(...this.numberToLE4Byte(width + frame * 2));
    // Height.
    byte.push(...this.numberToLE4Byte(height + frame * 2));
    // Planes
    byte.push(1, 0);
    // Bit count. Monochrome = 1.
    byte.push(1, 0);
    // Compression
    byte.push(0, 0, 0, 0);
    // DataSize.(after)
    byte.push(0, 0, 0, 0);
    // Option.
    byte.push(196, 14, 0, 0); // Set the same value as MS Paint.
    byte.push(196, 14, 0, 0); // Set the same value as MS Paint.
    byte.push(0, 0, 0, 0);
    byte.push(0, 0, 0, 0);
    // Pallet.
    byte.push(255, 255, 255, 0); // White = 0 = false
    byte.push(0, 0, 0, 0); // Black = 1 = true

    // Offset.
    const offset = this.numberToLE4Byte(byte.length);
    byte[10] = offset[0];
    byte[11] = offset[1];
    byte[12] = offset[2];
    byte[13] = offset[3];

    // 62 byte.

    // Image data.

    // Frame = only white
    this.whiteLine(byte, width, frame);

    // Image = frame data frame
    for (let y = height - 1; 0 <= y; --y) {
      const dot8 = [true, true, true, true, true, true, true, true];
      let x: number;
      let count = 0;
      let w = 0;
      for (x = -frame; x < width + frame; ++x) {
        dot8[w] = (x < 0 || width <= x)
          ? false
          : dot8[w] = bitArray[y * width + x];
        if (++w === 8) {
          ++count;
          byte.push(
            (dot8[0] ? 128 : 0) + (dot8[1] ? 64 : 0) + (dot8[2] ? 32 : 0) +
              (dot8[3] ? 16 : 0) + (dot8[4] ? 8 : 0) + (dot8[5] ? 4 : 0) +
              (dot8[6] ? 2 : 0) + (dot8[7] ? 1 : 0),
          );
          dot8[0] =
            dot8[1] =
            dot8[2] =
            dot8[3] =
            dot8[4] =
            dot8[5] =
            dot8[6] =
            dot8[7] =
              true;
          w = 0;
        }
      }
      if (w % 8 !== 0) {
        ++count;
        byte.push(
          (dot8[0] ? 128 : 0) + (dot8[1] ? 64 : 0) + (dot8[2] ? 32 : 0) +
            (dot8[3] ? 16 : 0) + (dot8[4] ? 8 : 0) + (dot8[5] ? 4 : 0) +
            (dot8[6] ? 2 : 0) + (dot8[7] ? 1 : 0),
        );
      }
      while (count % 4 !== 0) {
        ++count;
        byte.push(0);
      }
    }

    // Frame = only white
    this.whiteLine(byte, width, frame);

    // File size.
    const filesize = this.numberToLE4Byte(byte.length);
    byte[2] = filesize[0];
    byte[3] = filesize[1];
    byte[4] = filesize[2];
    byte[5] = filesize[3];

    // Data size.
    const dataSize = this.numberToLE4Byte(byte.length - 62);
    byte[34] = dataSize[0];
    byte[35] = dataSize[1];
    byte[36] = dataSize[2];
    byte[37] = dataSize[3];

    return byte;
  }

  private whiteLine(byte: number[], width: number, frame: number) {
    for (let y = 0; y < frame; ++y) {
      const length = width + frame * 2;
      let count = 0;
      let x: number;
      for (x = 0; x < length; x += 8) {
        ++count;
        byte.push(0);
      }
      while (count % 4 !== 0) {
        ++count;
        byte.push(0);
      }
    }
  }

  private numberToLE4Byte(data: number) {
    const byte = [0, 0, 0, 0];
    for (let i = 0; i < 4; ++i) {
      byte[i] = data % 256;
      data = Math.floor(data / 256);
    }
    return byte;
  }
}
