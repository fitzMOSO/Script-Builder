/**
 * Regenerates the favicon and PWA icons for Script Builder.
 *
 * sharp is not a dependency of this project — it is only needed when the icons
 * change, which is rarely:
 *
 *   npm i -D sharp --no-save && node scripts/generate-icons.mjs && rm -rf node_modules/sharp
 *
 * `rm -rf` rather than `npm uninstall`: uninstall rewrites package.json even
 * when the install was --no-save, re-sorting unrelated dependencies into a
 * diff you did not ask for.
 *
 * ## Why this script exists
 *
 * The repo already owned this mark — a white speech bubble on a #2563eb
 * squircle — but only as a PNG, and `<link rel="icon">` pointed at a
 * recoloured copy of the *Vite* logo. So the tab showed Vite's bolt while the
 * PWA icons showed the real mark.
 *
 * The geometry below was measured off the original icon-512.png rather than
 * redrawn by eye, and checked back against it: mean absolute difference
 * 1.75/255, which is antialiasing and nothing else. Having it as vector means
 * favicon.svg stays crisp at any density and every raster is derived from one
 * source instead of resampled from a PNG.
 */
import sharp from 'sharp'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const GLYPH = `
  <path d="M164 320 H261.3 L164 428 Z" fill="#ffffff"/>
  <rect x="103" y="123" width="306" height="215" rx="55" fill="#ffffff"/>
  <g fill="#2563eb">
    <circle cx="173.5" cy="229.5" r="25"/>
    <circle cx="255.5" cy="229.5" r="25"/>
    <circle cx="337.5" cy="229.5" r="25"/>
  </g>`

/** The glyph's own centre — below the canvas centre, because of the tail. */
const CX = 256
const CY = 275.5

function svg({ radius = 102, scale = 1 } = {}) {
  const g =
    scale === 1
      ? GLYPH
      : `<g transform="translate(256,256) scale(${scale}) translate(${-CX},${-CY})">${GLYPH}</g>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="${radius}" fill="#2563eb"/>${g}
</svg>
`
}

const rounded = svg()
const png = (src, size) =>
  sharp(Buffer.from(src), { density: 900 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer()

mkdirSync(join(ROOT, 'public/icons'), { recursive: true })
writeFileSync(join(ROOT, 'public/favicon.svg'), rounded)
writeFileSync(join(ROOT, 'public/icons/icon-192.png'), await png(rounded, 192))
writeFileSync(join(ROOT, 'public/icons/icon-512.png'), await png(rounded, 512))
// Full-bleed: iOS applies its own squircle mask to apple-touch-icon, so
// pre-rounded corners would composite their transparency to black.
writeFileSync(join(ROOT, 'public/icons/apple-touch-icon.png'), await png(svg({ radius: 0 }), 180))
// Maskable: Android crops to an arbitrary shape, so the glyph is recentred and
// shrunk inside the centre-80% safe circle.
writeFileSync(
  join(ROOT, 'public/icons/icon-maskable-512.png'),
  await png(svg({ radius: 0, scale: 0.62 }), 512),
)
console.log('icons written to public/')
