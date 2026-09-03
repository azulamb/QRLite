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

export class Generator implements QRLiteGenerator {
  private level: QRLiteLevel;
  private version: QRLiteVersion | 0;
  private lastMask: QRLiteMask | 0 = 0;
  private rawData!: Uint8Array;
  private canvas!: QRLiteBitCanvas;
  private mask!: boolean[];
  private rating!: QRLiteRating;

  constructor() {
    this.level = "Q";
    this.version = 0;
    this.setRating();
  }

  public get() {
    return this.canvas;
  }

  public getLevel() {
    return this.level;
  }

  public setLevel(level: QRLiteLevel) {
    if (level !== "L" && level !== "M" && level !== "Q" && level !== "H") {
      level = "Q";
    }
    this.level = level;
    return this.level;
  }

  public getVersion() {
    return this.version;
  }

  public setVersion(version = 0) {
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

  public getLastMask() {
    return this.lastMask;
  }

  public setRating(rating?: QRLiteRating) {
    this.rating = rating || new DefaultRating();
  }

  public setData(data: string | Uint8Array) {
    this.rawData = (typeof data === "string")
      ? this.convertStringByte(data)
      : data;
    this.setVersion();

    if (this.version <= 0) return null;

    return this.rawData;
  }

  public createDataCode() {
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

  public drawData(data: Uint8Array, ec: Uint8Array) {
    const cursor = this.canvas.drawQRByte(data);
    this.canvas.drawQRByte(ec, cursor);
    this.canvas.fillEmpty();
  }

  public createMaskedQRCode() {
    const masked: QRLiteBitCanvas[] = [];
    for (let maskNum = 0; maskNum < 8; ++maskNum) {
      masked.push(this.canvas.clone().reverse(Info.Mask[maskNum], this.mask));
    }

    masked.forEach((qrcode, maskNum) => {
      qrcode.drawQRInfo(this.level, maskNum);
    });

    return masked;
  }

  public evaluateQRCode(qrcodes: QRLiteBitCanvas[]) {
    return qrcodes.map((canvas) => {
      return this.rating.calc(canvas);
    });
  }

  public selectQRCode(qrcodes: QRLiteBitCanvas[]) {
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

  public convert(dataStr: string, option: QRLiteConvertOption = {}) {
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

  private createDataBlock(
    level: QRLiteLevel,
    version: number,
    data: Uint8Array,
  ) {
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

  private createECBlock(
    level: QRLiteLevel,
    version: number,
    blocks: Uint8Array[],
  ) {
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

  private convertStringByte(data: string) {
    return new TextEncoder().encode(data);
  }

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

  private calcLengthBitArray(
    dataSize: number,
    version: number,
    _level: QRLiteLevel,
  ) {
    const bitLen = version <= 9 ? 8 : 16;
    const byte: number[] = [];
    for (let i = bitLen - 1; 0 <= i; --i) {
      byte[i] = dataSize % 2;
      dataSize = Math.floor(dataSize / 2);
    }
    return byte;
  }

  private spritDataBlock(byte: Uint8Array, rsBlocks: QRLiteRSBlock[]) {
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

  private countErrorCode(version: number, level: QRLiteLevel) {
    const code = Info.Data[version][level].ECCode;
    let count = 0;
    Info.Data[version][level].RS.forEach((block) => {
      count += block.count;
    });
    return Math.floor(code / count);
  }

  private interleaveArrays(list: Uint8Array[]) {
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

  private convertMask(canvas: QRLiteBitCanvas) {
    const _mask = canvas.getPixels();
    const mask: boolean[] = [];
    for (let i = 0; i < _mask.length; ++i) mask.push(_mask[i] === undefined);
    return mask;
  }
}
