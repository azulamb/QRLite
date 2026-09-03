import { RS_BLOCKS } from "./rs_blocks.ts";
import type {
  QRLiteInfo,
  QRLiteLevel,
  QRLiteLevelData,
  QRLiteVersion,
} from "./types.ts";

const LEVELS = ["L", "M", "Q", "H"] as const;
const FIELD_SIZE = 256;
const FIELD_ORDER = FIELD_SIZE - 1;
const PRIMITIVE_POLYNOMIAL = 0x11D;
const GENERATOR_DEGREES = [
  7,
  10,
  13,
  15,
  16,
  17,
  18,
  ...Array.from({ length: 25 }, (_, index) => 20 + index * 2).filter((degree) =>
    degree !== 38
  ),
];

interface GaloisFieldTables {
  exponents: number[];
  logarithms: number[];
}

function createGaloisFieldTables(): GaloisFieldTables {
  const exponents = new Array<number>(FIELD_ORDER);
  const logarithms = new Array<number>(FIELD_SIZE).fill(-1);
  let value = 1;

  for (let exponent = 0; exponent < FIELD_ORDER; exponent++) {
    exponents[exponent] = value;
    logarithms[value] = exponent;
    value <<= 1;
    if ((value & FIELD_SIZE) !== 0) value ^= PRIMITIVE_POLYNOMIAL;
  }

  return { exponents, logarithms };
}

function multiply(
  left: number,
  right: number,
  field: GaloisFieldTables,
): number {
  if (left === 0 || right === 0) return 0;
  return field.exponents[
    (field.logarithms[left] + field.logarithms[right]) % FIELD_ORDER
  ];
}

function createGeneratorPolynomial(
  degree: number,
  field: GaloisFieldTables,
): { a: number; x: number }[] {
  let coefficients = [1];

  for (let exponent = 0; exponent < degree; exponent++) {
    const next = new Array<number>(coefficients.length + 1).fill(0);
    for (let index = 0; index < coefficients.length; index++) {
      next[index] ^= coefficients[index];
      next[index + 1] ^= multiply(
        coefficients[index],
        field.exponents[exponent],
        field,
      );
    }
    coefficients = next;
  }

  return coefficients.map((coefficient, index) => ({
    a: field.logarithms[coefficient],
    x: degree - index,
  }));
}

function createAlignmentCenters(version: QRLiteVersion): number[] {
  if (version === 1) return [];

  const count = Math.floor(version / 7) + 2;
  const step = version === 32
    ? 26
    : Math.floor((version * 4 + count * 2 + 1) / (count * 2 - 2)) * 2;
  const last = version * 4 + 10;
  const centers = [6];

  for (let index = count - 2; index >= 0; index--) {
    centers.push(last - index * step);
  }
  return centers;
}

function createAlignmentPositions(
  version: QRLiteVersion,
): { x: number; y: number }[] {
  const centers = createAlignmentCenters(version);
  if (centers.length === 0) return [];

  const last = centers[centers.length - 1];
  const positions: { x: number; y: number }[] = [];
  for (const y of centers) {
    for (const x of centers) {
      const overlapsFinder = (x === 6 && y === 6) ||
        (x === last && y === 6) || (x === 6 && y === last);
      if (!overlapsFinder) positions.push({ x: x - 2, y: y - 2 });
    }
  }
  return positions;
}

function createLevelData(
  version: QRLiteVersion,
  level: QRLiteLevel,
): QRLiteLevelData {
  const groups = RS_BLOCKS[version][level];
  const dataCode = groups.reduce(
    (sum, [count, , data]) => sum + count * data,
    0,
  );
  const ecCode = groups.reduce(
    (sum, [count, total, data]) => sum + count * (total - data),
    0,
  );
  const lengthBits = version <= 9 ? 8 : 16;

  return {
    DataCode: dataCode,
    ECCode: ecCode,
    Size: Math.floor((dataCode * 8 - 4 - lengthBits) / 8),
    RS: groups.map(([count, total, data, correctionCapacity]) => ({
      count,
      block: [total, data, correctionCapacity],
    })),
  };
}

export function createInfo(): QRLiteInfo {
  const field = createGaloisFieldTables();
  const data: QRLiteInfo["Data"] = {};

  for (let value = 1; value <= 40; value++) {
    const version = value as QRLiteVersion;
    const levels = {} as Record<QRLiteLevel, QRLiteLevelData>;
    for (const level of LEVELS) {
      levels[level] = createLevelData(version, level);
    }
    data[version] = {
      ...levels,
      Alignment: createAlignmentPositions(version),
    };
  }

  const generators: QRLiteInfo["G"] = {};
  for (const degree of GENERATOR_DEGREES) {
    generators[degree] = createGeneratorPolynomial(degree, field);
  }

  return {
    Data: data,
    ItoE: field.logarithms,
    G: generators,
    Mask: {
      0: (x, y) => (x + y) % 2 === 0,
      1: (_x, y) => y % 2 === 0,
      2: (x, _y) => x % 3 === 0,
      3: (x, y) => (x + y) % 3 === 0,
      4: (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
      5: (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
      6: (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0,
      7: (x, y) => ((x * y) % 3 + (x + y) % 2) % 2 === 0,
    },
  };
}
