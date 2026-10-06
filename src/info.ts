import { createInfo } from "./info_builder.ts";
import type { QRLiteInfo } from "./types.ts";

// ES modules are evaluated once, so all derived tables are built only when the
// library is first loaded and are reused by every Generator instance.
/** Shared capacity, Reed–Solomon, alignment, and mask lookup tables. */
export const Info: QRLiteInfo = createInfo();
