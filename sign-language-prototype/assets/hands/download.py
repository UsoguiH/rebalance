#!/usr/bin/env python3
"""Download the hand assets used by the إشارتي prototype.

Run from this folder:  python3 download.py
Needs: python3, npm (for the SignWriting fonts) and `pip install fonttools`.
Every set keeps its own LICENSE file next to the files.
"""
import json, os, subprocess, tarfile, tempfile, urllib.error, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = 'https://raw.githubusercontent.com'

# slug, codepoint, name used by Fluent Emoji
GESTURES = [
    ('waving_hand', '1f44b', 'Waving hand'),
    ('raised_back_of_hand', '1f91a', 'Raised back of hand'),
    ('hand_fingers_splayed', '1f590', 'Hand with fingers splayed'),
    ('raised_hand', '270b', 'Raised hand'),
    ('vulcan_salute', '1f596', 'Vulcan salute'),
    ('rightwards_hand', '1faf1', 'Rightwards hand'),
    ('leftwards_hand', '1faf2', 'Leftwards hand'),
    ('palm_down_hand', '1faf3', 'Palm down hand'),
    ('palm_up_hand', '1faf4', 'Palm up hand'),
    ('ok_hand', '1f44c', 'Ok hand'),
    ('pinched_fingers', '1f90c', 'Pinched fingers'),
    ('pinching_hand', '1f90f', 'Pinching hand'),
    ('victory_hand', '270c', 'Victory hand'),
    ('crossed_fingers', '1f91e', 'Crossed fingers'),
    ('index_thumb_crossed', '1faf0', 'Hand with index finger and thumb crossed'),
    ('love_you_gesture', '1f91f', 'Love-you gesture'),
    ('sign_of_the_horns', '1f918', 'Sign of the horns'),
    ('call_me_hand', '1f919', 'Call me hand'),
    ('point_left', '1f448', 'Backhand index pointing left'),
    ('point_right', '1f449', 'Backhand index pointing right'),
    ('point_up_backhand', '1f446', 'Backhand index pointing up'),
    ('point_down', '1f447', 'Backhand index pointing down'),
    ('index_pointing_up', '261d', 'Index pointing up'),
    ('point_at_viewer', '1faf5', 'Index pointing at the viewer'),
    ('thumbs_up', '1f44d', 'Thumbs up'),
    ('thumbs_down', '1f44e', 'Thumbs down'),
    ('raised_fist', '270a', 'Raised fist'),
    ('oncoming_fist', '1f44a', 'Oncoming fist'),
    ('left_facing_fist', '1f91b', 'Left-facing fist'),
    ('right_facing_fist', '1f91c', 'Right-facing fist'),
    ('clapping_hands', '1f44f', 'Clapping hands'),
    ('raising_hands', '1f64c', 'Raising hands'),
    ('heart_hands', '1faf6', 'Heart hands'),
    ('open_hands', '1f450', 'Open hands'),
    ('palms_up_together', '1f932', 'Palms up together'),
    ('handshake', '1f91d', 'Handshake'),
    ('folded_hands', '1f64f', 'Folded hands'),
    ('writing_hand', '270d', 'Writing hand'),
]
TONES = ['Default', 'Light', 'Medium-Light', 'Medium', 'Medium-Dark', 'Dark']


def fetch(url):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'ishara-assets'}), timeout=60) as r:
            return r.read()
    except urllib.error.HTTPError:
        return None


def save(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as f:
        f.write(data)


def q(s):
    return urllib.parse.quote(s)


def fluent():
    base = f'{RAW}/microsoft/fluentui-emoji/main/assets'
    missing = []
    for slug, _, name in GESTURES:
        stem = name.lower().replace(' ', '_')
        for tone in TONES:
            data = fetch(f'{base}/{q(name)}/{tone}/3D/{stem}_3d_{tone.lower()}.png')
            if data is None and tone == 'Default':
                data = fetch(f'{base}/{q(name)}/3D/{stem}_3d.png')  # no skin tones
            if data is None:
                missing.append(f'3d/{tone}/{slug}')
                continue
            save(f'{HERE}/1-fluent-emoji-3d/{tone.lower()}/{slug}.png', data)
        svg = fetch(f'{base}/{q(name)}/Default/Flat/{stem}_flat_default.svg') or fetch(f'{base}/{q(name)}/Flat/{stem}_flat.svg')
        if svg:
            save(f'{HERE}/1-fluent-emoji-3d/flat-svg/{slug}.svg', svg)
        else:
            missing.append(f'flat/{slug}')
    save(f'{HERE}/1-fluent-emoji-3d/LICENSE', fetch(f'{RAW}/microsoft/fluentui-emoji/main/LICENSE'))
    return missing


def noto_animated():
    missing = []
    for slug, cp, _ in GESTURES:
        data = fetch(f'https://fonts.gstatic.com/s/e/notoemoji/latest/{cp}/lottie.json')
        if data is None:
            missing.append(slug)
            continue
        save(f'{HERE}/2-noto-animated-emoji/{slug}.json', data)
    save(f'{HERE}/2-noto-animated-emoji/LICENSE.txt', (
        'Noto Animated Emoji by Google, licensed under CC BY 4.0.\n'
        'https://googlefonts.github.io/noto-emoji-animation/\n'
        'https://creativecommons.org/licenses/by/4.0/\n'
        'Attribution: "Noto Emoji Animation" by Google, CC BY 4.0.\n').encode())
    return missing


def signwriting():
    from fontTools.ttLib import TTFont
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.boundsPen import BoundsPen
    tmp = tempfile.mkdtemp()
    subprocess.run(['npm', 'pack', '@sutton-signwriting/font-ttf', '--silent'], cwd=tmp, check=True, stdout=subprocess.DEVNULL)
    tgz = next(f for f in os.listdir(tmp) if f.endswith('.tgz'))
    with tarfile.open(os.path.join(tmp, tgz)) as t:
        t.extractall(tmp, filter='data')
    line = TTFont(os.path.join(tmp, 'package/font/SuttonSignWritingLine.ttf'))
    fill = TTFont(os.path.join(tmp, 'package/font/SuttonSignWritingFill.ttf'))
    lmap, fmap = line.getBestCmap(), fill.getBestCmap()
    lgs, fgs = line.getGlyphSet(), fill.getGlyphSet()
    out = f'{HERE}/3-signwriting-handshapes'
    count = 0
    # ISWA 2010 handshapes are bases 0x100-0x204. Fill 0, rotation 0 = right hand, palm facing the viewer.
    for b in range(0x100, 0x205):
        sid = 1 + (b - 256) * 96
        lname, fname = lmap.get(0xF0000 + sid), fmap.get(0x100000 + sid)
        if not lname:
            continue
        paths, bounds = [], None
        for gs, name, color in ((fgs, fname, '#ffffff'), (lgs, lname, '#1f2a2c')):
            if not name:
                continue
            pen, bp = SVGPathPen(gs), BoundsPen(gs)
            gs[name].draw(pen); gs[name].draw(bp)
            if bp.bounds:
                x0, y0, x1, y1 = bp.bounds
                bounds = bp.bounds if bounds is None else (min(bounds[0], x0), min(bounds[1], y0), max(bounds[2], x1), max(bounds[3], y1))
            paths.append(f'<path fill="{color}" d="{pen.getCommands()}"/>')
        if not bounds:
            continue
        x0, y0, x1, y1 = bounds
        pad = 20
        w, h = x1 - x0 + 2 * pad, y1 - y0 + 2 * pad
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}">'
               f'<g transform="translate({pad - x0:.0f} {y1 + pad:.0f}) scale(1 -1)">{"".join(paths)}</g></svg>')
        save(f'{out}/S{b:03x}00.svg', svg.encode())
        count += 1
    save(f'{out}/LICENSE', open(os.path.join(tmp, 'package/LICENSE'), 'rb').read())
    return count


def openmoji():
    missing = []
    for slug, cp, _ in GESTURES:
        for style in ('color', 'black'):
            data = fetch(f'{RAW}/hfg-gmuend/openmoji/master/{style}/svg/{cp.upper()}.svg')
            if data is None:
                missing.append(f'{style}/{slug}')
                continue
            save(f'{HERE}/4-openmoji/{style}/{slug}.svg', data)
    save(f'{HERE}/4-openmoji/LICENSE.txt', fetch(f'{RAW}/hfg-gmuend/openmoji/master/LICENSE.txt'))
    return missing


def mediapipe():
    base = 'https://storage.googleapis.com/mediapipe-models'
    for path, name in (('hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task', 'hand_landmarker.task'),
                       ('gesture_recognizer/gesture_recognizer/float16/latest/gesture_recognizer.task', 'gesture_recognizer.task')):
        save(f'{HERE}/5-mediapipe-hand-models/{name}', fetch(f'{base}/{path}'))
    save(f'{HERE}/5-mediapipe-hand-models/LICENSE', fetch(f'{RAW}/google-ai-edge/mediapipe/master/LICENSE'))


if __name__ == '__main__':
    report = {}
    print('1/5 Fluent Emoji 3D…'); report['fluent_missing'] = fluent()
    print('2/5 Noto Animated Emoji…'); report['noto_missing'] = noto_animated()
    print('3/5 SignWriting handshapes…'); report['signwriting_count'] = signwriting()
    print('4/5 OpenMoji…'); report['openmoji_missing'] = openmoji()
    print('5/5 MediaPipe hand models…'); mediapipe()
    print(json.dumps(report, indent=1, ensure_ascii=False))
