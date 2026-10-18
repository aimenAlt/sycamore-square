#!/usr/bin/env python3
"""Content, link and privacy checks for the Sycamore Square site.

Run from anywhere:   python3 scripts/check_site.py
Rebuild the PDF ZIP: python3 scripts/check_site.py --rebuild-zip

Exit code 0 means every check passed. Standard library only, plus two outside tools for the text inside
PDFs and images (the naming and privacy rules apply there too):
  - PDF text:   pdftotext and pdfimages (poppler-utils), or the PyMuPDF package if it is installed.
  - Image text: tesseract, or on a Mac without it, macOS Vision through scripts/ocr_macos.swift.
The Site checks workflow installs poppler-utils and tesseract-ocr.
"""
import glob
import hashlib
import html.parser
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from urllib.parse import unquote, urlsplit

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_ZIP = 'docs/Sycamore_Square_All_PDFs_R4.3.zip'
ZIP_FOLDER = 'Sycamore_Square_PDFs_R4.3'
SCENARIO_HASHES = {'worst', 'realistic', 'average', 'best'}
MAX_FILE_MB = 25

# Each rule: (pattern, flags, what is wrong and what to do instead).
BANNED = [
    (r'\bAimen\b|\bAltaiyeb\b', re.I, 'A personal name. Leave buyer, seller and family names off the site.'),
    (r'\bpurchase price\s*(?:of|is|was|at|:|=)\s*\$(?!3\.0M\b)', re.I, 'A purchase price other than the study\'s assumed $3.0M. Write "an assumed price of $3.0M".'),
    (r'\$\s?\d[\d,.]*\s?(?:m|mm|million|k)?\s+(?:purchase|acquisition|offer|bid)\b', re.I, 'A purchase, offer or bid amount. Leave it off the site.'),
    (r'\b(?:offer|bid|asking)\s+(?:price|amount)\s*(?:of|is|:)?\s*\$', re.I, 'An offer, bid or asking amount. Leave it off the site.'),
    (r'\b(?:maximum|max|walk[- ]away)\s+(?:bid|price)\b', re.I, 'A maximum or walk-away price. Leave it off the site.'),
    (r'transaction fee|buyer.?s premium|\b\d+(?:\.\d+)?%\s+(?:transaction|buyer)', re.I, 'An auction fee or transaction term. Leave it off the site.'),
    (r'planning input\s*\(\$', re.I, 'A planning price. Leave it off the site.'),
    (r'\bfamily[- ](?:business|investment|owned|run)\b|\bfamily\s+(?:owns|runs|operates|invests)\b|\b(?:the|our|my) family\b(?!\s+(?:suite|zone|and child|-friendly))',
     re.I, 'A reference to a family owning or running the project. The buyer is a group of investors: write "the buying group".'),
    (r"\bladies\b|\bwomen\b|\bmen'?s\b|\bmen and women\b|\bfemale\b|\bbrides?\b|\bgrooms?\b|\bmothers?\b", re.I,
     'Gendered hall wording. Use "Hall A" and "Hall B", and "family suites".'),
    (r'\bIRR\b', 0, 'Finance jargon ("IRR"). Use plain words such as "years to earn back".'),
    (r'yield on cost|cap rate', re.I, 'Finance jargon. Use plain words such as "profit each year" or "years to earn back".'),
    (r'broker edge|\bAvison\b|\$6\.5', re.I, 'Wording the owner removed in R4.3.'),
    (r'\{\{|\}\}|\[NAME|\[ADD LINKS|lorem ipsum', re.I, 'Leftover placeholder text.'),
    (r'gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|\bsk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}', 0,
     'Something that looks like a secret key. Never commit keys.'),
    (r'[\w.+-]+@[\w-]+\.(?:com|net|org|gov|edu|io|us)\b', re.I, 'An email address. Keep contact details off the public site.'),
]

# The rules that also apply to text inside PDFs, images, CAD and 3D files: hall naming and privacy.
BINARY_RULES = [r for r in BANNED if r[2].startswith(('Gendered', 'A personal name', 'An email', 'Something that looks like a secret'))]
EXCEPTIONS_FILE = 'scripts/text_exceptions.json'
IMAGE_EXT = ('.jpg', '.jpeg', '.png', '.webp')

problems = []
notes = []


def rel(path):
    return os.path.relpath(path, ROOT)


def fail(path, line, message):
    problems.append((rel(path) if os.path.isabs(path) else path, line, message))


def line_of(text, offset):
    return text.count('\n', 0, offset) + 1


class PageParser(html.parser.HTMLParser):
    """Collects ids, local references, images and figure captions."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.refs = []      # (line, url)
        self.imgs = []      # dicts
        self.figures = []   # stack of {'imgs': [], 'caption': ''}
        self.in_caption = 0
        self.robots = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        line = self.getpos()[0]
        if 'id' in a:
            self.ids.add(a['id'])
        if tag == 'meta' and a.get('name') == 'robots':
            self.robots = a.get('content', '')
        for key in ('href', 'src', 'poster'):
            if a.get(key):
                self.refs.append((line, a[key]))
        if a.get('srcset'):
            for part in a['srcset'].split(','):
                if part.strip():
                    self.refs.append((line, part.strip().split()[0]))
        if tag == 'figure':
            self.figures.append({'imgs': [], 'caption': ''})
        if tag == 'figcaption':
            self.in_caption += 1
        if tag == 'img':
            img = {'line': line, 'attrs': a, 'figure': self.figures[-1] if self.figures else None}
            self.imgs.append(img)
            if self.figures:
                self.figures[-1]['imgs'].append(img)

    def handle_endtag(self, tag):
        if tag == 'figcaption' and self.in_caption:
            self.in_caption -= 1
        if tag == 'figure' and self.figures:
            self.figures.pop()

    def handle_data(self, data):
        if self.in_caption and self.figures:
            self.figures[-1]['caption'] += data


def check_text_rules(path):
    text = open(path, encoding='utf-8').read()
    for pattern, flags, message in BANNED:
        for m in re.finditer(pattern, text, flags):
            fail(path, line_of(text, m.start()), f'{message} Found: "{m.group(0)}"')
    return text


def check_pages():
    pages = sorted(glob.glob(os.path.join(ROOT, '*.html')))
    parsed = {}
    for path in pages:
        text = check_text_rules(path)
        p = PageParser()
        p.feed(text)
        parsed[os.path.basename(path)] = (path, text, p)
        if p.robots != 'noindex,nofollow':
            fail(path, 1, 'Every page needs <meta name="robots" content="noindex,nofollow">.')

    for name, (path, text, p) in parsed.items():
        for line, url in p.refs:
            parts = urlsplit(url)
            if parts.scheme in ('mailto', 'tel', 'data', 'javascript'):
                if parts.scheme in ('data', 'javascript'):
                    fail(path, line, f'"{parts.scheme}:" links are not allowed: {url[:60]}')
                continue
            if parts.scheme == 'http':
                fail(path, line, f'Use https, not http: {url}')
                continue
            if parts.scheme or parts.netloc:
                continue  # external https link; checked by hand, not here
            target = unquote(parts.path) or name
            if parts.path:
                full = os.path.normpath(os.path.join(ROOT, target))
                if not full.startswith(ROOT) or not os.path.isfile(full):
                    fail(path, line, f'Links to a file that does not exist: {url}')
                    continue
            if parts.fragment:
                tname = os.path.basename(target)
                ids = parsed[tname][2].ids if tname in parsed else None
                if ids is not None and parts.fragment not in ids and parts.fragment not in SCENARIO_HASHES:
                    fail(path, line, f'Links to #{parts.fragment}, but {tname} has no element with that id.')

        for img in p.imgs:
            a = img['attrs']
            src = a.get('src', '') + ' ' + a.get('srcset', '')
            hidden = a.get('aria-hidden') == 'true' or a.get('role') == 'presentation'
            if not hidden and not (a.get('alt') or '').strip():
                fail(path, img['line'], f'Image needs alt text describing it: {a.get("src", "")}')
            if not a.get('width') or not a.get('height'):
                fail(path, img['line'], f'Image needs width and height attributes: {a.get("src", "")}')
            if 'photoreal/' in src or 'hero-aerial' in src:
                caption = img['figure']['caption'] if img['figure'] else ''
                if 'ai-generated' not in caption.lower():
                    fail(path, img['line'], 'AI-generated image without the "AI-generated concept image" label in its caption.')

    # Every PDF in docs/ has a Documents card in the library on overview.html.
    index_text = parsed.get('overview.html', (None, '', None))[1]
    docs_start = index_text.find('id="documents"')
    docs_section = index_text[docs_start:index_text.find('</section>', docs_start)] if docs_start >= 0 else ''
    for pdf in sorted(glob.glob(os.path.join(ROOT, 'docs', '*.pdf'))):
        href = 'docs/' + os.path.basename(pdf)
        n = docs_section.count(f'href="{href}"')
        if n == 0:
            fail('overview.html', 1, f'{href} has no card in the Documents section.')
    return parsed


def check_zip():
    zpath = os.path.join(ROOT, PDF_ZIP)
    pdfs = sorted(os.path.basename(p) for p in glob.glob(os.path.join(ROOT, 'docs', '*.pdf')))
    if not os.path.isfile(zpath):
        fail(PDF_ZIP, 1, 'The all-PDFs ZIP is missing. Run: python3 scripts/check_site.py --rebuild-zip')
        return
    with zipfile.ZipFile(zpath) as z:
        inside = {os.path.basename(n): z.read(n) for n in z.namelist() if n.lower().endswith('.pdf')}
    for name in pdfs:
        data = open(os.path.join(ROOT, 'docs', name), 'rb').read()
        if inside.get(name) != data:
            fail(PDF_ZIP, 1, f'{name} is missing from the ZIP or out of date. Run: python3 scripts/check_site.py --rebuild-zip')
    for name in sorted(set(inside) - set(pdfs)):
        fail(PDF_ZIP, 1, f'The ZIP has {name}, which is no longer in docs/. Run: python3 scripts/check_site.py --rebuild-zip')


def rebuild_zip():
    zpath = os.path.join(ROOT, PDF_ZIP)
    pdfs = sorted(glob.glob(os.path.join(ROOT, 'docs', '*.pdf')))
    with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
        for pdf in pdfs:
            info = zipfile.ZipInfo(f'{ZIP_FOLDER}/{os.path.basename(pdf)}', date_time=(2026, 10, 18, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, open(pdf, 'rb').read())
    print(f'Rebuilt {PDF_ZIP} with {len(pdfs)} PDFs.')


def check_other_files():
    for pattern in ('assets/js/*.js', 'assets/*.json', 'README.md'):
        for path in sorted(glob.glob(os.path.join(ROOT, pattern))):
            check_text_rules(path)

    feas = os.path.join(ROOT, 'assets', 'feasibility.json')
    try:
        data = json.load(open(feas, encoding='utf-8'))
        if data.get('schema') != 2:
            fail(feas, 1, 'assets/feasibility.json must keep "schema": 2.')
        if not data.get('as_of'):
            fail(feas, 1, 'assets/feasibility.json needs an "as_of" date.')
    except json.JSONDecodeError as e:
        fail(feas, e.lineno, f'assets/feasibility.json is not valid JSON: {e.msg}')

    robots = os.path.join(ROOT, 'robots.txt')
    if not os.path.isfile(robots) or open(robots).read() != 'User-agent: *\nDisallow: /\n':
        fail(robots, 1, 'robots.txt must stay exactly "User-agent: *" / "Disallow: /".')

    for folder in ('assets', 'docs'):
        for dirpath, _, files in os.walk(os.path.join(ROOT, folder)):
            for f in files:
                full = os.path.join(dirpath, f)
                if os.path.getsize(full) > MAX_FILE_MB * 1e6:
                    fail(full, 1, f'File is larger than {MAX_FILE_MB} MB; make a smaller web version.')


def sha256(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


def load_exceptions():
    path = os.path.join(ROOT, EXCEPTIONS_FILE)
    if not os.path.isfile(path):
        return []
    return json.load(open(path, encoding='utf-8')).get('exceptions', [])


TILE = 2000      # OCR tile size in pixels; drawings carry small print that whole-page OCR downsamples away
OVERLAP = 250


def tiles(width, height):
    """Yields (x, y, w, h) tiles that cover a width x height image with some overlap."""
    step = TILE - OVERLAP
    for y in range(0, max(height - OVERLAP, 1), step):
        for x in range(0, max(width - OVERLAP, 1), step):
            yield x, y, min(TILE, width - x), min(TILE, height - y)


def pdf_text_and_images(path, tmp):
    """Returns (text, [image tiles]) for one PDF: its text layer, and every page that contains pictures, rendered and
    cut into overlapping tiles for OCR. Whole pages are rendered rather than the embedded pictures pulled out, because
    scans are often stored as thin strips that cut lines of text in half. At most 300 dpi, long side near 7,000 px."""
    prefix = os.path.join(tmp, hashlib.md5(path.encode()).hexdigest())
    if all(shutil.which(c) for c in ('pdftotext', 'pdfimages', 'pdftoppm', 'pdfinfo')):
        text = subprocess.run(['pdftotext', '-enc', 'UTF-8', path, '-'], capture_output=True, text=True, check=True).stdout
        listing = subprocess.run(['pdfimages', '-list', path], capture_output=True, text=True, check=True).stdout.splitlines()[2:]
        pages = sorted({int(line.split()[0]) for line in listing if line.split()})
        info = subprocess.run(['pdfinfo', '-f', '1', '-l', '9999', path], capture_output=True, text=True, check=True).stdout
        sizes = {int(m.group(1)): (float(m.group(2)), float(m.group(3)), int(m.group(4) or 0))
                 for m in re.finditer(r'Page\s+(\d+) size:\s+([\d.]+) x ([\d.]+)[^\n]*\n(?:Page\s+\d+ rot:\s+(\d+))?', info)}
        images = []
        for n in pages:
            w_pt, h_pt, rot = sizes.get(n, (612, 792, 0))
            if rot in (90, 270):
                w_pt, h_pt = h_pt, w_pt
            dpi = int(min(300, 7000 / (max(w_pt, h_pt) / 72)))
            width, height = int(w_pt / 72 * dpi), int(h_pt / 72 * dpi)
            for k, (x, y, w, h) in enumerate(tiles(width, height)):
                out = f'{prefix}-p{n}-t{k}'
                subprocess.run(['pdftoppm', '-r', str(dpi), '-f', str(n), '-l', str(n), '-x', str(x), '-y', str(y),
                                '-W', str(w), '-H', str(h), '-singlefile', '-png', path, out], check=True)
                images.append(out + '.png')
        return text, images
    try:
        import fitz  # PyMuPDF
    except ImportError:
        return None, []
    doc, text, images = fitz.open(path), [], []
    for i, page in enumerate(doc):
        text.append(page.get_text())
        if not page.get_images():
            continue
        r = page.rect   # already rotated
        dpi = int(min(300, 7000 / (max(r.width, r.height) / 72)))
        scale = dpi / 72
        for k, (x, y, w, h) in enumerate(tiles(int(r.width * scale), int(r.height * scale))):
            out = f'{prefix}-p{i + 1}-t{k}.png'
            clip = fitz.Rect(x / scale, y / scale, (x + w) / scale, (y + h) / scale) * page.derotation_matrix
            page.get_pixmap(dpi=dpi, clip=clip).save(out)
            images.append(out)
    return '\n'.join(text), images


def ocr(paths):
    """Returns {path: text found in the image}, or None when no OCR tool is available."""
    if not paths:
        return {}
    if shutil.which('tesseract'):
        found = {}
        for p in paths:
            r = subprocess.run(['tesseract', p, 'stdout', '--psm', '11', '-l', 'eng'], capture_output=True, text=True)
            found[p] = r.stdout
        return found
    if sys.platform == 'darwin' and shutil.which('swift'):
        r = subprocess.run(['swift', os.path.join(ROOT, 'scripts', 'ocr_macos.swift')] + list(paths), capture_output=True, text=True)
        found, current = {}, None
        for line in r.stdout.splitlines():
            if line.startswith('=== '):
                current = line[4:]
                found[current] = ''
            elif current:
                found[current] += line + '\n'
        return found
    return None


def check_binary_text():
    """Applies the naming and privacy rules to text inside PDFs, images, CAD and 3D model files."""
    exceptions = load_exceptions()
    used, seen, known = set(), set(), {}

    def apply(label, full, text):
        for pattern, flags, message in BINARY_RULES:
            for m in re.finditer(pattern, text, flags):
                hit = m.group(0)
                if (label, hit.lower()) in seen:
                    continue
                seen.add((label, hit.lower()))
                for i, ex in enumerate(exceptions):
                    if ex['file'] == label and ex['sha256'] == sha256(full) and any(w.lower() in hit.lower() for w in ex['words']):
                        used.add(i)
                        known.setdefault(label, (set(), ex['reason']))[0].add(hit.lower())
                        break
                else:
                    fail(label, 1, f'{message} Found inside the file: "{hit}"')

    with tempfile.TemporaryDirectory() as tmp:
        to_ocr = {}   # image file -> (label, the file whose hash the exceptions pin)
        for pdf in sorted(glob.glob(os.path.join(ROOT, 'docs', '*.pdf'))):
            label = rel(pdf)
            text, images = pdf_text_and_images(pdf, tmp)
            if text is None:
                fail(label, 1, 'Cannot read PDF text. Install poppler-utils (pdftotext) or PyMuPDF, then run the checks again.')
                break
            apply(label, pdf, text)
            for img in images:
                to_ocr[img] = (label + ' (picture inside)', pdf)
        for dirpath, _, files in os.walk(os.path.join(ROOT, 'assets', 'img')):
            # assets/img/docs holds small covers of the PDFs above, whose real text is already checked;
            # OCR of their tiny print only produces misreads.
            if os.path.normpath(dirpath) == os.path.join(ROOT, 'assets', 'img', 'docs'):
                continue
            for f in sorted(files):
                full = os.path.join(dirpath, f)
                if f.lower().endswith(IMAGE_EXT):
                    to_ocr[full] = (rel(full), full)
                elif f.lower().endswith('.svg'):
                    apply(rel(full), full, open(full, encoding='utf-8', errors='replace').read())
        for full in sorted(glob.glob(os.path.join(ROOT, 'docs', '*.dxf'))):
            apply(rel(full), full, open(full, encoding='utf-8', errors='replace').read())
        for full in sorted(glob.glob(os.path.join(ROOT, 'assets', 'models', '*.glb'))):
            data = open(full, 'rb').read()
            size = int.from_bytes(data[12:16], 'little')
            apply(rel(full), full, data[20:20 + size].decode('utf-8', errors='replace'))

        found = ocr(sorted(to_ocr))
        if found is None:
            fail('assets/img', 1, 'Cannot read text in images. Install tesseract (apt install tesseract-ocr, or brew install tesseract), then run the checks again.')
        else:
            for img, (label, pinned) in sorted(to_ocr.items()):
                apply(label.replace(' (picture inside)', ''), pinned, found.get(img, ''))

    for label, (hits, reason) in sorted(known.items()):
        notes.append(f'{label}: known exception ({", ".join(sorted(hits))}). {reason}')
    for i, ex in enumerate(exceptions):
        full = os.path.join(ROOT, ex['file'])
        if not os.path.isfile(full) or sha256(full) != ex['sha256']:
            fail(EXCEPTIONS_FILE, 1, f'The exception for {ex["file"]} no longer matches that file. If the file was fixed, remove the exception.')
        elif i not in used and found is not None:
            notes.append(f'{ex["file"]}: the text this exception allows was not found by this OCR tool; the exception stays until the file changes.')


def main():
    if '--rebuild-zip' in sys.argv:
        rebuild_zip()
    parsed = check_pages()
    check_zip()
    check_other_files()
    if '--no-binary' not in sys.argv:
        check_binary_text()
    print(f'Sycamore Square site checks: {len(parsed)} pages')
    for note in notes:
        print(f'NOTE  {note}')
    if problems:
        for path, line, message in problems:
            print(f'FAIL  {path}:{line}  {message}')
            if os.environ.get('GITHUB_ACTIONS'):
                print(f'::error file={path},line={line}::{message}')
        print(f'{len(problems)} problem(s) found. Nothing was published.' if os.environ.get('SITE_EDIT') else f'{len(problems)} problem(s) found.')
        sys.exit(1)
    print('All checks passed.')


if __name__ == '__main__':
    main()
