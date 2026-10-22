import sys, os, glob
from PIL import Image, ImageDraw
out, refdir, only = sys.argv[1], sys.argv[2], [int(x) for x in sys.argv[3].split(',')]
refs = {int(os.path.splitext(f)[0].rsplit('-', 1)[1]): f for f in os.listdir(refdir) if f[-6:-4].strip('-').isdigit()}
for n in only:
    r = Image.open(os.path.join(refdir, refs[n])).convert('RGB').resize((1672, 941))
    b = Image.open(os.path.join(out, f'build_{n:02d}.png')).convert('RGB')
    pair = Image.new('RGB', (1672, 941 * 2 + 12), (60, 60, 60))
    pair.paste(r, (0, 0)); pair.paste(b, (0, 953))
    d = ImageDraw.Draw(pair); d.text((8, 8), f'REFERENCE {n}', fill=(255, 0, 0)); d.text((8, 961), f'BUILD {n}', fill=(255, 0, 0))
    pair.resize((1100, int((941 * 2 + 12) * 1100 / 1672))).save(os.path.join(out, f'pair_{n:02d}.jpg'), quality=85)
print('pairs written to', out)
