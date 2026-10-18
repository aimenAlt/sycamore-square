# Sycamore Square website — rules for AI editors

This file is the rulebook for any AI that changes this site: the ChatGPT site editor, Codex, Claude or any other agent. Read it before every change. The site owner (repo `aimenAlt/sycamore-square`) can override any rule; nobody else can.

## What the site is

- A private investor website for the Sycamore Square redevelopment study, five pages: `index.html` (the front page with four choices), `overview.html` (overview and the documents library), `legal.html` (legal findings), `feasibility.html` (feasibility) and `auction.html` (before and during the auction). Links to overview content use `overview.html#anchor`; "Home" is `index.html`.
- A one-time password panel covers every page (`assets/js/gate-head.js` and `assets/js/gate.js`). Once a device enters the password it keeps access for good (localStorage plus a long-lived cookie). Only the password's SHA-256 hash is in the code; never commit the password itself. This is a light gate: the repository is public, so its files can still be read on GitHub. Every new page needs both gate scripts in its `<head>`.
- Plain HTML, CSS and vanilla JavaScript. No framework, no build step. Served by GitHub Pages from `main`; every change to `main` goes live in a few minutes.
- The feasibility page draws every number from `assets/feasibility.json` at runtime. `feasibility.html` holds wording only. Since v2.4 (owner's decision) the numbers include buying the property at an assumed $3.0M plus fees, closing, surveys and inspections; `build_cost` keeps the build-only figure.
- The repository is **public**. Anything committed here can be read by anyone, forever, even after it is removed.

## How changes ship

- Every change is a git commit, so every earlier version can be restored. Never rewrite history, force-push or delete `main`.
- Small text changes from the ChatGPT site editor go through `.github/workflows/site-edit.yml`. It applies the edit, runs every check and publishes only if all of them pass. "Undo" reverts the last edit the same way.
- Other changes go through a pull request. The `Site checks` workflow must pass before it is merged.
- Before you finish, run `python3 scripts/check_site.py`. It also reads the text inside every PDF, image, CAD and 3D file against the naming and privacy rules, so it needs `pdftotext` (poppler-utils) or PyMuPDF, and `tesseract` (on a Mac, macOS Vision is used when tesseract is missing). Reviewed exceptions live in `scripts/text_exceptions.json`, each pinned to one file's SHA-256; add one only with the owner's agreement. If you can, also run `npm install --no-save --legacy-peer-deps html-validate@11.4.0 playwright@1.64.1 && npx playwright install chromium`, then `./node_modules/.bin/html-validate *.html` and `node scripts/browser_check.mjs`.
- Make one focused change at a time, and describe it in plain English: which page, which section, what changed.

## Never put on the site

These are checked automatically, in the pages and in the text inside PDFs and images, and an edit that breaks them is refused.

- Any price for the property other than the study's assumed $3.0M (owner's decision): never an offer or bid amount, a maximum or walk-away price, the auction transaction fee or buyer's premium, or other transaction terms. Write the assumption as "an assumed price of $3.0M" or "buying at $3.0M", never "$3.0M purchase" (the check reads that as a deal amount).
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

- Every PDF in `docs/` has exactly one card in the Documents section of `overview.html`, and is inside `docs/Sycamore_Square_All_PDFs_R4.3.zip`. After adding or replacing a PDF, rebuild the ZIP with `python3 scripts/check_site.py --rebuild-zip`.
- Published PDFs must be public versions: no prices, fees, transaction terms or personal names.
- Some PDFs have an HTML source in `pdf-src/` (it says which in each file's title). Change the source, never the PDF, then rebuild with `node scripts/build_pdf.mjs pdf-src/<name>.html docs/<PDF name>.pdf`, replace the cover, update the card's page count and size, and rebuild the ZIP.
- Each PDF card shows the PDF's first page as its cover, saved as `assets/img/docs/<same name as the PDF>.jpg` at about 640 px (on a Mac: `qlmanage -t -s 900 -o . file.pdf`, then `sips -s format jpeg -Z 640`). The card also states the page count and file size, and gets a category (`data-cat`: plans, money, legal or research) so the filter buttons find it. Replace the cover whenever the PDF changes.

## Design

- Use the tokens in `assets/css/styles.css` (colors, gradients, fonts, spacing, corner radii, shadows). Never type a raw color into a page. Fonts are Fraunces for headings and big numbers, and Plus Jakarta Sans for everything else.
- "Golden hour" look, made for a wedding and event venue: warm champagne and white backgrounds, deep plum text, and the sunset gradient (gold, coral, rose, violet) for accents. Cards are white, with rounded corners and soft shadows. No dark navy page backgrounds, no monospace text and no emoji.
- Use the gradient as an accent only: buttons, the selected page or tab, small bars and badges, and at most one gradient feature card per section. Never put body text on it. All text keeps at least 4.5:1 contrast with its background.
- Navigation: the five page links (Home, Overview, Legal findings, Feasibility, Before the auction) always show in the header. "On this page" lists every section: chips on wide screens, and on phones a menu that names the section you are in. A new section needs its own entry in that page's `nav-list`.
- Mobile first: nothing may scroll sideways at 360 px, tap targets are at least 44 px, and body text is at least 16 px on phones.
- Keep `<meta name="robots" content="noindex,nofollow">` on every page, and keep `robots.txt` as it is.

## Leave alone unless the site owner asks

`.github/`, `scripts/`, `AGENTS.md`, `CLAUDE.md`, `gpt/`, `robots.txt`, `.nojekyll`, `assets/js/`, `assets/css/`, `assets/models/`, and the page structure (sections, navigation, tabs). The ChatGPT site editor can only change text in `index.html`, `overview.html`, `legal.html`, `feasibility.html`, `auction.html`, `assets/feasibility.json` and `README.md`.
