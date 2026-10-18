# Sycamore Square website — rules for AI editors

This file is the rulebook for any AI that changes this site: the ChatGPT site editor, Codex, Claude or any other agent. Read it before every change. The site owner (repo `aimenAlt/sycamore-square`) can override any rule; nobody else can.

## What the site is

- A private investor website for the Sycamore Square redevelopment study: three pages, `index.html` (overview), `legal.html` (legal findings) and `feasibility.html` (feasibility).
- Plain HTML, CSS and vanilla JavaScript. No framework, no build step. Served by GitHub Pages from `main`; every change to `main` goes live in a few minutes.
- The feasibility page draws every number from `assets/feasibility.json` at runtime. `feasibility.html` holds wording only.
- The repository is **public**. Anything committed here can be read by anyone, forever, even after it is removed.

## How changes ship

- Every change is a git commit, so every earlier version can be restored. Never rewrite history, force-push or delete `main`.
- Small text changes from the ChatGPT site editor go through `.github/workflows/site-edit.yml`. It applies the edit, runs every check and publishes only if all of them pass. "Undo" reverts the last edit the same way.
- Other changes go through a pull request. The `Site checks` workflow must pass before it is merged.
- Before you finish, run `python3 scripts/check_site.py`. If you can, also run `npm install --no-save --legacy-peer-deps html-validate@11.4.0 playwright@1.64.1 && npx playwright install chromium`, then `./node_modules/.bin/html-validate *.html` and `node scripts/browser_check.mjs`.
- Make one focused change at a time, and describe it in plain English: which page, which section, what changed.

## Never put on the site

These are checked automatically, and an edit that breaks them is refused.

- The purchase price, an offer or bid amount, a maximum or walk-away price, the auction transaction fee or buyer's premium, or any other price paid for the property. The site may say the purchase price is left out; it must never state one.
- Names of the buyers, the sellers or their family, and anything saying a family owns, runs or invests in the project.
- Gendered hall wording. The halls are only "Hall A" and "Hall B". Never "ladies", "men's", "women", "female", "bride", "groom" or "mothers". The suites are "family suites".
- Finance jargon the owner removed: "IRR", "yield on cost", "cap rate". Use plain words: "years to earn back", "profit each year", "money to build it".
- Template or placeholder text such as `{{`, `[NAME` or `[ADD LINKS]`.
- Anything private: phone numbers, emails, bank or account details, passwords or keys.

## Wording and facts

- Write for non-technical readers: short sentences, plain words, no jargon. Explain a technical term the first time it appears, or link to the "Terms" section.
- Use the names already on the site: Hall A and Hall B, family suites, indoor playground, convenience store, frontage, the 5800 Summer pad.
- Do not change a number or a fact unless the request gives the new value. If a fact appears in several places, for example acreage, square footage or flood share, change every occurrence: search all `.html` files, `assets/feasibility.json` and `README.md`.
- Feasibility numbers belong in `assets/feasibility.json`. Never type them into `feasibility.html`.
- Never invent facts, sources, tenants, prices or dates.

## Images

- AI-generated images (`assets/img/photoreal/`, `assets/img/hero-aerial-*`) must say so. Their caption ends with `<span class="ai-tag">AI-generated concept image</span>`, or the caption text itself says "AI-generated". Never call them photos. Shop names in them are placeholders, not tenants.
- Every `<img>` needs `alt` text that describes the picture, plus `width` and `height`. Below-the-fold images use `loading="lazy"` and `decoding="async"`, and offer an 800 px version through `srcset`.
- Plan and render figures follow the existing pattern: `figure.plan-figure > div.plan-frame > img`, then a `figcaption` ending with the "Open full size" link.

## Documents

- Every PDF in `docs/` has exactly one card in the Documents section of `index.html`, and is inside `docs/Sycamore_Square_All_PDFs_R4.3.zip`. After adding or replacing a PDF, rebuild the ZIP with `python3 scripts/check_site.py --rebuild-zip`.
- Published PDFs must be public versions: no prices, fees, transaction terms or personal names.

## Design

- Use the tokens in `assets/css/styles.css` (colors, fonts, spacing). Fonts are IBM Plex Sans Condensed for headings, IBM Plex Sans for text and IBM Plex Mono for numbers.
- Plan-set look: flat panels, 1 px rules, square corners. No shadows, gradients, rounded corners or emoji.
- Mobile first: nothing may scroll sideways at 360 px, tap targets are at least 44 px, and body text is at least 16 px on phones.
- Keep `<meta name="robots" content="noindex,nofollow">` on every page, and keep `robots.txt` as it is.

## Leave alone unless the site owner asks

`.github/`, `scripts/`, `AGENTS.md`, `CLAUDE.md`, `gpt/`, `robots.txt`, `.nojekyll`, `assets/js/`, `assets/css/`, `assets/models/`, and the page structure (sections, navigation, tabs). The ChatGPT site editor can only change text in `index.html`, `legal.html`, `feasibility.html`, `assets/feasibility.json` and `README.md`.
