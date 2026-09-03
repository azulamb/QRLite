import { Version } from "../src/constants.ts";

interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
}

interface ReleaseTag {
  name: string;
  version: SemVer;
}

const semVerPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function parseSemVer(value: string): SemVer | null {
  const match = semVerPattern.exec(value);
  if (!match) return null;

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4]?.split(".") ?? [],
  };
}

function compareIdentifiers(left: string, right: string): number {
  const leftNumber = /^\d+$/.test(left);
  const rightNumber = /^\d+$/.test(right);

  if (leftNumber && rightNumber) return Number(left) - Number(right);
  if (leftNumber !== rightNumber) return leftNumber ? -1 : 1;
  return left.localeCompare(right);
}

function compareSemVer(left: SemVer, right: SemVer): number {
  for (const key of ["major", "minor", "patch"] as const) {
    if (left[key] !== right[key]) return left[key] - right[key];
  }

  if (left.prerelease.length === 0 || right.prerelease.length === 0) {
    return left.prerelease.length === right.prerelease.length
      ? 0
      : left.prerelease.length === 0
      ? 1
      : -1;
  }

  const length = Math.max(left.prerelease.length, right.prerelease.length);
  for (let index = 0; index < length; index++) {
    const leftPart = left.prerelease[index];
    const rightPart = right.prerelease[index];
    if (leftPart === undefined || rightPart === undefined) {
      return leftPart === rightPart ? 0 : leftPart === undefined ? -1 : 1;
    }

    const difference = compareIdentifiers(leftPart, rightPart);
    if (difference !== 0) return difference;
  }

  return 0;
}

async function readGitTags(): Promise<string[]> {
  const command = new Deno.Command("git", {
    args: ["tag", "--list"],
    stdout: "piped",
    stderr: "piped",
  });
  const result = await command.output();

  if (!result.success) {
    const message = new TextDecoder().decode(result.stderr).trim();
    throw new Error(`Gitタグを取得できませんでした: ${message}`);
  }

  return new TextDecoder().decode(result.stdout).split(/\r?\n/).filter(Boolean);
}

const currentVersion = parseSemVer(Version);
if (!currentVersion) {
  console.error(
    `リリース不可: Version \"${Version}\" はSemVer形式ではありません。`,
  );
  Deno.exit(1);
}

const tagNames = await readGitTags();
const releaseTags: ReleaseTag[] = tagNames.flatMap((name) => {
  const version = parseSemVer(name.startsWith("v") ? name.slice(1) : name);
  return version ? [{ name, version }] : [];
});

console.log(`リリース候補: ${Version}`);

if (releaseTags.length === 0) {
  console.log(
    "比較対象のSemVerタグはありません。初回リリースとして準備可能です。",
  );
  Deno.exit(0);
}

const latest = releaseTags.reduce((left, right) =>
  compareSemVer(left.version, right.version) >= 0 ? left : right
);
const comparison = compareSemVer(currentVersion, latest.version);

console.log(`最新のリリースタグ: ${latest.name}`);

if (comparison === 0) {
  console.error(`リリース不可: ${Version} は既にタグとして存在します。`);
  Deno.exit(1);
}

if (comparison < 0) {
  console.error(
    `リリース不可: ${Version} は最新タグ ${latest.name} より新しくありません。`,
  );
  Deno.exit(1);
}

console.log(
  `${latest.name} から ${Version} への新バージョンをリリース可能です。`,
);
