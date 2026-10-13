// Production build: one minified file per page instead of ~25 small modules fetched one after another
// (each was a round trip on a phone network). Run after editing anything in js/ or css/:  npm run build
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';

const PAGES = ['explore', 'salon', 'appointments', 'favorites', 'account', 'categories', 'offers', 'business', 'join', 'dashboard'];
const root = new URL('..', import.meta.url).pathname;

rmSync(`${root}js/dist`, { recursive: true, force: true });
const js = await esbuild.build({
  absWorkingDir: root,
  entryPoints: PAGES.map((p) => `js/${p}.js`),
  outdir: 'js/dist',
  bundle: true, splitting: true, chunkNames: 'shared-[hash]', format: 'esm', minify: true, target: 'es2020', legalComments: 'none', metafile: true, charset: 'utf8', // Arabic stays readable (and 3x smaller than \u escapes)
});

// each page: its entry + the shared chunk it imports, requested together (modulepreload) instead of one after another
const outs = js.metafile.outputs;
for (const page of PAGES) {
  const entry = Object.keys(outs).find((f) => outs[f].entryPoint === `js/${page}.js`);
  const deps = outs[entry].imports.filter((i) => i.kind === 'import-statement').map((i) => i.path);
  const tags = [entry, ...deps].map((f) => `<link rel="modulepreload" href="${f}">`).join('\n');
  // index.html is home too (with the two sides at its top), so it loads the same bundle as explore.html
  for (const name of page === 'explore' ? ['explore', 'index'] : [page]) {
    const html = `${root}${name}.html`;
    let h = readFileSync(html, 'utf8');
    h = h.replace(/<!-- build:js -->[\s\S]*?<!-- \/build:js -->/, `<!-- build:js -->\n${tags}\n<script type="module" src="${entry}" blocking="render"></script>\n<!-- /build:js -->`);
    writeFileSync(html, h);
  }
}

// the four stylesheets of the inner pages → one file (kept in css/ so its ../fonts/ urls still resolve)
writeFileSync(`${root}css/.app.entry.css`, ['fonts', 'springs', 'm3', 'molu', 'chooser'].map((n) => `@import "./${n}.css";`).join('\n'));
await esbuild.build({
  absWorkingDir: root, entryPoints: ['css/.app.entry.css'], outfile: 'css/app.min.css',
  bundle: true, minify: true, external: ['*.woff2'], legalComments: 'none', charset: 'utf8',
});

// the tiny classic transition script: minify in place for the copy pages load
const vt = await esbuild.transform(readFileSync(`${root}js/vt.js`, 'utf8'), { minify: true, target: 'es2017', charset: 'utf8' });
writeFileSync(`${root}js/dist/vt.js`, vt.code);

for (const [f, o] of Object.entries(js.metafile.outputs)) console.log(f.padEnd(28), `${(o.bytes / 1024).toFixed(1)} KB`);
console.log('css/app.min.css'.padEnd(28), `${(readFileSync(`${root}css/app.min.css`).length / 1024).toFixed(1)} KB`);
