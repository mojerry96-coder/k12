"""Repairs Vision's subject masks in place: Vision sometimes drops pale feathers (the top of
Fitila's head) against the pale paper. Any pixel near the Vision mask that clearly differs from
the paper colour is added back, so heads and wing tips are never cut off.
usage: python3 tools/matte.py IN_DIR OUT_DIR   (OUT_DIR holds the Vision PNGs, same names)"""
import os, sys
import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
REACH = 24          # px around the Vision mask where colour may add pixels back
LO, HI = 45, 100    # summed RGB distance from paper: background below LO, subject above HI

def dilate(m, r):
    out = m.copy()
    for axis in (0, 1):
        acc = out.copy()
        for s in range(1, r + 1):
            acc |= np.roll(out, s, axis) | np.roll(out, -s, axis)
        out = acc
    return out

files = sorted(f for f in os.listdir(src) if f.endswith('.png'))
first = np.asarray(Image.open(os.path.join(src, files[0])).convert('RGB')).astype(np.int16)
edge = np.concatenate([first[:8].reshape(-1, 3), first[-8:].reshape(-1, 3), first[:, :8].reshape(-1, 3), first[:, -8:].reshape(-1, 3)])
paper = np.median(edge, axis=0)
worst = (0, '')
for f in files:
    rgb = np.asarray(Image.open(os.path.join(src, f)).convert('RGB'))
    va = np.asarray(Image.open(os.path.join(dst, f)).getchannel('A')).astype(np.float32) / 255
    diff = np.abs(rgb.astype(np.int16) - paper).sum(axis=2)
    t = np.clip((diff - LO) / (HI - LO), 0, 1)
    cm = t * t * (3 - 2 * t)
    near = dilate(va > .5, REACH)
    a = np.maximum(va, cm * near)
    added = int(((a > .5) & (va <= .5)).sum())
    if added > worst[0]: worst = (added, f)
    Image.fromarray(np.dstack([rgb, (a * 255 + .5).astype(np.uint8)]), 'RGBA').save(os.path.join(dst, f))
print(f'paper {paper.astype(int).tolist()}, most pixels restored: {worst[0]} in {worst[1]}')
