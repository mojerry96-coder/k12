"""Prepare a Fitila clip generated directly on an app background colour (no alpha).

usage: python3 bgclip.py CLIP.mp4 '#RRGGBB' OUT_STEM [--height 720] [--aspect W:H] [--crop x0,y0,x1,y1]

  1. measures the backdrop colour the model actually produced (median of frame borders, all frames)
  2. pulls near-backdrop pixels onto the exact app colour (weighted by similarity, so Fitila's own
     colours are untouched) and snaps the flat backdrop exactly to it
  3. crops to the union of all frames' non-backdrop pixels (+ padding), optional fixed aspect
  4. writes OUT_STEM.mp4 (H.264, BT.709, faststart) plus OUT_STEM_first.webp / OUT_STEM_last.webp
"""
import os, subprocess, sys, tempfile
import numpy as np
from PIL import Image


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


def main():
    src, hexcol, stem = sys.argv[1:4]
    arg = lambda k, d: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
    target_h = int(arg('--height', 720))
    aspect = arg('--aspect', None)
    T = np.array([int(hexcol[i:i + 2], 16) for i in (1, 3, 5)], np.float32)
    w, h = probe(src)

    borders = []
    for f in frames(src, w, h):
        borders.append(np.concatenate([f[:12].reshape(-1, 3), f[-12:].reshape(-1, 3), f[:, :12].reshape(-1, 3), f[:, -12:].reshape(-1, 3)]))
    M = np.median(np.concatenate(borders), axis=0)
    print('target', T, 'model backdrop', M.round(1), 'shift', (T - M).round(1))

    tmp = tempfile.mkdtemp()
    bbox = [w, h, 0, 0]
    n = 0
    for f in frames(src, w, h):
        d = np.sqrt(((f - M) ** 2).sum(2))
        wgt = np.exp(-(d / 28.0) ** 2)[..., None]          # 1 at backdrop, ~0 on Fitila
        g = f + (T - M) * wgt
        g[d < 7] = T                                       # flat backdrop: exactly the app colour
        ys, xs = np.nonzero(d > 20)
        if len(xs):
            bbox = [min(bbox[0], xs.min()), min(bbox[1], ys.min()), max(bbox[2], xs.max()), max(bbox[3], ys.max())]
        Image.fromarray(np.clip(g, 0, 255).astype(np.uint8)).save(os.path.join(tmp, f'g_{n:04d}.png'), compress_level=1)
        n += 1

    pad = 40
    x0, y0, x1, y1 = max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(w, bbox[2] + pad), min(h, bbox[3] + pad)
    if '--crop' in sys.argv:  # shared crop so light/dark variants frame Fitila identically
        x0, y0, x1, y1 = map(float, arg('--crop', '').split(','))
    elif aspect:  # widen/heighten symmetrically to a fixed aspect (canvas is backdrop-coloured anyway)
        aw, ah = map(float, aspect.split(':'))
        cw, ch = x1 - x0, y1 - y0
        if cw / ch < aw / ah:
            extra = (ch * aw / ah - cw) / 2; x0, x1 = x0 - extra, x1 + extra
        else:
            extra = (cw * ah / aw - ch) / 2; y0, y1 = y0 - extra, y1 + extra
    cw, ch = x1 - x0, y1 - y0
    scale = target_h / ch
    ow, oh = int(round(cw * scale / 2) * 2), int(round(ch * scale / 2) * 2)
    for i in range(n):
        p = os.path.join(tmp, f'g_{i:04d}.png')
        im = Image.open(p)
        canvas = Image.new('RGB', (int(np.ceil(cw)), int(np.ceil(ch))), tuple(int(v) for v in T))
        canvas.paste(im, (int(round(-x0)), int(round(-y0))))
        canvas.resize((ow, oh), Image.LANCZOS).save(os.path.join(tmp, f'c_{i:04d}.png'), compress_level=1)
        os.remove(p)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '24', '-i', os.path.join(tmp, 'c_%04d.png'),
                    '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-pix_fmt', 'yuv420p',
                    '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int+full_chroma_inp',
                    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
                    '-movflags', '+faststart', '-an', stem + '.mp4'], check=True)
    Image.open(os.path.join(tmp, 'c_0000.png')).save(stem + '_first.webp', quality=90, method=6)
    Image.open(os.path.join(tmp, f'c_{n - 1:04d}.png')).save(stem + '_last.webp', quality=90, method=6)
    print(f'frames={n} crop=({x0:.0f},{y0:.0f},{x1:.0f},{y1:.0f}) out={ow}x{oh} -> {stem}.mp4')


if __name__ == '__main__':
    main()
