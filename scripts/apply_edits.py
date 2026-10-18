#!/usr/bin/env python3
"""Apply a text edit sent by the ChatGPT site editor.

Usage: python3 scripts/apply_edits.py <event.json>

The event is a GitHub repository_dispatch payload whose client_payload is:
  {"request_id": "...", "summary": "...", "dry_run": false,
   "edits": [{"file": "overview.html", "find": "exact current text", "replace": "new text"}]}

Each "find" must appear exactly once in its file. Edits are applied in order.
Only text in the allowed files can change; anything that adds scripts, styles,
embeds or external images is refused. Exit code 0 means the edit was applied.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ALLOWED_FILES = {'index.html', 'overview.html', 'legal.html', 'feasibility.html', 'auction.html', 'assets/feasibility.json', 'README.md'}
MAX_EDITS = 25
MAX_CHARS = 8000

# Markup an edit may not add. Text, links and existing elements are fine.
UNSAFE = [
    (r'<\s*(script|iframe|object|embed|style|link|meta|form|input|button|base|svg|video|audio|source|template)\b', 'adds a <{0}> element'),
    (r'\son\w+\s*=', 'adds an event handler attribute'),
    (r'(?:javascript|vbscript):|\bdata:\s*[a-z]+/', 'adds a script or data URL'),
    (r'\sstyle\s*=', 'adds inline styling (use the existing classes)'),
    (r'srcdoc\s*=', 'adds embedded content'),
    (r'\s(?:src|srcset|poster)\s*=\s*["\']?\s*(?:https?:)?//', 'adds an image or media file from another website'),
    (r'href\s*=\s*["\']?\s*http://', 'adds an insecure http:// link (use https://)'),
]


def refuse(message):
    print(f'NOT APPLIED: {message}')
    sys.exit(1)


def main():
    if len(sys.argv) != 2:
        refuse('usage: apply_edits.py <event.json>')
    event = json.load(open(sys.argv[1], encoding='utf-8'))
    payload = event.get('client_payload', event)
    summary = ' '.join(str(payload.get('summary', '')).split())
    edits = payload.get('edits')

    if not summary:
        refuse('the request has no "summary" describing the change.')
    if len(summary) > 200:
        refuse('the summary is longer than 200 characters.')
    if not isinstance(edits, list) or not edits:
        refuse('the request has no edits.')
    if len(edits) > MAX_EDITS:
        refuse(f'the request has {len(edits)} edits; send at most {MAX_EDITS} at a time.')

    contents = {}
    for n, edit in enumerate(edits, 1):
        if not isinstance(edit, dict):
            refuse(f'edit {n} is not an object with file, find and replace.')
        file = str(edit.get('file', '')).strip().lstrip('./')
        find = edit.get('find')
        replace = edit.get('replace')
        if file not in ALLOWED_FILES:
            refuse(f'edit {n} targets "{file}". Only {", ".join(sorted(ALLOWED_FILES))} can be edited.')
        if not isinstance(find, str) or not find:
            refuse(f'edit {n} has no "find" text.')
        if not isinstance(replace, str):
            refuse(f'edit {n} has no "replace" text (use "" to delete).')
        if len(find) > MAX_CHARS or len(replace) > MAX_CHARS:
            refuse(f'edit {n} is longer than {MAX_CHARS} characters; split it into smaller edits.')
        if find == replace:
            refuse(f'edit {n} does not change anything.')
        for pattern, what in UNSAFE:
            added = re.findall(pattern, replace, re.I)
            before = re.findall(pattern, find, re.I)
            if len(added) > len(before):
                tag = added[0] if isinstance(added[0], str) else added[0][0]
                refuse(f'edit {n} {what.format(tag)}. Only text and links can be changed this way.')

        if file not in contents:
            contents[file] = open(os.path.join(ROOT, file), encoding='utf-8').read()
        count = contents[file].count(find)
        if count == 0:
            refuse(f'edit {n}: the "find" text was not found in {file}. Read the file again; it may have changed.')
        if count > 1:
            refuse(f'edit {n}: the "find" text appears {count} times in {file}. Include more surrounding text so it matches once.')
        contents[file] = contents[file].replace(find, replace, 1)

    for file, text in contents.items():
        if file.endswith('.json'):
            try:
                json.loads(text)
            except json.JSONDecodeError as e:
                refuse(f'after the edits {file} is not valid JSON ({e.msg} on line {e.lineno}).')
        with open(os.path.join(ROOT, file), 'w', encoding='utf-8') as f:
            f.write(text)

    print(f'APPLIED: {len(edits)} edit(s) to {", ".join(sorted(contents))}: {summary}')

    # Commit message for the workflow (written only when it asks for one).
    msg_file = os.environ.get('COMMIT_MSG_FILE')
    if msg_file:
        request_id = re.sub(r'[^\w.:-]', '', str(payload.get('request_id', '')))[:80] or 'none'
        with open(msg_file, 'w', encoding='utf-8') as f:
            f.write(f'Site edit: {summary}\n\nRequest: {request_id}\nSent from the ChatGPT site editor.\n')


if __name__ == '__main__':
    main()
