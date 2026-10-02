#!/usr/bin/env node
"use strict";
/* Rendert tools/og-image.html -> assets/img/og-image.png (1200x630) en tools/icon.html -> assets/img/apple-touch-icon.png (180x180)
   met een lokale Chromium
   via de DevTools-verbinding (Node 22+, geen dependencies).
   Gebruik: node tools/render-og.js [pad-naar-chrome]
   Chromium wordt gezocht via PLAYWRIGHT_BROWSERS_PATH, /opt/pw-browsers of PATH. */
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const zoek = () => {
  if(process.argv[2]) return process.argv[2];
  for(const b of [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers'].filter(Boolean)){
    if(!fs.existsSync(b)) continue;
    for(const d of fs.readdirSync(b)){
      const c = path.join(b, d, 'chrome-linux', 'chrome');
      if(fs.existsSync(c)) return c;
    }
  }
  for(const n of ['chromium', 'chromium-browser', 'google-chrome']) if(spawnSync('which', [n]).status === 0) return n;
  return null;
};
const chrome = zoek();
if(!chrome){ console.error('Geen Chromium gevonden. Geef het pad op: node tools/render-og.js /pad/naar/chrome'); process.exit(1); }
const poort = 9300 + Math.floor(Math.random() * 500);
const ch = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=' + poort, 'about:blank'], { stdio: 'ignore' });
const slaap = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let doelen;
  for(let i = 0; i < 50 && !doelen; i++){
    try{ const t = await (await fetch('http://127.0.0.1:' + poort + '/json')).json(); if(t.find(x => x.type === 'page')) doelen = t; }catch(e){ await slaap(200); }
  }
  if(!doelen) throw new Error('Chromium startte niet');
  const ws = new WebSocket(doelen.find(x => x.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const wacht = {};
  ws.onmessage = m => { const d = JSON.parse(m.data); if(d.id && wacht[d.id]) wacht[d.id](d); };
  const stuur = (method, params = {}) => new Promise(r => { const i = ++id; wacht[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  await stuur('Page.enable');
  const jobs = [
    { html: 'tools/og-image.html', uit: 'assets/img/og-image.png', w: 1200, h: 630 },
    { html: 'tools/icon.html', uit: 'assets/img/apple-touch-icon.png', w: 180, h: 180 }
  ];
  for(const j of jobs){
    await stuur('Emulation.setDeviceMetricsOverride', { width: j.w, height: j.h, deviceScaleFactor: 1, mobile: false });
    await stuur('Page.navigate', { url: 'file://' + path.join(ROOT, j.html) });
    await slaap(1500);
    await stuur('Runtime.evaluate', { expression: 'document.fonts.ready.then(()=>1)', awaitPromise: true });
    const shot = await stuur('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: j.w, height: j.h, scale: 1 } });
    const uit = path.join(ROOT, j.uit);
    fs.writeFileSync(uit, Buffer.from(shot.result.data, 'base64'));
    const b = fs.readFileSync(uit);
    console.log('geschreven: ' + j.uit + ' ' + b.readUInt32BE(16) + 'x' + b.readUInt32BE(20) + ' (' + Math.round(b.length / 1024) + ' KB)');
  }
  ch.kill(); process.exit(0);
})().catch(e => { console.error(e.message); ch.kill(); process.exit(1); });
