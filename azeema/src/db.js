import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from './config.js';

fs.mkdirSync(config.dataDir, { recursive: true });
fs.mkdirSync(path.join(config.dataDir, 'media'), { recursive: true });

export const db = new DatabaseSync(path.join(config.dataDir, 'azeema.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    host_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',      -- pending | paid
    package TEXT NOT NULL DEFAULT 'full',
    price INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL,
    contact_name TEXT, contact_phone TEXT,
    payment_ref TEXT,
    video_status TEXT NOT NULL DEFAULT 'none',   -- none | queued | rendering | ready | failed
    video_error TEXT,
    edits_left INTEGER NOT NULL DEFAULT 1,
    views INTEGER NOT NULL DEFAULT 0,
    ref TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    paid_at TEXT
  );
  CREATE TABLE IF NOT EXISTS rsvps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invitation_id INTEGER NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    attending INTEGER NOT NULL,
    companions INTEGER NOT NULL DEFAULT 0,
    message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS rsvps_inv ON rsvps(invitation_id);
`);

const ALPHA = 'abcdefghjkmnpqrstuvwxyz23456789';
export const token = (n) => Array.from(crypto.randomBytes(n), (b) => ALPHA[b % ALPHA.length]).join('');

const row = (r) => (r ? { ...r, data: JSON.parse(r.data) } : null);

export const Invitations = {
  create({ data, pkg, price, contactName, contactPhone, ref }) {
    const slug = token(8), hostKey = token(20);
    db.prepare(`INSERT INTO invitations (slug, host_key, package, price, data, contact_name, contact_phone, ref)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(slug, hostKey, pkg, price, JSON.stringify(data), contactName, contactPhone, ref || null);
    return this.bySlug(slug);
  },
  bySlug: (slug) => row(db.prepare('SELECT * FROM invitations WHERE slug = ?').get(String(slug))),
  all: () => db.prepare('SELECT * FROM invitations ORDER BY id DESC LIMIT 500').all().map(row),
  update(slug, fields) {
    const keys = Object.keys(fields);
    if (!keys.length) return;
    const vals = keys.map((k) => (k === 'data' ? JSON.stringify(fields[k]) : fields[k]));
    db.prepare(`UPDATE invitations SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE slug = ?`).run(...vals, slug);
  },
  markPaid(slug, ref) {
    db.prepare(`UPDATE invitations SET status = 'paid', paid_at = datetime('now'), payment_ref = COALESCE(?, payment_ref) WHERE slug = ?`).run(ref || null, slug);
  },
  view: (slug) => db.prepare('UPDATE invitations SET views = views + 1 WHERE slug = ?').run(slug),
  stats() {
    return db.prepare(`SELECT COUNT(*) total, SUM(status='paid') paid, COALESCE(SUM(CASE WHEN status='paid' THEN price END),0) revenue FROM invitations`).get();
  },
};

export const Rsvps = {
  add(invId, { name, attending, companions, message }) {
    db.prepare('INSERT INTO rsvps (invitation_id, name, attending, companions, message) VALUES (?, ?, ?, ?, ?)')
      .run(invId, name, attending ? 1 : 0, companions, message || null);
  },
  list: (invId) => db.prepare('SELECT * FROM rsvps WHERE invitation_id = ? ORDER BY id DESC').all(invId),
  summary(invId) {
    const r = db.prepare(`SELECT COUNT(*) responses, COALESCE(SUM(attending),0) yes, COALESCE(SUM(1-attending),0) no,
      COALESCE(SUM(CASE WHEN attending=1 THEN 1 + companions END),0) guests FROM rsvps WHERE invitation_id = ?`).get(invId);
    return { responses: r.responses, yes: r.yes, no: r.no, guests: r.guests };
  },
};
