import config from "../deno.json" with { type: "json" };

/** QRLite package version from deno.json. */
export const Version: string = config.version;
/** A white QR module. */
export const White = false;
/** A black QR module. */
export const Black = true;
