import { Info } from "../mod.ts";
import type { QRLiteVersion } from "../src/types.ts";

const levels = ["L", "M", "Q", "H"] as const;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("derived QR information is internally consistent", () => {
  for (let value = 1; value <= 40; value++) {
    const version = value as QRLiteVersion;
    for (const level of levels) {
      const info = Info.Data[version][level];
      const dataCode = info.RS.reduce(
        (sum, group) => sum + group.count * group.block[1],
        0,
      );
      const ecCode = info.RS.reduce(
        (sum, group) => sum + group.count * (group.block[0] - group.block[1]),
        0,
      );
      const lengthBits = version <= 9 ? 8 : 16;

      assert(
        info.DataCode === dataCode,
        `Version ${version}-${level}: invalid data codeword count`,
      );
      assert(
        info.ECCode === ecCode,
        `Version ${version}-${level}: invalid EC codeword count`,
      );
      assert(
        info.Size === Math.floor((dataCode * 8 - 4 - lengthBits) / 8),
        `Version ${version}-${level}: invalid byte capacity`,
      );

      for (const group of info.RS) {
        const degree = group.block[0] - group.block[1];
        assert(
          Info.G[degree]?.length === degree + 1,
          `Version ${version}-${level}: missing generator polynomial`,
        );
      }
    }
  }
});

Deno.test("alignment positions are generated within the QR symbol", () => {
  assert(Info.Data[1].Alignment.length === 0, "Version 1 must not align");
  assert(
    JSON.stringify(Info.Data[7].Alignment) === JSON.stringify([
      { x: 20, y: 4 },
      { x: 4, y: 20 },
      { x: 20, y: 20 },
      { x: 36, y: 20 },
      { x: 20, y: 36 },
      { x: 36, y: 36 },
    ]),
    "Version 7 alignment positions are incorrect",
  );

  for (let value = 2; value <= 40; value++) {
    const version = value as QRLiteVersion;
    const symbolSize = 17 + version * 4;
    const positions = Info.Data[version].Alignment;
    const centerCount = Math.floor(version / 7) + 2;
    assert(
      positions.length === centerCount ** 2 - 3,
      `Version ${version}: invalid alignment pattern count`,
    );
    assert(
      new Set(positions.map(({ x, y }) => `${x},${y}`)).size ===
        positions.length,
      `Version ${version}: duplicate alignment pattern`,
    );
    for (const { x, y } of positions) {
      assert(
        x >= 0 && y >= 0 && x + 5 <= symbolSize && y + 5 <= symbolSize,
        `Version ${version}: alignment pattern is outside the symbol`,
      );
    }
  }

  const version32Axes = [
    ...new Set(
      Info.Data[32].Alignment.flatMap(({ x, y }) => [x, y]),
    ),
  ].sort((a, b) => a - b);
  assert(
    JSON.stringify(version32Axes) === JSON.stringify([4, 32, 58, 84, 110, 136]),
    "Version 32 alignment step exception is incorrect",
  );
});

Deno.test("GF(256) and Reed-Solomon tables are generated correctly", () => {
  assert(Info.ItoE.length === 256, "GF logarithm table size is incorrect");
  assert(Info.ItoE[0] === -1, "GF logarithm of zero must be -1");
  assert(new Set(Info.ItoE.slice(1)).size === 255, "GF logarithms repeat");

  assert(
    JSON.stringify(Info.G[7].map(({ a }) => a)) ===
      JSON.stringify([0, 87, 229, 146, 149, 238, 102, 21]),
    "degree 7 generator polynomial is incorrect",
  );
});
