// Scaffolds a new promo on the template: a page, its content, an empty timing file,
// a script to fill in, and a mix set to the original film's levels.
//   node motion/tools/new-piece.js --slug acme --name "Acme"
//   node motion/tools/new-piece.js --slug acme --from motion/template/example   (copy content and script from a piece)
// Writes motion/<slug>/. Edit content.js and voice/script.json, then run
// tools/script.js for the ElevenLabs text.
const fs = require('fs');
const path = require('path');

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : true;
}
const root = path.join(__dirname, '..');
const slug = String(args.slug || '').toLowerCase();
if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error('usage: node motion/tools/new-piece.js --slug <lowercase-slug> [--name "Product"] [--from <piece dir>] [--force]');
  process.exit(1);
}
if (['js', 'tools', 'audio', 'renders', 'frames', 'template', 'jira'].includes(slug)) {
  console.error(`"${slug}" is taken by the toolkit; pick another slug`);
  process.exit(1);
}
const dir = path.join(root, slug);
if (fs.existsSync(dir) && !args.force) {
  console.error(`${dir} already exists (pass --force to overwrite its scaffold files)`);
  process.exit(1);
}
const from = path.resolve(args.from || path.join(root, 'template', 'example'));
const name = args.name || slug.replace(/(^|-)(.)/g, (_, s, ch) => (s ? ' ' : '') + ch.toUpperCase());

fs.mkdirSync(path.join(dir, 'voice'), { recursive: true });
fs.mkdirSync(path.join(dir, 'audio'), { recursive: true });

// the page loads the shared kit, this piece's content and timing, then the template
const page = fs.readFileSync(path.join(root, 'template', 'index.html'), 'utf8').replace(/__TITLE__/g, name);
fs.writeFileSync(path.join(dir, 'index.html'), page);

let content = fs.readFileSync(path.join(from, 'content.js'), 'utf8');
if (args.name) content = content.replace(/name: '[^']*'/, `name: '${name.replace(/'/g, "\\'")}'`);
fs.writeFileSync(path.join(dir, 'content.js'), content);

fs.writeFileSync(
  path.join(dir, 'timing.js'),
  '// When each on-screen word is spoken, in piece seconds. Written by tools/align.py\n// from the voice take; empty until there is one.\nM.TIMING = {};\n'
);

fs.copyFileSync(path.join(from, 'voice', 'script.json'), path.join(dir, 'voice', 'script.json'));

const mix = {
  duration: 26.6,
  voice: {
    take: 'take.mp3',
    note: 'One ElevenLabs take, cut at its pauses. from/to bound each phrase in the take; at is when it starts in the piece. Written by tools/align.py.',
    segments: [],
    lufs: -16.7,
    levels: '../../audio/original-levels.json',
    level_note: "The original narration's loudness; levels matches each line to the same line of the original.",
  },
  music: {
    file: '../../audio/music/original-bed.mp3',
    title: 'One Button music bed',
    note: "The original video's own music, voice removed. It lines up with the original recording, whose clip starts 0.288 s in.",
    anchor: { track: 0.288, at: 0 },
    fade_in: 0.02,
    fade_out: [26.3, 26.6],
    gain_db: 0,
    level_note: "Played at the bed's own level, which is the level it has in the original film. No extra ducking.",
  },
  master: { true_peak: -1, note: 'No loudness normalisation, so the mix lands where the original does (-16.7 LUFS).' },
};
fs.writeFileSync(path.join(dir, 'audio', 'mix.json'), JSON.stringify(mix, null, 2) + '\n');

console.log(`made ${path.relative(process.cwd(), dir)}/ for ${name}`);
console.log('next: edit content.js and voice/script.json, then');
console.log(`  node motion/tools/script.js --piece motion/${slug}`);
