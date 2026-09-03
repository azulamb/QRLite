import { Black, convert, Generator, Info, White } from "../mod.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

Deno.test("Denoから公開APIをimportできる", () => {
  assert(White === false, "Whiteがfalseではありません");
  assert(Black === true, "Blackがtrueではありません");
  assert(Info.Data[1].L.DataCode === 19, "Infoが公開されていません");
});

Deno.test("QRコードを生成できる", () => {
  const canvas = convert("test", { level: "H", mask: 7 });

  assert(canvas.width === 21, "Version 1の幅が21ではありません");
  assert(canvas.height === 21, "Version 1の高さが21ではありません");
  assert(canvas.getPixels().length === 21 * 21, "ピクセル数が不正です");
});

Deno.test("Generatorを直接利用できる", () => {
  const generator = new Generator();
  const canvas = generator.convert("https://google.com/", {
    level: "Q",
    mask: 6,
  });

  assert(generator.getVersion() === 2, "想定したVersionではありません");
  assert(generator.getLastMask() === 6, "指定したマスクではありません");
  assert(canvas.width === 25, "Version 2の幅が25ではありません");
});

function assertEquals<T>(actual: T, expected: T, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: actual=${JSON.stringify(actual)}, expected=${
        JSON.stringify(expected)
      }`,
    );
  }
}

function readBits(bytes: Uint8Array, count: number): string {
  let result = "";
  for (let i = 0; i < count; ++i) {
    result += (bytes[Math.floor(i / 8)] & (1 << (7 - i % 8))) === 0 ? "0" : "1";
  }
  return result;
}

function deinterleaveData(
  data: Uint8Array,
  version: number,
  level: "L" | "M" | "Q" | "H",
): Uint8Array {
  const lengths: number[] = [];
  for (const group of Info.Data[version][level].RS) {
    for (let i = 0; i < group.count; ++i) {
      lengths.push(group.block[1]);
    }
  }

  const blocks = lengths.map((length) => new Uint8Array(length));
  let cursor = 0;
  const maxLength = Math.max(...lengths);
  for (let i = 0; i < maxLength; ++i) {
    for (const block of blocks) {
      if (i < block.length) {
        block[i] = data[cursor++];
      }
    }
  }

  const result = new Uint8Array(
    lengths.reduce((sum, length) => sum + length, 0),
  );
  cursor = 0;
  for (const block of blocks) {
    result.set(block, cursor);
    cursor += block.length;
  }
  return result;
}

Deno.test("strings are encoded as UTF-8", () => {
  const generator = new Generator();
  assertEquals(
    Array.from(generator.setData("日本語") ?? []),
    [0xE6, 0x97, 0xA5, 0xE6, 0x9C, 0xAC, 0xE8, 0xAA, 0x9E],
    "UTF-8 bytes do not match",
  );
});

Deno.test("mask patterns use row and column in the correct order", () => {
  assert(Info.Mask[1](0, 0), "Mask 1 must match row 0");
  assert(!Info.Mask[1](0, 1), "Mask 1 must not match row 1");
  assert(Info.Mask[2](0, 1), "Mask 2 must match column 0");
  assert(!Info.Mask[2](1, 0), "Mask 2 must not match column 1");
  assert(!Info.Mask[4](0, 2), "Mask 4 row/column order is incorrect");
});

Deno.test("Reed-Solomon division skips a zero coefficient", () => {
  const generator = new Generator();
  generator.setLevel("L");
  generator.setData("0");
  const [, errorCorrection] = generator.createDataCode();

  assertEquals(
    Array.from(errorCorrection),
    [200, 46, 2, 239, 14, 159, 201],
    "Error correction codewords do not match",
  );
});

Deno.test("the maximum byte capacity is accepted", () => {
  const generator = new Generator();
  generator.setLevel("L");
  assert(
    generator.setData("A".repeat(17)) !== null,
    "Version 1-L capacity must include 17 bytes",
  );
  assert(generator.getVersion() === 1, "17 bytes must fit in Version 1-L");
  assert(
    generator.setData("A".repeat(18)) !== null,
    "18 bytes must fit in a QR code",
  );
  assert(generator.getVersion() === 2, "18 bytes must require Version 2-L");
});

Deno.test("Version 7 information is generated and reserved", () => {
  const generator = new Generator();
  generator.setLevel("L");
  generator.setData("A");
  generator.setVersion(7);
  const [data, errorCorrection] = generator.createDataCode();
  generator.drawData(data, errorCorrection);
  const canvas = generator.get();
  const expectedVersionBits = 0x07C94;

  for (let i = 0; i < 18; ++i) {
    const expected = ((expectedVersionBits >>> i) & 1) !== 0;
    const a = canvas.width - 11 + i % 3;
    const b = Math.floor(i / 3);
    assert(
      canvas.getPixel(a, b) === expected,
      `Version information differs at (${a}, ${b})`,
    );
    assert(
      canvas.getPixel(b, a) === expected,
      `Version information differs at (${b}, ${a})`,
    );
  }
});

Deno.test("Version 10 uses a 16-bit byte count indicator", () => {
  const generator = new Generator();
  generator.setLevel("L");
  generator.setData("A");
  generator.setVersion(10);
  const [interleavedData] = generator.createDataCode();
  const data = deinterleaveData(interleavedData, 10, "L");

  assert(
    readBits(data, 20) === "01000000000000000001",
    "Mode or byte count indicator is incorrect",
  );
});

Deno.test("oversized input reports a RangeError", () => {
  let error: unknown;
  try {
    convert("A".repeat(2954), { level: "L" });
  } catch (caught) {
    error = caught;
  }
  assert(error instanceof RangeError, "Oversized input must throw RangeError");
});
