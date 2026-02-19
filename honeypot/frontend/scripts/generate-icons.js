#!/usr/bin/env node

/**
 * Icon Generator for PWA
 * Generates icons from a single source SVG or PNG
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple icon generator using canvas (Node.js native)
// For production, use sharp or jimp packages

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const iconSVG = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="512" height="512" rx="100" fill="#020202"/>
  
  <!-- Gradient Background -->
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10b981;stop-opacity:0.2" />
      <stop offset="100%" style="stop-color:#14b8a6;stop-opacity:0.1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#grad)"/>
  
  <!-- Shield Icon -->
  <path d="M256 100L150 150V250C150 310 190 360 256 390C322 360 362 310 362 250V150L256 100Z" 
        fill="#10b981" 
        opacity="0.8"/>
  <path d="M256 120L170 160V250C170 300 204 340 256 365C308 340 342 300 342 250V160L256 120Z" 
        fill="#14b8a6"/>
  
  <!-- Badger Face (simplified) -->
  <ellipse cx="256" cy="246" rx="60" ry="65" fill="#FFFFFF"/>
  <circle cx="236" cy="240" r="8" fill="#020202"/>
  <circle cx="276" cy="240" r="8" fill="#020202"/>
  <path d="M246 265 Q256 275 266 265" stroke="#020202" stroke-width="4" fill="none" stroke-linecap="round"/>
  
  <!-- Ears -->
  <ellipse cx="216" cy="210" rx="18" ry="22" fill="#FFFFFF"/>
  <ellipse cx="296" cy="210" rx="18" ry="22" fill="#FFFFFF"/>
  
  <!-- Text "HB" -->
  <text x="256" y="430" font-family="Arial, sans-serif" font-size="80" font-weight="bold" 
        fill="#10b981" text-anchor="middle">HB</text>
</svg>
`;

console.log('🎨 Generating PWA icons...');

// Create icons directory
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate base SVG
const svgPath = path.join(iconsDir, 'icon.svg');
fs.writeFileSync(svgPath, iconSVG);
console.log('✅ Generated: icon.svg');

// Instructions for converting SVG to PNG
console.log('\n📝 To generate PNG icons, you have two options:');
console.log('\n1. Using ImageMagick (Linux/WSL):');
sizes.forEach(size => {
  console.log(`   convert -background none -resize ${size}x${size} ${iconsDir}/icon.svg ${iconsDir}/icon-${size}x${size}.png`);
});

console.log('\n2. Using Node Sharp (Install: npm install sharp):');
console.log(`   node scripts/generate-icons-sharp.js`);

console.log('\n3. Using online tool:');
console.log('   Upload icon.svg to https://realfavicongenerator.net/');

console.log('\n✨ Base SVG created successfully!');
console.log('📍 Location:', svgPath);
