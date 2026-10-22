#!/bin/sh
# Turns a Fitila clip into transparent web video: every frame is lifted with Vision, cropped to
# the union of all frames (+ padding), then encoded as VP9-alpha WebM (Chrome/Edge/Firefox) and
# HEVC-alpha MOV (Safari), plus a transparent WebP poster of the first frame.
# usage: tools/alphaclip.sh CLIP.mp4 OUT_STEM [height]
set -e
CLIP="$1"; STEM="$2"; H="${3:-720}"
HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="$(mktemp -d)"
ffmpeg -v error -i "$CLIP" -vf "scale=in_color_matrix=bt709:in_range=tv:flags=accurate_rnd+full_chroma_int" "$WORK/in_%04d.png"
mkdir -p "$WORK/in" && mv "$WORK"/in_*.png "$WORK/in/"
swift "$HERE/liftdir.swift" "$WORK/in" "$WORK/out"
# union of opaque pixels across frames, padded, even-sized
BOX=$(python3 - "$WORK/out" <<'PY'
import sys, os
from PIL import Image
d = sys.argv[1]; bb = None
for f in sorted(os.listdir(d)):
    b = Image.open(os.path.join(d, f)).getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    if b: bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
W, H = Image.open(os.path.join(d, sorted(os.listdir(d))[0])).size
p = 12
x0, y0, x1, y1 = max(0, bb[0] - p), max(0, bb[1] - p), min(W, bb[2] + p), min(H, bb[3] + p)
w, h = (x1 - x0) // 2 * 2, (y1 - y0) // 2 * 2
print(f"{w}:{h}:{x0}:{y0}")
PY
)
echo "crop $BOX"
SCALE="scale=-2:$H:flags=lanczos"
ffmpeg -v error -y -framerate 24 -i "$WORK/out/in_%04d.png" -vf "crop=$BOX,$SCALE,format=yuva420p" \
  -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 32 -row-mt 1 -deadline good -an "$STEM.webm"
ffmpeg -v error -y -framerate 24 -i "$WORK/out/in_%04d.png" -vf "crop=$BOX,$SCALE,format=bgra" \
  -c:v hevc_videotoolbox -allow_sw 1 -alpha_quality 0.9 -q:v 62 -tag:v hvc1 -an "$STEM.mov"
ffmpeg -v error -y -i "$WORK/out/in_0001.png" -vf "crop=$BOX,$SCALE" -c:v libwebp -quality 90 "${STEM}_poster.webp"
ls -la "$STEM".webm "$STEM".mov "${STEM}_poster.webp" | awk '{print $5, $9}'
rm -rf "$WORK"
