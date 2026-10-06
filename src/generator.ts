import { Byte } from "./byte.ts";
import { BitCanvas } from "./bit_canvas.ts";
import { Info } from "./info.ts";
import { DefaultRating } from "./rating.ts";
import type {
  QRLiteBitCanvas,
  QRLiteConvertOption,
  QRLiteGenerator,
  QRLiteLevel,
  QRLiteMask,
  QRLiteRating,
  QRLiteRSBlock,
  QRLiteVersion,
} from "./types.ts";

/** Stateful QR encoder supporting custom mask scoring and intermediate codewords. */
export class Generator implements QRLiteGenerator {
  private level: QRLiteLevel;
  private version: QRLiteVersion | 0;
  private lastMask: QRLiteMask | 0 = 0;
  private rawData!: Uint8Array;
  private canvas!: QRLiteBitCanvas;
  private mask!: boolean[];
  private rating!: QRLiteRating;

  /** Create a generator with correction level Q and automatic version selection. */
  constructor() {
    this.level = "Q";
    this.version = 0;
    this.setRating();
  }

  /** Return the working canvas initialized by setData or setVersion, before mask selection. */
  public get(): QRLiteBitCanvas {
    return this.canvas;
  }

  /** Return the current error correction level. */
  public getLevel(): QRLiteLevel {
    return this.level;
  }

  /** Set the correction level; invalid runtime values fall back to Q. */
  public setLevel(level: QRLiteLevel): QRLiteLevel {
    if (level !== "L" && level !== "M" && level !== "Q" && level !== "H") {
      level = "Q";
    }
    this.level = level;
    return this.level;
  }

  /** Return the selected version, or zero when no version fits. */
  public getVersion(): QRLiteVersion | 0 {
    return this.version;
  }

  /** Initialize a canvas for the requested minimum version; zero selects automatically. */
  public setVersion(version = 0): QRLiteVersion | 0 {
    version = Math.floor(version);
    const data = this.rawData || "";

    const min = this.searchVersion(data.length, this.level);

    this.version =
      <QRLiteVersion> ((1 <= version && version <= 40 && min <= version)
        ? version
        : min);

    if (this.version <= 0) return 0;

    // version1 = 21, 2 = 25, ...
    const w = 17 + this.version * 4;
    const h = w;
    this.canvas = new BitCanvas(w, h);
    this.canvas.drawQRInfo(); // draw empty info.
    this.canvas.drawTimingPattern();
    this.canvas.drawFinderPattern(-1, -1);
    this.canvas.drawFinderPattern(w - 8, -1);
    this.canvas.drawFinderPattern(-1, h - 8);
    this.canvas.drawVersionInfo(this.version);
    if (Info.Data[this.version].Alignment) {
      Info.Data[this.version].Alignment.forEach((pos) => {
        this.canvas.drawAlignmentPattern(pos.x, pos.y);
      });
    }

    // Get writable mask. now undefined = writable = true.
    this.mask = this.convertMask(this.canvas);

    return this.version;
  }

  /** Return the mask selected by the most recent convert call. */
  public getLastMask(): QRLiteMask | 0 {
    return this.lastMask;
  }

  /** Set a custom penalty evaluator, or restore the default when omitted. */
  public setRating(rating?: QRLiteRating): void {
    this.rating = rating || new DefaultRating();
  }

  /** Set UTF-8 text or bytes and select a version; return null if capacity is exceeded. */
  public setData(data: string | Uint8Array): Uint8Array | null {
    this.rawData = (typeof data === "string")
      ? this.convertStringByte(data)
      : data;
    this.setVersion();

    if (this.version <= 0) return null;

    return this.rawData;
  }

  /** Return interleaved data codewords followed by error correction codewords. */
  public createDataCode(): Uint8Array[] {
    if (!this.rawData || this.version <= 0) {
      throw new RangeError("Data is not set or is too large.");
    }
    const blocks = this.createDataBlock(this.level, this.version, this.rawData);
    const ecBlocks = this.createECBlock(this.level, this.version, blocks);

    const datacode: Uint8Array[] = [];
    datacode.push(this.interleaveArrays(blocks));
    datacode.push(this.interleaveArrays(ecBlocks));

    return datacode;
  }

  /** Write data and error correction codewords onto the working canvas. */
  public drawData(data: Uint8Array, ec: Uint8Array): void {
    const cursor = this.canvas.drawQRByte(data);
    this.canvas.drawQRByte(ec, cursor);
    this.canvas.fillEmpty();
  }

  /** Return eight candidate canvases in mask index order. */
  public createMaskedQRCode(): QRLiteBitCanvas[] {
    const masked: QRLiteBitCanvas[] = [];
    for (let maskNum = 0; maskNum < 8; ++maskNum) {
      masked.push(this.canvas.clone().reverse(Info.Mask[maskNum], this.mask));
    }

    masked.forEach((qrcode, maskNum) => {
      qrcode.drawQRInfo(this.level, maskNum);
    });

    return masked;
  }

  /** Return the penalty for each candidate canvas. */
  public evaluateQRCode(qrcodes: QRLiteBitCanvas[]): number[] {
    return qrcodes.map((canvas) => {
      return this.rating.calc(canvas);
    });
  }

  /** Return the index of the lowest-penalty candidate. */
  public selectQRCode(qrcodes: QRLiteBitCanvas[]): QRLiteMask {
    const points = this.evaluateQRCode(qrcodes);
    let maskNum = 0;
    let minPoint = points[0];
    for (let i = 1; i < points.length; ++i) {
      if (points[i] < minPoint) {
        maskNum = i;
        minPoint = points[i];
      }
    }
    return <QRLiteMask> maskNum;
  }

  /** Encode text and return the selected masked canvas; throw RangeError if too large. */
  public convert(
    dataStr: string,
    option: QRLiteConvertOption = {},
  ): QRLiteBitCanvas {
    const _newLevel = this.setLevel(option.level || this.level);

    if (this.setData(dataStr) === null) {
      throw new RangeError("Data is too large for a QR code.");
    }

    if (
      typeof option.version === "number" && 1 <= option.version &&
      option.version <= 40
    ) {
      this.setVersion(option.version);
    }

    // [ 0 ] = Data block, [ 1 ] = EC Block
    const datacode = this.createDataCode();

    this.drawData(datacode[0], datacode[1]);

    const masked = this.createMaskedQRCode();

    this.lastMask =
      (typeof option.mask === "number" && 0 <= option.mask && option.mask <= 7)
        ? <QRLiteMask> Math.floor(option.mask)
        : this.selectQRCode(masked);

    return masked[this.lastMask];
  }

  /** Encode and pad the byte payload, then split it into RS blocks. */
  private createDataBlock(
    level: QRLiteLevel,
    version: number,
    data: Uint8Array,
  ): Uint8Array[] {
    const byte = new Byte(Info.Data[version][level].DataCode);

    // Byte mode.
    byte.addBit(0, 1, 0, 0);

    byte.addBit(...this.calcLengthBitArray(data.length, version, level));

    byte.addByte(data);

    // End pattern.
    byte.add0Bit(Math.min(4, byte.remainingBitSize()));

    byte.add0Bit();

    for (let i = byte.countByteSize(); i < byte.size(); ++i) {
      byte.addByteNumber(236); // 11101100
      if (byte.size() <= ++i) break;
      byte.addByteNumber(17); // 00010001
    }

    return this.spritDataBlock(byte.get(), Info.Data[version][level].RS);
  }

  /** Compute Reed-Solomon parity for each data block. */
  private createECBlock(
    level: QRLiteLevel,
    version: number,
    blocks: Uint8Array[],
  ): Uint8Array[] {
    const countEC = this.countErrorCode(version, level);
    const g = Info.G[countEC];

    return blocks.map((block) => {
      const polynomial = new Uint8Array(block.length + countEC);
      polynomial.set(block);

      for (let i = 0; i < block.length; ++i) {
        if (polynomial[i] === 0) continue;
        const exponent = Info.ItoE[polynomial[i]];
        for (let j = 0; j < g.length; ++j) {
          const value = Info.ItoE.indexOf((exponent + g[j].a) % 255);
          polynomial[i + j] ^= value;
        }
      }

      return polynomial.slice(block.length);
    });
  }

  /** Encode text as UTF-8 bytes. */
  private convertStringByte(data: string): Uint8Array {
    return new TextEncoder().encode(data);
  }

  /** Find the smallest version fitting the payload. */
  private searchVersion(
    dataSize: number,
    level: QRLiteLevel,
  ): QRLiteVersion | 0 {
    const versions = Object.keys(Info.Data);

    for (let i = 0; i < versions.length; ++i) {
      if (dataSize <= Info.Data[parseInt(versions[i])][level].Size) {
        return <QRLiteVersion> parseInt(versions[i]);
      }
    }

    return 0;
  }

  /** Encode the byte-mode character count. */
  private calcLengthBitArray(
    dataSize: number,
    version: number,
    _level: QRLiteLevel,
  ): number[] {
    const bitLen = version <= 9 ? 8 : 16;
    const byte: number[] = [];
    for (let i = bitLen - 1; 0 <= i; --i) {
      byte[i] = dataSize % 2;
      dataSize = Math.floor(dataSize / 2);
    }
    return byte;
  }

  /** Split padded bytes according to the block table. */
  private spritDataBlock(
    byte: Uint8Array,
    rsBlocks: QRLiteRSBlock[],
  ): Uint8Array[] {
    const blocks: Uint8Array[] = [];
    let begin = 0;
    rsBlocks.forEach((info) => {
      for (let i = 0; i < info.count; ++i) {
        blocks.push(byte.slice(begin, begin + info.block[1]));
        begin += info.block[1];
      }
    });
    return blocks;
  }

  /** Return the parity codeword count per block. */
  private countErrorCode(version: number, level: QRLiteLevel): number {
    const code = Info.Data[version][level].ECCode;
    let count = 0;
    Info.Data[version][level].RS.forEach((block) => {
      count += block.count;
    });
    return Math.floor(code / count);
  }

  /** Interleave block bytes column by column. */
  private interleaveArrays(list: Uint8Array[]): Uint8Array {
    const size = list.map((v) => {
      return v.length;
    }).reduce((prev, current) => {
      return prev + current;
    });
    const byte = new Uint8Array(size);
    const length = list[list.length - 1].length;
    let count = 0;
    for (let i = 0; i < length; ++i) {
      for (let a = 0; a < list.length; ++a) {
        if (list[a].length <= i) continue;
        byte[count++] = list[a][i];
      }
    }
    return byte;
  }

  /** Identify writable modules on the working canvas. */
  private convertMask(canvas: QRLiteBitCanvas): boolean[] {
    const _mask = canvas.getPixels();
    const mask: boolean[] = [];
    for (let i = 0; i < _mask.length; ++i) mask.push(_mask[i] === undefined);
    return mask;
  }
}
