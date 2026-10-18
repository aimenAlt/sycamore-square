// Builds a study PDF from its HTML source in pdf-src/, the way the earlier PDFs were printed: Chromium, Letter,
// a running header and a footer with page numbers.
// Usage: node scripts/build_pdf.mjs pdf-src/operator-view.html docs/Sycamore_Square_Feasibility_Operator_View.pdf
// Needs: npm install --no-save playwright@1.64.1 && npx playwright install chromium (and network access for the Inter font).
// The header and footer text come from <meta name="pdf-header"> and <meta name="pdf-footer"> in the source.
import { chromium } from 'playwright';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [src, out] = process.argv.slice(2);
if (!src || !out) {
  console.error('Usage: node scripts/build_pdf.mjs <source.html> <output.pdf>');
  process.exit(2);
}

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(path.resolve(src)).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const meta = await page.evaluate(() => ({
  header: document.querySelector('meta[name="pdf-header"]')?.content || '',
  footer: document.querySelector('meta[name="pdf-footer"]')?.content || '',
  inter: document.fonts.check('10pt Inter')
}));
if (!meta.inter) {
  console.error('The Inter font did not load; check the network and try again.');
  process.exit(1);
}
const style = 'font-family: Inter, Arial, sans-serif; font-size: 7.5pt; color: #5a6b76; width: 100%; margin: 0 0.6in;';
await page.pdf({
  path: out,
  format: 'Letter',
  printBackground: true,
  displayHeaderFooter: true,
  margin: { top: '0.72in', right: '0.6in', bottom: '0.7in', left: '0.6in' },
  headerTemplate: `<div style="${style}">${esc(meta.header)}</div>`,
  footerTemplate: `<div style="${style} display: flex; justify-content: space-between;"><span>${esc(meta.footer)}</span>` +
    '<span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>'
});
await browser.close();
console.log(`Built ${out}`);
