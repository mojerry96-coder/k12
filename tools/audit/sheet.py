# Contact sheet: python3 sheet.py OUT.jpg COLS WIDTH img1.png img2.png ...  (labels each tile)
import sys
from PIL import Image, ImageDraw
out, cols, tw = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
ims = [Image.open(p).convert('RGB') for p in sys.argv[4:]]
th = max(round(im.height * tw / im.width) for im in ims) + 18
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (tw + 8), rows * (th + 8)), (60, 60, 60))
for i, (p, im) in enumerate(zip(sys.argv[4:], ims)):
    t = im.resize((tw, round(im.height * tw / im.width)), Image.LANCZOS)
    x, y = (i % cols) * (tw + 8), (i // cols) * (th + 8)
    sheet.paste(t, (x, y + 18))
    ImageDraw.Draw(sheet).text((x + 4, y + 3), p.split('/')[-1][:70], fill=(255, 255, 0))
sheet.save(out, quality=88)
