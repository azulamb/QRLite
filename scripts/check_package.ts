import config from "../deno.json" with { type: "json" };
import { Version } from "../mod.ts";

if (config.version !== Version) {
  throw new Error(
    `Version mismatch: deno.json=${config.version}, Version=${Version}`,
  );
}

console.log(`Package version verified: ${config.version}`);
