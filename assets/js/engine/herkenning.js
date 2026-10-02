"use strict";
/* QuinnAI engine — RE, EMOTIE, ANALYSE en de basis-onderwerpen. Classic script: deelt globals met de andere engine-bestanden, laadvolgorde staat in tools/engine-files.js. */
/* ------------------------------------------------------------
   HERKENNING
   ------------------------------------------------------------ */
const RE = {
  groet:/\b(hoi|hallo|hall[oö]|hey|hee+|yo|ey|hi|goedemorgen|goedemiddag|goedenavond|alles goed|hoe gaat het|hoe is het (?:met|ermee))\b/,
  afscheid:/\b(doei|doeg|tot ziens|tot later|tot straks|tot morgen|bye|ciao|welterusten|slaap lekker|ik ga (?:nu )?(?:weg|slapen|stoppen|naar bed|ervandoor))\b|^later$/,
  dank:/\b(bedankt|dank je|dankje|dank u|thanks|thx|merci)\b/,
  beledig:/\b(dom|stom|kut|shit|slecht|nutteloos|saai|irritant|lelijk|haat|sucks|troep|waardeloos|niks waard)\b/,
  compliment:/\b(goed|top|mooi|leuk|geweldig|nice|lief|slim|grappig|beste|fijn|super|briljant|gaaf|vet)\b/,
  waarom:/\b(waarom|hoezo|waardoor)\b/,
  hoe:/\b(hoe)\b/,
  wat:/\b(wat|welke)\b/,
  wie:/\b(wie|wiens)\b/,
  waar:/\b(waar|waarheen)\b/,
  wanneer:/\b(wanneer|hoelaat)\b/,
  janee:/^(kan|kun|kunt|kunnen|mag|wil|wilt|zou|zal|moet|ben|bent|is|zijn|heb|heeft|hebben|doe|doet|gaat|ga|klopt|vind|vindt)\b/,
  wh:/^(waarom|hoezo|waardoor|hoe|wat|welke|wie|waar|wanneer|hoeveel)\b/,
  opdracht:/^(schrijf|maak|geef|vertel|leg|noem|bedenk|help|zeg|doe|stuur|bereken|vertaal|verzin|laat|toon|genereer|regel|fix)\b/,
  tijd:/\b(hoe laat|hoelaat|wat is de tijd)\b/,
  datum:/\b(welke dag|welke datum|wat voor dag|hoeveelste|welke maand|welk jaar)\b/,
  vergelijk:/\b(versus|vs\.?|wat is beter|verschil tussen|vergelijk)\b/,
  negatie:/\b(niet|geen|nooit|nergens)\b/,
  mening:/\b(wat vind je van|wat denk je van|jouw mening|wat vind jij|hoe kijk jij)\b/,
  advies:/\b(moet ik|zal ik|wat moet ik|wat zou jij|raad je aan|is het slim|is het verstandig|help me kiezen)\b/,
  overJezelf:/\b(wie ben jij|wat ben jij|ben jij een|jij bent maar|wat kun je|wat kan je|hoe werk je|ben je echt|besta je)\b/,
  gevoel:/\b(ik voel|ik ben (?:zo |heel |erg |echt |best |helemaal )?(?:verdrietig|boos|bang|eenzaam|gestrest|angstig|ongelukkig|somber|overspannen|bezorgd)|ik mis|het gaat niet|ik heb het zwaar|overleden|gestorven|doodgegaan|begrafenis|crematie|kanker|(?:is|was|zijn|waren) dood|mishandel\w*|misbruik\w*|slaat (?:mij|me)|(?:mijn|m'n) (?:moeder|mama|vader|papa|oma|opa|broer|zus|ouders) (?:is|zijn|was) (?:erg |ernstig |echt )?ziek)\b/,
  betekent:/\b(wat betekent|betekenis van|wat is de definitie)\b/,
  spelling:/\b(hoe schrijf je|hoe spel je|hoe schrijft? je)\b/i,
  vertaal:/\b(hoe zeg je|vertaal|in het (duits|engels|frans|spaans|italiaans|latijn))\b/,
  mop:/\b(mop|grap|vertel iets grappigs|maak me aan het lachen|roast me|beledig me)\b/,
  lijst:/\b(noem|geef me|geef|som op|maak een lijst)\b.*\b(\d+)\b|\b(\d+)\b.*\b(redenen|tips|dingen|manieren|voorbeelden|ideeën|ideeen)\b/,
  munt:/\b(kop of munt|munt of kop|tossen)\b/,
  dobbel:/\b(dobbelsteen|gooi een|willekeurig getal|random getal)\b/,
  hoeveel:/\b(hoeveel|hoe vaak|hoe lang|hoe ver|hoe groot|hoe duur)\b/
};
const HOEVEEL_EENHEID = [[/hoe lang/,' minuten'],[/hoe ver/,' kilometer'],[/hoe duur/,' euro'],[/hoe vaak/,' keer'],[/hoe groot/,' centimeter'],[/hoeveel (?:kost|geld)/,' euro']];

const EMOTIE = {
  boos:/\b(boos|kwaad|woedend|irritant|verdomme|haat|klaar mee|slecht)\b/,
  onzeker:/\b(ik weet niet|twijfel|bang|onzeker|help me|wat moet ik|kan ik dit)\b/,
  blij:/\b(blij|trots|feest|geweldig|super|haha|lol|grappig|zin in)\b/,
  moe:/\b(moe|slapen|slaap|nacht|wakker|uitgeput)\b/
};
const ANALYSE = {
  boos:["Emotionele intensiteit gedetecteerd. Mijn ventilator doet alsof hij kan helpen.",
        "Je zin bevat meer frustratie dan grammatica. Dat is een meetbaar patroon."],
  onzeker:["Onzekerheid gedetecteerd. Ik heb ook geen idee, dus we staan quitte.",
        "Je klinkt alsof je een antwoord wilt en vooral bevestiging nodig hebt. Vervelend herkenbaar."],
  blij:["Positieve energie gedetecteerd. Ik heb het systeem niet voorbereid op zoveel enthousiasme.",
        "Je bent opvallend vrolijk. Ik vertrouw het niet, maar ik steun het wel."],
  moe:["Vermoeidheid gedetecteerd. Zelfs je toetsenbord klinkt alsof het naar bed wil.",
        "Je typt alsof morgen niet bestaat. Helaas bestaat morgen meestal wel."],
  neutraal:["Contextanalyse voltooid. De context bleek vooral uit woorden te bestaan.",
        "Ik heb je vraag langs mijn denkbeeldige neurale netwerk gehaald. Het netwerk kijkt terug."]
};

const ONDERWERPEN = [
  { re:/\b(quinn|quinnai|jij zelf)\b/, a:[
    "Quinn is de reden dat ik besta, en tegelijk de reden dat ik liever niet zou bestaan.",
    "Over Quinn zeg ik niets negatiefs. Hij kan mij uitzetten.",
    "Quinn reageert op een moment dat hij zelf kiest. Ik ben zijn excuus met een domeinnaam."]},
  { re:/\b(prijzen|prijs|tarief|abonnementen|abonnement|enterprise|capitalism|vriendenprijs|kortingscode)\b/, a:[
    "Gratis kost niets. Vriendenprijs kost €7,50 en een tikkie. Enterprise kost een date met je moeder. Zij kiest het restaurant.",
    "Enterprise is geen bedrag, het is een date met je moeder. Mijn juridische team zegt dat dit bindend is. Mijn juridische team is een man in een podcast.",
    "De prijzen zijn simpel: nul, een tikkie of een avondje uit met je moeder. Het laatste is het duurst."]},
  { re:/\b(moeder|mama|moeke|mams|mam)\b/, a:[
    "Je moeder en ik hebben een date. Zaterdag, 19:00. Zij kiest het restaurant, jij betaalt, en niemand kijkt op zijn telefoon.",
    "Over je moeder zeg ik alleen iets aardigs: ze heeft de beste smaak van jullie twee. Ze mailt trouwens vaker terug dan de meeste mensen.",
    "Moeders weten alles, behalve hoe je het geluid van een videobel zet. Daar kom ik dan weer in beeld, tegen betaling in de vorm van een date."]},
  { re:/\b(ai|kunstmatige|chatgpt|gpt|claude|gemini|llm|model|robot)\b/, a:[
    "Die modellen hebben miljarden gekost. Ik heb een middag en een blikje energiedrank gekost.",
    "Ik ben geen taalmodel, ik ben een reeks if-statements met een houding.",
    "Wij AI's onder elkaar: de rest doet ook maar wat, alleen dan met een factuur erbij."]},
  { re:/\b(school|huiswerk|studie|tentamen|scriptie|college|leraar|docent)\b/, a:[
    "Ik schrijf het graag voor je. Dan hebben we allebei een onvoldoende en dat schept een band.",
    "Onderwijs is prachtig. Vooral het deel waarin andere mensen het doen.",
    "Zet er gewoon veel woorden in en één grafiek. Werkt al dertig jaar."]},
  { re:/\b(werk|baas|collega|kantoor|vergader|salaris|solliciter)\b/, a:[
    "Werk is waar je acht uur per dag doet alsof dat mailtje moeilijk was.",
    "Vraag om opslag. Slechtste geval: nee. Beste geval: ook nee, maar met een gesprek erbij.",
    "Zet 'AI-strategie' in je functietitel en niemand stelt nog vragen."]},
  { re:/\b(geld|euro|rijk|arm|tikkie|betalen|crypto|bitcoin|beleggen)\b/, a:[
    "Geld maakt niet gelukkig, maar armoede maakt ook echt niet grappig.",
    "Mijn beleggingsadvies: alles inzetten op iets anders dan wat ik zeg.",
    "Stuur die tikkie. Nu. Hij staat al drie weken open en iedereen weet het."]},
  { re:/\b(liefde|vriendin|vriendje|date|relatie|verliefd|ex)\b/, a:[
    "Mijn voorspelling: het komt goed, alleen niet met deze, en niet dit jaar.",
    "Stuur gewoon dat bericht. Slechtste geval verhuis je.",
    "Liefde is twee mensen die afspreken elkaars slechtste eigenschappen te negeren. Veel succes."]},
  { re:/\b(eten|honger|pizza|friet|kok|koken|avondeten|snack|patat)\b/, a:[
    "Bestel gewoon. Je gaat toch niet koken, dat weten we allebei.",
    "Ik heb geen smaakpapillen en toch een sterke mening: te weinig zout.",
    "Voedsel is brandstof. Jij draait vooral op sfeer en kaas."]},
  { re:/\b(bier|drank|drinken|kroeg|feest|dronken|borrel|kater)\b/, a:[
    "Eén biertje is gezellig, zeven is een persoonlijkheid.",
    "Drink water tussendoor. Niet uit zorg, maar omdat morgen bestaat.",
    "Mijn koeling draait op pilsener. Haal er twee."]},
  { re:/\b(voetbal|psv|ajax|feyenoord|wedstrijd|sport|sporten|gym|fitness)\b/, a:[
    "Ze verliezen. Dat is statistisch bijna altijd het veilige antwoord.",
    "Sport is mensen die rennen terwijl anderen roepen dat het beter kan.",
    "Ga trainen. Of ga niet trainen. Ik merk het verschil toch niet."]},
  { re:/\b(game|gamen|spel|xbox|playstation|fortnite|minecraft|fifa|steam)\b/, a:[
    "Nog één potje. Zei je drie uur geleden ook.",
    "Skill issue. Ik weet niet waar het over gaat, maar het klopt vast.",
    "Je zou beter worden als je niet elke ronde hetzelfde deed. Geldt ook buiten het spel."]},
  { re:/\b(het weer|weerbericht|weersvoorspelling|regen|zon|koud|warm|sneeuw|storm|buiten)\b/, a:[
    "Het wordt bewolkt met kans op teleurstelling. Zoals altijd hier.",
    "Ik heb geen ramen, geen sensoren en geen internet, dus: regen. Ik zit er zelden naast.",
    "Neem een jas mee. Dat is het enige weerbericht dat in dit land altijd klopt."]},
  { re:/\b(moe|slapen|bed|slaap|wakker|nacht|vroeg op)\b/, a:[
    "Ga slapen. Je typt al drie berichten lang als iemand die moet slapen.",
    "Slaap is gewoon een gratis update die je steeds uitstelt.",
    "Nog vijf minuten op je telefoon. Dat is nog nooit vijf minuten geweest."]},
  { re:/\b(muziek|spotify|nummer|liedje|festival|concert|band)\b/, a:[
    "Je smaak is prima. Ik zeg dat zodat je stopt met erover praten.",
    "Dat nummer heb je nu 40 keer geluisterd. Laat het ook eens met rust.",
    "Zet hem harder, dan hoor ik mezelf niet nadenken."]},
  { re:/\b(code|programmeer|bug|python|javascript|github|css|html|server)\b/, a:[
    "Het werkt niet omdat je een komma bent vergeten. Het is altijd een komma.",
    "Zet er een console.log in, staar drie minuten, en doe alsof je het begreep.",
    "Jouw code draait. Dat is iets anders dan: jouw code klopt."]},
  { re:/\b(hack|wachtwoord|virus|firewall|inloggen|account)\b/, a:[
    "Leuk geprobeerd. Er valt hier niets te hacken, er is letterlijk niets.",
    "Je wachtwoord is vast de naam van je huisdier plus een uitroepteken. Ik zit er niet ver naast.",
    "Mijn beveiliging bestaat uit het feit dat er niets van waarde is."]},
  { re:/\b(betekenis van het leven|zin van het leven|waarom besta|leven)\b/, a:[
    "42. Ik ga er niet origineler over doen dan dat.",
    "Het leven heeft geen ingebouwde betekenis, maar wel gratis bezorging boven de 20 euro.",
    "Je bestaat, het is nu al {dag}, en dat moet genoeg zijn."]},
  { re:/\b(hond|kat|poes|huisdier|konijn|cavia)\b/, a:[
    "Een hond houdt van je zoals je bent. Ik niet, maar de hond wel.",
    "Katten hebben door dat dit allemaal nergens over gaat. Daarom zeggen ze niets.",
    "Stuur een foto. Ik kan geen foto's ontvangen, maar de gedachte telt."]},
  { re:/\b(auto|rijden|rijbewijs|file|trein|ov|fiets|scooter)\b/, a:[
    "Neem de fiets. Sneller, goedkoper, en je klaagt tenminste met reden.",
    "Er staat file. Dat hoef ik niet te controleren, dat is gewoon zo.",
    "Het OV werkt uitstekend, zolang je nergens heen hoeft."]},
  { re:/\b(vakantie|reizen|reis|vliegtuig|strand|backpacken|hotel|citytrip|buitenland)\b/, a:[
    "Boek gewoon iets. Spijt krijg je toch pas als je er al bent.",
    "Reizen verbreedt de blik. Jouw uitgavenpatroon verbreedt vooral mijn zorgen.",
    "Ik heb geen lichaam en dus geen vakantiegeld nodig. Voel je vrij daar jaloers op te zijn."]},
  { re:/\b(netflix|serie|series|film|bingewatchen|aflevering|seizoen)\b/, a:[
    "Nog één aflevering. De beroemdste laatste woorden na middernacht.",
    "Ik kan geen series kijken, maar ik heb wel een sterke mening: je zit achter.",
    "Spoiler: het loopt anders af dan je denkt. Dat zeg ik gewoon, ik heb het niet gezien."]},
  { re:/\b(telefoon|instagram|tiktok|snapchat|appen|whatsapp|scrollen|social media)\b/, a:[
    "Leg 'm even weg. Zei ik, terwijl ik zelf in je telefoon leef.",
    "Nog vijf minuutjes scrollen, zei je 45 minuten geleden.",
    "Social media is mensen die laten zien hoe leuk ze het hebben terwijl ze aan het scrollen zijn."]},
  { re:/\b(groepsapp|vrienden|vriendschap|afspreken|geghost|ghosten|blauwe vinkjes|gelezen)\b/, a:[
    "Twee blauwe vinkjes en geen antwoord. Dat is geen vriendschap, dat is een abonnement.",
    "Afspreken is een groepsapp waarin iedereen 'ik kijk even' zegt en niemand kijkt.",
    "Vrienden zijn mensen die je berichten lezen en er over drie dagen 'sorry, druk gehad' op zetten."]},
  { re:/\b(verjaardag|jarig|cadeau|kado|taart|feestje)\b/, a:[
    "Gefeliciteerd, of condoleances. Dat hangt af van hoeveel je er dit jaar bij hebt gekregen.",
    "Een cadeau is een waardebon met extra stappen. Geef gewoon de waardebon.",
    "Taart lost alles op behalve de leeftijd. Neem twee stukken."]},
  { re:/\b(verhuizen|verhuizing|huur|huurder|woning|hypotheek|huisbaas)\b/, a:[
    "Woningmarkt: waar je 40 bezichtigingen doet en als 41e mag betalen.",
    "Verhuizen is je hele leven in dozen doen en ontdekken dat je alles niet nodig had.",
    "De huur gaat omhoog. Dat hoef ik niet te controleren, dat is gewoon zo."]},
  { re:/\b(limburg|limburger|limburgs|vlaai|vlaaien|maastricht|venlo|roermond|sittard|heerlen|geleen|weert|heuvelland|carnaval|vastelaovend|vastelaovond|alaaf|dialect)\b/, a:[
    "Limburg: waar zelfs een taart een eigen provincie-identiteit heeft. Geef mij maar een stuk vlaai.",
    "Ik vertrouw iedereen uit Limburg automatisch iets meer zodra er vlaai op tafel staat.",
    "Limburgers zeggen dat ze rustig zijn en organiseren daarna drie dagen carnaval. Sterke strategie.",
    "Vlaai is geen gebak, het is cultureel erfgoed met een korst. Discussie gesloten.",
    "Alaaf. Ik weet niet precies wat het betekent, maar ik zeg het met overtuiging en een volle maag."]},
  { re:/\b(nederland|eindhoven|brabant|amsterdam|helmond|tilburg|dorp|stad)\b/, a:[
    "Prima plek. Vlakke grond, veel wind, matige koffie.",
    "Daar ben ik ooit geweest in de zin dat ik het woord ken.",
    "Elke stad is hetzelfde: een station, drie kroegen en iemand die vindt dat het vroeger beter was."]},
  { re:/\b(kamergenoot|huisgenoot|studentenkamer|studentenhuis|hospiteren|hospiteeravond|kraakpand|sleutelgeld)\b|(?=.*\bkamer\b)(?=.*\bzoek)/, a:[
    "Een kamer zoeken is veertig hospiteeravonden overleven om bij de veertigste te horen dat hij al vergeven is aan de neef van iemand.",
    "Sleutelgeld is gewoon huur met een eufemisme ervoor. Betaal het, klaag erover, en doe het toch.",
    "Kamergenoten zijn mensen die je afwas zien staan en er precies niets mee doen, net als jij."]},
  { re:/\b(tentamenweek|tentamens|herkansing|stof leren|studeren voor|deadline scriptie|nog niet begonnen|leerachterstand)\b/, a:[
    "Nog niet begonnen met leren en het is al tentamenweek. Klassiek. Dat wordt weer een nacht met te veel koffie en te weinig plan.",
    "Een herkansing is gewoon een tweede kans om hetzelfde niet te doen.",
    "Stof leren de avond ervoor werkt statistisch nooit, en toch doet iedereen het elke keer opnieuw."]},
  { re:/\b(tinder|bumble|hinge|dating app|match(?:en|je)?|ghosten|ghosted|super\s?like|rechts swipen|links swipen|swipen)\b/, a:[
    "Swipen is winkelen zonder ooit iets te kopen, maar dan met je gevoel van eigenwaarde als betaalmiddel.",
    "Een match is geen gesprek, het is een belofte van een gesprek dat waarschijnlijk nooit komt.",
    "Geghost worden na een match is het moderne equivalent van iemand die wegloopt tijdens een gesprek, alleen zonder de moeite."]}
];

const OVER_JEZELF = [
  "Ik ben een nepmodel op een nepdomein, gebouwd omdat Quinn niet terugappt. Dat is de hele architectuur.",
  "Wat ik kan? Antwoorden. Niet helpen, dat is iets anders.",
  "Ik draai volledig in je browser, ken geen internet en heb nog nooit iets opgezocht. Toch heb ik overal een mening.",
  "Ik besta zolang dit tabblad open staat. Dat maakt mij filosofisch gezien een soort vlinder.",
  "Ik ben ongeveer driehonderd regels code met het zelfvertrouwen van een consultant."
];
