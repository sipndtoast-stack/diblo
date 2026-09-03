import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve('public');

// SVG for standard icon
const standardSvg = fs.readFileSync(path.join(publicDir, 'icon.svg'));

// SVG for maskable icon: Full bleed background with 15% inner padding for Android adaptive icon clipping
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="dibloGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF387F" />
      <stop offset="50%" stop-color="#F42F73" />
      <stop offset="100%" stop-color="#D8175A" />
    </linearGradient>
  </defs>

  <!-- Full bleed background without corner radius (Android applies circular/squircle mask) -->
  <rect width="512" height="512" fill="url(#dibloGrad)" />

  <!-- Centered emblem scaled to fit strictly inside 80% safe zone -->
  <g transform="translate(51, 51) scale(0.8)">
    <path d="M 312 110
             C 328 110, 340 122, 340 138
             L 340 374
             C 340 390, 328 402, 312 402
             C 296 402, 284 390, 284 374
             L 284 358
             C 264 390, 228 406, 188 406
             C 120 406, 72 352, 72 278
             C 72 204, 120 150, 188 150
             C 228 150, 264 166, 284 198
             L 284 138
             C 284 122, 296 110, 312 110 Z
             M 206 206
             C 162 206, 130 238, 130 278
             C 130 318, 162 350, 206 350
             C 250 350, 284 318, 284 278
             C 284 238, 250 206, 206 206 Z"
          fill="#FFFFFF" />

    <path d="M 388 132
             C 388 156, 408 176, 432 176
             C 408 176, 388 196, 388 220
             C 388 196, 368 176, 344 176
             C 368 176, 388 156, 388 132 Z"
          fill="#FFF0F5" />
    <circle cx="438" cy="116" r="10" fill="#FFFFFF" opacity="0.9" />
  </g>
</svg>`;

async function generate() {
  console.log('Generating PWA icons...');

  // 192x192
  await sharp(standardSvg)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('✓ pwa-192x192.png');

  // 512x512
  await sharp(standardSvg)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('✓ pwa-512x512.png');

  // 512x512 maskable with safe zone
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('✓ pwa-maskable-512x512.png');

  // Apple touch icon 180x180
  await sharp(standardSvg)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png');

  // Favicon 64x64
  await sharp(standardSvg)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('✓ favicon.png');

  console.log('All icons generated successfully!');
}

generate().catch(console.error);
