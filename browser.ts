import * as QRLite from "./mod.ts";

if (typeof window !== "undefined") {
  // deno-lint-ignore no-explicit-any
  (window as any).QRLite = QRLite;
}
