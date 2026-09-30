#!/usr/bin/env node
// Render a local HTML file to PNG (used for preview sheets). Usage: node snap.mjs --project DIR --html in.html --out out.png [--width 1600]
import path from "node:path";
import { args, launch } from "./_browser.mjs";

const a = args();
const browser = await launch(a.project);
const page = await browser.newPage({ viewport: { width: Number(a.width || 1600), height: 900 } });
await page.goto("file://" + path.resolve(a.html));
await page.waitForTimeout(600);
await page.screenshot({ path: a.out, fullPage: true });
await browser.close();
console.log("wrote", a.out);
