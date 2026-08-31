"""
Make every nav icon occupy the same share of its own frame.

The nav renders each icon in a fixed box, so how big one LOOKS depends on how
much of its file the artwork fills — and that ranged from 43% (Archive) to 95%
(Settings). The same box produced anything from a 48px mark to a 145px one,
which is why "make this one bigger" kept being true of a different icon.

So the padding comes out of the files instead: a SQUARE crop centred on the
artwork, which leaves the aspect ratio alone and gives the nav's centre-crop
nothing left to take. One box size then reads the same for all of them.
"""
from PIL import Image
import numpy as np, re, sys

MARGIN = 1.10   # 5% breathing room each side
navs = re.findall(r"icon: \'(/icons/[^\']+)\'", open("components/NavBar.tsx").read())

for rel in navs:
    f = "public" + rel
    im = Image.open(f).convert("RGBA")
    a = np.array(im)
    mask = (a[..., 3] > 30) & (a[..., :3].min(axis=2) < 238)
    ys, xs = np.where(mask)
    if not len(ys):
        print(f"  {rel:34} no artwork found, left alone"); continue
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    w, h = x1 - x0, y1 - y0
    side = int(max(w, h) * MARGIN)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    box = (cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2)
    # PIL pads with transparency when the box runs past the edge.
    out = im.crop(box).resize((512, 512), Image.LANCZOS)
    out.save(f)
    print(f"  {rel.split('/')[-1]:26} art {w}x{h} -> square {side} -> 512")
