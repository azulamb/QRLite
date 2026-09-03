import { convert } from "../mod.ts";
import { parseArguments, renderTerminal } from "../tools/qrprint.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("qrprint arguments are parsed", () => {
  const options = parseArguments(["--invert", "--margin=2", "hello", "world"]);

  assert(options.invert, "invertが有効になっていません");
  assert(options.margin === 2, "marginが反映されていません");
  assert(options.text === "hello world", "入力文字列が一致しません");
});

Deno.test("qrprint rejects an invalid margin", () => {
  let thrown = false;
  try {
    parseArguments(["--margin", "-1", "test"]);
  } catch {
    thrown = true;
  }
  assert(thrown, "負のmarginが拒否されませんでした");
});

Deno.test("qrprint renders a compact QR code with a quiet zone", () => {
  const output = renderTerminal(convert("test"), { invert: false, margin: 4 });
  const lines = output.split("\n");

  assert(lines.length === 15, "出力行数が一致しません");
  assert(
    lines.every((line) => Array.from(line).length === 29),
    "出力幅が一致しません",
  );
  assert(lines[0] === "█".repeat(29), "上側の余白が描画されていません");
});

Deno.test("qrprint can invert foreground and background", () => {
  const canvas = convert("test");
  const normal = renderTerminal(canvas, { invert: false, margin: 4 });
  const inverted = renderTerminal(canvas, { invert: true, margin: 4 });

  assert(normal !== inverted, "反転表示が適用されていません");
  assert(
    inverted.split("\n")[0] === " ".repeat(29),
    "余白が反転されていません",
  );
});
