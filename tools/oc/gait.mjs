// Per frame: torso centroid x (hip band), head centroid x, and the two feet x-extents on the bottom rows.
import { execFileSync } from 'node:child_process';
for (const f of process.argv.slice(2)) {
  const [w, h] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', f]).toString().trim().split(',').map(Number);
  const px = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1 << 28 });
  const a = (x, y) => px[(y * w + x) * 4 + 3] > 128;
  let top = h, bot = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a(x, y)) { top = Math.min(top, y); bot = Math.max(bot, y); break; }
  const band = (p0, p1) => { let s = 0, n = 0; for (let y = Math.round(top + (bot - top) * p0); y < top + (bot - top) * p1; y++) for (let x = 0; x < w; x++) if (a(x, y)) (s += x), n++; return n ? s / n : NaN; };
  let lo = w, hi = 0;
  for (let y = Math.round(bot - (bot - top) * 0.06); y <= bot; y++) for (let x = 0; x < w; x++) if (a(x, y)) (lo = Math.min(lo, x)), (hi = Math.max(hi, x));
  console.log(f.split('/').pop().padEnd(8), 'head', band(0, 0.3).toFixed(1).padStart(6), ' torso', band(0.45, 0.6).toFixed(1).padStart(6), ' feet', lo, '-', hi, ' spread', hi - lo, ' top', top);
}
