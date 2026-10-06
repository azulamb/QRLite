/**
 * Dependency-free QR code generation with UTF-8 byte encoding, error correction
 * levels L/M/Q/H, versions 1–40, and text or monochrome BMP output.
 *
 * @example
 * ```ts
 * import { convert } from "@azulamb/qrlite";
 * const canvas = convert("https://example.com", { level: "Q" });
 * console.log(canvas.sprint());
 * ```
 * @module
 */
import { Generator } from "./src/generator.ts";
import type { QRLiteBitCanvas, QRLiteConvertOption } from "./src/types.ts";

export { Black, Version, White } from "./src/constants.ts";
export { Generator } from "./src/generator.ts";
export { Info } from "./src/info.ts";
export type {
  QRLite,
  QRLiteBitCanvas,
  QRLiteConvertOption,
  QRLiteGenerator,
  QRLiteInfo,
  QRLiteLevel,
  QRLiteLevelData,
  QRLiteMask,
  QRLiteRating,
  QRLiteRSBlock,
  QRLiteVersion,
} from "./src/types.ts";

/**
 * Encode a UTF-8 string as a QR code with automatic version and mask selection.
 * @param data Text to encode.
 * @param option Error correction (default Q), minimum version, and fixed mask.
 * @returns A canvas whose true pixels represent black modules.
 * @throws {RangeError} If the input exceeds version 40 capacity.
 */
export function convert(
  data: string,
  option?: QRLiteConvertOption,
): QRLiteBitCanvas {
  return new Generator().convert(data, option);
}
