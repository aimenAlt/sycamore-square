#!/usr/bin/env python3
"""Undo a change made by the ChatGPT site editor.

Usage: python3 scripts/undo_edit.py <event.json>

client_payload: {"request_id": "...", "target": "last" | "<commit sha>"}

"last" undoes the most recent site edit that has not already been undone.
Only commits whose subject starts with "Site edit:" can be undone this way;
the site owner can restore anything else from the GitHub history.
The undo is staged and committed as "Site undo: ..."; it is pushed only if the checks pass.
"""
import json
import re
import subprocess
import sys


def git(*args):
    return subprocess.run(['git', *args], check=True, capture_output=True, text=True).stdout


def refuse(message):
    print(f'NOT UNDONE: {message}')
    sys.exit(1)


def main():
    event = json.load(open(sys.argv[1], encoding='utf-8'))
    payload = event.get('client_payload', event)
    target = str(payload.get('target', 'last')).strip() or 'last'

    log = git('log', '-n', '300', '--format=%H%x1f%s%x1f%b%x1e', 'HEAD')
    commits = []
    for rec in log.split('\x1e'):
        rec = rec.strip('\n')
        if not rec:
            continue
        sha, subject, body = (rec.split('\x1f') + ['', ''])[:3]
        commits.append((sha, subject, body))
    reverted = set()
    for _, _, body in commits:
        reverted.update(re.findall(r'This reverts commit ([0-9a-f]{40})', body))

    chosen = None
    if target == 'last':
        for sha, subject, _ in commits:
            if subject.startswith('Site edit:') and sha not in reverted:
                chosen = (sha, subject)
                break
        if not chosen:
            refuse('there is no site edit left to undo.')
    else:
        if not re.fullmatch(r'[0-9a-f]{7,40}', target):
            refuse(f'"{target}" is not a version id.')
        for sha, subject, _ in commits:
            if sha.startswith(target):
                if not subject.startswith('Site edit:'):
                    refuse('that version was not made by the site editor; ask the site owner to restore it.')
                if sha in reverted:
                    refuse('that change has already been undone.')
                chosen = (sha, subject)
                break
        if not chosen:
            refuse(f'no recent site edit has the version id {target}.')

    sha, subject = chosen
    try:
        git('revert', '--no-commit', sha)
    except subprocess.CalledProcessError:
        subprocess.run(['git', 'revert', '--abort'], capture_output=True)
        refuse('later changes touched the same text, so this edit cannot be undone on its own. Ask the site owner.')
    what = subject[len('Site edit:'):].strip()
    git('commit', '-m', f'Site undo: {what}', '-m', f'This reverts commit {sha}.')
    print(f'UNDONE: {what} (version {sha[:7]})')


if __name__ == '__main__':
    main()
