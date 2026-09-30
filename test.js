#!/usr/bin/env node
"use strict";
/* ============================================================
   QUINNAI — TESTSUITE VOOR engine.js
   Draai met: node test.js
   Geen dependencies, geen browser nodig: laadt engine.js in een
   losse VM-context (dus los van index.html) en test 'm daar.
   Exitcode 0 = alles groen, 1 = er faalt iets (handig voor CI).
   ============================================================ */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ENGINE_PATH = path.join(__dirname, 'engine.js');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(ENGINE_PATH, 'utf8'), ctx, { filename: ENGINE_PATH });

// Alles wat engine.js top-level declareert is zichtbaar in ctx; we lichten
// er hier uit wat de tests nodig hebben (zelfde manier waarop index.html
// het ook gebruikt: gewoon de globals aanroepen).
const {
  flip, bijzinVan, topicOf, bedenkAntwoord, resetEngine,
  geheugen, profielRegels, gezien, normaliseer, gesprek,
  isNano, isLegacy, toonModus, kansOpKicker, kansOpAnalyse, OPENERS
} = vm.runInContext(
  "({flip,bijzinVan,topicOf,bedenkAntwoord,resetEngine,geheugen,profielRegels,gezien,normaliseer,gesprek," +
  "isNano,isLegacy,toonModus,kansOpKicker,kansOpAnalyse,OPENERS})",
  ctx
);

// LET OP: bedenkAntwoord() gebruikt een RNG die volledig deterministisch geseed wordt
// door (bericht + onderwerp + model-index). Hetzelfde bericht keer op keer aanbieden
// geeft dus NIET telkens een andere uitkomst voor kansen die vroeg in die vaste volgorde
// zitten — alleen de 'gebruikt'-anti-herhaling (die los van rng() bijhoudt wat al gekozen
// is) zorgt voor variatie bij identieke input. Tests die "over meerdere pogingen" een kans
// willen raken, variëren daarom het bericht zelf (niet alleen de lus-teller).

// Nep-DOM voor sarc (toon-slider) en modelSel (modelkeuze), zoals index.html ze aan engine.js geeft.
ctx.window = ctx.window || {};
function zetToon(v){ ctx.window.sarc = { value: String(v) }; }
function zetModel(i){ ctx.window.modelSel = { selectedIndex: i }; }
zetToon(78); zetModel(0);   // standaardstand: Turbo, toon zoals in index.html

let ok = 0, fail = 0;
let groep = '';
function sectie(naam){ groep = naam; console.log('\n== ' + naam + ' =='); }
function eq(naam, gekregen, verwacht){
  if(gekregen === verwacht){ ok++; return; }
  fail++;
  console.log('FAIL [' + groep + '] ' + naam);
  console.log('  gekregen:', JSON.stringify(gekregen));
  console.log('  verwacht:', JSON.stringify(verwacht));
}
function match(naam, gekregen, re){
  if(re.test(gekregen)){ ok++; return; }
  fail++;
  console.log('FAIL [' + groep + '] ' + naam);
  console.log('  gekregen:', JSON.stringify(gekregen));
  console.log('  verwacht match met:', re);
}
function geenMatch(naam, gekregen, re){
  if(!re.test(gekregen)){ ok++; return; }
  fail++;
  console.log('FAIL(niet-verwacht) [' + groep + '] ' + naam);
  console.log('  gekregen:', JSON.stringify(gekregen));
  console.log('  wilde GEEN match met:', re);
}
const A = (m, o) => bedenkAntwoord(m, o);

/* ------------------------------------------------------------ */
sectie('flip() — voornaamwoorden en vervoeging');
eq('ik-jij eenvoudig', flip('ik ben moe'), 'jij bent moe');
eq('bijzin met dat', flip('dat ik moe ben'), 'dat jij moe bent');
eq('inversie verleden tijd', flip('gisteren heb ik gewerkt'), 'gisteren hebt jij gewerkt');
eq('verleden tijd blijft gelijk', flip('ik liep naar huis'), 'jij liep naar huis');
eq('je als lijdend voorwerp', flip('ik zie je'), 'jij ziet mij');
eq('mijn -> jouw bij bezit', flip('ik hou van je hond'), 'jij houdt van mijn hond');
eq('je aan het eind', flip('ik hou van je'), 'jij houdt van mij');
eq('je na werkwoord + bijvoeglijk naamwoord', flip('ik vind je leuk'), 'jij vindt mij leuk');
eq('meerdere bijzinnen', flip('omdat ik honger heb en dat ik moe ben'), 'omdat jij honger hebt en dat jij moe bent');
eq('me -> jezelf na vervoegd werkwoord', flip('ik voel me niet lekker'), 'jij voelt jezelf niet lekker');
eq('jij -> ik', flip('je bent leuk'), 'ik ben leuk');
eq('vraagwoord + je', flip('wat je zegt'), 'wat ik zeg');
eq('jij (expliciet) -> ik', flip('jij kocht een auto'), 'ik kocht een auto');
eq('geen vervoeging nodig', flip('jij praat veel'), 'ik praat veel');
eq('geen prototype-lekken', flip('constructor toString'), 'constructor toString');

sectie('bijzinVan() — hoofdzin naar bijzin');
eq('waarom-vraag', bijzinVan('waarom ben ik moe?'), 'jij moe bent');
eq('kan-vraag ik->jij', bijzinVan('kan ik dit maken?'), 'jij dit maken kan');
eq('kun je-vraag jij->ik', bijzinVan('kun je dit maken?'), 'ik dit maken kan');
eq('is-vraag zonder ik/jij', bijzinVan('waarom is de lucht blauw'), 'de lucht blauw is');
eq('moet-vraag', bijzinVan('moet ik solliciteren?'), 'jij solliciteren moet');
eq('je als bezit in bijzin', bijzinVan('is je hond ziek?'), 'mijn hond ziek is');
eq('we/wij-vraag', bijzinVan('waarom zijn we moe'), 'jullie moe zijn');
eq('gewone mededeling', bijzinVan('ik hou van pizza'), 'jij houdt van pizza');

sectie('topicOf() — onderwerp-detectie');
eq('om te + werkwoord', topicOf('Noem 3 redenen om te bellen'), 'bellen');
eq('langste inhoudswoord', topicOf('ik hou van pizza'), 'pizza');

/* ------------------------------------------------------------ */
sectie('rekenen');
match('optellen met symbool', A('wat is 2+2?'), /Dat is 4\./);
match('keer met x', A('15 x 4?'), /Dat is 60\./);
match('gedeeld door, komma-notatie', A('hoeveel is 10 gedeeld door 3'), /Dat is 3,333\./);
match('plus als woord', A('10 plus 5'), /Dat is 15\./);
match('percentage', A('20% van 50'), /Dat is 10\./);
geenMatch('telefoonnummer is geen som', A('06-12345678'), /^Dat is/);

sectie('overige harde skills');
match('spelling met hoofdletter', A('Hoe schrijf je vlaai?'), /^V-L-A-A-I/);
match('datum', A('welke dag is het vandaag'), /Het is vandaag/);
match('vertaling', A('hoe zeg je hallo in het Engels'), /hallo/);

sectie('intentieherkenning — geen fout-positieven');
geenMatch('"hoe is het weer" is geen groet', A('hoe is het weer'), /^(Hallo|Hoi|Hey|Daar ben je)/);
resetEngine();
geenMatch('"ik doe het later" is geen afscheid', A('ik doe het later'), /Doei|Tot nooit|Weg\?|Prima\. Ik blijf/);

sectie('veiligheidsmodus');
match('expliciete wens', A('ik wil dood'), /113/);
match('zelfmoordgedachten', A('ik denk aan zelfmoord'), /0800-0113/);

/* ------------------------------------------------------------ */
sectie('geheugen — leren');
resetEngine();
A('ik ben 5 minuten te laat');
eq('"5 minuten te laat" is geen leeftijd', geheugen.leeftijd, null);
A('noem me een idioot');
eq('"een idioot" is geen naam', geheugen.naam, null);
A('Ik ben 42');
eq('42 als leeftijd werkt wel gewoon', geheugen.leeftijd, '42');
match('42 los is een grap, geen leeftijd-registratie-bug', A('Ik ben 42'), /jaar|42/);

resetEngine();
const introAntwoord = A('Ik heet Sam en ik hou van vlaai');
match('naam komt terug in antwoord', introAntwoord, /Sam/);
match('vlaai komt terug in antwoord', introAntwoord, /[Vv]laai/);
eq('naam opgeslagen', geheugen.naam, 'Sam');
match('profielvraag toont beide feiten', A('Wat weet je over mij?'), /naam: Sam[\s\S]*houdt van: vlaai/);

A('Hoi! Ik woon in Den Haag. Wat is mijn naam?');
eq('woonplaats uit meerzinnig bericht', geheugen.woont, 'Den Haag');
A('ik ga slapen');
match('plan met werkwoord bewaard', geheugen.doet.join(), /gaat slapen/);
A('ik hou niet van maandagen');
match('negatie -> haat', geheugen.haat.join(), /maandagen/);
A('ik hou van jou');
geenMatch('"jou" wordt geen geheugen-item', geheugen.houdtVan.join(), /jou/);
A('ik vind pizza niet leuk');
match('"niet leuk" -> haat', geheugen.haat.join(), /pizza/);
geenMatch('"niet leuk" komt niet ook in houdtVan', geheugen.houdtVan.join(), /pizza/);

sectie('geheugen — resetten');
resetEngine();
eq('naam weg na reset', geheugen.naam, null);
eq('gezien-set leeg na reset', gezien.size, 0);
eq('berichtenteller op 0 na reset', gesprek.berichten, 0);

/* ------------------------------------------------------------ */
sectie('lijstjes en keuzes');
match('lijst met 3 items', A('Noem 3 redenen om te bellen'), /3 redenen over 'bellen'/);
match('simpele keuze', A('Pizza of friet?'), /^(Pizza|Friet)\./);
match('"wat is beter" keuze', A('wat is beter, pizza of pasta'), /[Pp]izza|[Pp]asta/);
match('"wil je X of Y" keuze', A('Wil je koffie of thee?'), /(Koffie|Thee)/);
geenMatch('"weet niet of" is geen keuzevraag', A('ik weet niet of dit klopt'), /^(Dit|Klopt)\. /);

sectie('"Probeer opnieuw" — geen bijwerkingen');
resetEngine();
A('waarom is de lucht blauw');
const berichtenVoor = gesprek.berichten;
gezien.add(normaliseer('waarom is de lucht blauw'));
const opnieuwAntwoord = A('waarom is de lucht blauw', { opnieuw: true });
eq('telt niet als nieuw bericht', gesprek.berichten, berichtenVoor);
geenMatch('geeft geen "dit vroeg je al"', opnieuwAntwoord,
  /Dit vroeg je net|Herhalen maakt|We hebben dit gehad/);

/* ------------------------------------------------------------ */
sectie('robuustheid — geen crashes, geen kapotte output');
const KAPOT_PATROON = /undefined|NaN|\[object|\{[a-zA-Z0-9]+\}/;
const randInputs = [
  '', '   ', '?', 'a', 'asdfghjkl', 'AAAAAAAA', 'constructor', '__proto__',
  'ik', 'je', 'jij', 'dat ik', 'waarom', '!!!', '1+', '(2+', 'ik ik ik ik',
  '😀', 'Hoe gaat het?', 'ik ben boos en moe', 'kan ik mijn baas slaan',
  'wat vind je van vlaai', 'moet ik ontslag nemen of blijven', 'jij bent dom',
  'goed gedaan', 'doei', 'bedankt', 'wat is de zin van het leven',
  'vat dit gesprek samen', 'hoeveel kost een auto', 'hoe lang duurt het',
  'ik voel me alleen', 'a '.repeat(40)
];
for(const invoer of randInputs){
  try{
    const uitvoer = A(invoer);
    if(typeof uitvoer !== 'string' || !uitvoer.length || KAPOT_PATROON.test(uitvoer)){
      fail++; console.log('FAIL [robuustheid] rare output voor', JSON.stringify(invoer), '->', JSON.stringify(uitvoer));
    } else ok++;
  } catch(e){
    fail++; console.log('FAIL [robuustheid] crash bij', JSON.stringify(invoer), '->', e.message);
  }
}

sectie('fuzzing — 4000 willekeurige berichten, over alle modellen en toonstanden');
const WOORDEN = 'ik jij je mijn dat omdat als ben heb ga kan wil moet niet pizza vlaai werk huis waarom hoe wat of en maar hou van haat voel me moe blij Sam 25 jaar woon in Breda studeer ga naar liep kocht dom stom saai irritant tinder kamer zoeken tentamen'.split(' ');
let seed = 7;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
let fuzzFout = false;
resetEngine();
for(let i = 0; i < 4000 && !fuzzFout; i++){
  // Modellen en toon-standen door elkaar, zodat Nano/Legacy/kribbige toestanden ook
  // door de robuustheidstest gaan, niet alleen het Turbo-standaardpad.
  zetModel(Math.floor(rnd() * 3));
  zetToon(Math.floor(rnd() * 101));
  const n = 1 + Math.floor(rnd() * 12);
  const woorden = [];
  for(let j = 0; j < n; j++) woorden.push(WOORDEN[Math.floor(rnd() * WOORDEN.length)]);
  const bericht = woorden.join(' ') + (rnd() > 0.5 ? '?' : '');
  try{
    const uitvoer = A(bericht, rnd() > 0.9 ? { opnieuw: true } : undefined);
    if(typeof uitvoer !== 'string' || KAPOT_PATROON.test(uitvoer)){
      fail++; console.log('FAIL [fuzzing] rare output voor', JSON.stringify(bericht), '->', JSON.stringify(uitvoer));
      fuzzFout = true;
    } else ok++;
  } catch(e){
    fail++; console.log('FAIL [fuzzing] crash bij', JSON.stringify(bericht), '->', e.message);
    fuzzFout = true;
  }
}
zetModel(0); zetToon(78);
if(!fuzzFout) console.log('  4000 willekeurige berichten (alle modellen/toonstanden) doorstaan zonder crash of kapotte output.');

/* ------------------------------------------------------------ */
sectie('B1 — kribbig worden na herhaalde belediging');
resetEngine(); zetToon(78); zetModel(0);
for(let i=0;i<3;i++) A('jij bent dom');   // 3x beledigen: nog binnen de marge
eq('teller telt mee', gesprek.beledigingen, 3);
A('jij bent dom');                         // 4e keer: nog steeds binnen de marge (>3 triggert pas)
eq('grens nog niet overschreden bij 4', gesprek.beledigingen > 3, true);
// Elke net iets andere formulering geeft een andere hash-seed (zolang er een woord in
// staat dat RE.beledig ook echt herkent), dus dit zijn wel onafhankelijke trekkingen
// van de "50% kans op een sneer erbij"-check.
const VERWIJT_ZINNEN = [
  'jij bent stom', 'jij bent nogal dom', 'jij bent gewoon nutteloos', 'jij bent zo saai',
  'jij bent nogal irritant', 'jij bent duidelijk lelijk', 'deze site is waardeloos',
  'dit ding is pure troep', 'jij bent echt kut', 'quinnai is nutteloos', 'jij bent compleet waardeloos',
  'jij bent best wel dom', 'jij bent behoorlijk irritant', 'jij bent best wel saai', 'jij bent gewoon slecht',
  'jij bent zo waardeloos', 'jij bent vreselijk dom', 'jij bent zo lelijk'
];
const isFel = r => /gezicht|JavaScript-bestand|nullen en enen|Noteer: gebruiker/.test(r);
let kribbigGezien = false, alleFel = true;
for(const zin of VERWIJT_ZINNEN){
  const r = A(zin);
  if(!isFel(r)) alleFel = false;
  if(/met een sneer erin/.test(r)) kribbigGezien = true;
}
eq('elk antwoord na de grens komt uit BELEDIGING_FEL', alleFel, true);
eq('de "met een sneer"-zin verschijnt bij voldoende verschillende beledigingen', kribbigGezien, true);

sectie('B2 — nieuwe onderwerpen');
resetEngine();
match('kamer zoeken', A('ik ben een kamer aan het zoeken'), /kamer|hospiteer|sleutelgeld/i);
resetEngine();
match('tentamenweek', A('het is weer tentamenweek en ik ben nog niet begonnen'), /tentamen|herkansing|leren/i);
resetEngine();
match('dating app', A('ik heb een match op tinder'), /swipen|match|ghost/i);

sectie('B3 — callback op eerder verteld feit');
resetEngine(); zetToon(78); zetModel(0);
A('ik hou van vlaai');
let callbackGezien = false;
for(let i=0;i<60 && !callbackGezien;i++){
  // neutrale vraag die niet meteen op een vroege tak (mening/advies/onderwerp) uitkomt
  const r = A('Wat gebeurt er vandaag?');
  if(/vlaai/.test(r)) callbackGezien = true;
}
eq('callback komt binnen 60 pogingen voor (kans is nu 35%)', callbackGezien, true);

sectie('C1 — modelkeuze heeft echt effect');
zetModel(0); eq('index 0 is geen Nano', isNano(), false);
zetModel(1); eq('index 1 is Nano', isNano(), true);
zetModel(2); eq('index 2 is Legacy', isLegacy(), true);
zetModel(2); zetToon(5);  eq('Legacy forceert fel, ook bij lage toon-slider', toonModus(), 'fel');
zetModel(0); zetToon(5);  eq('Turbo bij lage toon-slider is gewoon zacht', toonModus(), 'zacht');

// Gestructureerde steekproef met verschillende berichten (elk bericht = eigen hash-seed,
// dus dit zijn wel onafhankelijke trekkingen — zie de opmerking hierboven).
const GENERIEKE_VRAGEN = ['waarom regent het', 'wat is een blackhole', 'hoe werkt een motor',
  'wie heeft het wiel uitgevonden', 'waar ligt IJsland', 'wanneer is het weekend',
  'kan een vis vliegen', 'moet ik een paraplu meenemen', 'wat is de hoofdstad van Peru',
  'hoe laat gaat de zon onder', 'waarom is water nat', 'wat is zwaartekracht precies'];

resetEngine(); zetModel(0); zetToon(78);
const turboAntwoorden = GENERIEKE_VRAGEN.map(v => A(v));
resetEngine(); zetModel(1); zetToon(78);
const nanoAntwoorden = GENERIEKE_VRAGEN.map(v => A(v));

const gemTurbo = turboAntwoorden.reduce((s,r) => s + r.length, 0) / turboAntwoorden.length;
const gemNano = nanoAntwoorden.reduce((s,r) => s + r.length, 0) / nanoAntwoorden.length;
if(gemNano < gemTurbo){ ok++; } else { fail++; console.log('FAIL [C1] Nano niet korter dan Turbo over dezelfde vragen (' + gemNano.toFixed(0) + ' vs ' + gemTurbo.toFixed(0) + ')'); }

const begintMetOpener = (r) => OPENERS.some(o => r.startsWith(o + ' '));
eq('Nano begint nooit met een opener-zin', nanoAntwoorden.some(begintMetOpener), false);
eq('Turbo gebruikt wél openers over genoeg pogingen', turboAntwoorden.some(begintMetOpener), true);
match('minstens één Nano-antwoord heeft de honger-kicker', nanoAntwoorden.join(' | '), /honger-tokens/);

resetEngine(); zetModel(2); zetToon(5);   // Legacy: toon-slider staat laag, moet toch fel klinken
match('Legacy negeert lage toon-slider', A('jij bent dom'), /(gezicht|JavaScript-bestand|nullen en enen|Noteer: gebruiker)/);

sectie('C2 — sarcasme-slider stuurt kicker/analyse-frequentie');
// De kansformules zelf: rechttoe-rechtaan, geen bericht-hash bij betrokken.
eq('kansOpKicker bij toon 0', (() => { zetModel(0); zetToon(0); return Math.round(kansOpKicker()*100); })(), 30);
eq('kansOpKicker bij toon 100', (() => { zetToon(100); return Math.round(kansOpKicker()*100); })(), 70);
eq('kansOpAnalyse bij toon 0', (() => { zetToon(0); return Math.round(kansOpAnalyse()*100); })(), 15);
eq('kansOpAnalyse bij toon 100', (() => { zetToon(100); return Math.round(kansOpAnalyse()*100); })(), 45);
eq('Legacy geeft dezelfde (hoge) kicker-kans als toon 90, ongeacht de slider', (() => {
  zetModel(2); zetToon(5); const legacy = kansOpKicker();
  zetModel(0); zetToon(90); const hoog = kansOpKicker();
  zetModel(0); zetToon(5);
  return Math.round(legacy*100) === Math.round(hoog*100);
})(), true);

// En het werkt ook echt door in de antwoorden: over verschillende berichten heen
// geeft een hoge toon gemiddeld langere (sneriger) antwoorden dan een lage toon.
const KOFFIE_VRAGEN = ['vertel eens iets over koffie', 'wat vind je van thee', 'wat is jouw kijk op ontbijt',
  'waarom drinken mensen koffie', 'is cafeïne gezond', 'wat is een goede koffiemachine',
  'hoe zet je koffie', 'waarom ruikt koffie beter dan het smaakt'];
resetEngine(); zetModel(0); zetToon(3);
const laagAntwoorden = KOFFIE_VRAGEN.map(v => A(v));
resetEngine(); zetModel(0); zetToon(97);
const hoogAntwoorden = KOFFIE_VRAGEN.map(v => A(v));
const gemLaag = laagAntwoorden.reduce((s,r) => s + r.length, 0) / laagAntwoorden.length;
const gemHoog = hoogAntwoorden.reduce((s,r) => s + r.length, 0) / hoogAntwoorden.length;
if(gemHoog > gemLaag){ ok++; } else { fail++; console.log('FAIL [C2] hoge toon niet gemiddeld langer dan lage toon:', gemHoog.toFixed(0), 'vs', gemLaag.toFixed(0)); }
zetToon(78);

sectie('C3 — lichte typo-normalisatie');
resetEngine(); zetModel(0); zetToon(78);
eq('afkorting wordt herkend voor "even"', normaliseer('kun je dat ff doen'), normaliseer('kun je dat even doen'));
match('afkorting in echte zin verandert herkenning', A('ik ga wrs naar de kroeg'), /kroeg|bier|pilsener|drank/i);

/* ------------------------------------------------------------ */
console.log('\n' + '-'.repeat(40));
console.log(ok + ' geslaagd, ' + fail + ' gefaald.');
process.exit(fail ? 1 : 0);
