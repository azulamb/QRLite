#!/usr/bin/env -S deno run

import { convert, type QRLiteBitCanvas, Version } from "../mod.ts";

export interface QRPrintOptions {
  invert: boolean;
  margin: number;
}

interface ParsedArguments extends QRPrintOptions {
  help: boolean;
  version: boolean;
  text?: string;
}

const usage = `qrprint - Print a QR code in the terminal

Usage:
  qrprint [options] <text>

Options:
  -i, --invert         Invert output for a light terminal background
  -m, --margin <size>  Set the quiet-zone size (default: 4)
  -V, --version        Print the QRLite version
  -h, --help           Print this help

Use -- before text that starts with a hyphen.`;

function parseMargin(value: string | undefined): number {
  if (value === undefined || !/^(?:0|[1-9]\d*)$/.test(value)) {
    throw new Error("--margin must be a non-negative integer.");
  }

  const margin = Number(value);
  if (!Number.isSafeInteger(margin)) {
    throw new Error("--margin is too large.");
  }
  return margin;
}

export function parseArguments(args: string[]): ParsedArguments {
  const result: ParsedArguments = {
    help: false,
    invert: false,
    margin: 4,
    version: false,
  };
  const values: string[] = [];
  let optionsEnded = false;

  for (let index = 0; index < args.length; index++) {
    const argument = args[index];

    if (optionsEnded) {
      values.push(argument);
      continue;
    }
    if (argument === "--") {
      optionsEnded = true;
      continue;
    }
    if (argument === "-h" || argument === "--help") {
      result.help = true;
      continue;
    }
    if (argument === "-V" || argument === "--version") {
      result.version = true;
      continue;
    }
    if (argument === "-i" || argument === "--invert") {
      result.invert = true;
      continue;
    }
    if (argument === "-m" || argument === "--margin") {
      result.margin = parseMargin(args[++index]);
      continue;
    }
    if (argument.startsWith("--margin=")) {
      result.margin = parseMargin(argument.slice("--margin=".length));
      continue;
    }
    if (argument.startsWith("-")) {
      throw new Error(`Unknown option: ${argument}`);
    }
    values.push(argument);
  }

  if (values.length > 0) result.text = values.join(" ");
  return result;
}

function selectBlock(top: boolean, bottom: boolean): string {
  if (top && bottom) return "█";
  if (top) return "▀";
  if (bottom) return "▄";
  return " ";
}

export function renderTerminal(
  canvas: QRLiteBitCanvas,
  options: QRPrintOptions,
): string {
  if (!Number.isSafeInteger(options.margin) || options.margin < 0) {
    throw new RangeError("margin must be a non-negative integer.");
  }

  const width = canvas.width + options.margin * 2;
  const height = canvas.height + options.margin * 2;
  const lines: string[] = [];

  const isForeground = (x: number, y: number): boolean => {
    const canvasX = x - options.margin;
    const canvasY = y - options.margin;
    const black = canvasX >= 0 && canvasX < canvas.width && canvasY >= 0 &&
      canvasY < canvas.height && canvas.getPixel(canvasX, canvasY) === true;
    return options.invert ? black : !black;
  };

  for (let y = 0; y < height; y += 2) {
    let line = "";
    for (let x = 0; x < width; x++) {
      const top = isForeground(x, y);
      const bottom = y + 1 < height ? isForeground(x, y + 1) : false;
      line += selectBlock(top, bottom);
    }
    lines.push(line);
  }

  return lines.join("\n");
}

export function run(args: string[]): number {
  let options: ParsedArguments;
  try {
    options = parseArguments(args);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}\n`);
    console.error(usage);
    return 1;
  }

  if (options.help) {
    console.log(usage);
    return 0;
  }
  if (options.version) {
    console.log(`qrprint ${Version}`);
    return 0;
  }
  if (options.text === undefined) {
    console.error("Error: Specify text to encode as a QR code.\n");
    console.error(usage);
    return 1;
  }

  try {
    const canvas = convert(options.text);
    console.log(renderTerminal(canvas, options));
    return 0;
  } catch (error) {
    console.error(`Failed to generate a QR code: ${(error as Error).message}`);
    return 1;
  }
}

if (import.meta.main) Deno.exitCode = run(Deno.args);
