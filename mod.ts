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

export function convert(
  data: string,
  option?: QRLiteConvertOption,
): QRLiteBitCanvas {
  return new Generator().convert(data, option);
}
