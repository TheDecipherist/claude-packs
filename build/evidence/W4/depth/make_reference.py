# The reference for W4's depth proof: a mock-up of one raised card on a mid-grey ground, drawn as a designer's picture is,
# with a drop shadow (offset 0, 6; Gaussian blur), a bevel (a light top edge, a dark bottom edge) and a 1 px lit top edge.
# python3 make_reference.py <out.png>
import sys
from PIL import Image, ImageDraw, ImageFilter

W, H = 480, 320
GROUND = (128, 132, 140)
FACE = (180, 186, 196)
BOX = (120, 80, 360, 220)  # the card's face: x0, y0, x1, y1 (x1, y1 exclusive)

img = Image.new('RGB', (W, H), GROUND)
shadow = Image.new('L', (W, H), 0)
x0, y0, x1, y1 = BOX
ImageDraw.Draw(shadow).rectangle((x0, y0 + 6, x1 - 1, y1 - 1 + 6), fill=120)
shadow = shadow.filter(ImageFilter.GaussianBlur(5))
img.paste((20, 22, 28), (0, 0), shadow)
d = ImageDraw.Draw(img)
d.rectangle((x0, y0, x1 - 1, y1 - 1), fill=FACE)
for i in range(3):  # the light bevel under the lit edge
    d.line((x0, y0 + 1 + i, x1 - 1, y0 + 1 + i), fill=(206, 212, 222))
for i in range(4):  # the dark bevel
    d.line((x0, y1 - 1 - i, x1 - 1, y1 - 1 - i), fill=(142, 147, 156))
d.line((x0, y0, x1 - 1, y0), fill=(246, 248, 252))  # the lit edge
img.save(sys.argv[1])
