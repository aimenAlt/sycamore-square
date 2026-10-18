#!/usr/bin/env python3
"""Write the plain-English result of a site edit or undo for the "Site update log" issue.

Reads step outcomes from the environment and logs from $RUNNER_TEMP, prints Markdown to stdout.
The ChatGPT site editor reads these comments to tell the person what happened.
"""
import os
import re
import subprocess

SITE = 'https://aimenalt.github.io/sycamore-square/'
temp = os.environ.get('RUNNER_TEMP', '/tmp')
env = os.environ.get


def read(name):
    path = os.path.join(temp, name)
    return open(path, encoding='utf-8', errors='replace').read() if os.path.exists(path) else ''


def problems():
    lines = []
    for name in ('apply.log', 'htmlvalidate.log', 'check.log', 'browser.log', 'publish.log'):
        for line in read(name).splitlines():
            line = line.strip()
            if not line or line.startswith('::'):
                continue
            if line.startswith(('NOT APPLIED', 'NOT UNDONE', 'FAIL', 'error', '!', 'fatal', 'rejected')) or ' error ' in line:
                lines.append(re.sub(r'\s+', ' ', line)[:300])
    return lines[:15]


action = env('EVENT_ACTION', 'site-edit')
request_id = re.sub(r'[^\w.:-]', '', env('REQUEST_ID') or '')[:80] or 'none'
dry_run = (env('DRY_RUN') or '').lower() == 'true'
change_ok = 'success' in (env('APPLY_OUTCOME', ''), env('UNDO_OUTCOME', ''))
checks_ok = all(env(k) == 'success' for k in ('HTML_OUTCOME', 'CONTENT_OUTCOME', 'BROWSER_OUTCOME'))
published = env('PUBLISH_OUTCOME') == 'success' and not dry_run

head = subprocess.run(['git', 'log', '-1', '--format=%H%x1f%s'], capture_output=True, text=True).stdout.strip().split('\x1f')
sha, subject = (head + ['', ''])[:2]
what = re.sub(r'^Site (edit|undo):\s*', '', subject) if change_ok else ''
kind = 'Undo' if action == 'site-undo' else 'Change'

if published:
    result = f'PUBLISHED. Live in about 2 minutes at {SITE}'
elif dry_run and change_ok and checks_ok:
    result = 'TEST RUN PASSED. Nothing was published.'
elif not change_ok:
    result = 'NOT PUBLISHED. The change could not be applied.'
elif not checks_ok:
    result = 'NOT PUBLISHED. The change failed the site checks, so the live site is unchanged.'
else:
    result = 'NOT PUBLISHED. Publishing failed; the live site is unchanged. Try again in a minute.'

out = [f'**Request:** `{request_id}`', f'**Type:** {kind}', f'**Result:** {result}']
if what:
    out.append(f'**What:** {what}')
if published and sha:
    if action == 'site-undo':
        out.append(f'**Version:** `{sha[:7]}` (the earlier wording is back)')
    else:
        out.append(f'**Version:** `{sha[:7]}` (to reverse it, ask the site editor to undo version `{sha[:7]}`)')
issues = problems()
if issues and not published:
    out.append('**Problems:**')
    out += [f'- {p}' for p in issues]
run = f"{env('GITHUB_SERVER_URL', 'https://github.com')}/{env('GITHUB_REPOSITORY', '')}/actions/runs/{env('GITHUB_RUN_ID', '')}"
out.append(f'[Run details]({run})')
print('\n\n'.join(out))
