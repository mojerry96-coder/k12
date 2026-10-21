"""Blue-screen key for Fitila clips (Fitila contains no blue, so blue dominance is a clean key).

usage: python3 chromakey.py CLIP.mp4 OUT_DIR [--height 720]

Writes RGBA frames f_0000.png… cropped to the union bounding box of all frames.
  alpha  : from normalised blue excess e = (B - max(R,G)) / B, compared with the backdrop's own e
           (so darker/shadowed blue still keys out; black beak and claws have e = 0 and stay solid)
  colour : backdrop removed from soft edges (un-premultiply), then blue clamped to max(R,G) (despill)
"""
import os, subprocess, sys
import numpy as np
from PIL import Image, ImageFilter


def probe(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                          'stream=width,height', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout
    return tuple(map(int, out.strip().split(',')))


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


def blue_excess(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return np.clip((b - np.maximum(r, g)) / np.maximum(b, 1.0), 0, 1)


def key_frame(rgb, lo=0.35, hi=0.75):
    h, w, _ = rgb.shape
    border = np.concatenate([rgb[:8].reshape(-1, 3), rgb[-8:].reshape(-1, 3), rgb[:, :8].reshape(-1, 3), rgb[:, -8:].reshape(-1, 3)])
    K = np.median(border, axis=0)                      # backdrop colour this frame
    ek = float(blue_excess(K[None, None, :])[0, 0])    # backdrop's own blueness
    e = blue_excess(rgb) / max(ek, 1e-3)               # 1 = as blue as the backdrop
    t = np.clip((e - lo) / (hi - lo), 0, 1)
    a = 1.0 - t * t * (3 - 2 * t)                      # smoothstep: 1 = Fitila, 0 = backdrop
    # 3px greyscale closing: fills hairline specks where grey feathers pick up blue spill,
    # without moving the outline.
    am = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    a = np.maximum(a, np.asarray(am, np.float32) / 255)
    a[a < 0.03] = 0
    A = a[..., None]
    col = np.where(A > 0.02, (rgb - (1 - A) * K) / np.maximum(A, 0.02), 0)
    col = np.clip(col, 0, 255)
    col[..., 2] = np.minimum(col[..., 2], np.maximum(col[..., 0], col[..., 1]) + 4)  # despill
    return np.dstack([col, a * 255]).astype(np.uint8), K, ek


def main():
    src, out = sys.argv[1:3]
    target_h = int(sys.argv[sys.argv.index('--height') + 1]) if '--height' in sys.argv else 720
    w, h = probe(src)
    os.makedirs(out, exist_ok=True)
    bbox = [w, h, 0, 0]
    n = 0
    for rgb in frames(src, w, h):
        rgba, K, ek = key_frame(rgb)
        if n == 0:
            print('backdrop', K.round(1), 'blueness', round(ek, 3))
        ys, xs = np.nonzero(rgba[..., 3] > 12)
        if len(xs):
            bbox = [min(bbox[0], xs.min()), min(bbox[1], ys.min()), max(bbox[2], xs.max()), max(bbox[3], ys.max())]
        Image.fromarray(rgba, 'RGBA').save(os.path.join(out, f'full_{n:04d}.png'), compress_level=1)
        n += 1
    pad = 16
    x0, y0, x1, y1 = max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(w, bbox[2] + pad), min(h, bbox[3] + pad)
    scale = min(1.0, target_h / (y1 - y0))
    ow, oh = int(round((x1 - x0) * scale / 2) * 2), int(round((y1 - y0) * scale / 2) * 2)
    for i in range(n):
        p = os.path.join(out, f'full_{i:04d}.png')
        Image.open(p).crop((x0, y0, x1, y1)).resize((ow, oh), Image.LANCZOS).save(os.path.join(out, f'f_{i:04d}.png'), compress_level=1)
        os.remove(p)
    print(f'frames={n} crop=({x0},{y0},{x1},{y1}) out={ow}x{oh}')


if __name__ == '__main__':
    main()
