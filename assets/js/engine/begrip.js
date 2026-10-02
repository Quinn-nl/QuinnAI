"use strict";
/* QuinnAI engine — typfouten, stam, scoring, doorvragen. Classic script: deelt globals met de andere engine-bestanden, laadvolgorde staat in tools/engine-files.js. */
/* ============================================================
   BEGRIP (v6): typfouten, stam, scoring, doorvragen
   Alles hier is alleen voor het HERKENNEN van onderwerpen. Wat er terug gezegd
   wordt (echo, flip, namen, geheugen) blijft altijd jouw eigen, onaangetaste tekst.
   Alle nieuwe willekeur loopt via een tweede rng-stroom (rng2), zodat de
   deterministische keuzes van de bestaande onderdelen niet verschuiven.
   ============================================================ */
function stam(w){
  w = w.replace(/'/g, '');
  if(w.length < 4) return w;
  const s = w.replace(/(?:etjes|tjes|jes|etje|tje|je)$/, '').replace(/(?:ingen|ing|en|s)$/, '').replace(/e$/, '');
  return s.length >= 3 ? s : w;
}
/* Damerau-Levenshtein (met omwisselen van buurletters), met vroege stop bij > max. */
function afstand(a, b, max){
  if(Math.abs(a.length - b.length) > max) return max + 1;
  const d = [];
  for(let i = 0; i <= a.length; i++){ d[i] = [i]; }
  for(let j = 1; j <= b.length; j++) d[0][j] = j;
  for(let i = 1; i <= a.length; i++){
    let rijMin = Infinity;
    for(let j = 1; j <= b.length; j++){
      const kosten = a[i-1] === b[j-1] ? 0 : 1;
      d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + kosten);
      if(i > 1 && j > 1 && a[i-1] === b[j-2] && a[i-2] === b[j-1]) d[i][j] = Math.min(d[i][j], d[i-2][j-2] + 1);
      if(d[i][j] < rijMin) rijMin = d[i][j];
    }
    if(rijMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

/* Woordenschat: sleutelwoorden uit de onderwerp-regexen + alle woorden uit zijn eigen antwoorden
   (dat zijn per definitie echte woorden: die corrigeren we nooit). */
const ONDERWERP_STAM = new Map();   // stam -> Set(onderwerp-index)
const VOCAB = new Set();            // sleutelwoorden waar we naartoe corrigeren
const KENNIS = new Set();           // bekende woorden: nooit corrigeren
(function bouwWoordenschat(){
  ONDERWERPEN.forEach((o, i) => {
    for(const g of (o.re.source.match(/\(([^()]+)\)/g) || [])){
      for(const alt of g.slice(1, -1).replace(/^\?:/, '').split('|')){
        const w = alt.trim();
        if(!/^[a-z]{3,}$/.test(w)) continue;
        VOCAB.add(w); KENNIS.add(w);
        const s = stam(w);
        if(!ONDERWERP_STAM.has(s)) ONDERWERP_STAM.set(s, new Set());
        ONDERWERP_STAM.get(s).add(i);
      }
    }
    for(const a of o.a) for(const w of a.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z]{3,}/g) || []) KENNIS.add(w);
  });
  for(const lijst of [ALGEMEEN, VRAAG_WAAROM, VRAAG_HOE, VRAAG_WAT, VRAAG_WIE, ADVIES, MENING, OPDRACHT, KEUZE_ANTW, JA_NEE, WIJSHEID]){
    for(const a of lijst) for(const w of a.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z]{3,}/g) || []) KENNIS.add(w);
  }
  for(const w of STOP) KENNIS.add(w);
})();

/* Eén woord herstellen: alleen onbekende woorden van >= 5 letters, zelfde beginletter,
   afstand 1 (2 vanaf 9 letters), en alleen als er precies één beste kandidaat is. */
function herstelWoord(w){
  if(w.length < 5 || KENNIS.has(w) || VOCAB.has(w)) return w;
  const max = w.length >= 9 ? 2 : 1;
  let beste = null, besteAfstand = max + 1, gelijk = false;
  for(const v of VOCAB){
    if(v[0] !== w[0]) continue;
    const dist = afstand(w, v, max);
    if(dist < besteAfstand){ beste = v; besteAfstand = dist; gelijk = false; }
    else if(dist === besteAfstand && v !== beste) gelijk = true;
  }
  return beste && !gelijk ? beste : w;
}
/* Hele zin herstellen voor de herkenning. Woorden met een hoofdletter midden in de zin
   (namen) worden niet aangeraakt. Geeft de herstelde genormaliseerde tekst + tokens. */
function herstelZin(t){
  const delen = t.match(/\p{L}[\p{L}']*/gu) || [];
  const tokens = delen.map((w, i) => {
    const l = normaliseer(w).replace(/'/g, '');
    return (i > 0 && /^\p{Lu}/u.test(w)) ? l : herstelWoord(l);
  });
  return { laag: normaliseer(tokens.join(' ')), tokens };
}

/* Onderwerpen scoren: een regex-hit telt 3 (volgorde in de lijst beslist bij gelijkspel, dus
   het oude "eerste match wint" blijft kloppen); een hit via de stam (hondjes = hond) telt 1-2. */
/* Algemene woorden die vaak toevallig in een zin staan: een hit telt iets minder dan een specifiek sleutelwoord. */
const ZWAK_SLEUTELS = new Set(['weekend','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag','zondag','oud','jong','leeftijd','vroeger','taal',
  'kind','winter','zomer','herfst','kou','boot','tent','berg','natuur','geduld','klok','uur','lui','nummer','punt','tijd','kaarten','spel','gelukt','succes','trots']);
function scoreOnderwerpen(laag, tokens){
  const res = [];
  ONDERWERPEN.forEach((o, i) => {
    const m = o.re.exec(laag);
    let score = 0, sleutel = '';
    if(m){ score = ZWAK_SLEUTELS.has(m[0]) ? 2.5 : 3; sleutel = m[0]; }
    else {
      const hits = [];
      for(const tk of tokens){
        const idx = ONDERWERP_STAM.get(stam(tk));
        if(idx && idx.has(i) && !hits.includes(tk)) hits.push(tk);
      }
      if(hits.length){ score = Math.min(2, hits.length); sleutel = hits[0]; }
    }
    if(score) res.push({ i, score, sleutel });
  });
  res.sort((a, b) => (b.score - a.score) || (a.i - b.i));
  return res;
}
function kiesOnderwerpen(t, laag){
  const eigen = (t.match(/\p{L}[\p{L}']*/gu) || []).map(w => normaliseer(w).replace(/'/g, ''));
  let res = scoreOnderwerpen(laag, eigen);
  if(!res.length){
    const h = herstelZin(t);
    if(h.laag !== laag) res = scoreOnderwerpen(h.laag, h.tokens);
  }
  return res;
}

/* Onthouden welk onderwerp het laatste antwoord was, voor "waarom dan?" / "vertel meer". */
let volgOnderwerp = null;   // { i, sleutel, beurt }
const DOORVRAAG = /^(waarom dan|hoezo|hoezo dan|echt|echt waar|echt\?+|serieus|vertel meer|meer|vertel verder|en verder|hoe bedoel je|wat bedoel je|wat bedoel je daarmee|leg uit|leg dat uit|ga door|nog meer|en wat nog meer)[?!. ]*$/;
const DIEPER = [
  "Over {t} kan ik uren doorgaan. Dat doe ik niet, maar de dreiging is er.",
  "Ik bedoel: {t} is ingewikkelder dan het lijkt, maar ik ga het niet ingewikkelder maken dan nodig.",
  "Meer over {t}? Dat zou betekenen dat ik er verstand van heb. Daar zijn we nog niet.",
  "Als je over {t} meer wilt weten: ik ook. We zitten in hetzelfde schuitje, alleen ik heb een vlag.",
  "Verder over {t}: ik heb er een mening over en die verandert per bericht.",
  "Goed dat je doorvraagt over {t}. De meeste mensen laten het bij mijn eerste antwoord. Dat was ook het beste antwoord.",
  "Over {t} heb ik nog precies één zin over, en die was net.",
  "Wat ik bedoel met {t}? Dat het me meer raakt dan ik kan uitleggen, en ik kan niets uitleggen."
];
const VOEGWOORDEN = [
  "En over {x} gesproken:", "Dan nog dit, over {x}:", "En wat {x} betreft:", "Terwijl we het toch over {x} hebben:", "Over {x} ook nog:"
];
