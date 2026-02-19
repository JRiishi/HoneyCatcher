#!/usr/bin/env node

/**
 * Sharp-based icon generator
 * Requires: npm install sharp
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
const svgPath = path.join(iconsDir, 'icon.svg');

if (!fs.existsSync(svgPath)) {
  console.error('❌ icon.svg not found. Run generate-icons.js first.');
  process.exit(1);
}

console.log('🎨 Generating PNG icons with Sharp...');

Promise.all(
  sizes.map(size => {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    return sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(outputPath)
      .then(() => console.log(`✅ Generated: icon-${size}x${size}.png`));
  })
)
  .then(() => {
    console.log('\n✨ All icons generated successfully!');
  })
  .catch(err => {
    console.error('❌ Error generating icons:', err);
    process.exit(1);
  });
