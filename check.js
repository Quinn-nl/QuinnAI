#!/usr/bin/env node
"use strict";
/* ============================================================
   QUINNAI — REPO-CONTROLES (geen dependencies)
   Draai met: node check.js         (alleen controleren)
              node check.js --fix   (engine.js?v=… in index.html bijwerken)
   Controleert:
   1. of de inline scripts in index.html en 404.html syntactisch kloppen
   2. of elk lokaal bestand waarnaar verwezen wordt (scripts, fonts, iconen,
      og-image, CSS url()) ook echt in de repo staat
   3. of index.html engine.js met de juiste versie-hash laadt (cachebuster)
   Exitcode 0 = alles goed, 1 = er klopt iets niet.
   ============================================================ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = __dirname;
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
try{ new vm.Script(fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8'), { filename: 'engine.js' }); goed('engine.js: syntax in orde'); }
catch(e){ fout('engine.js: ' + e.message); }

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

/* 3. cachebuster */
const engine = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8').replace(/\r\n/g, '\n');
const hash = crypto.createHash('sha1').update(engine, 'utf8').digest('hex').slice(0, 8);
const indexPad = path.join(ROOT, 'index.html');
let index = fs.readFileSync(indexPad, 'utf8');
const m = index.match(/<script src="engine\.js\?v=([0-9a-f]+)"><\/script>/);
if(!m) fout('index.html: <script src="engine.js?v=…"> niet gevonden');
else if(m[1] !== hash){
  if(FIX){
    index = index.replace(m[0], '<script src="engine.js?v=' + hash + '"></script>');
    fs.writeFileSync(indexPad, index);
    console.log('GEFIXT engine.js?v=' + m[1] + ' -> ?v=' + hash);
  } else {
    fout('index.html laadt engine.js?v=' + m[1] + ', maar engine.js heeft hash ' + hash + '. Draai: node check.js --fix');
  }
} else goed('engine.js?v=' + hash + ' klopt');

console.log(fouten ? '\n' + fouten + ' probleem(en).' : '\nAlles in orde.');
process.exit(fouten ? 1 : 0);
