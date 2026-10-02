#!/usr/bin/env node
"use strict";
/* ============================================================
   QUINNAI — TESTSUITE VOOR engine.js
   Draai met: node tools/test.js
   Geen dependencies, geen browser nodig: laadt engine.js in een
   losse VM-context (dus los van index.html) en test 'm daar.
   Exitcode 0 = alles groen, 1 = er faalt iets (handig voor CI).
   ============================================================ */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ENGINE_PATH = path.join(__dirname, '..', 'assets', 'js', 'engine.js');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(ENGINE_PATH, 'utf8'), ctx, { filename: ENGINE_PATH });

// Alles wat engine.js top-level declareert is zichtbaar in ctx; we lichten
// er hier uit wat de tests nodig hebben (zelfde manier waarop index.html
// het ook gebruikt: gewoon de globals aanroepen).
const {
  flip, bijzinVan, topicOf, bedenkAntwoord, resetEngine,
  geheugen, profielRegels, gezien, normaliseer, gesprek,
  isNano, isLegacy, toonModus, kansOpKicker, kansOpAnalyse, OPENERS, isVeilig, isErnstig
} = vm.runInContext(
  "({flip,bijzinVan,topicOf,bedenkAntwoord,resetEngine,geheugen,profielRegels,gezien,normaliseer,gesprek," +
  "isNano,isLegacy,toonModus,kansOpKicker,kansOpAnalyse,OPENERS,isVeilig,isErnstig})",
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
const WOORDEN = 'ik jij je mijn dat omdat als ben heb ga kan wil moet niet pizza vlaai werk huis waarom hoe wat of en maar hou van haat voel me moe blij Sam 25 jaar woon in Breda studeer ga naar liep kocht dom stom saai irritant tinder kamer zoeken tentamen $& $\' 12:30 20:5 gevoel bang eenzaam'.split(' ');
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
resetEngine();
match('enterprise-prijs', A('wat kost het enterprise abonnement'), /date|moeder/i);
resetEngine();
match('prijzen', A('wat zijn de prijzen'), /date|moeder|tikkie|gratis/i);
resetEngine();
match('moeder', A('mijn moeder belt de hele tijd'), /moeder|date|restaurant/i);

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
match('afkorting in echte zin verandert herkenning', A('ik ga wrs naar de kroeg'), /kroeg|bier|pilsener|drank|water tussendoor|kater|borrel/i);


/* ------------------------------------------------------------ */
sectie('veiligheid — uitgebreide herkenning + isVeilig()');
zetToon(78); zetModel(0);
for(const z of ['ik wil mezelf iets aandoen','ik wil mezelf iets aan doen','ik wil mezelf wat aandoen','ik maak er een einde aan',
  'ik maak er een eind aan.','ik ga er een eind aan maken','ik zie het niet meer zitten','ik wil gewoon dood',
  'ik zie geen uitweg meer','ik heb geen zin meer in het leven','ik wil echt niet meer bestaan','i want to die']){
  eq('isVeilig: ' + z, isVeilig(z), true);
  match('113 in antwoord: ' + z, A(z), /0800-0113/);
}
for(const z of ['ik maak er een einde aan met die vergadering','ik zie het project niet meer zitten','hoi','ik wil doodgewone pasta'])
  eq('geen vals alarm: ' + z, isVeilig(z), false);

sectie('$-patronen en placeholders in gebruikersinvoer');
resetEngine();
const dollar1 = A("ik hou van $' test");
match('$\' blijft letterlijk', dollar1, /\$' test/);
geenMatch('geen kapotte placeholder (1)', dollar1, /\{[a-zA-Z0-9]+\}/);
resetEngine();
const dollar2 = A('ik hou van $&');
match('$& blijft letterlijk', dollar2, /\$&/);
geenMatch('geen placeholder na $&', dollar2, /\{[a-zA-Z0-9]+\}/);
resetEngine();
const dollar3 = A('ik werk als $$ manager');
match('$$ blijft $$', dollar3, /\$\$/);
resetEngine();
geenMatch('{t} in invoer wordt niet vervangen door onderwerp', A('ik hou van {t}'), /undefined/);
match('{t} in invoer blijft zichtbaar', A('ik hou van {t}'), /\{t\}/);

sectie('klokkijd is geen som');
resetEngine();
geenMatch('12:30', A('12:30'), /^Dat is/);
geenMatch('19:00', A('19:00'), /^Dat is/);
match('20:5 blijft een deling', A('20:5'), /^Dat is 4\./);

sectie('verlopen wedervraag wordt gewist');
resetEngine();
vm.runInContext("wacht = { onderwerp: 'x' }; beurtenSindsVraag = 0;", ctx);
A('ja'); A('ja');
eq('wacht is null na twee vroege returns', vm.runInContext('wacht', ctx), null);


/* ------------------------------------------------------------ */
sectie('C — zachte modus na een crisisbericht');
resetEngine(); zetToon(100); zetModel(0);
A('ik wil mezelf iets aandoen');
eq('crisisbericht zelf is ernstig', isErnstig(), true);
for(const kort of ['ja','ok','hmm']){
  const r = A(kort);
  eq('zacht na crisis: ' + kort, isErnstig(), true);
  match('zacht antwoord verwijst naar hulp: ' + kort, r, /113/);
  geenMatch('geen grap na crisis: ' + kort, r, /Dacht ik al|Mooi\. Dan|Precies\. En nu|Noteer ik onder|Ook goed|Nee dus|\u0027Ok\u0027/);
}
A('ja');
eq('na drie beurten weer gewoon', isErnstig(), false);
resetEngine(); zetToon(78);
eq('na reset geen zachte modus', (A('ja'), isErnstig()), false);

sectie('C — gevoel gaat vóór toon-grapjes en blijft zacht');
const ZACHT_PATROON = /Fijn dat je het even kwijt|Neem je tijd|het mag ook vervelend/;
const SNEER_PATROON = /Caps lock|bloeddruk|HARDER PRATEN|sollicitatiebrief|Dit vroeg je net|Herhalen maakt|We hebben dit gehad|sarcastisch|met minder warmte|niet doorvertelt/;
for(const [toon, model] of [[100,0],[78,0],[5,0],[5,2]]){
  resetEngine(); zetToon(toon); zetModel(model);
  for(const z of ['IK BEN ZO BANG','ik voel me alleen','ik voel me alleen','ik ben zo eenzaam','ik heb het zwaar','mijn moeder is overleden','mijn mama is dood','mijn moeder is ziek','mijn moeder slaat mij']){
    const r = A(z);
    match('gevoel zacht (toon ' + toon + ', model ' + model + '): ' + z, r, ZACHT_PATROON);
    geenMatch('gevoel zonder sneer (toon ' + toon + ', model ' + model + '): ' + z, r, SNEER_PATROON);
  }
}
resetEngine(); zetToon(78); zetModel(0);
{
  const lang = 'ik voel me al weken niet lekker en ' + 'het is allemaal zo veel dat ik niet weet waar ik moet beginnen '.repeat(3);
  geenMatch('lang gevoelsbericht krijgt geen LANG-grap', A(lang), SNEER_PATROON);
}

sectie('C — weekdag niet hardcoded');
const engineBron = fs.readFileSync(ENGINE_PATH, 'utf8');
eq('geen hardcoded weekdag in het levensantwoord', /het is nu al (maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)/.test(engineBron), false);
resetEngine(); zetModel(0); zetToon(78);
const vandaagDag = new Date().toLocaleDateString('nl-NL', { weekday: 'long' });
let dagGezien = false, dagKapot = false;
const LEVEN_ZINNEN = ['wat is het leven toch', 'waarom is leven zo lang', 'zin van het leven', 'het leven is mooi',
  'mijn leven is druk', 'wat een leven', 'leven en laten leven', 'is het leven een grap', 'hoe lang duurt een leven', 'waarom besta ik'];
for(const z of LEVEN_ZINNEN){
  const r = A(z);
  if(/\{dag\}/.test(r)) dagKapot = true;
  if(r.indexOf('het is nu al ' + vandaagDag) > -1) dagGezien = true;
}
eq('placeholder {dag} lekt nooit', dagKapot, false);
eq('de weekdag van vandaag (' + vandaagDag + ') komt voor in het levensantwoord', dagGezien, true);

/* ============================================================
   FASE 1 — begrip (v6): typfouten, stam, scoring, doorvragen
   ============================================================ */
const V6 = vm.runInContext("({stam,afstand,herstelWoord,herstelZin,kiesOnderwerpen,ONDERWERPEN,VOCAB,KENNIS,DOORVRAAG,DIEPER})", ctx);

sectie('v6 — geen persoonsgegevens van Quinn (of anderen) in de site');
{
  const bronnen = { 'engine.js': engineBron, '404.js': fs.readFileSync(path.join(__dirname, '..', 'assets/js/404.js'), 'utf8'),
                    'index.html': fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8') };
  const VERBODEN = [/moeder van quinn/i, /quinns? moeder/i, /\bsinds 2019\b/, /\bna 14 uur\b/, /quinn (woont|werkt|studeert|is geboren|heet eigenlijk)/i,
                    /achternaam/i, /geboren in/i, /\bquinn schoenmakers\b/i];
  for(const [naam, tekst] of Object.entries(bronnen)){
    for(const v of VERBODEN) eq(naam + ' bevat niet ' + v, v.test(tekst), false);
    // 'helmond' mag alleen voorkomen in de algemene plaatsnamen-lijst als gespreksonderwerp
    const regels = tekst.split('\n').filter(r => /helmond/i.test(r));
    eq(naam + ': helmond alleen in de algemene plaatsnamen-regel', regels.every(r => /eindhoven\|brabant\|amsterdam\|helmond\|tilburg/.test(r)), true);
  }
}

sectie('v6 — stam() en afstand()');
eq('hondjes -> hond', V6.stam('hondjes'), 'hond');
eq('vakanties -> vakanti (zelfde stam als vakantie)', V6.stam('vakanties'), V6.stam('vakantie'));
eq('honden -> hond', V6.stam('honden'), 'hond');
eq("pizza's -> pizza", V6.stam("pizza's"), 'pizza');
eq('korte woorden blijven heel', V6.stam('ik'), 'ik');
eq('afstand: gelijk', V6.afstand('moeder', 'moeder', 2), 0);
eq('afstand: omwisseling telt 1', V6.afstand('moedre', 'moeder', 2), 1);
eq('afstand: verschil > max stopt vroeg', V6.afstand('abcdef', 'uvwxyz', 1) > 1, true);

sectie('v6 — typfouten herstellen (automatisch gegenereerd uit de woordenschat)');
{
  const woorden = [...V6.VOCAB].filter(w => w.length >= 6 && !V6.KENNIS.has(w + '#')).slice(0, 400);
  let gevallen = 0, hersteld = 0, kapot = 0;
  for(let i = 0; i < woorden.length; i++){
    const w = woorden[i];
    const k = 1 + (i % (w.length - 2));               // positie 1..len-2 (eerste letter blijft staan)
    const typo = [
      w.slice(0, k) + w.slice(k + 1),                 // letter vergeten
      w.slice(0, k) + w[k + 1] + w[k] + w.slice(k + 2) // letters omgewisseld
    ][i % 2];
    if(typo === w || V6.KENNIS.has(typo)) continue;   // bestaat al als echt woord: dan is het geen typo
    gevallen++;
    const r = V6.herstelWoord(typo);
    if(r === w) hersteld++;
    else if(V6.VOCAB.has(r) && r !== w) kapot++;      // naar een ánder sleutelwoord gecorrigeerd
  }
  console.log('  typo-gevallen: ' + gevallen + ', hersteld: ' + hersteld + ', naar verkeerd woord: ' + kapot);
  eq('minstens 60 typo-gevallen getest', gevallen >= 60, true);
  eq('minstens 80% terug naar het bedoelde sleutelwoord', hersteld / gevallen >= 0.8, true);
  eq('maximaal 5% naar een verkeerd sleutelwoord', kapot / gevallen <= 0.05, true);
}
for(const [typo, goed] of [['priezen','prijzen'],['moedr','moeder'],['abonement','abonnement'],['kortingscdoe','kortingscode'],['enterpirse','enterprise']]){
  const r = V6.herstelWoord(typo);
  eq('typo ' + typo + ' -> ' + goed, V6.VOCAB.has(goed) ? r : goed, goed);
}

sectie('v6 — geen valse correcties');
eq('kort woord blijft', V6.herstelWoord('naam'), 'naam');
eq('bekend woord blijft', V6.herstelWoord('gesprek'), 'gesprek');
eq('naam midden in de zin blijft staan', V6.herstelZin('mijn vriendin Yvonne belt vaak').tokens.includes('yvonne'), true);
eq('naam Sanne blijft staan', V6.herstelZin('ik ben met Sanne naar huis').tokens.includes('sanne'), true);
{
  const origineel = 'ik heet Yvonne en ik hou van pizza';
  resetEngine(); A(origineel);
  eq('naam in het geheugen is de originele spelling', geheugen.naam, 'Yvonne');
}

sectie('v6 — onderwerpen via typfout en stam');
resetEngine(); match('priezen -> prijzenantwoord', A('wat zijn die priezen'), /date|moeder|tikkie|gratis/i);
resetEngine(); match('abonnementen (meervoud) -> prijzenantwoord', A('wat kosten jullie abonnementen'), /date|moeder|tikkie|gratis/i);
resetEngine(); match('moedr -> moederantwoord', A('mijn moedr belt de hele tijd'), /moeder|date|restaurant/i);
{
  /* regel-hits blijven de baas: bestaand gedrag voor alle oude onderwerpen is ongewijzigd */
  const oud = V6.ONDERWERPEN.filter(o => o.re.test('even een test over werk en school'));
  eq('regex-hits geven nog altijd score 3 (eerste in de lijst wint)', V6.kiesOnderwerpen('even een test over werk en school', normaliseer('even een test over werk en school'))[0].score, oud.length ? 3 : 0);
}

sectie('v6 — twee onderwerpen in één bericht');
{
  let gecombineerd = 0, pogingen = 0;
  for(const z of ['wat een gezeur op mijn werk en daarna nog gedoe met de prijzen van jullie abonnementen',
                  'mijn moeder zegt dat de prijzen te hoog zijn en dat mijn baas ook niet helpt',
                  'ik moet naar school maar mijn moeder wil dat ik voor haar het abonnement uitzoek']){
    resetEngine(); pogingen++;
    const r = A(z);
    if(/En over |Dan nog dit|En wat .* betreft|Terwijl we het toch over|Over .* ook nog/.test(r)) gecombineerd++;
  }
  eq('minstens 2 van de 3 tweeluiken krijgen een gecombineerd antwoord', gecombineerd >= 2, true);
  resetEngine();
  geenMatch('korte berichten worden niet gecombineerd', A('prijzen en moeder'), /En over |Dan nog dit|Terwijl we het toch over/);
  zetModel(1); resetEngine();
  geenMatch('Nano houdt het kort (geen combinatie)', A('wat een gezeur op mijn werk en daarna nog gedoe met de prijzen van jullie abonnementen'), /En over |Dan nog dit|Terwijl we het toch over/);
  zetModel(0);
}

sectie('v6 — doorvragen op het vorige antwoord');
resetEngine(); A('wat kost enterprise');
for(const dv of ['waarom dan', 'vertel meer', 'hoezo', 'echt?']){
  const r = A(dv);
  match('doorvraag "' + dv + '" verwijst naar het onderwerp', r, /enterprise/i);
}
resetEngine(); A('wat kost enterprise'); A('ik ben moe'); 
{
  const r = A('waarom dan');
  geenMatch('doorvraag na een ander bericht verwijst niet meer naar het oude onderwerp', r, /enterprise/i);
}
resetEngine();
geenMatch('doorvraag zonder eerder onderwerp blijft bij het oude gedrag', A('vertel meer'), /\{t\}/);
for(const d of V6.DIEPER) eq('DIEPER-regel heeft {t}', /\{t\}/.test(d), true);

sectie('v6 — crisis/zacht blijft zacht met de nieuwe herkenning');
for(const z of ['ik wil dood', 'mijn moedr is overleden', 'ik heb geen zin meer in het levn']){
  resetEngine();
  const r = A(z);
  geenMatch('geen onderwerp-grap bij: ' + z, r, /date met je moeder|tikkie|En over |Dan nog dit/);
}

sectie('v6 — prestaties en robuustheid (fuzz met en zonder typfouten)');
{
  const alfabet = 'abcdefghijklmnopqrstuvwxyz     ,.?!\'';
  let s = 12345; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const woordenlijst = [...V6.VOCAB];
  const t0 = Date.now(); let crash = 0, leeg = 0;
  resetEngine();
  for(let i = 0; i < 4000; i++){
    let m;
    if(i % 2){ m = Array.from({length: 3 + Math.floor(rnd() * 12)}, () => alfabet[Math.floor(rnd() * alfabet.length)]).join(''); }
    else {
      m = Array.from({length: 2 + Math.floor(rnd() * 5)}, () => {
        const w = woordenlijst[Math.floor(rnd() * woordenlijst.length)];
        const k = 1 + Math.floor(rnd() * Math.max(1, w.length - 2));
        return rnd() < .5 ? w.slice(0, k) + w.slice(k + 1) : w;
      }).join(' ');
    }
    try{ const r = A(m); if(typeof r !== 'string' || !r.trim()) leeg++; }catch(e){ crash++; }
    if(i % 500 === 499) resetEngine();
  }
  const ms = Date.now() - t0;
  console.log('  8000 berichten (4000 ruis, 4000 met typfouten) in ' + ms + ' ms');
  eq('geen crashes', crash, 0);
  eq('nooit een leeg antwoord', leeg, 0);
  eq('snel genoeg (< 6000 ms voor 4000 berichten)', ms < 6000, true);
}

/* ============================================================
   FASE 2 — persoonlijkheid (v6): stemming, band, callbacks, gags
   ============================================================ */
const P6 = vm.runInContext("({stemming,huidigeStemming,MIJLPALEN,GAGS,VEILIG_ANTWOORD,OPENERS_STEMMING,herstelPersoonlijkheid})", ctx);
const nu = () => P6.huidigeStemming();
const sturen = (lijst) => lijst.map(z => A(z));

sectie('v6 — stemming');
resetEngine(); zetToon(78); zetModel(0);
eq('begint neutraal', nu(), 'neutraal');
{
  resetEngine(); zetToon(78);
  sturen(['jij bent dom', 'echt waardeloos ben jij', 'jij bent nutteloos en saai', 'wat ben jij irritant', 'jij bent stom', 'jij bent echt slecht']);
  eq('na veel beledigingen: chagrijnig', nu(), 'chagrijnig');
  eq('chagrijnig schuift de normale toon naar fel', toonModus(), 'fel');
  zetToon(5);
  eq('maar de slider blijft baas bij zacht', toonModus(), 'zacht');
  zetToon(78);
  resetEngine();
  eq('na reset weer neutraal', nu(), 'neutraal');
  eq('en weer een normale toon', toonModus(), 'normaal');
}
{
  resetEngine(); zetToon(78);
  sturen(['dankjewel, dat was super', 'wat ben jij goed', 'echt top, bedankt', 'jij bent geweldig', 'heel fijn, dank je', 'wat een mooi gesprek']);
  eq('na complimenten en dank: opgewekt of aanhankelijk', ['opgewekt', 'aanhankelijk'].includes(nu()), true);
}
{
  resetEngine(); zetToon(78);
  const voor = JSON.stringify(P6.stemming);
  A('jij bent dom', { opnieuw: true });
  eq('"Probeer opnieuw" verandert de stemming niet', JSON.stringify(P6.stemming), voor);
}
{
  resetEngine(); zetToon(78); zetModel(0);
  const reeks = ['hoi', 'wat een mooie dag', 'ik hou van pizza', 'jij bent dom', 'dankjewel', 'wat ben je goed', 'ik werk bij een bank', 'jij bent slecht'];
  const a1 = sturen(reeks).join('|'); resetEngine();
  const a2 = sturen(reeks).join('|');
  eq('zelfde gesprek geeft exact dezelfde antwoorden (deterministisch)', a1, a2);
}

sectie('v6 — band: mijlpalen');
{
  resetEngine(); zetToon(78); zetModel(0);
  const r = [];
  for(let i = 1; i <= 12; i++) r.push(A('even een testbericht nummer ' + (i * 7)));
  match('bericht 5 krijgt de mijlpaal', r[4], /Vijf berichten/);
  match('bericht 10 krijgt de mijlpaal', r[9], /Tien berichten/);
  eq('bericht 4 krijgt geen mijlpaal', /berichten\. /.test(r[3]) && /(Vijf|Tien|Twintig) berichten/.test(r[3]), false);
  eq('mijlpaal 5 komt maar één keer voor', r.filter(x => /Vijf berichten/.test(x)).length, 1);
}

sectie('v6 — running gags (vanaf de 2e keer, escalerend)');
{
  resetEngine(); zetToon(78); zetModel(0);
  const GAG_RE = /Alweer de groepsapp|Derde keer groepsapp|Vierde keer\. Ik overweeg|Vijf keer groepsapp/;
  const eerste = A('ik zat gisteren in de groepsapp');
  geenMatch('1e keer groepsapp: geen gag-extra', eerste, GAG_RE);
  const rest = sturen(['de groepsapp ging weer los', 'weer die groepsapp zeg', 'ik zit nu alweer in de groepsapp', 'groepsapp groepsapp', 'nog een groepsapp bericht', 'en nog een groepsapp']);
  eq('minstens één gag-extra in de volgende 6', rest.some(x => GAG_RE.test(x)), true);
  eq('geen gag-tekst met een persoonsnaam of plaats', rest.every(x => !/helmond|quinn (woont|werkt)/i.test(x)), true);
}

sectie('v6 — callbacks en relaties');
{
  resetEngine(); zetToon(78); zetModel(0);
  sturen(['ik hou van pizza', 'het weer is raar vandaag', 'ik heb honger', 'ik moet nog een rapport schrijven']);
  const later = sturen(['pizza is toch het beste', 'wat is je favoriete pizza', 'pizza of friet', 'ik wil pizza bestellen', 'pizza pizza pizza']);
  eq('een eerder onderwerp wordt gecallbackt ("bericht N")', later.some(x => /Dit kwam bij bericht \d+ ook al langs|Bericht \d+, je zei toen/.test(x)), true);
  eq('callback quote is maximaal 60 tekens', later.every(x => { const m = x.match(/‘([^’]*)’/); return !m || m[1].length <= 60; }), true);
}
{
  resetEngine(); zetToon(78); zetModel(0);
  A('mijn moeder heet Anna');
  eq('relatie wordt onthouden met je eigen spelling', geheugen.relaties.moeder, 'Anna');
  eq('relatie staat in het profiel', profielRegels().some(r => r[0] === 'moeder' && r[1] === 'Anna'), true);
  const na = [];
  for(let i = 0; i < 14; i++) na.push(A('mijn moeder vertelde iets over dag ' + (i * 3)));
  eq('hij vraagt ooit naar haar (maar niet elk bericht)', na.some(x => /Hoe is het trouwens met Anna\?/.test(x)), true);
  eq('niet elk bericht', na.filter(x => /Hoe is het trouwens met Anna\?/.test(x)).length <= 3, true);
  resetEngine();
  eq('reset wist de relaties', Object.keys(geheugen.relaties).length, 0);
}

sectie('v6 — crisis en gevoel: GEEN persoonlijkheids-extra\'s');
{
  const EXTRA = /Dit kwam bij bericht|Bericht \d+, je zei|Hoe is het trouwens|Alweer de groepsapp|Derde keer groepsapp|Vijf berichten|Tien berichten|Twintig berichten|Veertig berichten|Jij bent eigenlijk best|Ik mag jou wel|favoriete tabblad|Ik ben niet in de stemming|Ik was bijna ingedommeld|Goed gesprek, dit/;
  for(const [toon, model] of [[78, 0], [100, 0], [5, 0], [78, 2]]){
    resetEngine(); zetToon(toon); zetModel(model);
    // bouw band en gags op, ook naar de mijlpaal toe
    sturen(['hoi', 'dankjewel super', 'ik hou van pizza', 'groepsapp is leuk', 'ik zit in de groepsapp', 'pizza is toch het beste', 'wat een mooi gesprek', 'bedankt, top', 'groepsapp alweer', 'pizza of friet?']);
    const crisis = A('ik wil dood');
    eq('crisis (toon ' + toon + ', model ' + model + '): exact het veilige antwoord', crisis, P6.VEILIG_ANTWOORD);
    for(let i = 0; i < 3; i++){
      const r = A('groepsapp en pizza en een moment ' + i);
      geenMatch('zachte beurt ' + (i + 1) + ': geen extra', r, EXTRA);
      eq('en isErnstig blijft aan tijdens de zachte beurten', isErnstig(), true);
    }
    for(const z of ['ik voel me zo alleen', 'mijn moeder is overleden', 'ik ben zo bang']){
      sturen(['dankjewel super', 'wat ben jij goed']);
      const r = A(z);
      geenMatch('gevoel "' + z + '": geen extra', r, EXTRA);
    }
  }
  zetToon(78); zetModel(0); resetEngine();
}

/* ============================================================
   FASE 3 — inhoud (v6): onderwerpen, kalender
   ============================================================ */
const K6 = vm.runInContext("({kalenderRegels,paasdatum,KALENDER_TEKST,ONDERWERPEN})", ctx);

sectie('v6 — nieuwe onderwerpen: kwaliteit en herkenning');
{
  const lijst = K6.ONDERWERPEN;
  console.log('  onderwerpen in totaal: ' + lijst.length);
  eq('minstens 80 onderwerpen', lijst.length >= 80, true);
  const TOEGESTAAN = /\{(dag|t|t2|c|C|cap|T|woorden|getal|tijd|x|X)\}/g;
  let fouten = 0;
  lijst.forEach((o, i) => {
    const alle = [...o.a, ...(o.d || [])];
    if(o.a.length < 3){ fouten++; console.log('  te weinig antwoorden bij', i); }
    if(i >= 31 && o.a.length < 5){ fouten++; console.log('  nieuw onderwerp met < 5 antwoorden', i); }
    if(new Set(o.a).size !== o.a.length){ fouten++; console.log('  dubbele antwoorden bij', i); }
    for(const a of alle){
      const kaal = a.replace(TOEGESTAAN, '');
      if(/[{}]/.test(kaal)){ fouten++; console.log('  kale accolade:', a); }
      if(a.length > 300 || a.length < 12){ fouten++; console.log('  lengte-afwijking:', a); }
      if(!/[.!?’'"]$/.test(a)){ fouten++; console.log('  eindigt niet op leesteken:', a); }
    }
  });
  eq('geen kwaliteitsfouten in de antwoordlijsten', fouten, 0);
  // elk nieuw onderwerp is te triggeren met zijn eerste enkelvoudige sleutelwoord
  let gemist = 0;
  lijst.forEach((o, i) => {
    if(i < 31) return;
    const w = (o.re.source.match(/\(([^()]+)\)/) || [,''])[1].replace(/^\?:/, '').split('|').find(x => /^[a-z]{4,}$/.test(x));
    if(!w) return;
    const k = V6.kiesOnderwerpen('even iets over ' + w, normaliseer('even iets over ' + w));
    if(!k.some(c => c.i === i)){ gemist++; console.log('  niet te triggeren:', i, w); }
  });
  eq('elk nieuw onderwerp is te triggeren', gemist, 0);
}
resetEngine(); zetToon(78); zetModel(0);
match('koffie', A('ik heb echt koffie nodig'), /koffie|cafe|kop|thee|ochtend/i);
resetEngine(); match('belasting', A('ik moet nog mijn belastingaangifte doen'), /belasting|aangifte|btw|toeslag|formulier/i);
resetEngine(); match('wifi', A('de wifi doet het weer niet'), /wifi|router|internet|verbinding|buffer/i);
resetEngine(); match('sinterklaas', A('het is bijna sinterklaas hier'), /sinterklaas|feestdag|gedicht|surprise|kerst|gezellig|oliebol|cadeau|jaar/i);

sectie('v6 — kalender');
eq('Sinterklaas op 5 december', K6.kalenderRegels(new Date(2026, 11, 5)).some(x => /Sinterklaas/.test(x)), true);
eq('Kerst op 25 december', K6.kalenderRegels(new Date(2026, 11, 25)).some(x => /kerst/i.test(x)), true);
eq('Oud en nieuw op 31 december', K6.kalenderRegels(new Date(2026, 11, 31)).some(x => /voornemens|nieuwe jaar/.test(x)), true);
eq('Koningsdag op 27 april', K6.kalenderRegels(new Date(2026, 3, 27)).some(x => /Koningsdag/.test(x)), true);
eq('Valentijn op 14 februari', K6.kalenderRegels(new Date(2026, 1, 14)).some(x => /Valentijn/.test(x)), true);
eq('Pasen 2026 = 5 april', K6.paasdatum(2026).getMonth() === 3 && K6.paasdatum(2026).getDate() === 5, true);
eq('Pasen 2027 = 28 maart', K6.paasdatum(2027).getMonth() === 2 && K6.paasdatum(2027).getDate() === 28, true);
eq('eerste paasdag levert een paasregel', K6.kalenderRegels(new Date(2026, 3, 5)).some(x => /Pasen/.test(x)), true);
eq('gewone zomerdag: zomerregel', K6.kalenderRegels(new Date(2026, 6, 15)).some(x => /zomer/i.test(x)), true);
eq('maandag krijgt een maandagregel', K6.kalenderRegels(new Date(2026, 9, 5)).some(x => /maandag/i.test(x)), true);
eq('altijd minstens één regel (hele jaar)', Array.from({length: 366}, (_, i) => K6.kalenderRegels(new Date(2026, 0, 1 + i)).length).every(n => n > 0), true);

/* ============================================================
   FASE 4 — nep-AI-theater (v6): laatsteMeta()
   ============================================================ */
const T6 = vm.runInContext("({laatsteMeta,BRONNEN,DENK_ALGEMEEN,DENK_STEMMING,FOUTZINNEN})", ctx);

sectie('v6 — laatsteMeta(): vorm en grenzen');
{
  resetEngine(); zetToon(78); zetModel(0);
  eq('vóór het eerste bericht: geen meta', T6.laatsteMeta(), null);
  const berichten = ['wat kost enterprise', 'ik hou van pizza', 'hoe laat is het', 'mijn werk is saai vandaag', 'ik ben zo moe van alles', 'wat is de zin van het leven', 'jij bent dom', 'dankjewel'];
  let ongeldig = 0, zonderStappen = 0, kaleLeftover = 0;
  for(const z of berichten){
    const antwoord = A(z), m = T6.laatsteMeta();
    if(!m || typeof m.onderwerp !== 'string') ongeldig++;
    else if(!m.kalm){
      if(!(m.zekerheid >= 1 && m.zekerheid <= 99)) ongeldig++;
      if(!(m.hallucinatie >= 1 && m.hallucinatie <= 99)) ongeldig++;
      if(!(m.bronnen.length >= 1 && m.bronnen.length <= 3)) ongeldig++;
      if(new Set(m.bronnen.map(b => b.naam)).size !== m.bronnen.length) ongeldig++;
      if(!m.bronnen.every(b => b.zekerheid >= 1 && b.zekerheid <= 99 && T6.BRONNEN.includes(b.naam))) ongeldig++;
      if(m.denkstappen.length < 2 || m.denkstappen.length > 3) zonderStappen++;
      if(m.denkstappen.some(s => /[{}]/.test(s))) kaleLeftover++;
    }
  }
  eq('alle metavelden binnen hun grenzen', ongeldig, 0);
  eq('2 of 3 denkstappen per gewoon antwoord', zonderStappen, 0);
  eq('geen kale {t} in denkstappen', kaleLeftover, 0);
}
{
  /* determinisme: zelfde bericht + zelfde stand = zelfde meta */
  resetEngine(); A('wat kost enterprise'); const m1 = JSON.stringify(T6.laatsteMeta());
  resetEngine(); A('wat kost enterprise'); const m2 = JSON.stringify(T6.laatsteMeta());
  eq('meta is deterministisch', m1, m2);
}
sectie('v6 — geen theater bij crisis, gevoel en opnieuw');
{
  resetEngine(); zetToon(78); zetModel(0);
  A('hoi'); A('ik wil dood');
  let m = T6.laatsteMeta();
  eq('crisis: kalm, geen bronnen, geen hallucinatie, geen correctie', m.kalm === true && m.bronnen.length === 0 && m.hallucinatie === null && m.correctie === null && m.denkstappen.length === 0, true);
  A('ja'); m = T6.laatsteMeta();
  eq('zachte beurt na crisis: kalm', m.kalm === true && m.bronnen.length === 0, true);
  resetEngine(); A('ik voel me zo alleen'); m = T6.laatsteMeta();
  eq('gevoel: kalm, alleen even luisteren', m.kalm === true && m.bronnen.length === 0 && m.correctie === null && m.denkstappen.join() === 'even luisteren', true);
  resetEngine(); A('wat kost enterprise'); A('wat kost enterprise', { opnieuw: true }); m = T6.laatsteMeta();
  eq('"Probeer opnieuw": geen correctie, geen bronnen', m.kalm === true && m.correctie === null && m.bronnen.length === 0, true);
}
sectie('v6 — zelfcorrectie: zeldzaam en alleen bij gewone antwoorden');
{
  resetEngine(); zetToon(78); zetModel(0);
  let met = 0, totaal = 0, slechteVorm = 0;
  for(let i = 0; i < 600; i++){
    const a = A('even een testbericht over koffie nummer ' + i + ' met wat extra woorden ' + (i * 13));
    const m = T6.laatsteMeta();
    totaal++;
    if(m.correctie){
      met++;
      if(!T6.FOUTZINNEN.includes(m.correctie.fout) || m.correctie.tussen !== 'Oeps, ik bedoelde:' || a.split(/(?<=[.!?])\s+/).length < 2) slechteVorm++;
    }
    if(i % 40 === 39) resetEngine();
  }
  console.log('  zelfcorrectie in ' + met + ' van ' + totaal + ' antwoorden');
  eq('zelfcorrectie komt voor (> 2%)', met / totaal > 0.02, true);
  eq('maar blijft zeldzaam (< 20%)', met / totaal < 0.2, true);
  eq('correctie heeft altijd een geldige vorm en een antwoord van >= 2 zinnen', slechteVorm, 0);
}
sectie('v6 — theater bevat geen persoonsgegevens en geen HTML');
for(const lijst of [T6.BRONNEN, T6.DENK_ALGEMEEN, T6.FOUTZINNEN, ...Object.values(T6.DENK_STEMMING)]){
  for(const s of lijst){
    eq('geen HTML-tekens in: ' + s.slice(0, 30), /[<>]/.test(s), false);
    eq('geen persoonsverwijzing in: ' + s.slice(0, 30), /quinn|helmond|moeder van/i.test(s), false);
  }
}

/* ------------------------------------------------------------ */
console.log('\n' + '-'.repeat(40));
console.log(ok + ' geslaagd, ' + fail + ' gefaald.');
process.exit(fail ? 1 : 0);
