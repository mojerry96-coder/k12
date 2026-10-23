"""Keeps Fitila's beak closed in chosen frames of a clip: the closed beak from a clean reference
frame is found again in each frame (template match over small shifts, scales and turns) and
blended in with a soft mask, so the rest of the frame — wings, eyes, body — is untouched.
Needs OpenCV. usage: python3 tools/beakpatch.py RAW.mp4 OUT.mp4 START-END:REF [START-END:REF …]"""
import sys, subprocess, numpy as np, cv2

src, dst, specs = sys.argv[1], sys.argv[2], sys.argv[3:]
cap = cv2.VideoCapture(src)
frames = []
while True:
    ok, f = cap.read()
    if not ok: break
    frames.append(f)
H, W = frames[0].shape[:2]
paper = np.median(frames[0][:8].reshape(-1, 3), axis=0)

def beak_box(f):
    g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
    fg = np.abs(f.astype(int) - paper).sum(2) > 60
    ys, _ = np.where(fg); top, bot = ys.min(), ys.max()
    d = ((g < 50) & fg).astype(np.uint8); d[int(top + (bot - top) * 0.4):] = 0
    n, lab, st, _ = cv2.connectedComponentsWithStats(d)
    i = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    return st[i, :4], (lab == i)

def warp(img, ang, sc):
    h, w = img.shape[:2]
    M = cv2.getRotationMatrix2D((w / 2, h / 2), ang, sc)
    return cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)

for spec in specs:
    rng, ref = spec.split(':'); a, b = map(int, rng.split('-')); ref = int(ref)
    (x, y, w, h), comp = beak_box(frames[ref])
    m = int(max(w, h) * 0.35)
    x0, y0, x1, y1 = max(0, x - m), max(0, y - m), min(W, x + w + m), min(H, y + h + m)
    patch = frames[ref][y0:y1, x0:x1].copy()
    # soft mask: the beak itself, grown a little and feathered
    mask = comp[y0:y1, x0:x1].astype(np.uint8) * 255
    mask = cv2.dilate(mask, np.ones((15, 15), np.uint8))
    mask = cv2.GaussianBlur(mask, (0, 0), 6).astype(np.float32) / 255
    tmpl = cv2.cvtColor(patch, cv2.COLOR_BGR2GRAY)
    last = (x0, y0)
    for k in range(a, b + 1):
        g = cv2.cvtColor(frames[k], cv2.COLOR_BGR2GRAY)
        best = (-1, None)
        for ang in (-12, -8, -4, 0, 4, 8, 12):
            for sc in (0.9, 0.95, 1.0, 1.05, 1.1):
                t = warp(tmpl, ang, sc)
                sx0, sy0 = max(0, last[0] - 120), max(0, last[1] - 120)
                win = g[sy0:min(H, last[1] + t.shape[0] + 120), sx0:min(W, last[0] + t.shape[1] + 120)]
                if win.shape[0] < t.shape[0] or win.shape[1] < t.shape[1]: continue
                r = cv2.matchTemplate(win, t, cv2.TM_CCOEFF_NORMED)
                _, mv, _, ml = cv2.minMaxLoc(r)
                if mv > best[0]: best = (mv, (sx0 + ml[0], sy0 + ml[1], ang, sc))
        score, (px, py, ang, sc) = best
        last = (px, py)
        p = warp(patch, ang, sc).astype(np.float32)
        mk = warp(mask, ang, sc)[..., None]
        ph, pw = p.shape[:2]
        region = frames[k][py:py + ph, px:px + pw].astype(np.float32)
        frames[k][py:py + ph, px:px + pw] = (p * mk + region * (1 - mk)).astype(np.uint8)
        print(f'frame {k}: matched {score:.2f} at {px},{py} turn {ang} scale {sc}')

proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', '24', '-i', '-',
                         '-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv420p', dst], stdin=subprocess.PIPE)
for f in frames: proc.stdin.write(f.tobytes())
proc.stdin.close(); proc.wait()
