"""Cut every Fitila pose out of the design references (macOS Vision subject lift).
Writes assets/fitila/<pose>.png (trimmed) and assets/fitila/poses.json with each pose's
trimmed box in design coordinates, so the app can place it exactly where the design has it."""
import json, os, subprocess, sys
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, '..', 'references')
OUT = os.path.join(HERE, '..', 'assets', 'fitila')
WORK = sys.argv[1] if len(sys.argv) > 1 else '/tmp/lift'
os.makedirs(WORK, exist_ok=True)
# pose: (reference file, crop box in the 1672x941 design)
POSES = {
  'wave':      ('Fitila welcomes learners to Gradient Lab-1.png', (100, 300, 720, 880)),
  'point':     ('Fitila’s Line Lab-2.png', (1190, 372, 1580, 790)),
  'side':      ('Place point B with Fitila-3.png', (1140, 355, 1600, 760)),
  'wing':      ('Gradient Lab_ Plot the line-4.png', (1250, 238, 1600, 650)),
  'hint':      ('Gradient Hint with Fitila-5.png', (1270, 330, 1610, 812)),
  'wingwave':  ('Gradient Lab graph challenge-6.png', (1300, 268, 1600, 712)),
  'think':     ('Gradient Lab coordinate challenge-7.png', (1200, 340, 1500, 815)),
  'puzzled':   ('Gradient Lab_ Find the Missing Number-8.png', (1335, 330, 1600, 780)),
  'celebrate': ('Gradient Lab activity complete-10.png', (575, 125, 1105, 565)),
  'raise':     ('Hit Both Targets in Gradient Lab-11.png', (1105, 318, 1510, 710)),
  'almost':    ('Almost! Check the y-axis-13.png', (752, 282, 918, 448)),
  'success':   ('Single parrot in learning popup-14.png', (700, 282, 980, 478)),
}
meta = {}
for name, (ref, box) in POSES.items():
    src = os.path.join(WORK, f'{name}_in.png'); dst = os.path.join(WORK, f'{name}_all.png')
    Image.open(os.path.join(REF, ref)).convert('RGB').crop(box).save(src)
    for f in os.listdir(WORK):
        if f.startswith(f'{name}_all.inst'): os.remove(os.path.join(WORK, f))
    subprocess.run(['swift', os.path.join(HERE, 'lift.swift'), src, dst], check=True, capture_output=True)
    insts = sorted(f for f in os.listdir(WORK) if f.startswith(f'{name}_all.inst'))
    areas = []
    for f in insts:
        a = Image.open(os.path.join(WORK, f)).getchannel('A')
        areas.append((sum(1 for v in a.getdata() if v > 128), f))
    areas.sort(reverse=True)
    main = Image.open(os.path.join(WORK, areas[0][1])).convert('RGBA')   # the parrot is the largest subject
    bb = main.getbbox()
    main.crop(bb).save(os.path.join(OUT, f'{name}.png'))
    meta[name] = {'ref': ref, 'box': [box[0] + bb[0], box[1] + bb[1], bb[2] - bb[0], bb[3] - bb[1]],
                  'others': [a for a, _ in areas[1:]]}
    print(f'{name:10s} instances={len(areas)} kept={areas[0][0]}px box={meta[name]["box"]} others={meta[name]["others"]}')
json.dump(meta, open(os.path.join(OUT, 'poses.json'), 'w'), indent=1)
