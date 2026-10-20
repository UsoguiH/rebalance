// Turns a piece's voice/script.json into the one block of text to paste into
// ElevenLabs, and checks every phrase against its slot on the template's beats.
//   node motion/tools/script.js --piece motion/acme
// Prints the block, the voice settings and a timing check; writes voice/elevenlabs.txt.
// The timing check is an estimate from syllables (0.22 s + 0.25 s a syllable, fitted
// to the Hope take of the Jira script); tools/align.py measures the real take.
const fs = require('fs');
const path = require('path');

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : true;
}
if (!args.piece) {
  console.error('usage: node motion/tools/script.js --piece motion/<slug>');
  process.exit(1);
}
const piece = path.resolve(args.piece);
const script = JSON.parse(fs.readFileSync(path.join(piece, 'voice', 'script.json'), 'utf8'));
const beats = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'template', 'beats.json'), 'utf8'));
const slots = Object.fromEntries(beats.slots.map((s) => [s.id, s]));

// every slot needs exactly one phrase, in beat order
const ids = script.phrases.map((p) => p.slot);
const missing = beats.slots.filter((s) => !ids.includes(s.id)).map((s) => s.id);
const unknown = ids.filter((id) => !slots[id]);
const order = ids.filter((id) => slots[id]).join() === beats.slots.map((s) => s.id).filter((id) => ids.includes(id)).join();
const problems = [];
if (missing.length) problems.push(`missing phrases for: ${missing.join(', ')}`);
if (unknown.length) problems.push(`unknown slots: ${unknown.join(', ')}`);
if (!order) problems.push('phrases are out of beat order');

const spoken = (text) => text.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
const syllables = (word) => {
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  // silent endings: a final e (but not a syllabic -le), and -es / -ed that add no vowel sound
  if (/[^aeiouy]e$/.test(w) && !/[^aeiouy]le$/.test(w)) w = w.slice(0, -1);
  else if (/[^aeiouysxz]es$/.test(w) && !/(ch|sh)es$/.test(w)) w = w.slice(0, -2);
  else if (/[^aeiouytd]ed$/.test(w)) w = w.slice(0, -2);
  w = w.replace(/([^aeiouy])e([^aeiouy]+)$/, (m, a, b) => (b === 's' ? a + b : m));
  // a silent e inside a compound (time-lines, safe-ly, hope-ful)
  w = w.replace(/([aeiou][^aeiouy])e([lsfw][aeiouy])/g, '$1$2');
  const groups = w.replace(/^y/, '').match(/[aeiouy]+/g);
  // vowel pairs that split into two syllables (cre-ate, ac-tu-al, ide-a)
  const splits = (w.replace(/[ts]io/g, '').match(/ia|io(?!u)|ua|uo|eo|iu|ea(?=t[eio])/g) || []).length;
  return Math.max(1, (groups ? groups.length : 1) + splits);
};
// numbers and symbols are read out, so count them as words
const sayable = (text) =>
  spoken(text)
    .replace(/(\d+)%/g, '$1 percent')
    .replace(/\$(\d+)/g, '$1 dollars')
    .replace(/&/g, ' and ')
    .replace(/\d+/g, (n) => ' number '.repeat(Math.min(4, n.length)));

// the block: phrases of the same script line run together, one line per script line
const lines = [];
for (const p of script.phrases) {
  const s = slots[p.slot];
  if (!s) continue;
  if (!lines[s.line - 1]) lines[s.line - 1] = [];
  lines[s.line - 1].push(p.text.trim());
}
const block = lines.filter(Boolean).map((l) => l.join(' ')).join('\n');
fs.writeFileSync(path.join(piece, 'voice', 'elevenlabs.txt'), block + '\n');

console.log('--- paste into ElevenLabs (one generation) ---');
console.log(block);
console.log('----------------------------------------------');
if (script.voice) console.log(`voice: ${script.voice.name} · model: ${script.voice.model}${script.voice.settings ? `\nsettings: ${script.voice.settings}` : ''}`);
console.log('\nslot        words  syl  est.s  max.s');
let over = 0;
for (const p of script.phrases) {
  const s = slots[p.slot];
  if (!s) continue;
  const words = sayable(p.text).split(' ').filter(Boolean);
  const syl = words.reduce((n, w) => n + syllables(w), 0);
  const est = 0.22 + 0.25 * syl;
  const flag = est > s.max * 1.25 ? '  TOO LONG' : est > s.max ? '  tight' : '';
  if (flag === '  TOO LONG') over++;
  console.log(`${p.slot.padEnd(11)} ${String(words.length).padStart(5)} ${String(syl).padStart(4)}  ${est.toFixed(2).padStart(5)}  ${s.max.toFixed(2).padStart(5)}${flag}`);
}
if (over) problems.push(`${over} phrase(s) are likely too long for their slot: cut words, or they will be sped up or overlap the next beat`);
// the aligner cuts at pauses inside a script line, so each slot boundary inside a line needs one
for (let i = 1; i < script.phrases.length; i++) {
  const a = slots[script.phrases[i - 1].slot];
  const b = slots[script.phrases[i].slot];
  if (a && b && a.line === b.line && !/(\.\.\.|[.,!?;:])$/.test(spoken(script.phrases[i - 1].text)))
    problems.push(`end "${script.phrases[i - 1].slot}" with "..." or punctuation so the take has a pause before "${b.id}"`);
}
if (problems.length) {
  console.log('\nproblems:');
  problems.forEach((p) => console.log('  - ' + p));
  process.exit(2);
}
console.log(`\nok. wrote ${path.relative(process.cwd(), path.join(piece, 'voice', 'elevenlabs.txt'))}`);
