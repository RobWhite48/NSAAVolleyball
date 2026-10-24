// Usage: node tools/bundle.mjs [out.html]
// Produces ONE self-contained HTML file (CSS, data, engine and app inlined). Handy for emailing,
// previewing, or dropping onto any host. GitHub Pages can serve the multi-file site as-is.
import fs from 'node:fs';
const r = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
let html = r('index.html');
html = html.replace('<link rel="stylesheet" href="styles.css">', () => '<style>\n' + r('styles.css') + '\n</style>');
for (const f of ['data.js', 'engine.js', 'app.js']) html = html.replace(`<script src="${f}"></script>`, () => '<script>\n' + r(f).replace(/<\/script/gi, '<\\/script') + '\n</script>');
const out = process.argv[2] || new URL('../dist/lutheran-playoff-guide.html', import.meta.url).pathname;
fs.mkdirSync(new URL('.', 'file://' + out).pathname, { recursive: true });
fs.writeFileSync(out, html);
console.log('wrote', out, (html.length / 1024).toFixed(0) + ' KB');
