interface QRLite {
    Version: string;
    White: false;
    Black: true;
    Info: QRLiteInfo;
    Generator: {
        new (): QRLiteGenerator;
    };
    convert(data: string, option: QRLiteConvertOption): QRLiteBitCanvas;
}
interface QRLiteConvertOption {
    level?: QRLiteLevel;
    version?: number;
    mask?: number;
}
declare type QRLiteLevel = 'L' | 'M' | 'Q' | 'H';
interface QRLiteRSBlock {
    count: number;
    block: number[];
}
interface QRLiteLevelData {
    DataCode: number;
    ECCode: number;
    Size: number;
    RS: QRLiteRSBlock[];
}
interface QRLiteInfo {
    Data: {
        [key: number]: {
            L: QRLiteLevelData;
            M: QRLiteLevelData;
            Q: QRLiteLevelData;
            H: QRLiteLevelData;
            Alignment: {
                x: number;
                y: number;
            }[];
        };
    };
    ItoE: number[];
    G: {
        [key: number]: {
            a: number;
            x: number;
        }[];
    };
    Mask: {
        [key: number]: (i: number, j: number) => boolean;
    };
}
interface QRLiteBitCanvas {
    width: number;
    height: number;
    getPixels(): boolean[];
    clone(): QRLiteBitCanvas;
    reverse(func: (i: number, j: number) => boolean, mask: boolean[]): this;
    drawQRInfo(level?: QRLiteLevel, mask?: number): this;
    drawTimingPattern(): this;
    drawFinderPattern(x: number, y: number): this;
    drawAlignmentPattern(x: number, y: number): this;
    drawQRByte(byte: Uint8Array, cursor?: {
        x: number;
        y: number;
        up: boolean;
        right: boolean;
    }): {
        x: number;
        y: number;
        up: boolean;
        right: boolean;
    };
    fillEmpty(color?: boolean): number;
    sprint(option?: {
        white?: string;
        black?: string;
        none?: string;
        newline?: string;
    }): string;
    print(white: string, black: string, none: string): void;
    outputBitmapByte(frame?: number): number[];
}
interface QRLiteRating {
    calc: (canvas: QRLiteBitCanvas) => number;
}
interface QRLiteGenerator {
    get(): QRLiteBitCanvas;
    getLevel(): QRLiteLevel;
    setLevel(level: QRLiteLevel): QRLiteLevel;
    getVersion(): number;
    setVersion(version?: number): number;
    getLastMask(): number;
    setRating(rating?: QRLiteRating): void;
    setData(data: string | Uint8Array): Uint8Array | null;
    createDataCode(): Uint8Array[];
    drawData(data: Uint8Array, ec: Uint8Array): void;
    createMaskedQRCode(): QRLiteBitCanvas[];
    evaluateQRCode(qrcodes: QRLiteBitCanvas[]): number[];
    selectQRCode(qrcodes: QRLiteBitCanvas[]): number;
    convert(datastr: string, option?: QRLiteConvertOption): QRLiteBitCanvas;
}
