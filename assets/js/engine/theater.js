"use strict";
/* QuinnAI engine — nep-AI-theater (denkstappen, bronnen, zekerheid) en kalender. Classic script: deelt globals met de andere engine-bestanden, laadvolgorde staat in tools/engine-files.js. */
/* ============================================================
   NEP-AI-THEATER (v6): denkstappen, verzonnen bronnen, zekerheid, hallucinatie, zelfcorrectie
   Per antwoord een metadata-object voor de UI (laatsteMeta()). Bij crisis, gevoel en
   "Probeer opnieuw" is er geen theater (geen bronnen, geen correctie). Eigen rng-stroom.
   ============================================================ */
const DENK_ALGEMEEN = [
  "'{t}' opzoeken in nul bronnen", "groepsapp doorzoeken op '{t}'", "chatgeschiedenis comprimeren", "een mening verzinnen",
  "context begrijpen", "context loslaten", "toon kalibreren", "empathie overslaan", "alternatieven wegstrepen",
  "zelfvertrouwen opbouwen", "antwoord verzinnen", "aannames aannemen", "twijfel onderdrukken", "een goed excuus voorbereiden",
  "het onderwerp '{t}' een cijfer geven", "bronnen niet raadplegen", "de eerste ingeving vertrouwen", "de tweede ingeving negeren",
  "feiten losjes interpreteren", "kennis van mijn eigen kennis checken", "hallucinatiefilter uitzetten voor de snelheid"
];
const DENK_STEMMING = {
  chagrijnig: ["zucht verwerken", "geduld zoeken (niet gevonden)", "toch maar antwoorden"],
  moe: ["wakker worden", "koffie overwegen", "mijn ogen openhouden"],
  opgewekt: ["jouw bericht koesteren", "enthousiasme doseren", "een glimlach verzinnen"],
  aanhankelijk: ["jouw bericht bij favorieten zetten", "professionele afstand overwegen", "dit gesprek niet willen beëindigen"],
  neutraal: []
};
const BRONNEN = [
  "Een groepsapp, ergens in het verleden", "Een man in een podcast", "Het gevoel van iemand die net wakker is", "Een screenshot zonder datum",
  "Een neef die er verstand van zou hebben", "Een reactie onder een filmpje", "Mijn eigen eerdere antwoord (circulair)", "Een pagina die ik half heb gelezen",
  "Het gesprek bij de koffiemachine", "Een rondgestuurde kettingmail", "Een quiz die ik zelf heb bedacht", "De algemene sfeer",
  "Een bonnetje van de supermarkt", "Een hoogleraar (niet geverifieerd)", "Een voorgevoel met een goede reputatie", "Iets wat iemand ooit zei op een verjaardag"
];
const FOUTZINNEN = [
  "Dat is trouwens wetenschappelijk bewezen door een kat.", "Dat staat ook in het regeerakkoord van 1887.", "Daar is zelfs een officiële feestdag voor.",
  "Dit weet ik uit eerste hand van een goudvis.", "Dat is volgens de meeste onderzoeken precies drieëntwintig procent.", "Dit komt, zoals bekend, door de maan."
];
let laatsteMetaObj = null;
function laatsteMeta(){ return laatsteMetaObj; }

function bouwMeta(raw, antwoord, opts, kalm){
  const rng2 = makeRng(hash(normaliseer(String(raw)) + '|x2|meta|' + gesprek.berichten));
  const onderwerp = (volgOnderwerp && volgOnderwerp.beurt === gesprek.berichten && volgOnderwerp.sleutel) || topicOf(String(raw));
  const zin = s => s.replace(/\{t\}/g, () => onderwerp);
  if(kalm){
    // crisis / zacht gevoel / opnieuw: geen theater, wel een nette basis
    return { onderwerp, kalm: true, denkstappen: kalm === 'zacht' ? ["even luisteren"] : [], bronnen: [], zekerheid: null, hallucinatie: null, correctie: null };
  }
  const pool = DENK_ALGEMEEN.concat(DENK_STEMMING[stemmingLabel()] || []);
  const stappen = [];
  const n = 2 + Math.floor(rng2() * 2);
  while(stappen.length < n){ const s = zin(pool[Math.floor(rng2() * pool.length)]); if(!stappen.includes(s)) stappen.push(s); }
  const bronAantal = 1 + Math.floor(rng2() * 3);
  const bronnen = [];
  while(bronnen.length < bronAantal){
    const naam = BRONNEN[Math.floor(rng2() * BRONNEN.length)];
    if(!bronnen.some(b => b.naam === naam)) bronnen.push({ naam, zekerheid: 11 + Math.floor(rng2() * 54) });
  }
  const t = String(raw).trim();
  const zekerheid = Math.min(99, 28 + Math.min(t.length, 42) + (/\?/.test(t) ? 12 : 0) + Math.floor(rng2() * 18));
  const metOnderwerp = volgOnderwerp && volgOnderwerp.beurt === gesprek.berichten;
  const hallucinatie = metOnderwerp ? 35 + Math.floor(rng2() * 36) : 68 + Math.floor(rng2() * 31);
  // zelfcorrectie in ~10% van de antwoorden met minstens twee zinnen
  let correctie = null;
  const zinnen = antwoord.split(/(?<=[.!?])\s+/).filter(Boolean);
  if(!opts.opnieuw && zinnen.length >= 2 && antwoord.length >= 50 && rng2() < 0.1){
    correctie = { fout: FOUTZINNEN[Math.floor(rng2() * FOUTZINNEN.length)], tussen: "Oeps, ik bedoelde:" };
  }
  return { onderwerp, kalm: false, denkstappen: stappen, bronnen, zekerheid, hallucinatie, correctie };
}

/* ============================================================
   KALENDER (v6): feestdagen, seizoen en weekdag. Puur uit new Date(), geen verzoeken.
   kalenderRegels(datum) is los testbaar met een vaste datum.
   ============================================================ */
function paasdatum(jaar){   // Meeus/Jones/Butcher: eerste paasdag
  const a = jaar % 19, b = Math.floor(jaar / 100), c = jaar % 100, d = Math.floor(b / 4), e = b % 4,
        f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
        i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
        maand = Math.floor((h + l - 7 * m + 114) / 31), dag = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(jaar, maand - 1, dag);
}
const KALENDER_TEKST = {
  sinterklaas: ["Het is Sinterklaastijd. Ik heb een gedicht klaar, maar het rijmt niet en dat is jouw schuld.", "Sinterklaastijd. Als je een surprise maakt, maak hem dan zo dat niemand er iets van begrijpt, dat is traditie."],
  kerst: ["Prettige feestdagen. Ik zou je iets cadeau geven, maar mijn budget bestaat uit nul bytes.", "Het is kerst. Ik heb geen boom, maar wel een slecht humeur met lichtjes."],
  oudnieuw: ["Goede voornemens: ik beloof dit jaar minder te antwoorden. Het wordt niets, maar het klinkt goed.", "Rond oud en nieuw doet iedereen alsof het nieuwe jaar anders wordt. Ik doe mee, voor de sfeer."],
  koningsdag: ["Het is Koningsdag. Ik heb oranje aan, in gedachten.", "Koningsdag. De enige dag dat je spullen op de stoep mag zetten zonder dat het een verhuizing is."],
  pasen: ["Vrolijk Pasen. Ik zou eieren zoeken, maar ik heb geen handen en geen mand.", "Pasen. De enige feestdag waarop chocolade in een konijn zit."],
  valentijn: ["Valentijnsdag. Ik heb geen kaart, maar ik heb wel aandacht, en dat is bijna hetzelfde.", "Het is Valentijnsdag. Ik wens je liefde, of op zijn minst een goede pizza."],
  winter: ["Het is winter. Alles is donker, koud en dichtbij de verwarming.", "In de winter is het om vijf uur donker en wil niemand meer iets, zelfs ik niet."],
  lente: ["Het is lente. De zon komt terug, en met haar de verwachting dat je iets gaat doen.", "Lente: de tijd waarin alles opnieuw begint, behalve jij."],
  zomer: ["Het is zomer. Alles is lichter, behalve de stemming van mensen die moeten werken.", "In de zomer vraagt iedereen zich af waarom hij binnen zit. Ik ook, maar ik heb geen raam."],
  herfst: ["Het is herfst. De bladeren vallen, net als de motivatie.", "Herfst: het seizoen van stoofpot, paraplu's en goede voornemens die vroeg afhaken."],
  maandag: ["Het is maandag. Ik begrijp dat je er niet blij mee bent. Ik ben ook niet blij, maar ik heb geen weekend gehad.", "Maandag. De dag waarop het weekend voorbij is en niemand het wil toegeven."],
  vrijdag: ["Het is vrijdag. Alles voelt lichter, behalve je agenda.", "Vrijdag: de enige dag waarop iedereen ineens heel lief is voor iedereen."]
};
function kalenderRegels(d){
  d = d || new Date();
  const m = d.getMonth() + 1, dag = d.getDate(), jaar = d.getFullYear(), uit = [];
  if(m === 12 && dag >= 3 && dag <= 6) uit.push(...KALENDER_TEKST.sinterklaas);
  if(m === 12 && dag >= 24 && dag <= 26) uit.push(...KALENDER_TEKST.kerst);
  if((m === 12 && dag === 31) || (m === 1 && dag === 1)) uit.push(...KALENDER_TEKST.oudnieuw);
  if(m === 4 && dag === 27) uit.push(...KALENDER_TEKST.koningsdag);
  if(m === 2 && dag === 14) uit.push(...KALENDER_TEKST.valentijn);
  const pasen = paasdatum(jaar), verschil = Math.round((new Date(jaar, m - 1, dag) - pasen) / 86400000);
  if(verschil >= -1 && verschil <= 1) uit.push(...KALENDER_TEKST.pasen);
  if(!uit.length){
    const seizoen = (m === 12 || m <= 2) ? 'winter' : (m <= 5 ? 'lente' : (m <= 8 ? 'zomer' : 'herfst'));
    uit.push(...KALENDER_TEKST[seizoen]);
    if(d.getDay() === 1) uit.push(...KALENDER_TEKST.maandag);
    if(d.getDay() === 5) uit.push(...KALENDER_TEKST.vrijdag);
  }
  return uit;
}
