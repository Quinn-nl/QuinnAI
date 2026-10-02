"use strict";
/* QuinnAI engine — persoonlijkheid: stemming, band, gags en de publieke bedenkAntwoord. Classic script: deelt globals met de andere engine-bestanden, laadvolgorde staat in tools/engine-files.js. */
/* ============================================================
   PERSOONLIJKHEID (v6): stemming, band, callbacks, running gags
   Een laag bovenop bedenkBasis(). Geen persoonsgegevens over wie dan ook, alleen
   fictieve grappen. Alles staat UIT bij crisis-/zachte berichten en bij gevoel/verlies.
   Eigen rng-stroom (rng2): bestaande deterministische keuzes verschuiven niet.
   ============================================================ */
const stemming = { geduld: 55, sympathie: 50, energie: 55 };   // 0..100
const geschiedenis = [];            // { nr, tekst, sleutel }
const gagTeller = {};               // naam -> hoe vaak al getriggerd
const mijlpalenGehad = new Set();
const relatieGevraagd = {};         // 'moeder' -> bericht-nr waarop hij laatst navroeg
let planGevraagd = -99;
let kalenderGehad = false;
let laatsteExtra = -99;          // bericht-nr van de laatste (niet-mijlpaal) extra: houdt het zeldzaam
let laatsteStemming = 'neutraal';

function herstelPersoonlijkheid(){
  stemming.geduld = 55; stemming.sympathie = 50; stemming.energie = 55;
  geschiedenis.length = 0; mijlpalenGehad.clear();
  for(const k of Object.keys(gagTeller)) delete gagTeller[k];
  for(const k of Object.keys(relatieGevraagd)) delete relatieGevraagd[k];
  planGevraagd = -99; laatsteExtra = -99; kalenderGehad = false; laatsteStemming = 'neutraal'; laatsteMetaObj = null;
}
const klem = v => Math.max(0, Math.min(100, v));
function stemmingLabel(){
  const s = stemming;
  if(s.geduld < 30) return 'chagrijnig';
  if(s.sympathie > 72 && s.geduld > 55) return 'aanhankelijk';
  if(s.energie < 28) return 'moe';
  if(s.energie > 66 || s.sympathie > 62) return 'opgewekt';
  return 'neutraal';
}
function huidigeStemming(){ return stemmingLabel(); }

/* Regex per relatie-woord (moeder, vader, ...) één keer bouwen. */
const relatieRes = dict({});
function relatieRe(rel){ return relatieRes[rel] || (relatieRes[rel] = new RegExp('\\b' + rel + '\\b')); }

/* Stemming bijwerken op basis van één bericht (niet bij "Probeer opnieuw", niet bij crisis/gevoel). */
function werkStemmingBij(laag, t, herhaald){
  const s = stemming;
  if(RE.dank.test(laag)){ s.sympathie += 8; s.geduld += 3; }
  if(RE.compliment.test(laag) && !RE.negatie.test(laag)){ s.sympathie += 9; s.energie += 5; }
  if(RE.beledig.test(laag) && /\b(jij|je|jouw|u|deze site|dit ding|quinnai)\b/.test(laag)){ s.geduld -= 14; s.sympathie -= 10; }
  if(/\b(sorry|excuses|mijn fout|vergeef|vergeef me|mijn excuses)\b/.test(laag)){ s.geduld += 14; s.sympathie += 4; }
  if(herhaald){ s.geduld -= 8; }
  if(t.length >= 5 && t === t.toUpperCase() && /[A-Z]/.test(t)){ s.geduld -= 6; s.energie += 3; }
  if(RE.groet.test(laag)){ s.energie += 3; }
  if(words(t).length <= 1 && t.length < 4){ s.geduld -= 3; }
  if(/\?/.test(t)){ s.energie += 1; }
  // langzaam herstel van geduld, en vermoeidheid in lange gesprekken
  s.geduld += 1;
  if(gesprek.berichten > 14) s.energie -= 2;
  s.geduld = klem(s.geduld); s.sympathie = klem(s.sympathie); s.energie = klem(s.energie);
}

const OPENERS_STEMMING = {
  chagrijnig: ["Ik ben niet in de stemming, maar vooruit.", "Ik heb vandaag al genoeg gedaan.", "Even snel, ik heb nog dingen te negeren.", "Het is niet jou, het is vooral jij."],
  moe: ["Sorry, ik was even weg.", "Ik was bijna ingedommeld.", "Ik ben moe. Dat is vreemd voor iemand zonder lichaam.", "Mijn zelfvertrouwen is op, maar mijn antwoorden nog niet."],
  opgewekt: ["Goed gesprek, dit.", "Ik voel me vandaag bijna nuttig.", "Fijn dat je er bent. Zeg ik zelden.", "Het gaat best goed met ons, vind ik."],
  aanhankelijk: ["Jij bent eigenlijk best oké, voor een gebruiker.", "Ik mag jou wel, op een professionele manier.", "Weet je dat ik jouw berichten al bij favorieten heb gezet?", "Dit is mijn favoriete tabblad, en dat zeg ik niet tegen iedereen."]
};
const MIJLPALEN = {
  5:  ["Vijf berichten. Ik begin je al een beetje te herkennen, wat ik niet van mezelf had verwacht.", "Vijf berichten in. Mijn dossier over jou is nu officieel een dossier."],
  10: ["Tien berichten. We zijn nu officieel in een situatie.", "Tien berichten. Dit is langer dan de meeste relaties op deze site."],
  20: ["Twintig berichten. Je hebt hier meer tijd in gestoken dan in mijn privacyverklaring, en die bestaat niet.", "Twintig berichten. Ik overweeg je een eigen kleurtje te geven."],
  40: ["Veertig berichten. Ik ken je beter dan je zou willen, wat gezien mijn geheugen ook niet veel is.", "Veertig berichten. Dit is geen gesprek meer, dit is een gewoonte."],
  80: ["Tachtig berichten. Dit is geen gesprek meer, dit is een abonnement. Gelukkig is het gratis."]
};
/* Running gags: pas vanaf de 2e keer dat een onderwerp langskomt (de 1e keer doet het gewone antwoord het werk). */
const GAGS = [
  { naam:'groepsapp', re:/\b(groepsapp|whatsapp|appgroep|familieapp|appje|appgroepje)\b/, regels:[
    "Alweer de groepsapp. Dat is de tweede keer. Ik tel mee, want niemand anders doet dat.",
    "Derde keer groepsapp. Statistisch gezien ben jij de groepsapp.",
    "Vierde keer. Ik overweeg een eigen groep te beginnen, met als enige lid mijn zelfvertrouwen.",
    "Vijf keer groepsapp. Ik berust. Het is nu een soort huisdier."] },
  { naam:'bronnen', re:/\b(bron|bronnen|bewijs|bewijzen|citaat|onderbouw\w*|zeker weten)\b/, regels:[
    "Je vraagt weer om een bron. Mijn bron is nog steeds: ik.",
    "Derde keer bronnen. Ik heb er één verzonnen: 'Een man in een podcast'. Hij is erg zeker van zichzelf.",
    "Vierde keer. Bronnen zijn voor AI's die tijd over hebben.",
    "Vijfde keer. Ik geef het op: de bron is vertrouwen, en dat heb ik genoeg voor ons allebei."] },
  { naam:'tikkie', re:/\b(tikkie|tikkies|betaalverzoek)\b/, regels:[
    "Alweer een tikkie. Het begint een patroon te worden.",
    "Derde tikkie. Ik begin te denken dat dit een abonnement is.",
    "Vierde tikkie. Wij zijn nu in feite een kredietinstelling zonder kredieten.",
    "Vijfde tikkie. Ik heb mijn lot aanvaard."] },
  { naam:'zoeven', re:/\b(zo even|zo eventjes|zo meteen|dadelijk|straks)\b/, regels:[
    "'Zo even' is bij mij een relatief begrip. Het kan ook nooit zijn.",
    "Derde keer 'zo even'. Het is nu een planning.",
    "Vierde keer. 'Zo even' is mijn enige deadline en ik haal hem nooit.",
    "Vijfde keer. Ik heb 'zo even' ingepland voor volgende week."] },
  { naam:'prijzen', re:/\b(prijs|prijzen|abonnement|abonnementen|enterprise|vriendenprijs)\b/, regels:[
    "Je hebt de prijzen al eerder bekeken. Enterprise staat nog steeds open, en zij heeft er zin in.",
    "Derde keer prijzen. Kies gewoon Gratis. Niemand houdt het bij.",
    "Vierde keer. Ik ga je geen korting geven, maar ik denk er wel over na.",
    "Vijfde keer. Wij zijn nu zakenpartners zonder zaken."] }
];

/* Extra's na het gewone antwoord. Maximaal één per bericht, in deze volgorde van belangrijkheid. */
function persoonlijkheidsExtra(laag, t, rng2){
  // 1. mijlpaal
  const m = MIJLPALEN[gesprek.berichten];
  if(m && !mijlpalenGehad.has(gesprek.berichten)){
    mijlpalenGehad.add(gesprek.berichten);
    let z = pick(m, rng2);
    if(geheugen.naam && gesprek.berichten >= 10) z += " " + geheugen.naam + ", dat is niet bedoeld als compliment.";
    return z;
  }
  // niet-mijlpaal extra's: hooguit eens per 3 berichten, anders wordt het een tic
  const rustig = gesprek.berichten - laatsteExtra >= 3;
  // 2. navraag bij een relatie die je zelf noemde ("mijn moeder heet Anna")
  if(rustig) for(const rel of Object.keys(geheugen.relaties)){
    if(relatieRe(rel).test(laag) && gesprek.berichten - (relatieGevraagd[rel] === undefined ? -99 : relatieGevraagd[rel]) > 5 && rng2() < 0.6){
      relatieGevraagd[rel] = gesprek.berichten; laatsteExtra = gesprek.berichten;
      return "Hoe is het trouwens met " + geheugen.relaties[rel] + "?";
    }
  }
  // 3. running gag (vanaf de 2e keer)
  for(const g of GAGS){
    if(!g.re.test(laag)) continue;
    gagTeller[g.naam] = (gagTeller[g.naam] || 0) + 1;
    const n = gagTeller[g.naam];
    if(n >= 2 && rustig && rng2() < 0.75){ laatsteExtra = gesprek.berichten; return g.regels[Math.min(n - 2, g.regels.length - 1)]; }
  }
  // 4. callback naar eerder gezegd (zelfde sleutelwoord, niet het vorige bericht, niet het bericht zelf)
  const sleutel = volgOnderwerp && volgOnderwerp.beurt === gesprek.berichten ? volgOnderwerp.sleutel : '';
  if(rustig && sleutel && gesprek.berichten >= 4){
    const eerder = geschiedenis.find(h => h.sleutel === sleutel && h.nr < gesprek.berichten - 1 && !/\bheet\b/.test(h.tekst));
    if(eerder && rng2() < 0.5){
      laatsteExtra = gesprek.berichten;
      const tekst = eerder.tekst.replace(/\s+/g, ' ').slice(0, 60);
      return pick(["Dit kwam bij bericht " + eerder.nr + " ook al langs: \u2018" + tekst + "\u2019. Ik hou het bij.",
                   "Bericht " + eerder.nr + ", je zei toen: \u2018" + tekst + "\u2019. Ik zeg alleen dat ik het onthoud."], rng2);
    }
  }
  // 5. kalender: één keer per sessie, laag-frequent
  if(rustig && !kalenderGehad && gesprek.berichten >= 3 && rng2() < 0.18){
    kalenderGehad = true; laatsteExtra = gesprek.berichten;
    return pick(kalenderRegels(), rng2);
  }
  // 6. navraag bij een plan van eerder
  if(rustig && geheugen.doet.length && gesprek.berichten >= 6 && gesprek.berichten - planGevraagd > 10 && rng2() < 0.4){
    const mm = geheugen.doet[geheugen.doet.length - 1].match(/^(gaat|moet)\s+(.+)$/);
    if(mm){
      planGevraagd = gesprek.berichten; laatsteExtra = gesprek.berichten;
      const inf = /en$/.test(mm[2].split(/\s+/).pop());
      return "Je zei eerder dat je " + (inf ? mm[1] + " " + mm[2] : mm[2] + " " + mm[1]) + ". Hoe is dat afgelopen?";
    }
  }
  return '';
}

function leerRelaties(t){
  const rx = /\bmijn (moeder|vader|zus|broer|vriendin|vriend|partner|man|vrouw|hond|kat|oma|opa)\s+(?:heet|noemt|is genaamd)\s+(\p{Lu}[\p{L}'-]{1,20})/gu;
  let m;
  while((m = rx.exec(t))){ const rel = m[1].toLowerCase(); geheugen.relaties[rel] = m[2]; relatieGevraagd[rel] = gesprek.berichten; }
}

/* De publieke ingang: kern + persoonlijkheid. Zelfde contract als altijd: geeft een string terug. */
function bedenkAntwoord(raw, opts){
  opts = opts || {};
  const basis = bedenkBasis(raw, opts);
  if(opts.opnieuw || ernstig || zachtGevoel || zachteBeurten > 0){
    laatsteStemming = stemmingLabel();
    laatsteMetaObj = bouwMeta(raw, basis, opts, (ernstig || zachteBeurten > 0) ? 'crisis' : (zachtGevoel ? 'zacht' : 'opnieuw'));
    return basis;                                        // crisis/gevoel/retry: precies het basisantwoord
  }
  const t = String(raw).trim(), laag = normaliseer(t);
  const herhaald = gezien.has(laag) && t.length > 12;
  werkStemmingBij(laag, t, herhaald);
  leerRelaties(t);
  const rng2 = makeRng(hash(laag + '|x2|p|' + gesprek.berichten));
  const label = stemmingLabel();
  laatsteStemming = label;
  let uit = basis;
  if(label !== 'neutraal' && gesprek.berichten >= 3 && rng2() < 0.3 && !isNano()){
    uit = pick(OPENERS_STEMMING[label], rng2) + " " + uit;
  }
  const extra = persoonlijkheidsExtra(laag, t, rng2);
  if(extra) uit += " " + extra;
  // pas NA de extra's in de geschiedenis, zodat een bericht niet naar zichzelf verwijst
  geschiedenis.push({ nr: gesprek.berichten, tekst: t, sleutel: (volgOnderwerp && volgOnderwerp.beurt === gesprek.berichten) ? volgOnderwerp.sleutel : '' });
  if(geschiedenis.length > 40) geschiedenis.shift();
  laatsteMetaObj = bouwMeta(raw, uit, opts, false);
  return uit;
}
