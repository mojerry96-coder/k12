"""Makes a seamless loop from part of a Fitila clip: frames A→B (wrapping through the clip's end, since
each clip starts and ends on the same pose) played forwards then backwards. Used to keep only the
stretch where her beak stays closed.
usage: python3 tools/pingpong.py RAW.mp4 OUT.mp4 A B"""
import subprocess, sys, tempfile, os, shutil

src, dst, a, b = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
tmp = tempfile.mkdtemp()
subprocess.run(['ffmpeg', '-v', 'error', '-i', src, os.path.join(tmp, 'f_%04d.png')], check=True)
n = len(os.listdir(tmp))  # frames 0 … n-1; the last matches the first
seq = list(range(a, b + 1)) if a <= b else list(range(a, n)) + list(range(1, b + 1))
seq = seq + seq[-2:0:-1]
rest = n - 1 if n - 1 in seq else 0 # start on the resting pose so the poster and placement match the design
if rest in seq: i = seq.index(rest); seq = seq[i:] + seq[:i]
out = os.path.join(tmp, 'seq'); os.mkdir(out)
for i, k in enumerate(seq): os.link(os.path.join(tmp, f'f_{k + 1:04d}.png'), os.path.join(out, f's_{i:04d}.png'))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '24', '-i', os.path.join(out, 's_%04d.png'),
                '-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv420p', dst], check=True)
shutil.rmtree(tmp)
print(f'{os.path.basename(dst)}: frames {a}→{b}, {len(seq)} frames ({len(seq) / 24:.2f}s)')
