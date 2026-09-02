import { B } from "./constants.ts";

export class Byte {
  private byte: Uint8Array;
  private wbit: number;

  constructor(bytesize: number) {
    this.byte = new Uint8Array(bytesize);
    this.wbit = 0;
  }

  public size() {
    return this.byte.length;
  }

  public countByteSize() {
    return Math.ceil(this.wbit / 8);
  }

  public remainingBitSize() {
    return this.byte.length * 8 - this.wbit;
  }

  public get() {
    return this.byte;
  }

  public addBit(...bitarray: (number | boolean)[]) {
    bitarray.forEach((bit) => {
      if (!!bit === B) { // bit == true ... Black
        this.byte[Math.floor(this.wbit / 8)] |= 1 << (7 - this.wbit % 8);
      }
      ++this.wbit;
    });
  }

  public add0Bit(count?: number) {
    if (count === undefined) count = (8 - this.wbit % 8) % 8;
    this.wbit += count;
  }

  public addByte(data: Uint8Array) {
    if (this.wbit % 8 === 0) {
      data.forEach((byte) => {
        this.byte[Math.floor(this.wbit / 8)] = byte;
        this.wbit += 8;
      });
      return;
    }
    data.forEach((byte) => {
      this.addBit(
        byte & 0x80,
        byte & 0x40,
        byte & 0x20,
        byte & 0x10,
        byte & 0x8,
        byte & 0x4,
        byte & 0x2,
        byte & 0x1,
      );
    });
  }

  public addByteNumber(byte: number) {
    if (this.wbit % 8 === 0) {
      this.byte[Math.floor(this.wbit / 8)] = byte;
      this.wbit += 8;
      return;
    }
    this.addBit(
      byte & 0x80,
      byte & 0x40,
      byte & 0x20,
      byte & 0x10,
      byte & 0x8,
      byte & 0x4,
      byte & 0x2,
      byte & 0x1,
    );
  }
}
