"""Measure where Fitila's resting pose sits in each clip (alpha bbox of its first-frame poster),
so the app can place the video with her resting pose exactly on the design's pose box.
Writes media/fitila/clips.json: {pose: [videoW, videoH, restX, restY, restW, restH]}."""
import json, os
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__)); d = os.path.join(here, '..', 'media', 'fitila')
out = {}
for f in sorted(os.listdir(d)):
    if not f.endswith('_poster.webp'): continue
    im = Image.open(os.path.join(d, f)).convert('RGBA')
    bb = im.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
    out[f[:-12]] = [im.width, im.height, bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]]
json.dump(out, open(os.path.join(d, 'clips.json'), 'w'), separators=(',', ':'))
print(json.dumps(out))
