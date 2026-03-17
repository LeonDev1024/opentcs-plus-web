import sharp from 'sharp';
import toIco from 'to-ico';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '../public');
const svgPath = join(publicDir, 'favicon.svg');

const svg = readFileSync(svgPath);
const [png16, png32, png48, png64] = await Promise.all([
  sharp(svg).resize(16, 16).png().toBuffer(),
  sharp(svg).resize(32, 32).png().toBuffer(),
  sharp(svg).resize(48, 48).png().toBuffer(),
  sharp(svg).resize(64, 64).png().toBuffer()
]);
const ico = await toIco([png16, png32, png48, png64]);
writeFileSync(join(publicDir, 'favicon.ico'), ico);
await sharp(svg).resize(180, 180).png().toFile(join(publicDir, 'favicon.png'));
console.log('favicon.ico and favicon.png generated');
