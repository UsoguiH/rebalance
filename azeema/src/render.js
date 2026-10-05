// Video renderer: opens the invitation's video page in headless Chromium, seeks every CSS/SVG
// animation to exact frame times (Web Animations API), and pipes JPEG frames into ffmpeg.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { config } from './config.js';
import { Invitations } from './db.js';
import { VIDEO_SECONDS } from '../public/js/shared/invite.js';

const FPS = 30;
const WORKERS = Math.max(1, Number(process.env.RENDER_WORKERS || Math.min(4, os.cpus().length)));
const queue = [];
const progress = new Map(); // slug → 0..100
export const renderProgress = (slug) => progress.get(slug) ?? 0;
let active = 0;
let browserP = null;

const getBrowser = () => (browserP ??= chromium.launch({ args: ['--font-render-hinting=none'] }));

export const mediaDir = (slug) => path.join(config.dataDir, 'media', slug);

export function enqueueRender(slug) {
  Invitations.update(slug, { video_status: 'queued', video_error: null });
  if (!config.renderEnabled) return;
  if (!queue.includes(slug)) queue.push(slug);
  pump();
}

function pump() {
  while (active < config.renderConcurrency && queue.length) {
    const slug = queue.shift();
    active++;
    renderInvitation(slug)
      .then(() => Invitations.update(slug, { video_status: 'ready' }))
      .catch((e) => {
        console.error('[render]', slug, e);
        Invitations.update(slug, { video_status: 'failed', video_error: String(e.message || e).slice(0, 500) });
      })
      .finally(() => { active--; pump(); });
  }
}

export async function renderInvitation(slug, { url, outDir, seconds = VIDEO_SECONDS } = {}) {
  if (!url) Invitations.update(slug, { video_status: 'rendering' });
  const dir = outDir || mediaDir(slug);
  fs.mkdirSync(dir, { recursive: true });
  const target = url || `http://127.0.0.1:${config.port}/v/${slug}?token=${config.renderToken}`;
  const browser = await getBrowser();
  const ctx = await browser.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
  const tmp = path.join(dir, 'video.tmp.mp4');
  try {
    // Several pages render interleaved frames in parallel; frames are written to ffmpeg in order.
    const pages = await Promise.all(Array.from({ length: WORKERS }, async () => {
      const page = await ctx.newPage();
      await page.goto(target, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => typeof window.__seek === 'function');
      return page;
    }));

    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', tmp]);
    let ffErr = '';
    ff.stderr.on('data', (d) => (ffErr += d));
    const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg: ' + ffErr)))));

    const frames = Math.round(seconds * FPS);
    const ready = new Map();
    let next = 0;
    const flush = async () => {
      while (ready.has(next)) {
        const buf = ready.get(next);
        ready.delete(next++);
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      }
    };
    let writing = Promise.resolve();
    await Promise.all(pages.map(async (page, w) => {
      for (let i = w; i < frames; i += pages.length) {
        await page.evaluate((ms) => window.__seek(ms), (i * 1000) / FPS);
        ready.set(i, await page.screenshot({ type: 'jpeg', quality: 92 }));
        progress.set(slug, Math.min(99, Math.round((next / frames) * 100)));
        writing = writing.then(flush);
        // keep workers from racing too far ahead of the writer
        while (i - next > pages.length * 12) await new Promise((r) => setTimeout(r, 10));
      }
    }));
    await writing.then(flush);
    ff.stdin.end();
    await done;
    fs.renameSync(tmp, path.join(dir, 'video.mp4'));
    progress.delete(slug);

    // Poster (final composed frame) — used for WhatsApp/OG previews
    await pages[0].evaluate((ms) => window.__seek(ms), seconds * 1000 - 200);
    await pages[0].screenshot({ type: 'jpeg', quality: 88, path: path.join(dir, 'poster.jpg') });
  } finally {
    await ctx.close();
    fs.rmSync(tmp, { force: true });
  }
}

export async function closeRenderer() {
  if (browserP) (await browserP).close();
}
