declare module QRLite {
    type QRLiteLevel = 'L' | 'M' | 'H' | 'Q';
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
    interface QRDATA {
        Level: {
            [key: string]: number;
        };
        Data: {
            [key: number]: {
                L: QRLiteLevelData;
                M: QRLiteLevelData;
                H: QRLiteLevelData;
                Q: QRLiteLevelData;
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
    const QR: QRDATA;
    class BitCanvas {
        width: number;
        height: number;
        private bitarray;
        constructor(w: number, h: number);
        clone(): BitCanvas;
        reverse(func: (i: number, j: number) => boolean, mask: boolean[]): this;
        getPixel(x: number, y: number): boolean;
        getPixels(): boolean[];
        drawPixel(x: number, y: number, white: boolean): this | undefined;
        drawFromBitarray(bitarray: boolean[]): this;
        isTransparentPixel(x: number, y: number): boolean;
        drawTimingPattern(): this;
        drawQRInfo(level?: QRLiteLevel, mask?: number): this;
        drawFinderPattern(x: number, y: number): this;
        drawAlignmentPattern(x: number, y: number): this;
        drawPattern(pattern: (number | boolean)[], x: number, y: number, w: number, h: number): this;
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
        fillEmptyWhite(): number;
        private existsEmpty(rx, y, up);
        private noEmptyLine(x);
        print(white?: string, black?: string, none?: string): void;
        outputBitmapByte(frame?: number): number[];
        private numberToLE4Byte(data);
    }
    class Generator {
        private level;
        private version;
        private rawdata;
        private canvas;
        private mask;
        constructor();
        get(): BitCanvas;
        getLevel(): QRLiteLevel;
        setLevel(level: QRLiteLevel): QRLiteLevel;
        getVersion(): number;
        setData(data: string): Uint8Array | null;
        createDataCode(): Uint8Array[];
        drawData(data: Uint8Array, ec: Uint8Array): void;
        createMaskedQRCode(): BitCanvas[];
        selectQRCode(qrcodes: BitCanvas[]): number;
        convert(datastr: string, level?: QRLiteLevel): BitCanvas;
        private createDataBlock(level, version, data);
        private createECBlock(level, version, blocks);
        private convertStringByte(data);
        private searchVersion(datasize, level);
        private calcLengthBitarray(datasize, version, level);
        private spritDataBlock(byte, rsblocks);
        private countErrorCode(version, level);
        private interleaveArrays(list);
        private convertMask(canvas);
        private rating(canvas);
        private sameBitarrayLines(bitarray, width, height);
        private count2x2Blocks(bitarray, width, height);
        private existsBadPattern(bitarray, width, height);
        private countBitarray(bitarray, target);
    }
    function convert(data: string): BitCanvas;
}
declare const module: any;
