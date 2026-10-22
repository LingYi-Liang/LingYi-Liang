# Painted sky

The hero's sky and the panels' background are cut from two paintings made with Codex image generation.
The full paintings are in `source/` and the prompts in `prompts/` (`base.txt` plus one variant line).
`SKY` in `scripts/content.mjs` picks the hero's painting.

| Painting | Band in the repo | Cut (1536 wide, from y) | Grass line at x=860 / 1130 | Trail angle |
|---|---|---|---|---|
| `azure` (calm, 青空) | `assets/art/sky-azure.webp` | 384 | 278 / 271 | 25° |
| `galaxy` (Milky Way, violet-pink dawn) | `assets/art/sky-galaxy.webp` | 400 | 281 / 255 | 24° |

To paint a new sky:

1. Generate a 1536×1024 painting: put "Generate one image with the image generation tool and save it as
   sky.png in the current directory." above `base.txt` and a variant line, then
   `codex exec --skip-git-repo-check -s workspace-write -C <dir> - < prompt.txt` (about 4 minutes).
2. Cut a 4:1 band with the hill crest near the bottom and calm sky on the left, where the text goes:
   `ffmpeg -i sky.png -vf "crop=1536:384:0:<y>" -c:v libwebp -quality 80 assets/art/sky-<name>.webp`
3. Add it to `SKIES` in `scripts/hero.mjs`. On the band scaled to 1200×300, `ground` is the y of the
   grass line at the stargazer's two stops (x=860 and x=1130), so she walks on the painted hill, and
   `trail` is the angle of the painted star trails, which the meteor follows.

The panels share one texture, the top of the azure painting, darkened and softened so text stays legible:

```
ffmpeg -i source/azure.webp -vf "crop=1536:372:0:0,scale=1200:290,gblur=sigma=1.4,eq=brightness=-0.10:contrast=0.92:saturation=1.05,colorchannelmixer=rr=0.78:gg=0.80:bb=0.86" -c:v libwebp -quality 72 assets/art/panel-sky.webp
```
