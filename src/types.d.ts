interface QRLite
{
	Version: string,
	White: false,
	Black: true,
	Info: QRLiteInfo,

	Generator: { new(): QRLiteGenerator },

	convert( data: string, option: QRLiteConvertOption ): QRLiteBitCanvas,
}

interface QRLiteConvertOption
{
	level?: QRLiteLevel,
	version?: QRLiteVersion,
	mask?: QRLiteMask,
}

type QRLiteLevel = 'L' | 'M' | 'Q' | 'H';
type QRLiteMask = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
type QRLiteVersion = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40;

interface QRLiteRSBlock
{
	count: number,
	block: number[],
}

interface QRLiteLevelData
{
	DataCode: number,
	ECCode: number,
	Size: number,
	RS: QRLiteRSBlock[],
}

interface QRLiteInfo
{
	Data:
	{
		[ key: number ]: // version.
		{
			L: QRLiteLevelData,
			M: QRLiteLevelData,
			Q: QRLiteLevelData,
			H: QRLiteLevelData,
			Alignment: { x: number, y: number }[],
		},
	},
	ItoE: number[],
	G: { [ key: number ]: { a: number, x: number }[] },
	Mask: { [ key: number ]: ( i: number, j: number ) => boolean },
}

interface QRLiteBitCanvas
{
	width: number;
	height: number;
	/**
	 * @retrun Create new canvas & copy.
	 */
	clone(): QRLiteBitCanvas;
	/**
	 * @param x 
	 * @param y 
	 * @return true = Black. other = White.
	 */
	getPixel( x: number, y: number ): boolean;
	/**
	 * @returns Get all pixels. true = Black. other = White.
	 */
	getPixels(): boolean[];
	/**
	 * @param x 
	 * @param y 
	 * @param black true = Black. false = White.
	 */
	drawPixel( x: number, y: number, black: boolean ): this;

	// For QRCode.

	/**
	 * 
	 * @param func Reverse checker.
	 * @param mask Reverse mask. true = Can draw.
	 */
	reverse( func: ( x: number, y: number ) => boolean, mask: boolean[] ): this;
	/**
	 * @param level QRCode level.
	 * @param mask QRCode mask number.
	 */
	drawQRInfo( level?: QRLiteLevel, mask?: number ): this;
	drawTimingPattern(): this;
	drawFinderPattern( x: number, y: number ): this;
	drawAlignmentPattern( x: number, y: number ): this;
	drawQRByte( byte: Uint8Array, cursor?: { x: number, y: number, up: boolean, right: boolean } ): { x: number, y: number, up: boolean, right: boolean };
	/**
	 * @param color true = Black.
	 */
	fillEmpty( color?: boolean ): number;

	/**
	 * Output text QRCode.
	 * @param option 
	 */
	sprint( option?: { white?: string, black?: string, none?: string, newline?: string } ): string;
	/**
	 * Output text QRCode to console.
	 * @param white White text.
	 * @param black Black text.
	 * @param none Empty text.
	 */
	print( white: string, black: string, none: string ): void;
	/**
	 * Output Microsoft Monochrome bitmap QRCode.
	 * @param frame 
	 * @returns Byte array.
	 */
	outputBitmapByte( frame?: number ): number[];
}

interface QRLiteRating
{
	/**
	 * @param canvas QRCode.
	 * @return Large value is bad.
	 */
	calc: ( canvas: QRLiteBitCanvas ) => number;
}

interface QRLiteGenerator
{
	/**
	 * @return Return generated QRCode.
	*/
	get(): QRLiteBitCanvas;
	/**
	 * @return Get now QRCode version.
	*/
	getLevel(): QRLiteLevel;
	/**
	 * @param level Set level.
	 * @return Setted level.
	 */
	setLevel( level: QRLiteLevel ): QRLiteLevel;
	/**
	 * @return Get now version.
	 */
	getVersion(): QRLiteVersion | 0;
	/**
	 * @param version Set version. 0 = auto.
	 * @return Setted version.
	 */
	setVersion( version?: QRLiteVersion | 0 ): QRLiteVersion | 0;
	/**
	 * @return Get last selected mask number.
	 */
	getLastMask(): QRLiteMask | 0;
	/**
	 * @param rating Set rating calculator.
	 */
	setRating( rating?: QRLiteRating ): void;
	/**
	 * @param data Set QRCode data.
	 */
	setData( data: string | Uint8Array ): Uint8Array | null;
	/**
	 * @returns [ 0 ] Data code. [ 1 ] EC code.
	 */
	createDataCode(): Uint8Array[];
	/**
	 * @param data Data code.
	 * @param ec EC code.
	 */
	drawData( data: Uint8Array, ec: Uint8Array ): void;
	/**
	 * @returns [ 0 ... 7 ] Get generated QRCodes.
	 */
	createMaskedQRCode(): QRLiteBitCanvas[];
	/**
	 * @param qrcodes Set QRCodes.
	 * @returns Results. A large value is bad.
	 */
	evaluateQRCode( qrcodes: QRLiteBitCanvas[] ): number[];
	/**
	 * @param qrcodes QRCodes.
	 * @return Selected QRCode number.
	 */
	selectQRCode( qrcodes: QRLiteBitCanvas[] ): QRLiteMask;
	/**
	 * @param datastr Set QRCode data.
	 * @param option Generate option.
	 * @return QRCode.
	 */
	convert( datastr: string, option?: QRLiteConvertOption ): QRLiteBitCanvas;
}
