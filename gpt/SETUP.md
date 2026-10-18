# Setting up the ChatGPT site editor (one time, about 15 minutes)

The site editor is a custom GPT that you create in your ChatGPT account and share as a private link with the investor who edits the site. They need no GitHub account. Every change it sends is checked automatically and published only if every check passes. Each change is saved as a version and can be undone.

You need a ChatGPT plan that can create GPTs (Plus or higher). The editor only needs to be able to open the link in ChatGPT.

## 1. Create the access key on GitHub

1. Open https://github.com/settings/personal-access-tokens/new (a fine-grained token).
2. Token name: `Sycamore site editor (ChatGPT)`. Expiration: 1 year. Put a reminder in your calendar to renew it.
3. Repository access: **Only select repositories**, then pick `aimenAlt/sycamore-square`.
4. Repository permissions: **Contents: Read and write**. Leave everything else as it is.
5. Click **Generate token** and copy it. You only see it once.

This key can only start the site-edit workflow, read and write files in this one repository, and read its issues. It cannot touch any other repository.

## 2. Create the GPT

1. Open https://chatgpt.com/gpts/editor and choose **Configure**.
2. **Name:** Sycamore Square site editor
3. **Description:** Makes small text changes to the Sycamore Square website and undoes them.
4. **Instructions:** paste everything in `gpt/instructions.md`.
5. **Conversation starters:**
   - Change some wording on the site
   - Undo my last change
   - What changed recently?
   - How do I try my own numbers?
6. **Capabilities:** turn off Web Search, Canvas, Image Generation and Code Interpreter. The editor doesn't need them.
7. **Actions → Create new action:**
   - Authentication: **None**
   - Schema: paste `gpt/read-site.openapi.yaml`
8. **Actions → Create new action** (a second one):
   - Authentication: **API Key**, Auth Type **Bearer**, then paste the token from step 1.
   - Schema: paste `gpt/github.openapi.yaml`
9. If a privacy policy URL is asked for, use `https://aimenalt.github.io/sycamore-square/`.

## 3. Test it in the preview pane

1. Ask: "Do a test run: on the Overview page, change 'Two halls that work apart or together' to 'Two halls that work apart or together.' Don't publish it."
2. It should show a before and after, then send the change with `dry_run`.
3. About 5 minutes later, ask "Did it work?" It should report **TEST RUN PASSED. Nothing was published.**
4. You can also see every result at https://github.com/aimenAlt/sycamore-square/issues/2

## 4. Share it with the editor

1. Click **Create** (or **Update**), then share with **Anyone with the link**. Do not publish it to the GPT Store.
2. Send them the link along with the one-page guide.
3. Anyone who has the link can edit the site, so keep it private. If it ever leaks, delete the token at https://github.com/settings/personal-access-tokens and make a new one.

## How you keep control

- Every change is a commit by "Sycamore site editor" on `main`, with a "Site edit:" or "Site undo:" message, and a result entry in issue #2.
- The editor can only change text in the five pages, the numbers file and the README. It can't add scripts, styles, embeds or outside images. The checks block offer, bid and other deal amounts, fees, names, gendered hall wording, finance jargon and broken links.
- `main` cannot be force-pushed or deleted, so no version is ever lost. To restore anything by hand, open the commit on GitHub and revert it, or ask Claude.
- Each year, renew the token and paste the new one into the second action's authentication.
- When the site gains pages (as in R4.4, which added `overview.html` and `auction.html`), paste the updated `gpt/instructions.md` and both schemas into the GPT again, so it can read and edit the new pages.
