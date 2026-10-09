# OC sprite pipeline

The walking OC in the merged-PR cards is drawn frame by frame. Frames live in `assets/oc/*.webp`
(188×260, transparent; the character fills the card height) and are embedded into each card by `scripts/oc.mjs`.

To add or redraw an action:

1. Generate a 2×4 sprite sheet on a pure-green background (the prompts in `prompts/` were used with
   Codex image generation, attaching the original character art and the approved walk sheet as references).
2. Cut it into aligned frames (needs ffmpeg). Use the shared scale so every sheet matches in size:
   `node tools/oc/sprites.mjs sheet.png frames scale=0.667`
   Frames are aligned on the hips, so the body doesn't drift between frames.
   For walk/jog cycles, generate two candidates and keep the steadier one:
   `node tools/oc/gait.mjs frames/walk-*.png` (torso x should barely move; foot spread should
   rise and fall smoothly: contact → down → passing → up)
3. If a re-drawn batch drifts in colour, match it to the originals:
   `node tools/oc/colormatch.mjs frames/walk-{1..8}.png -- frames/new-{1..8}.png`
4. Encode into the repo:
   `ffmpeg -i frames/x.png -vf scale=188:260:flags=lanczos -c:v libwebp -q:v 76 -pix_fmt yuva420p assets/oc/x.webp`
5. Use the frame names in `SCRIPTS` inside `scripts/oc.mjs`, then run `node scripts/observatory.mjs`.
