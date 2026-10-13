"""Subset the Libron fonts to the characters Print Counter uses.

Run once after replacing the source fonts:
    python3 scripts/subset-fonts.py /path/to/Libron-woff2-or-ttf-dir

Writes fonts/ui/*.woff2 (embedded in the page) and fonts/pdf/*.ttf (embedded in quote/invoice PDFs).
Needs: pip install fonttools brotli
"""
import glob, os, sys
from fontTools import subset
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'src', 'assets', 'fonts')
UNICODES = ('U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+0160-0161,U+0178,U+017D-017E,U+02C6,U+02DC,'
            'U+2010-2027,U+2030-203A,U+2044,U+20AC,U+2116,U+2122,U+2190-2193,U+2212,U+2264-2265')

def run(src, out, flavor):
    opts = subset.Options()
    opts.flavor = flavor
    opts.layout_features = ['kern', 'liga', 'tnum', 'lnum', 'pnum', 'onum']
    opts.name_IDs = ['*']
    opts.name_languages = ['*']
    opts.notdef_outline = True
    opts.glyph_names = False
    font = TTFont(src)
    s = subset.Subsetter(opts)
    s.populate(unicodes=subset.parse_unicodes(UNICODES))
    s.subset(font)
    font.flavor = flavor
    font.save(out)
    print(os.path.relpath(out, HERE), os.path.getsize(out))

for f in sorted(glob.glob(os.path.join(SRC, 'Libron-*'))):
    name, ext = os.path.splitext(os.path.basename(f))
    if ext not in ('.woff2', '.ttf', '.otf'):
        continue
    run(f, os.path.join(HERE, 'fonts', 'ui', name + '.woff2'), 'woff2')
    if name in ('Libron-Regular', 'Libron-Bold'):
        run(f, os.path.join(HERE, 'fonts', 'pdf', name + '.ttf'), None)
