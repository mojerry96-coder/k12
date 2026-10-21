"""Difference matting for Fitila clips.

Inputs: the generated clip on its known pale backdrop (orig) and the background-removed
render of the same clip on black (masked = alpha * colour). Recovers a true alpha channel,
crops to the union bounding box over all frames and writes RGBA PNG frames plus posters.

usage: python3 matte.py ORIG.mp4 MASKED.mp4 OUT_DIR [--height 720]
"""
import os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def probe(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                          'stream=width,height', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout
    w, h = map(int, out.strip().split(','))
    return w, h


def frames(path, w, h):
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                         stdout=subprocess.PIPE)
    size = w * h * 3
    while True:
        buf = p.stdout.read(size)
        if len(buf) < size:
            break
        yield np.frombuffer(buf, np.uint8).reshape(h, w, 3).astype(np.float32)
    p.wait()


EDGE = 5  # px band (at source resolution) where soft alpha is kept


def solid_silhouette(mask):
    """Seal edge gaps, fill every interior hole, then keep only the body region.

    Specks are removed by keeping the component that contains the body (seeded at the mask
    centroid), never by eroding, because erosion opens channels where the remover's own matte
    is speckled and lets interior holes leak to the outside.
    """
    im = Image.fromarray((mask * 255).astype(np.uint8))
    im = im.filter(ImageFilter.MaxFilter(15)).filter(ImageFilter.MinFilter(15))  # close gaps
    padded = Image.new('L', (im.width + 2, im.height + 2), 0)
    padded.paste(im, (1, 1))
    ImageDraw.floodfill(padded, (0, 0), 128)
    filled = np.where(np.array(padded)[1:-1, 1:-1] == 128, 0, 255).astype(np.uint8)
    ys, xs = np.nonzero(filled)
    if not len(xs):
        return filled
    cy, cx = int(ys.mean()), int(xs.mean())
    if not filled[cy, cx]:  # centroid outside the body: take the nearest body pixel
        i = np.argmin((ys - cy) ** 2 + (xs - cx) ** 2)
        cy, cx = int(ys[i]), int(xs[i])
    body = Image.fromarray(255 - filled).copy()  # .copy(): floodfill is a no-op on fromarray-backed images
    ImageDraw.floodfill(body, (cx, cy), 128)
    return np.where(np.array(body) == 128, 255, 0).astype(np.uint8)


def main():
    orig, masked, out = sys.argv[1:4]
    target_h = int(sys.argv[sys.argv.index('--height') + 1]) if '--height' in sys.argv else 720
    w, h = probe(orig)
    assert probe(masked) == (w, h), 'clips differ in size'
    os.makedirs(out, exist_ok=True)

    # Pass 1: background plate from pixels the subject leaves uncovered.
    acc = np.zeros((h, w, 3), np.float64)
    cnt = np.zeros((h, w, 1), np.float64)
    for o, m in zip(frames(orig, w, h), frames(masked, w, h)):
        bare = (m.sum(2, keepdims=True) < 6)
        acc += o * bare
        cnt += bare
    fallback = (acc.sum((0, 1)) / max(cnt.sum(), 1)).astype(np.float32)
    plate = np.where(cnt > 0, acc / np.maximum(cnt, 1), fallback).astype(np.float32)
    plate = np.maximum(plate, 1.0)

    # Pass 2. The remover's own matte is speckled on textured/dark regions, so:
    #  - silhouette = difference alpha > .5, closed and hole-filled -> solid interior (alpha 1)
    #  - soft difference alpha kept only in a thin edge band (feather transparency)
    #  - colour taken from the ORIGINAL clip, un-composited from the plate at the edges.
    bbox = [w, h, 0, 0]
    n = 0
    for o, m in zip(frames(orig, w, h), frames(masked, w, h)):
        a = np.clip(1.0 - np.mean((o - m) / plate, axis=2), 0, 1)
        seen = a > 0.5
        sil = solid_silhouette(seen)
        # A filled-in pixel is a remover speckle (keep solid) unless it looks like the backdrop,
        # in which case it is a real gap, e.g. between the legs and tail (make transparent).
        gap = (sil > 0) & ~seen & (np.mean(np.abs(o - plate), axis=2) < 22)
        # Only sizeable regions are real gaps; pin-pricks (white shirt between waistcoat and
        # sweater) are speckle and stay solid.
        gap = np.array(Image.fromarray((gap * 255).astype(np.uint8))
                       .filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(7))) > 0
        sil = np.where(gap, 0, sil).astype(np.uint8)
        core = np.array(Image.fromarray(sil).filter(ImageFilter.MinFilter(EDGE))) > 0
        hull = np.array(Image.fromarray(sil).filter(ImageFilter.MaxFilter(EDGE))) > 0
        a = np.where(core, 1.0, np.where(hull, a, 0.0))
        a[a < 0.04] = 0
        A = a[..., None]
        col = np.where(A > 0.02, (o - (1 - A) * plate) / np.maximum(A, 0.02), 0)
        rgba = np.dstack([np.clip(col, 0, 255), a * 255]).astype(np.uint8)
        ys, xs = np.nonzero(a > 0.05)
        if len(xs):
            bbox = [min(bbox[0], xs.min()), min(bbox[1], ys.min()), max(bbox[2], xs.max()), max(bbox[3], ys.max())]
        Image.fromarray(rgba, 'RGBA').save(os.path.join(out, f'full_{n:04d}.png'), compress_level=1)
        n += 1

    pad = 16
    x0, y0 = max(0, bbox[0] - pad), max(0, bbox[1] - pad)
    x1, y1 = min(w, bbox[2] + pad), min(h, bbox[3] + pad)
    cw, ch = x1 - x0, y1 - y0
    scale = min(1.0, target_h / ch)
    ow, oh = int(round(cw * scale / 2) * 2), int(round(ch * scale / 2) * 2)
    for i in range(n):
        src = os.path.join(out, f'full_{i:04d}.png')
        im = Image.open(src).crop((x0, y0, x1, y1)).resize((ow, oh), Image.LANCZOS)
        im.save(os.path.join(out, f'f_{i:04d}.png'), compress_level=1)
        os.remove(src)
    print(f'frames={n} crop=({x0},{y0},{x1},{y1}) out={ow}x{oh}')


if __name__ == '__main__':
    main()
