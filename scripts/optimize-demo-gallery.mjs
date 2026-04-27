#!/usr/bin/env node
/**
 * Compress + resize the home-page demo gallery images in place.
 *
 * The originals are full-resolution camera JPEGs (some over 10 MB),
 * shipped raw to every homepage visitor. This pass resizes the long
 * edge to a web-friendly maximum and re-encodes with mozjpeg @ q=80.
 *
 * Run with: node scripts/optimize-demo-gallery.mjs
 *
 * Idempotent: re-running on an already-optimized image just produces a
 * marginally different file. The script writes to a sibling `.opt.jpg`
 * file first, then atomically renames over the original — so a
 * mid-run failure leaves the original intact.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TARGET_DIR = path.resolve(
  __dirname,
  "..",
  "public",
  "demo",
  "home-gallery",
);

const MAX_LONG_EDGE = 1600;
const QUALITY = 80;

async function optimizeOne(filename) {
  const fullPath = path.join(TARGET_DIR, filename);
  const tmpPath = `${fullPath}.opt.jpg`;
  const beforeSize = (await fs.stat(fullPath)).size;

  await sharp(fullPath)
    .rotate() // honor EXIF orientation, then strip
    .resize({
      width: MAX_LONG_EDGE,
      height: MAX_LONG_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({
      quality: QUALITY,
      mozjpeg: true,
      progressive: true,
    })
    .toFile(tmpPath);

  await fs.rename(tmpPath, fullPath);
  const afterSize = (await fs.stat(fullPath)).size;
  return { filename, beforeSize, afterSize };
}

async function main() {
  const entries = await fs.readdir(TARGET_DIR);
  const targets = entries.filter((entry) =>
    /^(gallery-cover|subgallery-\d+-cover|scene-\d+-\d+)\.jpe?g$/i.test(entry),
  );

  console.log(`Optimizing ${targets.length} files in ${TARGET_DIR}\n`);

  let totalBefore = 0;
  let totalAfter = 0;
  for (const filename of targets) {
    try {
      const { beforeSize, afterSize } = await optimizeOne(filename);
      totalBefore += beforeSize;
      totalAfter += afterSize;
      const beforeKb = (beforeSize / 1024).toFixed(0);
      const afterKb = (afterSize / 1024).toFixed(0);
      const pct = ((1 - afterSize / beforeSize) * 100).toFixed(0);
      console.log(`  ${filename.padEnd(28)} ${beforeKb} KB → ${afterKb} KB (${pct}% smaller)`);
    } catch (err) {
      console.error(`  ${filename}: FAILED — ${err.message}`);
    }
  }

  const totalBeforeMb = (totalBefore / 1024 / 1024).toFixed(1);
  const totalAfterMb = (totalAfter / 1024 / 1024).toFixed(1);
  const totalPct = ((1 - totalAfter / totalBefore) * 100).toFixed(0);
  console.log(`\nTotal: ${totalBeforeMb} MB → ${totalAfterMb} MB (${totalPct}% smaller)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
