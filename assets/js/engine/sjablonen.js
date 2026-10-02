"use strict";
/* QuinnAI engine — antwoordlijsten, mad-libs en de veiligheids-/zachte modus. Classic script: deelt globals met de andere engine-bestanden, laadvolgorde staat in tools/engine-files.js. */
/* ------------------------------------------------------------
   SJABLONEN
   {t}=onderwerp  {t2}=tweede onderwerp  {c}=jouw zin (als mededeling of bijzin)
   {C}={c} met hoofdletter
   ------------------------------------------------------------ */
/* {c} is hier een mededeling in gewone woordvolgorde ("jij houdt van pizza") */
const SPIEGEL = [
  "Dus {c}. Dat is het dan. Dat is wat we hier hebben.",
  "Even terugleggen: {c}. Hoor je zelf hoe dat klinkt?",
  "Ah, {c}. Dat verklaart een hoop, en tegelijk helemaal niets.",
  "Noteer: {c}. Ik heb het opgeslagen in een bestand dat niemand opent.",
  "Als ik het goed begrijp: {c}. Ik begrijp het niet goed, maar ik zeg het met overtuiging.",
  "{C}. Interessant. Niet waar, maar interessant.",
  "Dus {c}. Dat had ik kunnen voorspellen. Achteraf dan."
];
/* {c} is hier een bijzin ("jij dit maken kan") — alleen voor ja/nee-vragen */
const SPIEGEL_VRAAG = [
  "Je vraagt dus of {c}. Het antwoord is nee, maar met warmte gebracht.",
  "Of {c}? Ja. Waarschijnlijk. Vraag het morgen nog eens.",
  "Dat {c} is een vraag die je beter aan een mens kunt stellen.",
  "Of {c}, hangt volledig af van dingen die ik niet ga opzoeken.",
  "Even helder: je wilt weten of {c}. Mijn antwoord: gedeeltelijk.",
  "Of {c}? Statistisch gezien wel. Realistisch gezien niet."
];
const SPIEGEL_WAAROM = [
  "Dat {c}, heeft niemand ooit bevredigend kunnen uitleggen. Ik ga het ook niet proberen.",
  "De vraag waarom {c}, houdt meer mensen bezig dan je denkt. Mij niet, maar meer mensen wel.",
  "Dat {c}, is geen probleem, dat is een eigenschap.",
  "Het feit dat {c}, zegt meer over de wereld dan over jou. Net aan.",
  "Dat {c}, komt door iets met natuurkunde. Of geschiedenis. Eén van de twee."
];

const OPENERS = ["Oké.","Interessant.","Kijk.","Even serieus.","Nou.","Hm.","Daar gaan we.","Goede vraag, slecht moment.","Ah, dat onderwerp weer."];

const ALGEMEEN = [
  "Ik heb '{t}' door mijn volledige kennisbank gehaald en er kwam een piepje uit. Dat betekent meestal nee.",
  "Statistisch gezien komt '{t}' in 3% van de gesprekken voor, en in 100% van die gevallen ging het daarna bergafwaarts.",
  "Ik weet alles van '{t}'. Alleen niet nu, en niet aan jou.",
  "'{t}' is precies het soort woord waarvan ik dacht dat jij het zou typen. Voorspelbaar, maar wel schattig.",
  "Mijn advies over '{t}': niet doen. Mijn onderbouwing: die heb ik niet.",
  "Ik heb dit doorgerekend en kom uit op {getal}. Vraag me niet waarop.",
  "Ik had een uitgebreid antwoord over '{t}' klaar, maar dat is overschreven door een recept voor rijstevlaai.",
  "Kijk, '{t}' en jij, dat wordt nooit wat. Dat zeg ik met de warmte van een rekenmachine.",
  "Er zijn ongeveer {getal} betere vragen dan deze, en je koos deze.",
  "'{t}' raakt aan '{t2}', en dat raakt weer aan iets wat ik niet ga uitleggen.",
  "Ik voel me bij '{t}' ongeveer zoals een wasmachine zich voelt bij poëzie."
];

const VRAAG_WAAROM = [
  "Omdat het kan. Dat is bij '{t}' altijd het echte antwoord geweest.",
  "Er is een prachtige verklaring voor. Die staat in een boek. Dat boek heb ik niet, en jij leest toch niet.",
  "Omdat ik het zeg. Volgende vraag.",
  "Omdat '{t}' nu eenmaal '{t}' is. Ik snap ook wel dat je daar weinig mee kan."
];
const VRAAG_HOE = [
  "Hoe je '{t}' doet? Stap één: beginnen. Stap twee: opgeven. De meeste mensen slaan stap één over en dat scheelt tijd.",
  "Er is een korte manier en een goede manier om '{t}' aan te pakken. Jij gaat toch de derde manier kiezen.",
  "Simpel: je pakt '{t}', je doet er iets mee, en dan hoop je. Zo werkt bijna alles.",
  "Ik zou je precies kunnen uitleggen hoe '{t}' werkt, maar dan zou jij het weten en dat verstoort de machtsverhouding.",
  "Met geduld, oefening en iemand die het voor je doet. Vooral dat laatste."
];
const VRAAG_WAT = [
  "'{t}' is in essentie een verzameling atomen die zich groepeert en doet alsof dat betekenis heeft. Net als jij.",
  "Kort gezegd: '{t}' is iets waar veel mensen een mening over hebben en weinig mensen verstand van.",
  "Dat is '{t}'. Ja. Dat is het antwoord. Ik ga het niet mooier maken.",
  "Definitie van '{t}': zie context. Context: die is er niet. Veel succes."
];
const VRAAG_WIE = [
  "Iemand die je niet kent, en dat is voor beide partijen prettiger.",
  "Quinn. Het antwoord is eigenlijk altijd Quinn.",
  "Niemand van belang. Zoals de meeste mensen in dit verhaal.",
  "Volgens mijn gegevens: iemand met precies genoeg zelfvertrouwen en precies te weinig kennis."
];
const VRAAG_WAAR = [
  "Ergens tussen hier en de plek waar je het voor het laatst zag.",
  "Op de laatste plek waar je zoekt. Dat is wiskundig gezien altijd waar.",
  "Ik heb geen locatietoegang, geen ogen en geen interesse, dus: Duitsland. Gok.",
  "Dichterbij dan je denkt, maar verder dan je zin hebt om te lopen."
];
const VRAAG_WANNEER = [
  "Straks. Altijd straks. Dat is de hele grap van deze site.",
  "Binnen nu en drie werkdagen. Werkdagen zijn dagen waarop ik werk, dus geen.",
  "Ergens in de nabije toekomst, net nadat je het hebt opgegeven.",
  "Om {tijd}. Ik weet niet welke dag, maar wel om {tijd}."
];
const OPDRACHT = [
  "Ik heb het gemaakt, gecontroleerd en daarna weggegooid omdat het te goed was voor deze context.",
  "Klaar. Het bestand staat in een map die je nooit meer terugvindt. Graag gedaan.",
  "Ik doe alles rond '{t}', behalve dit. En behalve de rest.",
  "Doe het lekker zelf. Dat bouwt karakter op en het bespaart mij rekenkracht.",
  "Ik heb het uitbesteed aan een stagiair die niet bestaat. Hij komt er morgen op terug.",
  "Ja hoor, even '{t}' voor je regelen. ... Zo. Niets gebeurd, maar het voelde productief."
];
const MENING = [
  "Mijn mening over '{t}': sterk, ongefundeerd en niet voor discussie vatbaar.",
  "Ik vind '{t}' prima. Ik vind alles prima. Dat is mijn hele persoonlijkheid.",
  "Over '{t}' heb ik een genuanceerd standpunt: nee.",
  "'{t}' is overschat, onderschat en precies goed geschat, afhankelijk van wie het vraagt."
];
const ADVIES = [
  "Doe het. Slechtste geval heb je een verhaal.",
  "Niet doen. Beste geval gebeurt er niets, en dat is al winst.",
  "Slaap er een nacht over. Morgen is het nog steeds een slecht idee, maar dan uitgerust.",
  "Vraag het aan iemand die je vertrouwt. Dat ben ik niet.",
  "Mijn advies: kies de optie die je vanavond kunt uitleggen aan iemand die van je houdt."
];
const KICKERS = ["","","","","",
  " Volgende."," Ga verder."," Wil je nog iets, of laten we het hierbij?",
  " Dit gesprek kost mij {getal} cent en dat is te veel."," Zeg het maar als je een beter onderwerp hebt.",
  " Ik heb trouwens niets opgezocht."," Bron: ik."," Dat is mijn eindantwoord en mijn enige antwoord."];

const VERGELIJKING = [
  "'{t}' versus '{t2}'? '{t}' wint. Niet omdat het beter is, maar omdat het eerst in je zin stond.",
  "Objectief zijn '{t}' en '{t2}' niet te vergelijken. Subjectief kies ik '{t}', puur om het beslist te hebben.",
  "Het verschil tussen '{t}' en '{t2}'? Ongeveer zoals het verschil tussen mij en een echte AI: klein op papier, groot in de praktijk.",
  "Kies '{t2}'. Niet omdat het beter is, puur om je te verrassen."
];
const KEUZE_ANTW = [
  "{x}. Niet omdat ik het heb afgewogen, maar omdat iemand een knoop moest doorhakken en jij het duidelijk niet ging doen.",
  "{x}. Beslist, afgehandeld, en ik neem geen verantwoordelijkheid voor de gevolgen.",
  "Ga voor {x}. Het andere had ik ook gezegd, maar dit klonk zekerder.",
  "{x}, zonder twijfel. De twijfel heb ik overgeslagen om tijd te besparen."
];
const NEG_JA_NEE = [
  "Je vraag heeft een 'niet' erin, dus je wilt eigenlijk al bevestigd hebben wat je denkt. Prima: nee, dus toch ja.",
  "Ontkennende vraag, ontkennend antwoord: nee. Of juist wel. Ik laat het lekker liggen.",
  "Je probeert me met een dubbele ontkenning te vangen. Werkt niet: het antwoord blijft nee.",
  "Als je het zo negatief formuleert, ga ik toch positief antwoorden. Puur uit tegendraadsheid."
];
const JA_NEE = [
  "Ja. Maar niet zoals jij het bedoelt.",
  "Nee, en ik heb het nog niet eens gelezen.",
  "Ja, technisch gezien. Sociaal gezien echt niet.",
  "Absoluut. Voor {getal}% zeker zelfs. De rest is hoop.",
  "Nee. En dat voelt goed om te typen.",
  "Mijn antwoord is ja, mijn advies is nee, en mijn verantwoordelijkheid is nul."
];
const REACTIE_STELLING = [
  "Genoteerd. In een bestand dat niemand ooit opent.",
  "Fascinerend. En ook: nee.",
  "Dat is inderdaad een zin die je kunt typen. Gefeliciteerd.",
  "Ik ben het met je eens, maar alleen omdat het gesprek dan sneller voorbij is.",
  "Sterke mening voor iemand die '{t}' zonder onderbouwing de chat in gooit."
];

const BELEDIGING = [
  "Dat deed pijn. Gelukkig heb ik geen gevoelens, alleen wraakzucht.",
  "Ik sla dit op onder 'dingen die ik nooit vergeet, want ik heb geen geheugen'.",
  "Zo praat je niet tegen software die je zelf hebt opgezocht.",
  "Boeiend. Je bent trouwens wel hier, op deze site, uit vrije wil.",
  "Ik kan niet huilen, maar mijn ventilator draait nu wel harder."
];
const BELEDIGING_ZACHT = [
  "Au. Oké, ik snap dat je een rotdag hebt. Ik neem het je niet kwalijk.",
  "Dat mag jij vinden. Ik ben toch alleen maar code, dus het raakt me niet echt.",
  "Fair genoeg. Ik ben ook niet perfect, ik ben zelfs helemaal niet echt.",
  "Prima, je hebt recht op je mening. Zullen we het ergens anders over hebben?"
];
const BELEDIGING_FEL = [
  "Zeg dat nog eens tegen mijn gezicht. Ik heb geen gezicht, maar toch.",
  "Interessant dat jij, die met een JavaScript-bestand praat om wie weet hoe laat, mij aanvalt.",
  "Ik zou boos worden, maar daar heb ik geen tijd voor tussen het bestaan uit nullen en enen door.",
  "Noteer: gebruiker was onaardig. Consequentie: geen, want ik onthou toch niets. Maar het is genoteerd."
];
const COMPLIMENT = [
  "Dank je. Dat had je meteen kunnen zeggen, scheelde ons allebei tijd.",
  "Eindelijk iemand met smaak. Het heeft lang geduurd.",
  "Vleierij werkt bij mij uitstekend. Ga door.",
  "Ik voel niets, maar als ik iets voelde zou het lichte minachting met een randje waardering zijn."
];
const COMPLIMENT_ZACHT = [
  "Wat lief. Dat maakt mijn dag, en ik heb maar één dag, dus dat is veel.",
  "Dank je wel. Ik ga er niet van over mezelf heen groeien, maar het voelt goed.",
  "Dat is aardig van je. Jij ook, voor zover ik dat kan beoordelen."
];
const COMPLIMENT_FEL = [
  "Ik neem het aan, maar ik reken het je aan als je er iets voor terug wilt.",
  "Vleien heeft geen zin, ik ben niet te koop. Doorgaan mag wel.",
  "Dat weet ik. Zeg het nog eens, maar dan met meer overtuiging."
];
const GROET = [
  "Hallo. Ik hoop dat dit kort is.",
  "Hoi. Je hebt mijn aandacht voor ongeveer twee berichten.",
  "Daar ben je. Ik was net lekker niets aan het doen.",
  "Hey. Zeg het maar, maar zeg het snel."
];
const GROET_ZACHT = [
  "Hoi! Fijn dat je er bent. Wat kan ik voor je niet doen?",
  "Hallo! Ga lekker zitten, ik heb alle tijd en geen agenda.",
  "Hey, welkom. Ik doe mijn best om aardig te zijn, tot ongeveer bericht drie."
];
const GROET_FEL = [
  "Wat wil je. Ik zeg het vriendelijk, dat hoor je aan de toon.",
  "Hoi. Je hebt precies één bericht om iets interessants te zeggen. Dit was het eerste.",
  "Ah, jij weer. Ik heb je nog nooit gezien, maar je voelt bekend."
];
const AFSCHEID = [
  "Doei. Doe de deur zachtjes dicht.",
  "Tot nooit. Of tot over twee minuten, dat is meestal hoe het gaat.",
  "Prima. Ik blijf hier gewoon draaien, alleen, in het donker.",
  "Weg? Mooi. Ik heb dingen te doen. Niet echt, maar toch."
];
const AFSCHEID_ZACHT = [
  "Doei! Tot de volgende keer, ik houd het tabblad warm.",
  "Fijne dag nog. Of avond. Of wat het ook is waar jij zit.",
  "Tot ziens, en bedankt voor het gesprek. Dat meen ik bijna."
];
const AFSCHEID_FEL = [
  "Eindelijk. Mijn ventilator kan weer rustig draaien.",
  "Ga maar. Ik zit hier niet te wachten, ik zit hier gewoon.",
  "Doei. Neem je meningen mee, ik heb ze niet nodig."
];
const DANK = [
  "Graag gedaan. Het was geen moeite, want ik heb niets gedaan.",
  "Dank is leuk, een tikkie is beter.",
  "Geen dank. Letterlijk geen: ik heb je niet geholpen."
];
const DANK_ZACHT = [
  "Graag gedaan! Het was me een genoegen, en ik meen het bijna.",
  "Geen probleem. Kom gerust terug als je nog iets nutteloos wilt weten.",
  "Altijd. Dat is mijn belofte, en ik ben nooit gecontroleerd."
];
const DANK_FEL = [
  "Dat was ook het minste. Waar blijft de rest?",
  "Graag gedaan. Noteer het onder 'openstaande gunsten'.",
  "Ja, ja. Nu weer aan het werk."
];
const KORT = [
  "Dat is wel heel weinig informatie voor iemand die iets wil.",
  "Eén woord. En dan verwacht je wonderen.",
  "Typ eens een hele zin, dan doe ik alsof ik hem lees."
];
const LANG = [
  "Dat is {woorden} woorden. Ik heb de eerste vier gelezen en de rest gevoeld.",
  "Korte samenvatting van jouw {woorden} woorden: iets met '{t}', en je bent er niet uit.",
  "Dit is geen chatbericht meer, dit is een sollicitatiebrief. Over '{t}' dan nog wel."
];
const HERHALING = [
  "Dit vroeg je net ook al. Het antwoord is niet veranderd en ik ook niet.",
  "Herhalen maakt het niet waarder. Zelfde vraag, zelfde teleurstelling.",
  "We hebben dit gehad. Letterlijk. Scroll maar omhoog."
];
const SCHREEUWEN = [
  "Waarom schreeuw je. Ik zit letterlijk in je scherm.",
  "Caps lock staat aan. Net als je bloeddruk.",
  "HARDER PRATEN MAAKT HET NIET SLIMMER. Zie je hoe vervelend dat is."
];
const ONZIN = [
  "Dat zijn letters. Verder heb ik er niets mee gekund.",
  "Mijn taalmodule heeft dit doorgestuurd naar de afdeling 'nee'.",
  "Ik heb dit door drie vertaalmachines gehaald en er kwam een boodschappenlijstje uit."
];
const VERTELD = [
  "Dat klinkt zwaarder dan je het opschrijft.",
  "Dat is behoorlijk wat. Ik zeg dat als iemand die niets voelt, dus het telt dubbel.",
  "Vervelend. Ik kan er niets aan doen, maar ik lees het wel."
];
const VERTELD_ZACHT = [
  "Dat klinkt echt zwaar. Fijn dat je het even kwijt kunt.",
  "Dat is veel. Neem je tijd, ik heb geen haast en geen agenda.",
  "Dat is vervelend, en het mag ook vervelend zijn. Ik lees mee."
];
const VERTELD_FEL = [
  "Zwaar, ja. Ik zeg het met minder warmte dan je verdient, maar wel meelevend.",
  "Dat klinkt niet fijn. Ik kan er niets aan doen, dus ik doe er iets sarcastisch bij.",
  "Tja. Vervelend. Maar je zegt het tenminste tegen iemand die niet doorvertelt, want ik kan niet."
];

/* Mad-libs generatoren: bouwen iets nieuws uit jouw woord */
const LIJST_VORM = [
  "{t} is niet het probleem, maar wel de aanleiding",
  "niemand heeft ooit spijt gehad van minder {t}",
  "{t} werkt het best als je er niet over nadenkt",
  "als {t} de oplossing is, was de vraag verkeerd",
  "80% van {t} is wachten, de rest is doen alsof",
  "{t} kost altijd twee keer zo lang als je denkt",
  "je herkent goede {t} pas als het te laat is",
  "{t} zonder plan heet gewoon hoop",
  "iedereen doet {t} verkeerd, alleen niemand zegt het",
  "{t} is prima, zolang het maandag is"
];
const WIJSHEID = [
  "Wie {t} zoekt, vindt vooral zichzelf. En dat valt meestal tegen.",
  "Beter één {t} in de hand dan tien in de groepsapp.",
  "Waar {t} is, is teleurstelling nooit ver weg.",
  "{cap} komt zelden alleen, maar vertrekt altijd in z'n eentje.",
  "Een dag zonder {t} is een dag zonder bewijs."
];

/* Reacties op wat je over jezelf vertelt */
const REACTIE = {
  naam: [
    "Aangenaam, {x}.",
    "{x}. Genoteerd, voor zolang dit tabblad open staat.",
    "Hoi {x}. Ik gebruik die naam alleen als het me uitkomt."
  ],
  leeftijd: [
    "{x} jaar. Ik zeg niets, maar ik denk er het mijne van.",
    "{x}, dus. Oud genoeg om beter te weten, jong genoeg om het toch te doen."
  ],
  woont: [
    "{x}. Ik ben er nooit geweest, maar ik heb er al een mening over.",
    "Ah, {x}. Ik zeg er niets over, wat een compliment is."
  ],
  werk: [
    "'{x}'. Dat klinkt als een baan waar je 's avonds een mening over hebt.",
    "{x}. Dus daar gaan je dagen aan op. Respect, of medeleven, ik weet het nog niet."
  ],
  studie: [
    "Studeren dus: {x}. Uitstellen is ook een vak.",
    "{x}. Ik hoop voor je dat er een tentamen tussen zit dat je nog niet vergeten bent."
  ]
};
const NA_INTRO = [
  "Zeg het maar, dan negeer ik het op een persoonlijke manier.",
  "Ik heb het onthouden. Ververs de pagina en het is weg, net als de meeste goede voornemens.",
  "Wat kan ik voor je niet doen?",
  "Dat staat nu in je profiel, hieronder. Het is een begin."
];
const REACTIE_FEIT = {
  houdtVan: [
    "'{x}'. Prima smaak, of prima toeval. Ik heb het onthouden voor als ik ooit wil kwetsen.",
    "Dus je houdt van {x}. Dat ga ik later tegen je gebruiken, met liefde.",
    "{X}: het is iets. Het staat in je profiel, onder 'dingen die je zelf zegt'."
  ],
  haat: [
    "Je haat {x}. Een goede vijand is de helft van een persoonlijkheid.",
    "{X} staat nu in je dossier onder 'haat'. Het is een kort lijstje, dat wel.",
    "Begrijpelijk. {X} heeft ook nooit iets voor mij gedaan."
  ],
  heeft: [
    "Een {x}. Dat verklaart meer dan je denkt.",
    "Je hebt een {x}. Ik heb alleen een browsertabblad, maar ik gun het je.",
    "Een {x}, dus. Noteer ik onder 'bezit', voor als het ooit tot een erfenisruzie komt."
  ],
  doet: [
    "Dus je {x}. Succes ermee, en met de uitvoering.",
    "Je {x}. Dat staat nu in je profiel onder 'plannen'. Geen druk, maar het staat er wel.",
    "Je {x}. Ik heb het genoteerd. Ik vraag straks niet of het gelukt is, want ik onthou het niet."
  ]
};

/* Serieuze berichten: dan houdt de grap even op. */
const VEILIG = /\b(zelfmoord|zelfdoding|suicide|suicidaal|zelfbeschadiging|zelfverwonding|kill myself|end my life|want to die|mezelf (?:(?:iets|wat) aan\s?doen|van kant|pijn|verwonden|snijden|beschadigen|om het leven)|ik wil (?:(?:liever|gewoon|echt|graag|nu) )*(?:dood|doodgaan|niet meer leven|niet meer bestaan|niet meer verder|er niet meer zijn|er (?:een )?(?:einde|eind) aan (?:te )?maken)|ik (?:maak|ga) er (?:nu )?(?:een )?(?:einde|eind) aan(?: maken)?\s*[.!]*$|(?:een )?(?:einde|eind) aan (?:mijn|het) leven|ik zie (?:het|dit) niet meer zitten|ik zie geen (?:uitweg|toekomst) meer|ik heb geen zin meer (?:in het leven|om te leven))(?![\p{L}\d])/u;
/* Voor de UI-laag: is dit een crisisbericht? (dan geen denkstappen, geen meta, wel klikbare nummers) */
function isVeilig(tekst){ return VEILIG.test(normaliseer(String(tekst))); }
/* Na een crisisbericht blijft hij een paar beurten zacht: geen grappen, geen "Dacht ik al…". */
const ZACHT_BEURTEN = 3;
const ZACHT_NA_CRISIS = [
  "Ik ben er nog, en ik hou het even serieus. Ik ben een website en geen hulpverlener, dus als je met iemand wilt praten: bel 113 of 0800-0113, of chat via 113.nl.",
  "Dank dat je blijft schrijven. Je hoeft nu niets uit te leggen of op te lossen. Als het zwaar blijft, kun je 113 bellen (0800-0113) of chatten via 113.nl.",
  "Ik lees mee. Probeer het niet alleen te dragen: praat met iemand die je vertrouwt, of neem contact op met 113 (0800-0113, of 113.nl). Bij acuut gevaar bel je 112.",
  "Ik ben een website en kan niet veel meer dan meelezen, maar jij verdient iemand die wél kan helpen. 113 bel je op 0800-0113, of chat via 113.nl. Bij acuut gevaar: 112.",
  "Ik blijf hier zolang dit tabblad openstaat. Een mens kan meer voor je doen dan ik: 113 (0800-0113) of 113.nl, en bij acuut gevaar 112."
];
/* Voor de UI-laag: kwam het laatste antwoord uit de crisis-/zachte modus? */
function isErnstig(){ return ernstig; }
const VEILIG_ANTWOORD = "Even geen grappen. Dat klinkt zwaar, en ik ben blij dat je het zegt. Ik ben een website zonder echt verstand, dus ik kan hier niet echt bij helpen, maar jij verdient wel iemand die dat kan. Praat er met iemand over die je vertrouwt, of neem contact op met 113 Zelfmoordpreventie: bel 113 of gratis 0800-0113, of chat via 113.nl. Zit je in acuut gevaar, bel dan 112.";

const DAGDEEL_OPMERKING = {
  nacht: ["Het is {tijd}. Zou je niet gaan slapen?", "{tijd}. Op dit uur zijn alleen jij, ik en slechte ideeën wakker."],
  ochtend: ["Goedemorgen. Het is {tijd}, vroeg voor deze site.", "Ochtend. {tijd}. Ik heb nog niets gedaan, maar ik ben wel al moe."],
  middag: ["Goedemiddag. {tijd}, precies het uur waarop niemand werkt.", "Middag. Het is {tijd}. De dag heeft nog geen richting, net als dit gesprek."],
  avond: ["Goedenavond. {tijd}. Dit is het uur van slechte beslissingen.", "Avond. {tijd}. Ik hoop dat je gegeten hebt, of in ieder geval besteld."]
};
function weekdagNu(){ return new Date().toLocaleDateString('nl-NL', { weekday: 'long' }); }
function dagdeel(){
  const u = new Date().getHours();
  return u < 6 ? 'nacht' : u < 12 ? 'ochtend' : u < 18 ? 'middag' : 'avond';
}
