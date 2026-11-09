#!/usr/bin/env node
/**
 * @fileOverview Generate the browser icons from src/app/icon.svg.
 *
 * Run `npm run brand:icons` after changing the mark. Keeping the SVG as the
 * single source means the favicon, the home-screen icon and the in-app shield
 * cannot drift apart, and the binary .ico is reproducible rather than a file
 * somebody exported once from a design tool.
 *
 * The .ico carries PNG-encoded entries at 16/32/48px, which every browser in the
 * support matrix decodes; a legacy BMP writer would add code for no benefit.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const appDir = path.join(root, 'src/app');
const source = path.join(appDir, 'icon.svg');

/** Pack PNG buffers into a Windows icon container. */
function buildIco(entries) {
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  const directory = Buffer.alloc(16 * count);
  let offset = 6 + directory.length;

  entries.forEach(({ size, png }, index) => {
    const base = index * 16;
    directory.writeUInt8(size >= 256 ? 0 : size, base + 0);
    directory.writeUInt8(size >= 256 ? 0 : size, base + 1);
    directory.writeUInt8(0, base + 2); // palette
    directory.writeUInt8(0, base + 3); // reserved
    directory.writeUInt16LE(1, base + 4); // colour planes
    directory.writeUInt16LE(32, base + 6); // bits per pixel
    directory.writeUInt32LE(png.length, base + 8);
    directory.writeUInt32LE(offset, base + 12);
    offset += png.length;
  });

  return Buffer.concat([header, directory, ...entries.map((entry) => entry.png)]);
}

async function main() {
  const svg = await readFile(source);

  const icoSizes = [16, 32, 48];
  const entries = [];
  for (const size of icoSizes) {
    const png = await sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();
    entries.push({ size, png });
  }
  await writeFile(path.join(appDir, 'favicon.ico'), buildIco(entries));

  const targets = [
    ['apple-icon.png', 180],
    ['icon1.png', 192],
    ['icon2.png', 512],
  ];
  for (const [name, size] of targets) {
    const png = await sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();
    await writeFile(path.join(appDir, name), png);
  }

  console.log(`brand:icons — favicon.ico (${icoSizes.join('/')}px), ${targets.map(([n, s]) => `${n} ${s}px`).join(', ')}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
