// node colormatch.mjs refs... -- targets...   (targets are rewritten in place)
// Per-channel mean/std transfer over opaque pixels, so a re-drawn batch matches the reference palette.
import { execFileSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
const args = process.argv.slice(2), sep = args.indexOf('--');
const refs = args.slice(0, sep), targets = args.slice(sep + 1);
const load = (f) => {
  const [w, h] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', f]).toString().trim().split(',').map(Number);
  return { w, h, px: Buffer.from(execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1 << 28 })) };
};
const stats = (files) => {
  const s = [0, 0, 0], q = [0, 0, 0];
  let n = 0;
  for (const f of files) {
    const { px } = load(f);
    for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 220) { for (let c = 0; c < 3; c++) (s[c] += px[i + c]), (q[c] += px[i + c] ** 2); n++; }
  }
  return s.map((v, c) => ({ m: v / n, sd: Math.sqrt(q[c] / n - (v / n) ** 2) }));
};
const R = stats(refs), T = stats(targets);
console.log('ref', R.map((x) => x.m.toFixed(1)).join(','), 'target', T.map((x) => x.m.toFixed(1)).join(','));
for (const f of targets) {
  const { w, h, px } = load(f);
  for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 0)
    for (let c = 0; c < 3; c++) px[i + c] = Math.max(0, Math.min(255, Math.round(((px[i + c] - T[c].m) / T[c].sd) * R[c].sd + R[c].m)));
  const tmp = f + '.raw';
  writeFileSync(tmp, px);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-i', tmp, f]);
  unlinkSync(tmp);
}
