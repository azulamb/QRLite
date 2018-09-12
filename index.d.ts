declare module QRLite {
    type Level = 'L' | 'M' | 'H' | 'Q';
    interface QRLiteRSBlock {
        count: number;
        block: number[];
    }
    interface LevelData {
        DataCode: number;
        ECCode: number;
        Size: number;
        RS: QRLiteRSBlock[];
    }
    interface QRInfo {
        Level: {
            [key in Level]: number;
        };
        Data: {
            [key: number]: {
                L: LevelData;
                M: LevelData;
                H: LevelData;
                Q: LevelData;
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
    class BitCanvas {
        width: number;
        height: number;
        private bitarray;
        constructor(w: number, h: number);
        clone(): BitCanvas;
        reverse(func: (i: number, j: number) => boolean, mask: boolean[]): this;
        getPixel(x: number, y: number): boolean;
        getPixels(): boolean[];
        drawPixel(x: number, y: number, black: boolean): this | undefined;
        drawFromBitarray(bitarray: boolean[]): this;
        isTransparentPixel(x: number, y: number): boolean;
        drawTimingPattern(): this;
        drawQRInfo(level?: Level, mask?: number): this;
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
        private existsEmpty;
        private noEmptyLine;
        print(white?: string, black?: string, none?: string): void;
        outputBitmapByte(frame?: number): number[];
        private numberToLE4Byte;
    }
    class Generator {
        private level;
        private version;
        private rawdata;
        private canvas;
        private mask;
        constructor();
        get(): BitCanvas;
        getLevel(): Level;
        setLevel(level: Level): Level;
        getVersion(): number;
        setData(data: string): Uint8Array | null;
        createDataCode(): Uint8Array[];
        drawData(data: Uint8Array, ec: Uint8Array): void;
        createMaskedQRCode(): BitCanvas[];
        selectQRCode(qrcodes: BitCanvas[]): number;
        convert(datastr: string, level?: Level): BitCanvas;
        private createDataBlock;
        private createECBlock;
        private convertStringByte;
        private searchVersion;
        private calcLengthBitarray;
        private spritDataBlock;
        private countErrorCode;
        private interleaveArrays;
        private convertMask;
        private rating;
        private sameBitarrayLines;
        private count2x2Blocks;
        private existsBadPattern;
        private countBitarray;
    }
    function convert(data: string, level?: Level): BitCanvas;
    const INFO: QRInfo;
}
