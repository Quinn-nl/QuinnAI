#!/usr/bin/env node
"use strict";
/* ============================================================
   QUINNAI — REPO-CONTROLES (geen dependencies)
   Draai met: node tools/check.js         (alleen controleren)
              node tools/check.js --fix   (?v=… van css/js in index.html en 404.html bijwerken)
   Controleert:
   1. of de inline scripts in index.html en 404.html syntactisch kloppen
   2. of elk lokaal bestand waarnaar verwezen wordt (scripts, fonts, iconen,
      og-image, CSS url()) ook echt in de repo staat
   3. of index.html/404.html style.css, engine.js en ui.js met de juiste versie-hash laden (cachebuster)
   4. of de kleurparen uit :root hun WCAG-contrastdrempel halen
   Exitcode 0 = alles goed, 1 = er klopt iets niet.
   ============================================================ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://quinnai.tech/';
const FIX = process.argv.includes('--fix');
const PAGINAS = ['index.html', '404.html'].filter(f => fs.existsSync(path.join(ROOT, f)));
let fouten = 0;
const fout = m => { fouten++; console.log('FOUT  ' + m); };
const goed = m => console.log('ok    ' + m);

/* 1. inline scripts */
for(const pagina of PAGINAS){
  const html = fs.readFileSync(path.join(ROOT, pagina), 'utf8');
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  scripts.forEach((code, i) => {
    try{ new vm.Script(code, { filename: pagina + '#script' + (i + 1) }); }
    catch(e){ fout(pagina + ': inline script ' + (i + 1) + ' is syntactisch kapot: ' + e.message); }
  });
  if(scripts.length) goed(pagina + ': ' + scripts.length + ' inline script(s) syntactisch in orde');
}
for(const js of ['assets/js/engine.js', 'assets/js/proof.js', 'assets/js/arcade.js', 'assets/js/ui.js', 'assets/js/404.js']){
  try{ new vm.Script(fs.readFileSync(path.join(ROOT, js), 'utf8'), { filename: js }); goed(js + ': syntax in orde'); }
  catch(e){ fout(js + ': ' + e.message); }
}

/* 2. lokale verwijzingen */
function lokaalPad(verw){
  if(!verw || /^(#|data:|tel:|mailto:|javascript:)/i.test(verw)) return null;
  let v = verw;
  if(v.startsWith(SITE)) v = v.slice(SITE.length);
  else if(/^[a-z][a-z0-9+.-]*:/i.test(v) || v.startsWith('//')) return null;   // externe URL
  v = v.split('#')[0].split('?')[0].replace(/^\//, '');
  return v || null;
}
for(const pagina of PAGINAS){
  const html = fs.readFileSync(path.join(ROOT, pagina), 'utf8');
  const verwijzingen = new Set();
  for(const m of html.matchAll(/\b(?:src|href|content)="([^"]+)"/g)) verwijzingen.add(m[1]);
  for(const m of html.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) verwijzingen.add(m[1]);
  let n = 0;
  for(const v of verwijzingen){
    if(/^data:/i.test(v)) continue;
    // content="" bevat ook gewone tekst; alleen kijken naar dingen die op een bestand lijken
    if(!/\.(js|css|png|jpe?g|svg|woff2?|ico|webp|xml|txt|json|html)(\?.*)?$/i.test(v) && !v.startsWith(SITE)) continue;
    const p = lokaalPad(v);
    if(p === null) continue;
    n++;
    if(!fs.existsSync(path.join(ROOT, p))) fout(pagina + ': verwijst naar ' + v + ' maar ' + p + ' bestaat niet');
  }
  goed(pagina + ': ' + n + ' lokale verwijzing(en) gecontroleerd');
}

/* 3. cachebuster: elk eigen css/js-bestand krijgt ?v=<eerste 8 tekens sha1, CRLF genormaliseerd> */
const ASSETS = {
  'index.html': ['assets/css/style.css', 'assets/js/engine.js', 'assets/js/proof.js', 'assets/js/arcade.js', 'assets/js/ui.js'],
  '404.html':   ['assets/css/style.css', 'assets/css/404.css', 'assets/js/proof.js', 'assets/js/404.js']
};
const hashVan = rel => crypto.createHash('sha1')
  .update(fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n'), 'utf8').digest('hex').slice(0, 8);
for(const [pagina, lijst] of Object.entries(ASSETS)){
  const pad = path.join(ROOT, pagina);
  let html = fs.readFileSync(pad, 'utf8');
  for(const asset of lijst){
    const h = hashVan(asset);
    const re = new RegExp('((?:src|href)="/?' + asset.replace(/[.\/]/g, '\\$&') + ')(?:\\?v=([0-9a-f]+))?"');
    const mm = html.match(re);
    if(!mm){ fout(pagina + ': verwijzing naar ' + asset + ' niet gevonden'); continue; }
    if(mm[2] === h){ goed(pagina + ': ' + asset + '?v=' + h + ' klopt'); continue; }
    if(FIX){
      html = html.replace(mm[0], mm[1] + '?v=' + h + '"');
      fs.writeFileSync(pad, html);
      console.log('GEFIXT ' + pagina + ': ' + asset + ' ?v=' + (mm[2] || '(geen)') + ' -> ?v=' + h);
    } else {
      fout(pagina + ' laadt ' + asset + ' met ?v=' + (mm[2] || '(geen)') + ', maar het bestand heeft hash ' + h + '. Draai: node tools/check.js --fix');
    }
  }
}

/* 4. contrast (WCAG 1.4.3 tekst 4,5:1 / 1.4.11 niet-tekst 3:1), berekend met relatieve luminantie
      op de échte achtergrond uit :root in style.css */
{
  const css = fs.readFileSync(path.join(ROOT, 'assets/css/style.css'), 'utf8');
  const kleur = {};
  for(const mm of css.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6}|rgba?\([^)]*\))/g)) kleur[mm[1]] = mm[2];
  const rgb = c => {
    if(c[0] === '#') return [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)).concat(1);
    const n = c.match(/[\d.]+/g).map(Number); return [n[0], n[1], n[2], n[3] === undefined ? 1 : n[3]];
  };
  const op = (f, bg) => { const [r, g, b, a] = rgb(f), B = rgb(bg); return [0, 1, 2].map(i => (rgb(f)[i] * a + B[i] * (1 - a))); };
  const lum = v => { const [r, g, b] = v.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (f, bg) => { const a = lum(op(f, bg)), b = lum(rgb(bg).slice(0, 3)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
  const paren = [
    // tekst en accenten op de pagina-achtergrond (4,5:1)
    ['paper', 'ink', 4.5], ['muted', 'ink', 4.5], ['muted-3', 'ink', 4.5], ['text-soft', 'ink', 4.5],
    ['lime', 'ink', 4.5], ['cyan', 'ink', 4.5], ['pink', 'ink', 4.5], ['orange', 'ink', 4.5], ['violet', 'ink', 4.5],
    // op kaarten en verhoogde vlakken
    ['paper', 'ink-2', 4.5], ['text-soft', 'ink-2', 4.5], ['muted', 'ink-2', 4.5], ['muted-3', 'ink-2', 4.5],
    ['lime', 'ink-2', 4.5], ['cyan', 'ink-2', 4.5], ['pink', 'ink-2', 4.5],
    ['muted', 'ink-3', 4.5], ['paper', 'ink-3', 4.5], ['cyan', 'ink-3', 4.5], ['lime', 'ink-3', 4.5],
    // randen en niet-tekst (3:1, WCAG 1.4.11)
    ['line', 'ink', 3], ['line', 'ink-2', 3]
  ];
  let n = 0;
  for(const [f, bg, min] of paren){
    if(!kleur[f] || !kleur[bg]){ fout('contrast: --' + f + ' of --' + bg + ' niet gevonden in :root'); continue; }
    const r = ratio(kleur[f], kleur[bg]); n++;
    if(r < min) fout('contrast: --' + f + ' op --' + bg + ' is ' + r.toFixed(2) + ':1, minimaal ' + min + ':1 nodig');
  }
  // donkere tekst op neon-vlakken (knoppen, stickers, het Q-merk)
  for(const [t, bg] of [['on-lime', 'lime'], ['on-lime', 'lime-hover'], ['on-lime', 'cyan'], ['on-lime', 'pink'], ['on-lime', 'orange'], ['on-lime-mark', 'lime'], ['on-lime-mark', 'cyan']]){
    if(!kleur[t] || !kleur[bg]){ fout('contrast: --' + t + ' of --' + bg + ' niet gevonden in :root'); continue; }
    const kn = ratio(kleur[t], kleur[bg]); n++;
    if(kn < 4.5) fout('contrast: --' + t + ' op --' + bg + ' is ' + kn.toFixed(2) + ':1, minimaal 4.5:1 nodig');
  }
  goed(n + ' kleurparen halen hun WCAG-contrastdrempel');
}

console.log(fouten ? '\n' + fouten + ' probleem(en).' : '\nAlles in orde.');
process.exit(fouten ? 1 : 0);
