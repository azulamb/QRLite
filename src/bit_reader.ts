export class BitReader {
  private cursor: number;
  private byte: Uint8Array;

  constructor(byte: Uint8Array) {
    this.byte = byte;
    this.cursor = 0;
  }

  public hasNext() {
    return this.cursor < this.byte.length * 8;
  }

  public getNow() {
    const b = this.byte[Math.floor(this.cursor / 8)];
    return !!(b & (1 << (7 - (this.cursor % 8))));
  }
  public getNext() {
    const b = this.byte[Math.floor(this.cursor / 8)];
    return !!(b & (1 << (7 - (this.cursor++ % 8))));
  }
}
