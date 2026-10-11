#!/usr/bin/env node
/**
 * Generates PNG icons at 16, 32, 48, and 128px from icon-source.png
 * Run: node generate_icons.js
 * Requires: npm install sharp (one-time)
 */
const sharp = require('sharp');
const path = require('path');

const sizes = [16, 32, 48, 128];
const src = path.join(__dirname, 'icon-source.png');

(async () => {
  for (const size of sizes) {
    const out = path.join(__dirname, `icon${size}.png`);
    await sharp(src)
      .resize(size, size)
      .png()
      .toFile(out);
    console.log(`✓ icon${size}.png`);
  }
  console.log('All icons generated.');
})();
