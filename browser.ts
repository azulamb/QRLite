import * as QRLite from "./mod.ts";

if (typeof window !== "undefined") {
  (window as any).QRLite = QRLite;
}
