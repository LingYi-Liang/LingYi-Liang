// Cut a 2x4 chroma-key sprite sheet into aligned frames.
//   node sprites.mjs <sheet.png> <outDir> [targetHeight]
// Writes <outDir>/<name>-<i>.png (transparent) and <name>-<i>.green.png (on #00FF00, for interpolation).
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { basename, join } from 'node:path';

const [sheet, outDir, targetArg] = process.argv.slice(2);
// targetArg is either a median height in output px ("300") or a fixed scale ("scale=0.708") shared across sheets.
const FIXED = targetArg && targetArg.startsWith('scale=') ? +targetArg.slice(6) : 0;
const TARGET = FIXED ? 0 : +(targetArg || 300);
const CANVAS_W = 260, CANVAS_H = 360, BASE = 340; // output canvas, feet baseline
const name = basename(sheet, '.png');
mkdirSync(outDir, { recursive: true });

const probe = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', sheet]).toString().trim();
const [W, H] = probe.split(',').map(Number);
const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', sheet, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1 << 30 });

// Key out green: alpha from how much green dominates, then despill the edges.
const px = Buffer.from(raw);
for (let i = 0; i < px.length; i += 4) {
  const r = px[i], g = px[i + 1], b = px[i + 2];
  const spill = g - Math.max(r, b);
  const a = spill > 70 ? 0 : spill < 18 ? 1 : 1 - (spill - 18) / 52;
  if (spill > 0) px[i + 1] = Math.max(r, b);
  px[i + 3] = Math.round(a * 255);
}

const alphaAt = (x, y) => px[(y * W + x) * 4 + 3];
const frames = [];
for (let row = 0; row < 2; row++)
  for (let col = 0; col < 4; col++) {
    const x0 = Math.floor((col * W) / 4), x1 = Math.floor(((col + 1) * W) / 4);
    const y0 = Math.floor((row * H) / 2), y1 = Math.floor(((row + 1) * H) / 2);
    let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
    for (let y = y0; y < y1; y++) {
      let n = 0, lo = 1e9, hi = -1;
      for (let x = x0; x < x1; x++) if (alphaAt(x, y) > 128) n++, (lo = Math.min(lo, x)), (hi = Math.max(hi, x));
      if (n > 3) (minY = Math.min(minY, y)), (maxY = Math.max(maxY, y)), (minX = Math.min(minX, lo)), (maxX = Math.max(maxX, hi));
    }
    // Horizontal anchor: the hips (the band just under the waist), so the body doesn't drift between frames.
    // ANCHOR=head keeps the old behaviour.
    const [b0, b1] = process.env.ANCHOR === 'head' ? [0, 0.3] : [0.5, 0.6];
    let sum = 0, cnt = 0;
    for (let y = Math.round(minY + (maxY - minY) * b0); y < minY + (maxY - minY) * b1; y++) for (let x = minX; x <= maxX; x++) if (alphaAt(x, y) > 128) (sum += x), cnt++;
    frames.push({ row, col, minX, maxX, minY, maxY, ax: sum / cnt, h: maxY - minY });
  }

// One scale per sheet: its median figure height maps to TARGET. Per row, the lowest foot is the ground.
const heights = frames.map((f) => f.h).sort((a, b) => a - b);
const scale = FIXED || TARGET / heights[Math.floor(heights.length / 2)];
const ground = [0, 1].map((r) => Math.max(...frames.filter((f) => f.row === r).map((f) => f.maxY)));

frames.forEach((fr, i) => {
  const cw = Math.ceil(CANVAS_W / scale), ch = Math.ceil(CANVAS_H / scale);
  const ox = Math.round(fr.ax - cw / 2), oy = Math.round(ground[fr.row] - (BASE / scale));
  const crop = Buffer.alloc(cw * ch * 4);
  const green = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      const sx = ox + x, sy = oy + y, o = (y * cw + x) * 4;
      const inCell = sx >= Math.floor((fr.col * W) / 4) && sx < Math.floor(((fr.col + 1) * W) / 4) && sy >= Math.floor((fr.row * H) / 2) && sy < Math.floor(((fr.row + 1) * H) / 2);
      if (!inCell) {
        green[o + 1] = 255, (green[o + 3] = 255);
        continue;
      }
      const s = (sy * W + sx) * 4, a = px[s + 3] / 255;
      crop[o] = px[s], crop[o + 1] = px[s + 1], crop[o + 2] = px[s + 2], crop[o + 3] = px[s + 3];
      green[o] = Math.round(px[s] * a), green[o + 1] = Math.round(px[s + 1] * a + 255 * (1 - a)), green[o + 2] = Math.round(px[s + 2] * a), green[o + 3] = 255;
    }
  const tmp = join(outDir, `_${name}-${i}.raw`), tmpG = tmp + 'g';
  writeFileSync(tmp, crop);
  writeFileSync(tmpG, green);
  const vf = `scale=${CANVAS_W}:${CANVAS_H}:flags=lanczos`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${cw}x${ch}`, '-i', tmp, '-vf', vf, join(outDir, `${name}-${i + 1}.png`)]);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${cw}x${ch}`, '-i', tmpG, '-vf', vf, '-pix_fmt', 'rgb24', join(outDir, `${name}-${i + 1}.green.png`)]);
  unlinkSync(tmp);
  unlinkSync(tmpG);
});
console.log(`${name}: ${frames.length} frames, scale ${scale.toFixed(3)}, heights ${frames.map((f) => f.h).join(',')}`);
