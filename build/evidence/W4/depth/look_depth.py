# W4's depth proof: the depth rows of a look gate, measured on the reference and on a render by this one code, and judged.
# For the element's face box (seeded from the analysis, as a dark-on-dark part is), along its centre column and row:
#   shadow:     darkness (ground minus the darkest pixel beside the face), blur width (the falloff from 90% to 10% of that
#               darkness, in px), offset x and y (half the difference of the shadow's reach on opposite sides)
#   bevel:      the light edge's and the dark edge's width (rows past 4 levels from the face) and contrast (their mean difference)
#   edge light: the lit top edge's brightness over the face (its peak in the first rows) and its width (rows at 60% of the peak)
# and the face and ground colours, so a flat render that matches every colour still fails on depth alone.
# python3 look_depth.py <reference.png> <render.png> <report.json> <commit>   -> exit 0 on pass, 1 on fail
import json, sys
from statistics import median
from PIL import Image

BOX = (120, 80, 360, 220)  # the card's face, from the analysis
TOL = {  # row: (absolute, relative to the reference); a row passes when |render - reference| <= max(absolute, relative * reference)
    'face': (4, 0), 'ground': (4, 0),
    'shadow.darkness': (4, 0.35), 'shadow.blur': (2, 0.4), 'shadow.offset_x': (2, 0), 'shadow.offset_y': (2, 0),
    'bevel.light_width': (1, 0), 'bevel.light_contrast': (4, 0.4), 'bevel.dark_width': (1, 0), 'bevel.dark_contrast': (4, 0.4),
    'edge_light.brightness': (6, 0.4), 'edge_light.width': (0, 0),  # a 1 px edge: a 1 px tolerance would pass its absence
}

def lum(px):
    r, g, b = px[:3]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def run_of(values, test):
    n = 0
    for v in values:
        if not test(v):
            break
        n += 1
    return n

def shadow_side(profile, peak):
    return run_of(profile, lambda v: v > 0.1 * peak) if peak >= 3 else 0

def measure(path):
    img = Image.open(path).convert('RGB')
    L = lambda x, y: lum(img.getpixel((x, y)))
    x0, y0, x1, y1 = BOX
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    face = median(L(x, y) for x in range(x0 + 20, x1 - 20, 7) for y in range(y0 + 20, y1 - 20, 7))
    ground = median(L(x, y) for x in range(5, 60, 5) for y in range(5, 40, 5))
    top = [L(cx, y0 + i) - face for i in range(16)]
    peak = max(top[:3])
    edge_w = run_of(top, lambda v: v >= 0.6 * peak) if peak > 8 else 0
    light = top[edge_w:]
    light_w = run_of(light, lambda v: v > 4)
    bottom = [face - L(cx, y1 - 1 - i) for i in range(16)]
    dark_w = run_of(bottom, lambda v: v > 4)
    below = [ground - L(cx, y1 + i) for i in range(60)]
    above = [ground - L(cx, y0 - 1 - i) for i in range(60)]
    right = [ground - L(x1 + i, cy) for i in range(60)]
    left = [ground - L(x0 - 1 - i, cy) for i in range(60)]
    dark = max(below + right)
    dark = dark if dark >= 3 else 0
    blur = 0
    if dark:
        at = below.index(max(below))
        i90 = next((i for i in range(at, 60) if below[i] < 0.9 * dark), at)
        i10 = next((i for i in range(at, 60) if below[i] < 0.1 * dark), 59)
        blur = i10 - i90
    return {
        'face': round(face, 1), 'ground': round(ground, 1),
        'shadow.darkness': round(dark, 1), 'shadow.blur': blur,
        'shadow.offset_x': (shadow_side(right, dark) - shadow_side(left, dark)) / 2,
        'shadow.offset_y': (shadow_side(below, dark) - shadow_side(above, dark)) / 2,
        'bevel.light_width': light_w, 'bevel.light_contrast': round(sum(light[:light_w]) / light_w, 1) if light_w else 0,
        'bevel.dark_width': dark_w, 'bevel.dark_contrast': round(sum(bottom[:dark_w]) / dark_w, 1) if dark_w else 0,
        'edge_light.brightness': round(peak, 1) if edge_w else 0, 'edge_light.width': edge_w,
    }

def main(ref_path, render_path, report_path, commit):
    ref, got = measure(ref_path), measure(render_path)
    rows = {}
    for row, (absolute, relative) in TOL.items():
        tol = max(absolute, relative * abs(ref[row]))
        rows[row] = {'reference': ref[row], 'render': got[row], 'tolerance': round(tol, 1), 'pass': abs(got[row] - ref[row]) <= tol}
    verdict = 'pass' if all(r['pass'] for r in rows.values()) else 'fail'
    report = {'reference': ref_path, 'render': render_path, 'commit': commit, 'verdict': verdict, 'measures': rows}
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
        f.write('\n')
    for row, r in rows.items():
        print(f"{'ok  ' if r['pass'] else 'FAIL'} {row}: reference {r['reference']}, render {r['render']}, tolerance {r['tolerance']}")
    print(f'verdict: {verdict}')
    return 0 if verdict == 'pass' else 1

if __name__ == '__main__':
    sys.exit(main(*sys.argv[1:5]))
