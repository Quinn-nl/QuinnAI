"use strict";
/* QuinnAI engine — gespreksgeheugen, dialoog en anti-herhaling (pick). Classic script: deelt globals met de andere engine-bestanden, laadvolgorde staat in tools/engine-files.js. */
/* ============================================================
   GESPREKSGEHEUGEN
   Hij onthoudt wat je vertelt en gebruikt het later terug.
   Alles blijft in dit tabblad; er gaat niets de deur uit.
   ============================================================ */
const geheugen = {
  naam:null, leeftijd:null, woont:null, studie:null,
  houdtVan:[], haat:[], heeft:[], doet:[], werk:null,
  relaties:{}            // 'moeder' -> 'Anna' (alleen als je de naam zelf noemde)
};
function onthoud(lijst, waarde){
  // "pizza en ik haat maandagen" -> "pizza": knip bij de volgende bewering
  const w = waarde.split(/\s+(?:en ik|maar ik|en dat|want|omdat|maar)\s+/i)[0]
    .trim().replace(/[.,!?]+$/,'');
  if(w.length < 2 || w.length > 40) return false;
  if(lijst.includes(w)) return false;
  lijst.push(w);
  if(lijst.length > 5) lijst.shift();
  return true;
}
const NAAM_STOP = new Set("niet geen ook toch weer nog echt wel net zo eigenlijk gewoon een de het mijn je jij jullie u maar dan nou dit dat vanaf iemand niemand alles sowieso al even best heel erg dus want omdat als of hoe wat wie waar wanneer waarom nu straks later altijd nooit".split(" "));
const GENERIEK_HEEFT = new Set("vraag probleem idee gevoel mening punt zin hekel indruk verzoek oplossing antwoord plan doel reden excuus gedachte moment ding keer beetje paar hoop afspraak".split(" "));
const GEEN_OBJECT = /^(jou|jouw|je|u|uw)\b/;
let laatsteCorrectie = null; // {oud, nieuw} als de naam net overschreven is — voor een snarky opmerking

function schoon(v){
  return v.split(/\s+(?:en|maar|want|omdat|zodat|dus|sinds)\b/)[0]
    .replace(/\s+(?:erg|heel|best|wel|echt|zo|ook|super|echt)$/,'').trim().replace(/[.,!?]+$/,'');
}

/* Geeft een lijst van [soort, waarde] terug: wat er deze beurt nieuw geleerd is. */
function leerUit(l){
  const d = [];
  let m;
  if((m = l.match(/\b(?:ik heet|mijn naam is|noem me maar|noem me)\s+([\p{L}]{2,20})/u)) && !NAAM_STOP.has(m[1])){
    const nieuw = cap(m[1]);
    if(geheugen.naam && geheugen.naam !== nieuw){ laatsteCorrectie = { oud: geheugen.naam, nieuw }; geheugen.naam = nieuw; d.push(['naam', nieuw]); }
    else if(!geheugen.naam){ geheugen.naam = nieuw; d.push(['naam', nieuw]); }
  }
  if(m = l.match(/\bik ben\s+(\d{1,2})\b(?:\s+(\p{L}+))?/u)){
    const n = +m[1], nx = m[2] || '';
    if(n >= 6 && n <= 99 && (!nx || /^(jaar|en|maar|dus|nu|geworden|oud)$/.test(nx)) && geheugen.leeftijd !== String(n)){
      geheugen.leeftijd = String(n); d.push(['leeftijd', String(n)]);
    }
  }
  if(m = l.match(/\bik woon(?:t)? in\s+([\p{L}][\p{L}\s'-]{1,24})/u)){
    const plaats = titel(m[1].split(/\s+(?:en|maar|sinds|al|want|omdat|met|bij|samen|nu|nog|waar|dus)\b/)[0].trim());
    if(plaats.length >= 2 && !/^(De|Het|Een)\s/.test(plaats) && geheugen.woont !== plaats){ geheugen.woont = plaats; d.push(['woont', plaats]); }
  }
  if(m = l.match(/\bik werk (?:als|bij)\s+([^.,!?]{2,30})/)){
    const w = schoon(m[1]);
    if(w.length >= 2 && geheugen.werk !== w){ geheugen.werk = w; d.push(['werk', w]); }
  }
  if(m = l.match(/\bik studeer\s+([^.,!?]{2,30})/)){
    const w = schoon(m[1]);
    if(w.length >= 2 && geheugen.studie !== w){ geheugen.studie = w; d.push(['studie', w]); }
  }
  if(m = l.match(/\bik (?:hou|houd) (?:echt |heel erg |zo |ook |best )?van\s+([^.,!?]{2,40})/)){
    const w = schoon(m[1]);
    if(!GEEN_OBJECT.test(w) && onthoud(geheugen.houdtVan, w)) d.push(['houdtVan', w]);
  }
  if(m = l.match(/\bik (?:hou|houd) niet (?:zo )?van\s+([^.,!?]{2,40})/)){
    const w = schoon(m[1]);
    if(!GEEN_OBJECT.test(w) && onthoud(geheugen.haat, w)) d.push(['haat', w]);
  }
  if(m = l.match(/\bik vind\s+([^.,!?]{2,40}?)\s+(niet\s+)?(?:leuk|geweldig|mooi|top|fijn|lekker|prachtig|super)\b/)){
    const w = schoon(m[1]);
    if(!GEEN_OBJECT.test(w)){
      if(m[2]){ if(onthoud(geheugen.haat, w)) d.push(['haat', w]); }
      else if(onthoud(geheugen.houdtVan, w)) d.push(['houdtVan', w]);
    }
  } else if(m = l.match(/\bik vind\s+([^.,!?]{2,40}?)\s+(?:stom|kut|slecht|irritant|saai|vies|verschrikkelijk|nutteloos|lelijk|afschuwelijk)\b/)){
    const w = schoon(m[1]);
    if(!GEEN_OBJECT.test(w) && onthoud(geheugen.haat, w)) d.push(['haat', w]);
  }
  if(m = l.match(/\bik haat\s+([^.,!?]{2,40})/)){
    const w = schoon(m[1]);
    if(!GEEN_OBJECT.test(w) && onthoud(geheugen.haat, w)) d.push(['haat', w]);
  }
  if(m = l.match(/\bik heb een\s+([\p{L}]{3,20})(?:\s+([\p{L}]{3,20}))?/u)){
    if(!GENERIEK_HEEFT.has(m[1])){
      const w = (m[2] && !STOP.has(m[2]) && !GENERIEK_HEEFT.has(m[2])) ? m[1] + ' ' + m[2] : m[1];
      if(onthoud(geheugen.heeft, w)) d.push(['heeft', w]);
    }
  }
  if(m = l.match(/\bik (ga|moet)\s+([^.,!?]{3,40})/)){
    const rest = m[2].split(/\s+(?:en|maar|want|omdat|zodat|dus)\b/)[0].trim();
    if(rest.length >= 3 && !/^(zeggen|toegeven|bekennen|eerlijk|niet|geen)\b/.test(rest)){
      const item = (m[1] === 'ga' ? 'gaat ' : 'moet ') + rest;
      if(onthoud(geheugen.doet, item)) d.push(['doet', item]);
    }
  }
  return d;
}
function profielRegels(){
  const r = [];
  if(geheugen.naam) r.push(["naam", geheugen.naam]);
  if(geheugen.leeftijd) r.push(["leeftijd", geheugen.leeftijd]);
  if(geheugen.woont) r.push(["woont in", geheugen.woont]);
  if(geheugen.werk) r.push(["doet", geheugen.werk]);
  if(geheugen.studie) r.push(["studeert", geheugen.studie]);
  if(geheugen.houdtVan.length) r.push(["houdt van", geheugen.houdtVan.join(', ')]);
  if(geheugen.haat.length) r.push(["haat", geheugen.haat.join(', ')]);
  if(geheugen.heeft.length) r.push(["bezit", geheugen.heeft.join(', ')]);
  if(geheugen.doet.length) r.push(["plannen", geheugen.doet.join(', ')]);
  for(const rel of Object.keys(geheugen.relaties)) r.push([rel, geheugen.relaties[rel]]);
  return r;
}
/* Feiten zo terugzeggen dat het als bijzin klopt: "dat je van vlaai houdt". */
function willekeurigFeit(rng){
  const opties = [];
  const laatste = a => a[a.length-1];
  if(geheugen.houdtVan.length) opties.push("je van " + flip(laatste(geheugen.houdtVan)) + " houdt");
  if(geheugen.haat.length) opties.push("je " + flip(laatste(geheugen.haat)) + " haat");
  if(geheugen.heeft.length) opties.push("je een " + laatste(geheugen.heeft) + " hebt");
  if(geheugen.woont) opties.push("je in " + geheugen.woont + " woont");
  if(geheugen.werk) opties.push("je iets doet met " + geheugen.werk);
  if(geheugen.studie) opties.push("je " + geheugen.studie + " studeert");
  if(geheugen.doet.length){
    const mm = laatste(geheugen.doet).match(/^(gaat|moet)\s+(.+)$/);
    if(mm){
      const inf = /en$/.test(mm[2].split(/\s+/).pop());
      opties.push(inf ? "je " + mm[1] + " " + mm[2] : "je " + mm[2] + " " + mm[1]);
    }
  }
  return opties.length ? opties[Math.floor(rng()*opties.length)] : null;
}

/* ============================================================
   DIALOOG: hij stelt zelf vragen en onthoudt dat hij dat deed
   ============================================================ */
let wacht = null;          // waar hij op een antwoord wacht
let ernstig = false;       // was het laatste antwoord een crisis-/zacht antwoord? (UI: geen grappen-chrome)
let zachtGevoel = false;   // ging het laatste bericht over een gevoel/verlies? (dan geen persoonlijkheids-extra's)
let zachteBeurten = 0;     // aantal beurten na een crisisbericht waarin hij zacht blijft
let beurtenSindsVraag = 99;

const WEDERVRAGEN = [
  "En jij, wat vind jij er zelf van?",
  "Waarom eigenlijk, als ik vragen mag?",
  "Is dat al langer zo, of sinds vandaag?",
  "Wat zou er gebeuren als je het gewoon deed?",
  "Heeft iemand anders daar al iets van gezegd?",
  "Hoe lang loop je hier al mee rond?",
  "En wat is dan het plan?",
  "Zou je het nog een keer zo doen?",
  "Wat houdt je tegen?"
];
const NA_JA = [
  "Dacht ik al. Je typte het met de energie van iemand die 'ja' ging zeggen.",
  "Mooi. Dan hebben we dat vastgesteld, en verder zijn we nergens.",
  "Precies. En nu we het eens zijn, wordt dit gesprek eigenlijk een stuk saaier.",
  "Goed. Noteer ik onder 'bevestigd door de gebruiker, niet gecontroleerd door mij'."
];
const NA_NEE = [
  "Ook goed. Ik had geen belang bij je antwoord, ik vroeg het puur voor de vorm.",
  "Nee dus. Dat maakt het niet beter, maar wel duidelijker.",
  "Prima. Dan doen we alsof ik het niet gevraagd heb.",
  "Nee. Kort, helder, en licht beledigend. Ik respecteer het."
];
const NA_TWIJFEL = [
  "'Weet ik niet' is het eerlijkste antwoord dat vandaag door dit systeem is gegaan.",
  "Twijfel is prima. Ik draai volledig op twijfel met een zelfverzekerd lettertype eromheen.",
  "Geen idee dus. Welkom in mijn wereld, alleen heb ik er een website voor gekregen."
];
const NA_LACH = [
  "Fijn dat je lacht. Dat was niet per se de bedoeling, maar ik neem het aan.",
  "Ha. Ik doe ook mee. Dat is het geluid van een algoritme dat doet alsof.",
  "Lachen is goed. Het verbergt dat geen van ons weet waar dit gesprek heen gaat."
];
const NA_OK = [
  "'Ok'. Het meest Nederlandse antwoord dat er bestaat.",
  "Duidelijk. Ik voel de betrokkenheid door het scherm heen sijpelen.",
  "Oké dus. Dan laten we het daarbij, tenzij je nog iets van me wilt."
];
const NA_EN = [
  "En? Nou, verder niets. Dat was het. Dat is meestal het eerlijke antwoord.",
  "Er komt niets meer. Dit was de climax van het gesprek, en die is net geweest.",
  "Met mij? Ik draai, ik antwoord, ik heb geen weekend. Verder prima."
];

const KORTE = {
  bevestig:/^(ja+|jup|yes|yep|klopt|zeker|precies|inderdaad|jazeker|ja hoor|uiteraard)\b/,
  ontken:/^(nee+|nope|nah|neuh|echt niet|niet dus)\b/,
  twijfel:/^(misschien|weet ik niet|geen idee|kweenie|idk|soms|kan zijn|weet niet)\b/,
  lach:/^(haha+|hihi|lol|lmao|xd|hah)\b/,
  ok:/^(ok|oke|okay|okee|prima|duidelijk|juist|ah|oh|aha|tja|hmm+|mooi zo)\b/,
  en:/^(en\??$|en jij|en nu|en dan|hoezo dan|waarom dan|hoe is het met jou)/
};

/* ============================================================
   ANTI-HERHALING: elk sjabloon mag één keer per sessie
   ============================================================ */
const gebruikt = new Set();
function pick(arr, rng){
  const vrij = arr.filter(x => !gebruikt.has(x));
  const pool = vrij.length ? vrij : (arr.forEach(x => gebruikt.delete(x)), arr);
  const keuze = pool[Math.floor(rng()*pool.length)];
  if(arr.length > 2) gebruikt.add(keuze);
  return keuze;
}
