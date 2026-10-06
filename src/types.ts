/** Browser namespace exposing the public QRLite API. */
export interface QRLite {
  /** Package version in SemVer format. */
  Version: string;
  /** White module value. */
  White: false;
  /** Black module value. */
  Black: true;
  /** Shared QR specification tables. */
  Info: QRLiteInfo;

  /** Construct a stateful QR code generator. */
  Generator: { new (): QRLiteGenerator };

  /** Encode text and return the selected masked canvas; throw RangeError if too large. */
  convert(data: string, option?: QRLiteConvertOption): QRLiteBitCanvas;
}

/** Options for encoding a UTF-8 string as a QR code. */
export interface QRLiteConvertOption {
  /** Error correction level; defaults to Q for a new generator. */
  level?: QRLiteLevel;
  /** Minimum version; omitted values select the smallest fitting version. */
  version?: QRLiteVersion;
  /** Fixed mask index; omitted values select the lowest penalty. */
  mask?: QRLiteMask;
}

/** QR error correction level, from lowest (L) to highest (H). */
export type QRLiteLevel = "L" | "M" | "Q" | "H";
/** Index of one of the eight QR mask patterns. */
export type QRLiteMask = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
// deno-fmt-ignore
/** QR symbol version (1-40), with side length 17 + 4 * version. */
export type QRLiteVersion =
  |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20
  | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30
  | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40;

/** A group of Reed-Solomon blocks with the same size. */
export interface QRLiteRSBlock {
  /** Number of blocks in this group. */
  count: number;
  /** Total codewords, data codewords, and correction capacity per block. */
  block: number[];
}

/** Capacity and block layout for a version and correction level. */
export interface QRLiteLevelData {
  /** Total number of data codewords. */
  DataCode: number;
  /** Total number of error correction codewords. */
  ECCode: number;
  /** Maximum byte-mode payload length. */
  Size: number;
  /** Reed-Solomon block groups. */
  RS: QRLiteRSBlock[];
}

/** QR specification tables shared by generators. */
export interface QRLiteInfo {
  /** Capacity and alignment tables indexed by QR version. */
  Data: {
    [key: number]: // version.
      {
        L: QRLiteLevelData;
        M: QRLiteLevelData;
        Q: QRLiteLevelData;
        H: QRLiteLevelData;
        Alignment: { x: number; y: number }[];
      };
  };
  /** GF(256) logarithms indexed by field element. */
  ItoE: number[];
  /** Generator polynomials indexed by error correction length. */
  G: { [key: number]: { a: number; x: number }[] };
  /** Mask predicates indexed by pattern number. */
  Mask: { [key: number]: (i: number, j: number) => boolean };
}

/** Mutable QR module canvas; true is black, false is white. */
export interface QRLiteBitCanvas {
  /** Canvas width in modules. */
  width: number;
  /** Canvas height in modules. */
  height: number;
  /** Copy the canvas and its pixels. */
  clone(): QRLiteBitCanvas;
  /** Read a module; unfilled coordinates may be undefined. */
  getPixel(x: number, y: number): boolean | undefined;
  /** Return the underlying row-major pixel array. */
  getPixels(): boolean[];
  /** Set the color of one module. */
  drawPixel(x: number, y: number, black: boolean): this;

  // For QRCode.

  /** Invert modules selected by both the predicate and writable mask. */
  reverse(func: (x: number, y: number) => boolean, mask: boolean[]): this;
  /** Draw error correction and mask format information. */
  drawQRInfo(level?: QRLiteLevel, mask?: number): this;
  /** Draw version information for versions 7 and above. */
  drawVersionInfo(version: number): this;
  /** Draw the horizontal and vertical timing patterns. */
  drawTimingPattern(): this;
  /** Draw a finder pattern at the supplied position. */
  drawFinderPattern(x: number, y: number): this;
  /** Draw an alignment pattern at the supplied position. */
  drawAlignmentPattern(x: number, y: number): this;
  /** Write codewords in QR traversal order and return the next cursor. */
  drawQRByte(
    byte: Uint8Array,
    cursor?: { x: number; y: number; up: boolean; right: boolean },
  ): { x: number; y: number; up: boolean; right: boolean };
  /** Fill unassigned modules and return the number filled. */
  fillEmpty(color?: boolean): number;

  /**
   * Output text QRCode.
   * @param option
   */
  sprint(
    option?: {
      white?: string;
      black?: string;
      none?: string;
      newline?: string;
    },
  ): string;
  /**
   * Output text QRCode to console.
   * @param white White text.
   * @param black Black text.
   * @param none Empty text.
   */
  print(white?: string, black?: string, none?: string): void;
  /**
   * Output Microsoft Monochrome bitmap QRCode.
   * @param frame
   * @returns Byte array.
   */
  outputBitmapByte(frame?: number): number[];
}

/** Custom mask penalty evaluator. */
export interface QRLiteRating {
  /** Calculate a mask penalty; lower values are better. */
  calc: (canvas: QRLiteBitCanvas) => number;
}

/** Stateful API for the individual QR encoding stages. */
export interface QRLiteGenerator {
  /** Return the working canvas initialized by setData or setVersion, before mask selection. */
  get(): QRLiteBitCanvas;
  /** Return the current error correction level. */
  getLevel(): QRLiteLevel;
  /** Set the correction level; invalid runtime values fall back to Q. */
  setLevel(level: QRLiteLevel): QRLiteLevel;
  /** Return the selected version, or zero when no version fits. */
  getVersion(): QRLiteVersion | 0;
  /** Initialize a canvas for the requested minimum version; zero selects automatically. */
  setVersion(version?: QRLiteVersion | 0): QRLiteVersion | 0;
  /** Return the mask selected by the most recent convert call. */
  getLastMask(): QRLiteMask | 0;
  /** Set a custom penalty evaluator, or restore the default when omitted. */
  setRating(rating?: QRLiteRating): void;
  /** Set UTF-8 text or bytes and select a version; return null if capacity is exceeded. */
  setData(data: string | Uint8Array): Uint8Array | null;
  /** Return interleaved data codewords followed by error correction codewords. */
  createDataCode(): Uint8Array[];
  /** Write data and error correction codewords onto the working canvas. */
  drawData(data: Uint8Array, ec: Uint8Array): void;
  /** Return eight candidate canvases in mask index order. */
  createMaskedQRCode(): QRLiteBitCanvas[];
  /** Return the penalty for each candidate canvas. */
  evaluateQRCode(qrcodes: QRLiteBitCanvas[]): number[];
  /** Return the index of the lowest-penalty candidate. */
  selectQRCode(qrcodes: QRLiteBitCanvas[]): QRLiteMask;
  /** Encode text and return the selected masked canvas; throw RangeError if too large. */
  convert(dataStr: string, option?: QRLiteConvertOption): QRLiteBitCanvas;
}
