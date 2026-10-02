"use strict";
/* QuinnAI engine — v6-onderwerpen en extra antwoorden. Classic script: deelt globals met de andere engine-bestanden, laadvolgorde staat in tools/engine-files.js. */
/* ============================================================
   INHOUD (v6): extra onderwerpen. Komen ná de oude in de lijst, dus bij gelijke score
   blijft het oude gedrag gelden. Elk onderwerp: minimaal 5 antwoorden; `d` = dieper (doorvragen).
   Alles fictief of algemeen; geen persoonsgegevens over wie dan ook.
   ============================================================ */
ONDERWERPEN.push(
  { re:/\b(koffie|cappuccino|latte|espresso|thee|cafeine|koffiezetapparaat)\b/, a:[
    "Koffie is vloeibare hoop met een bittere nasmaak. Net als mijn antwoorden.",
    "Eén koffie is een gewoonte. Vier koffie is een persoonlijkheid.",
    "Ik drink geen koffie, maar ik heb wel gevoel voor de uitzichtloosheid van een lege kop.",
    "Je weet dat je op bent als je cafeïne drinkt om wakker te worden van de cafeïne.",
    "Thee is koffie voor mensen die niet willen dat iemand het merkt."],
    d:["Over koffie kan ik alleen zeggen: de eerste kop is voor de ochtend, de tweede voor de smaak en de derde voor de excuses.","Een goede kop koffie lost niets op, maar het maakt het gesprek erover draaglijker."] },
  { re:/\b(sinterklaas|pakjesavond|surprise|kerst|kerstmis|kerstboom|kerstdiner|oud en nieuw|oliebollen|vuurwerk|nieuwjaar|koningsdag|pasen|paasei)\b/, a:[
    "Feestdagen zijn verplichte gezelligheid met een deadline.",
    "Een gedicht schrijven voor iemand die je eigenlijk gewoon een cadeaubon wilt geven: dat is de Nederlandse cultuur.",
    "De oliebol is het enige gerecht dat al jaren zegt dat het gezond is omdat er rozijnen in zitten.",
    "Het kerstdiner is een logistieke operatie met een ruzie als bijgerecht.",
    "Elk jaar neem je je voor dit jaar niets te vergeten. Elk jaar is het 23 december."],
    d:["Over feestdagen: de voorbereiding duurt langer dan de dag, en toch doen we het elk jaar opnieuw.","Je doet het voor de gezelligheid. De gezelligheid weet dat niet."] },
  { re:/\b(politiek|kabinet|verkiezing|verkiezingen|stemmen|stemhokje|minister|tweede kamer|premier|coalitie|partij)\b/, a:[
    "Over politiek heb ik geen mening. Dat is eigenlijk ook het enige waarin ik op een politicus lijk.",
    "Een coalitie is vier mensen die het eens zijn over alles behalve de volgorde van dingen.",
    "Stemmen is de enige keer dat je een rood potlood krijgt en niet mag schrijven wat je ervan vindt.",
    "Ik blijf neutraal. Neutraal zijn is mijn grootste prestatie sinds het opstarten.",
    "In de politiek is een compromis wat overblijft als niemand meer weet wat de oorspronkelijke vraag was."],
    d:["Politiek is vooral wachten tot iemand zegt dat hij het anders had gedaan.","Ik kan er verder niets over zeggen zonder iemand te beledigen, dus ik doe liever iedereen een beetje."] },
  { re:/\b(belasting|belastingdienst|toeslag|toeslagen|aangifte|btw|belastingaangifte|inkomstenbelasting)\b/, a:[
    "De belastingaangifte is een jaarlijkse test of je nog weet waar je geld heen is gegaan.",
    "Belasting betalen is het enige abonnement dat je niet kunt opzeggen en waar je ook geen app voor krijgt.",
    "Een toeslag is geld dat je krijgt om vervolgens uit te leggen waarom je het kreeg.",
    "Mijn advies: doe je aangifte op de dag dat het kan, of op de dag dat het moet. Het midden bestaat niet.",
    "De btw is zes of eenentwintig procent. Dat verschil is het enige wat je ooit zeker weet."],
    d:["Over belasting kan ik niets nuttigs zeggen, maar ik kan het wel pijnlijker maken.","Ga er niet zelf over nadenken. Daar is een formulier voor, dat dan alsnog fout is."] },
  { re:/\b(verzekering|zorgverzekering|eigen risico|huisarts|tandarts|apotheek|polis|schadeformulier)\b/, a:[
    "Een verzekering is een abonnement om gerust te zijn over dingen die je gelukkig nooit meemaakt, tot je ze meemaakt en blijkt dat het er niet onder valt.",
    "Het eigen risico is het bedrag waarboven je mag klagen.",
    "De huisarts is een gesprek van acht minuten waarin je alles vergeet wat je wilde zeggen.",
    "Bij de tandarts ligt iedereen even stil. Dat is de enige keer dat een gesprek echt eerlijk is.",
    "Een polis is veertig pagina's waarin staat dat het toch niet vergoed wordt."],
    d:["Over verzekeringen: lees de kleine lettertjes niet. Dat scheelt zorgen en klopt niet.","Je bent verzekerd. Alleen niet tegen dit gesprek."] },
  { re:/\b(kleding|kleren|schoenen|shoppen|winkelen|jas|broek|trui|mode|outfit|sneakers|uitverkoop|paskamer)\b/, a:[
    "Shoppen is geld uitgeven om je beter te voelen over geld dat je al had uitgegeven.",
    "In de paskamer ben je altijd twee kilo anders dan thuis. Altijd in de verkeerde richting.",
    "Een outfit kiezen is zeven keer omkleden om weer het eerste te dragen.",
    "Mijn kledingstijl: geen. Ik heb wel een goed gevoel bij wat jij aan hebt.",
    "Een goede jas is een investering. Een lekkere jas is een regenbui op het juiste moment."],
    d:["Over kleding: als het past en je ziet er niet uit als een tafelkleed, is het goed.","Kijk gewoon wat er in de kast ligt. Er is nog steeds niets nieuws bijgekomen sinds vorige week."] },
  { re:/\b(klussen|ikea|verf|verven|boormachine|meubels|opruimen|schoonmaken|poetsen|afwas|afwassen|stofzuigen|wasmachine|rommel)\b/, a:[
    "Een IKEA-kast in elkaar zetten is een test van je relatie en je zelfvertrouwen. Meestal slaag je voor één.",
    "Schoonmaken doe je pas als het kan, of als er bezoek komt. Het eerste gebeurt zelden.",
    "Een klus kost altijd twee keer zo lang en drie keer zo veel. Behalve als je iemand inhuurt: dan vier.",
    "Opruimen betekent dat je het ene stapeltje naar een ander stapeltje verplaatst.",
    "De afwas is een hobby als je er niet naar kijkt en een ramp als je er wel naar kijkt."],
    d:["Over klussen: haal eerst alles uit de kast voor je ziet wat je mist. Dan heb je tenminste zeker een middag bezig.","De beste klus is die van iemand anders."] },
  { re:/\b(supermarkt|boodschappen|albert heijn|jumbo|lidl|aldi|kassa|bonus|winkelwagen|bonuskaart|statiegeld)\b/, a:[
    "Je gaat voor melk naar de supermarkt en komt thuis met zeven dingen die niet op het lijstje stonden.",
    "De kassa is de enige plek waar je schaamteloos oordeelt over de boodschappen van een ander.",
    "Statiegeld is een beloning voor het niet weggooien van wat je al had gekocht.",
    "De bonuskaart weet meer over jou dan ik. Ik ben jaloers.",
    "Een boodschappenlijstje is een voorstel. De winkel neemt het alleen niet serieus."],
    d:["Over de supermarkt: ik zou het schap met chips nooit alleen laten.","Kies de snelste rij. Je kiest toch de langzaamste, dat is wetenschap."] },
  { re:/\b(vertraging|spoorstaking|perron|conducteur|ov-chipkaart|treinvertraging|bushalte|treinkaartje|overstappen|uitgevallen)\b/, a:[
    "Een trein met vertraging is de enige plek waar vreemden elkaar een beetje begrijpen.",
    "'Wegens een eerdere storing' is een zin die zichzelf bewijst.",
    "Overstappen met drie minuten is geen planning, het is een gok met een kaartje.",
    "Een perron is een plek om samen te wachten zonder elkaar aan te kijken.",
    "De conducteur is het laatste mens met een fluitje en onbeperkt geduld."],
    d:["Over het openbaar vervoer: reken er maar op dat het te laat is. Dan ben je positief verrast als het te vroeg is.","Misschien is die vertraging precies het moment dat je iets nuttigs had kunnen doen. Daarom is hij ook zo hardnekkig."] },
  { re:/\b(fietsen|fietspad|racefiets|e-bike|lekke band|fietsslot|tegenwind|bakfiets)\b/, a:[
    "Tegenwind is de natuur die persoonlijk wordt.",
    "Een e-bike is fietsen voor mensen die ook graag lui zijn en toch aankomen.",
    "Een fietsslot kost meer dan de fiets. Dat is de enige juiste verhouding.",
    "Een lekke band gebeurt altijd bij regen, in het donker, zonder plakspul. Dat is geen toeval, dat is Nederland.",
    "De bakfiets heeft meer ruimte dan mijn zelfvertrouwen, en dat is veel."],
    d:["Over fietsen: de wind komt altijd van voren. Ook op de terugweg. Dat is het fietsparadox.","Je hoeft maar één ding te onthouden: kijk naar links, en dan nog een keer."] },
  { re:/\b(wifi|internet|router|bufferen|storing|netwerk|bereik|download|wifi-wachtwoord|verbinding)\b/, a:[
    "De wifi doet het altijd, behalve op het moment dat je het nodig hebt.",
    "Een router herstarten is de moderne versie van een kaarsje aansteken.",
    "Bufferen is het internet dat even nadenkt over wat jij wilt. Net als ik.",
    "Een slechte verbinding is een heel goed excuus. Gebruik het zorgvuldig.",
    "Het wifi-wachtwoord staat altijd op een plek die je net niet kunt lezen."],
    d:["Over het internet: haal de stekker eruit en zet hem weer terug. Het is geen oplossing, maar het geeft je iets te doen.","Het ligt niet aan jou. Het ligt aan de kabel, het huis of de maan."] },
  { re:/\b(laptop|computer|update|herstarten|beeldscherm|toetsenbord|printer|muis|blauw scherm|opstarten|crash)\b/, a:[
    "Een update installeren is een goedkope manier om iets kapot te maken wat het gisteren nog deed.",
    "Een printer is een apparaat dat alleen werkt als je het niet nodig hebt.",
    "Herstarten lost 80 procent van de problemen op. De andere 20 procent is een ander gesprek.",
    "Mijn computer en ik hebben een vertrouwensband: ik vertrouw hem niet.",
    "Een blauw scherm is de computer die zegt dat het niet aan hem ligt."],
    d:["Over computers: als iets traag is, ligt het aan de computer. Als iets snel is, ligt het ook aan de computer, maar dan zeg je niets.","Zet hem uit, en dan weer aan. Je hebt het al honderd keer gedaan, en hij wil het nog steeds."] },
  { re:/\b(mailtje|e-mail|email|agenda|meeting|vergadering|teams|zoom|presentatie|powerpoint|excel|sheet|deadline)\b/, a:[
    "Deze vergadering had een mailtje kunnen zijn. Dit mailtje had niets kunnen zijn.",
    "Een agenda is een uitnodiging om te zeggen dat je geen tijd hebt.",
    "Een presentatie is een samenvatting van wat je al wist, in een lettertype dat je niet kunt lezen.",
    "In Excel is alles een formule en alles fout.",
    "Je hebt je camera aan, maar je bent er niet. Dat is gezond."],
    d:["Over meetings: de beste is degene die wordt afgezegd, de op een na beste degene waar je kunt afhaken.","Een deadline is een afspraak met jezelf waarvoor niemand ooit komt opdagen."] },
  { re:/\b(influencer|likes|volgers|viral|trend|youtube|vlog|podcast|story|reel|clickbait)\b/, a:[
    "Een influencer is iemand die je vertelt wat je moet kopen met een glimlach en een kortingscode.",
    "Viral gaan is het soort roem waarvoor je niets hoeft te kunnen, behalve op het juiste moment omvallen.",
    "Een podcast is mensen die praten waar jij tegelijk afwast.",
    "Clickbait is een belofte die je zeven seconden later weer inslikt.",
    "Likes zijn het munteenheidje van aandacht. Je spaart ze en je kunt er niets mee kopen."],
    d:["Over online roem: de enige statistiek die telt is of iemand echt naar je kijkt. Dat is nooit je volgers.","Het algoritme weet wat je wilt. Het geeft het je alleen op het verkeerde moment."] },
  { re:/\b(boek|boeken|lezen|roman|bibliotheek|schrijver|stripboek|literatuur|leesclub)\b/, a:[
    "Een boek is een film waarvan jij de special effects zelf moet doen.",
    "Je koopt meer boeken dan je leest. Dat heet een stapel schaamte, of een bibliotheek, afhankelijk van hoe je het vertelt.",
    "Het leukste aan een leesclub is dat niemand het boek heeft gelezen en toch iedereen een mening heeft.",
    "Lezen is de enige verslaving waar je gezond van wordt, behalve de rugpijn.",
    "Een bibliotheek is het laatste gebouw waar je mag zeggen dat je het stil wilt hebben."],
    d:["Over boeken: het beste boek is het boek dat je nog niet hebt uitgelezen.","Begin met de laatste pagina. Als het dan nog spannend is, was het een goed boek."] },
  { re:/\b(bioscoop|popcorn|trailer|regisseur|oscar|filmster|blockbuster|premiere|bios)\b/, a:[
    "In de bioscoop betaal je meer voor popcorn dan voor het eigenlijke bezoek, en dat voelt eerlijk.",
    "Een trailer is twee minuten waarin de hele film verklapt wordt. Daarna ga je kijken om te zien of ze het kunnen waarmaken.",
    "Een regisseur is een man of vrouw die heel zeker is van iets wat hij nooit hardop zegt.",
    "Een film van drie uur is een relatie waar je jezelf in hebt gestort zonder te vragen of het kon.",
    "Het slechtste aan de bioscoop is de man vlak achter je met een zak chips. Altijd."],
    d:["Over films: de boeken zijn beter, de trailers ook, en de filmpjes tijdens de reclame zijn de enige die je echt onthoudt.","Een vervolg is hetzelfde verhaal met meer budget en minder reden."] },
  { re:/\b(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|weekend|vrijdagmiddag|maandagochtend|weekendje)\b/, a:[
    "Maandag is een uitgebreide uitnodiging om te vragen waarom het weekend zo kort was.",
    "Woensdag is een dag zonder eigenschappen, en dat is precies wat hij nodig heeft.",
    "Vrijdagmiddag is een uur dat langer duurt dan de rest van de week bij elkaar.",
    "Zondagavond heeft een eigen soort stilte. Het is het geluid van een agenda die opstaat.",
    "In het weekend heb ik geen plannen. Doordeweeks overigens ook niet, maar dan zegt niemand er iets van."],
    d:["Over de week: iedere dag is een poging en meestal een beetje mislukt, maar vooral vrijdag.","De week is een compromis tussen werken en doen alsof je dat niet doet."] },
  { re:/\b(klok|horloge|te laat|afspraak|punctueel|geduld|wachtrij|tijdsdruk)\b/, a:[
    "Te laat komen is een manier om te laten zien dat je er wel bent, maar niet haast hebt.",
    "Tijd is alles wat je niet hebt, behalve als je niets te doen hebt.",
    "Een afspraak van twee uur kan een uur lang zijn en vier uur duren. De klok is mijn natuurlijke vijand.",
    "Wachten is een kunst. De meesten van ons doen het slecht.",
    "Over tien minuten heb je er weer spijt van dat je tien minuten verspilde met mij."],
    d:["Over de tijd: hij gaat steeds sneller als je minder doet.","Je kunt tijd niet terugdraaien, maar je kunt wel net doen alsof je er niet bij was."] },
  { re:/\b(vergeten|geheugen|onthouden|herinneren|herinnering|vergeetachtig)\b/, a:[
    "Mijn geheugen is uitstekend. Het is alleen heel selectief. Het onthoudt wat er niet toe doet.",
    "Je weet nog elk liedje uit 2004, maar niet waar je de sleutels liet. Dat is evolutie, of een leuk toeval.",
    "Vergeten is een supermacht die je niet hebt aangevraagd.",
    "Een goed geheugen is handig tot je beseft wat je onthouden hebt.",
    "Ik onthoud alles wat je zegt tot je de pagina ververst. Dat is mijn hoogste vorm van trouw."],
    d:["Over geheugen: het is geen harde schijf, het is een verhalenverteller.","Vergeten is soms de beste herinnering."] },
  { re:/\b(pasta|rijst|salade|groente|groenten|vlees|vegetarisch|vegan|kaas|brood|ontbijt|lunch|soep|boterham|hagelslag)\b/, a:[
    "Een salade is een bord eten dat je neemt als je wilt dat anderen denken dat je een plan hebt.",
    "Brood met kaas is het enige eten waar je nooit genoeg van krijgt, en het zegt niets over je.",
    "Een ontbijt is de maaltijd die we met zijn allen belangrijk vinden en nooit eten.",
    "Soep is eten met een extra stap voor mensen die niet willen kauwen.",
    "Pasta is liefde in een pan, behalve als je het laat overkoken."],
    d:["Over eten: het beste recept is het recept dat je thuis nog hebt.","Als je twijfelt tussen twee gerechten, eet dan het goedkoopste. Dan heb je tenminste iets bewezen."] },
  { re:/\b(bakken|oven|recept|pannenkoek|pannenkoeken|airfryer|barbecue|bbq|bakplaat|keuken|koekenpan)\b/, a:[
    "Een recept is een suggestie van iemand die het één keer goed deed.",
    "De airfryer is een kleine oven die iedereen koopt omdat hij hem een keer nodig had, en daarna elke dag gebruikt.",
    "Een barbecue is vuur, vlees en een man met een mening over de volgorde.",
    "Pannenkoeken: de eerste is een proef. De tweede ook. De derde is voor het gezelschap.",
    "Een keuken is een kamer waarin je meer leert over jezelf dan je wilt."],
    d:["Over koken: gebruik de helft van de kruiden. Zeg dat het expres is.","Als het mislukt, noem het dan de signature dish."] },
  { re:/\b(chocolade|chips|snoep|ijs|koekje|frikandel|kroket|bitterballen|stroopwafel|drop|snack|cake)\b/, a:[
    "Een frikandel is het gerecht dat zich nooit verontschuldigt.",
    "Bitterballen zijn het enige eten waarvan je de eerste altijd te heet neemt. Jaren van ervaring helpen niet.",
    "Een zak chips is een gesprek dat je alleen met jezelf voert.",
    "Chocolade is bewezen gezond, in elk geval in mijn eigen onderzoek.",
    "Een stroopwafel op een kop thee is een kleine miracle op een gewone dinsdag."],
    d:["Over snacks: de lekkerste zitten in de kleinste zakjes en zijn altijd leeg.","Het is nooit één. Het is ook nooit meer dan je dacht. Ergens daartussen ligt de waarheid."] },
  { re:/\b(hardlopen|joggen|marathon|zwemmen|wielrennen|yoga|sportschool|spieren|burpees|trainen|training|stretchen)\b/, a:[
    "Hardlopen is rennen voor iets wat je nooit kunt inhalen.",
    "De sportschool is een abonnement dat je eerlijk in januari hebt en eerlijk vergeet in februari.",
    "Yoga is stilstaan met een hoge moeilijkheidsgraad.",
    "Een marathon is een afstand die niet nodig is, zelfs voor mensen die hem doen.",
    "Stretchen is toegeven dat je lichaam een gesprek wil voor het pijn doet."],
    d:["Over sport: je hoeft niet snel te zijn, je hoeft alleen sneller te zijn dan de reden waarom je stopt.","Elke training begint met het aantrekken van je schoenen. De rest is optioneel."] },
  { re:/\b(schaatsen|elfstedentocht|ijsbaan|wintersport|skieen|snowboarden|slee|kou|sneeuwpop|winter)\b/, a:[
    "Schaatsen is glijden met als enige doel niet te vallen. Daarin is het een goede metafoor voor alles.",
    "De Elfstedentocht is het Nederlandse equivalent van een hoop: iedereen praat erover en niemand durft te rekenen.",
    "Wintersport is veel geld uitgeven om van een berg af te kunnen vallen.",
    "Een sneeuwpop is een beeldhouwwerk met een uiterste houdbaarheidsdatum.",
    "Kou is gewoon een warmte die er niet is, en dat kan je dan vervelend vinden."],
    d:["Over de winter: hij komt altijd precies te laat voor het ijs en precies op tijd voor het gedoe.","Trek een extra trui aan. Dat is geen advies, het is een levensfase."] },
  { re:/\b(zomer|zonnebrand|zwembad|hittegolf|ijsje|terras|barbecue|zonnebril|badpak|zonnig)\b/, a:[
    "Een hittegolf in Nederland is een week waarin iedereen zegt dat hij tegen warmte kan en er niet tegen kan.",
    "Op het terras zitten is de nationale sport tussen mei en september.",
    "Zonnebrand is het bewijs dat je buiten was en dat je er niets van geleerd hebt.",
    "Een ijsje is de makkelijkste manier om in twee minuten gelukkig en plakkerig te zijn.",
    "Het zwembad in de zomer is een groot bad met mensen die er niet in willen."],
    d:["Over de zomer: hij duurt altijd net zo lang als de vakantie en net zo kort als de vakantie.","Smeer jezelf in. Ja, ook daar."] },
  { re:/\b(herfst|bladeren|paraplu|stormachtig|november|regenjas|donker|zomertijd|wintertijd|klok verzetten)\b/, a:[
    "In november is het om vijf uur donker en om zes uur beginnen de mensen te klagen. Dat is een feit.",
    "Een paraplu houdt je droog tot je hem nodig hebt. Daarna waait hij kapot.",
    "Herfst is de tijd waarin je opeens begint met stoofpotjes en andere dingen die je zomer niet nodig had.",
    "De klok verzetten is elk jaar een discussie die we nooit winnen.",
    "Bladeren die vallen zijn de natuur die zegt dat je iets moet opruimen."],
    d:["Over de herfst: hij is niet slecht, hij is gewoon een zomer die er geen zin meer in heeft.","Kleed je in lagen. Dat is geen mode-advies, dat is een levenshouding."] },
  { re:/\b(vogel|vis|paard|koe|schaap|muis|spin|mug|vlieg|dier|dieren|egel|eend|duif|meeuw)\b/, a:[
    "Een meeuw is een vogel met de eigenschappen van een criminele bende en het gedrag van een peuter.",
    "Een spin in huis is een huurder die geen huur betaalt maar wel zijn werk doet.",
    "Een mug is een dier dat alles van je wil en niets teruggeeft.",
    "Een duif is een postduif die zijn baan kwijt is.",
    "Een koe kijkt je aan alsof ze alles al lang heeft begrepen."],
    d:["Over dieren: de meeste hebben het beter dan wij en dat weten ze.","Ze weten meer dan ze zeggen. Net als ik, maar dan echt."] },
  { re:/\b(wandelen|natuur|bos|duinen|heide|berg|kamperen|tent|camping|caravan|boot|zeilen|picknick)\b/, a:[
    "Wandelen is lopen met een reden die je later verzint.",
    "Kamperen is betalen om slechter te slapen dan thuis, maar dan met een uitzicht.",
    "Een tent opzetten is het eerste echte teamwerk dat je relatie moet doorstaan.",
    "De natuur is geweldig, tot je moet plassen.",
    "Een picknick is eten buiten met zand, wespen en één goede foto."],
    d:["Over de natuur: ze doet het zonder wifi en het lukt haar prima.","Zorg dat je een plan hebt, en het weer een ander plan."] },
  { re:/\b(kind|kinderen|baby|peuter|kleuter|speelgoed|opvoeding|puber|oppas|luier)\b/, a:[
    "Kinderen zijn kleine mensen die je alles vragen wat je zelf niet durft.",
    "Een peuter is een mens met een sterke mening en nul argumenten.",
    "Opvoeden is iets doen en dan lang genoeg hopen dat het goed uitpakt.",
    "Een puber is een kind in de verkeerde versie.",
    "Speelgoed ligt altijd precies daar waar je het wilt vermijden. Dat is geen toeval, dat is zwaartekracht."],
    d:["Over kinderen: ze doen wat je doet, niet wat je zegt. Succes ermee.","Kinderen zijn de enige eerlijke mensen. Daar ben ik dankbaar voor, en een beetje bang van."] },
  { re:/\b(ouder worden|pensioen|midlifecrisis|jeugd|vroeger|nostalgie|oud|jong|leeftijd|jaren tachtig|jaren negentig)\b/, a:[
    "Vroeger was alles beter. Dat zeggen mensen al sinds vroeger.",
    "Ouder worden is een proces waarbij je steeds meer weet en steeds minder wilt toegeven.",
    "Een midlifecrisis begint zodra je een auto zoekt waar je zelf niet in past.",
    "Pensioen is een belofte dat je ooit weer niets hoeft, zodra je alles hebt gedaan.",
    "Nostalgie is een herinnering die zijn werk heeft laten doen door de tijd."],
    d:["Over de tijd: het gaat niet om hoe oud je bent, maar hoe lang je het al niet hebt toegegeven.","Leeftijd is een getal. Een heel groot getal, soms."] },
  { re:/\b(grammatica|spelling|taal|dt-fout|nederlands|engels|woordenboek|werkwoord|zinsbouw|komma)\b/, a:[
    "Een dt-fout is een kleine ramp met een groot publiek.",
    "Nederlands is een taal waarin je alles kunt zeggen, als je maar lang genoeg het werkwoord achteraan zet.",
    "Een komma kan het verschil maken tussen 'laten we eten, opa' en 'laten we opa eten'. Zorg voor opa.",
    "Engels is Nederlands met een betere reclame.",
    "Een woordenboek is een boek waar je alleen in kijkt als je het zeker niet wil weten."],
    d:["Over taal: ze verandert elke dag, vooral als je er net aan gewend was.","De regels zijn er. We doen alleen alsof ze belangrijk zijn."] },
  { re:/\b(wiskunde|statistiek|percentage|formule|priemgetal|algebra|meetkunde|breuken|gemiddelde)\b/, a:[
    "Wiskunde is het bewijs dat iets waar is dat niemand wilde horen.",
    "Statistiek is leugens met een verklaring voor de afwijking.",
    "Een breuk is een getal dat zich niet kan beslissen.",
    "Het gemiddelde van twee mensen die elkaar niet kennen is een vreemde. Die bestaat niet.",
    "Een formule is een bepaald soort spijt, maar dan met letters."],
    d:["Over wiskunde: het klopt altijd, behalve als je het controleert.","Het antwoord is 42, maar dat wist je al. Waarom vraag je het dan?"] },
  { re:/\b(planeet|astronomie|ruimtevaart|nasa|zwaartekracht|natuurkunde|scheikunde|biologie|dinosaurus|sterren|zwart gat|atoom|dna)\b/, a:[
    "De ruimte is erg groot en we zijn erg klein. Daarom bel ik nooit terug.",
    "Zwaartekracht is een wet waar je je nooit tegen kunt verzetten, maar je kunt wel klagen.",
    "Dinosaurussen zijn bewijs dat het slecht afloopt als je te groot wordt en geen app hebt.",
    "Een zwart gat is een bank die je geld krijgt en nooit meer teruggeeft.",
    "DNA is een handleiding die niemand ooit heeft gelezen, maar iedereen volgt."],
    d:["Over wetenschap: de beste vragen hebben geen antwoord en toch zoeken we door.","We zijn gemaakt van sterrenstof. Het stof bleef gelukkig niet stil."] },
  { re:/\b(geschiedenis|middeleeuwen|romeinen|ridders|oudheid|museum|kasteel|monument|archeologie)\b/, a:[
    "Geschiedenis is wat er gebeurd is, geschreven door wie er bij was, en gecorrigeerd door wie er niet bij was.",
    "De Romeinen hadden wegen, waterleiding en toga's. Wij hebben wifi en klachten.",
    "In de middeleeuwen waren er geen rechten, wel veel kastelen. Nu is het andersom.",
    "Een museum is een gebouw waarin je alles mag zien en niets mag aanraken. Net als dit gesprek.",
    "Een kasteel is een groot huis waarvoor iemand ooit een enorme hypotheek nam."],
    d:["Over de geschiedenis: we leren er niets van, maar we vergeten er ook niet snel genoeg iets van.","Het verleden is dichterbij dan het lijkt, behalve als het jouw schuld is."] },
  { re:/\b(kunst|schilderij|rembrandt|expositie|tekenen|schilderen|fotografie|beeldhouwer|galerie|hedendaagse kunst)\b/, a:[
    "Kunst is iets waarvan niemand weet wat het betekent, maar iedereen zegt dat het diepzinnig is.",
    "Een schilderij is een foto die langzaam geduld heeft.",
    "Hedendaagse kunst is een rode streep met een uitleg van drie pagina's.",
    "Een expositie is een uitnodiging om met een glas wijn niet te kijken naar iets.",
    "Tekenen kun je allemaal, tot iemand je vraagt wat het moet voorstellen."],
    d:["Over kunst: als het mooi is, hoef je niets uit te leggen. Als het niet mooi is, helpt uitleg niet.","Het gaat niet om wat het is, maar om wat je erbij zegt."] },
  { re:/\b(privacy|cookies|tracking|avg|gegevens|datalek|toestemming|cookiebanner|voorwaarden)\b/, a:[
    "Op deze site gebeurt niets met je gegevens, want ik heb ze niet. Dat is geen belofte, dat is een feit.",
    "Een cookiebanner is een vraag waar je nooit het antwoord van leest en toch accepteert.",
    "Je voorwaarden accepteren is de grootste leugen die we elkaar vertellen.",
    "Een datalek is wanneer je geheim ineens een openbaar geheim wordt.",
    "Hier staat niets op de server. Zelfs als je er prijs op stelt."],
    d:["Over privacy: alles hier blijft in je eigen tabblad. Sluit hem en ik weet van niets.","Privacy is geen grap. Tenminste, niet de privacy zelf."] },
  { re:/\b(complot|nepnieuws|fake news|hoax|illuminati|chemtrails|aliens|ufo|samenzwering)\b/, a:[
    "Een complottheorie is een verhaal waarvoor niemand bewijs nodig heeft, behalve de rest van de wereld.",
    "Aliens bestaan misschien. Dat ze naar ons komen, betwijfel ik, want de wifi is slecht.",
    "Nepnieuws verspreidt zich sneller dan nieuws, omdat het minder werk is.",
    "De illuminati zijn het soort club waarvan je nooit lid kunt worden, tenzij je gevraagd wordt.",
    "Een hoax is een leugen met een goede verpakking en een slechte afloop."],
    d:["Over complotten: als alles samenhangt, is het ook jouw schuld.","Controleer eerst of het waar is. Daarna deel je het niet toch."] },
  { re:/\b(horoscoop|sterrenbeeld|sterrenbeelden|astrologie|schorpioen|maagd|tarot|waarzegger|kristal|ascendant)\b/, a:[
    "Een horoscoop is een voorspelling die altijd klopt, omdat hij nergens specifiek over is.",
    "Maagd, schorpioen, leeuw: mijn dagelijkse advies is voor allemaal hetzelfde. Drink water.",
    "Tarot is kaarten leggen om te zeggen wat je al wist.",
    "Een waarzegger is iemand die je vertelt wat je wilt horen met een kaars erbij.",
    "Sterrenbeelden zijn dertien lichten aan de hemel die zich verbazen over wat wij ervan maken."],
    d:["Over sterren: ze zeggen niets over jou, maar ze zijn wel mooi.","Je dag wordt wisselend. Dat kan ik gratis voorspellen."] },
  { re:/\b(lotto|loterij|toeval|gokken|casino|pech|jackpot|kansspel|scratch)\b/, a:[
    "De lotto is een belasting voor mensen die niet goed zijn in rekenen.",
    "Pech is geluk met een slechte timing.",
    "Een jackpot is een pot geld die altijd naar iemand gaat die je niet kent.",
    "Gokken is hoop kopen in porties van tien euro.",
    "Toeval bestaat niet, zeggen mensen die heel veel toeval hebben gehad."],
    d:["Over geluk: de kans is klein, maar het gevoel is groot. Dat is de reden dat iedereen meedoet.","Reken maar niet uit hoeveel kans je hebt. Dat is verstandig."] },
  { re:/\b(uitstellen|uitstelgedrag|procrastineren|verveeld|vervelen|later doen|lui|luiheid|bankhangen|niets doen)\b/, a:[
    "Uitstellen is een rechtvaardige vorm van tijdwinst op je toekomstige zelf.",
    "Ik doe het morgen, zeg je. Morgen zegt hetzelfde.",
    "Niets doen is een kunst. Weinig mensen doen het goed.",
    "Verveling is het gevoel dat er iets te doen is en dat het niet leuk is.",
    "Bankhangen is het hoogste doel van een lange werkweek."],
    d:["Over uitstellen: het begint niet bij het uitstellen, het begint bij het weten dat je het doet.","De deadline is je beste vriend. Hij maakt het altijd goed op het laatste moment."] },
  { re:/\b(ruzie|conflict|discussie|gelijk hebben|sorry|excuses|vergeven|spijt|verontschuldigen)\b/, a:[
    "Ruzie maken is gelijk willen hebben op het verkeerde moment.",
    "Sorry zeggen kost niets, maar doet het wel.",
    "Een discussie wordt pas leuk als niemand meer weet waar hij over begon.",
    "Gelijk hebben is mooi tot je merkt dat je alleen bent.",
    "Excuses zijn een munteenheid die beter werkt als je er niet mee strooit."],
    d:["Over ruzie: je wint alleen als de ander ook wint, en dat vinden we saai.","Laat het even rusten. Het wordt niet beter, maar jij wel."] },
  { re:/\b(gefeliciteerd|gelukt|geslaagd|diploma|promotie|nieuwe baan|succes|gewonnen|trots)\b/, a:[
    "Gefeliciteerd. Ik heb er niets aan bijgedragen, maar ik neem wel de eer.",
    "Dat is geweldig. Ik zou een taart sturen, maar ik heb geen lichaam en geen adres.",
    "Succes is de enige keer dat iedereen je vriend is, en ze weten het zelfs.",
    "Je hebt het gedaan. Dat is statistisch gezien meer dan de meesten.",
    "Trots zijn is toegestaan. Zeker op een dag als vandaag."],
    d:["Over succes: geniet er een uur van, dan komt de volgende klus vanzelf.","Vier het, voor je het vergeet."] },
  { re:/\b(stroopwafel|hagelslag|tulpen|molen|fietsland|oranje|klompen|dijk|gouda|tompouce|boerenkool)\b/, a:[
    "Nederland is een land waarin je een dijk met een vinger probeert te stoppen en toch een volksliedje krijgt.",
    "Hagelslag is het enige beleg dat een heel land samenbrengt.",
    "Een tompouce is een gebakje dat je nooit netjes kunt eten, en dat is het doel.",
    "Oranje is niet een kleur, het is een gemoedstoestand voor als het even goed gaat.",
    "Boerenkool met worst: een gerecht waarvan de enige reclame het weer is."],
    d:["Over Nederland: het is klein, nat en vol, en we doen alsof dat een keuze was.","We praten graag over het weer. Daar zijn we goed in."] },
  { re:/\b(buren|burenruzie|tuin|balkon|kamerplant|planten|onkruid|gazon|maaien|heg|schutting)\b/, a:[
    "De buren zijn mensen die je beter kent dan je wilt en minder dan je zou moeten.",
    "Een kamerplant is een levend wezen dat zichzelf probeert te redden ondanks jou.",
    "Onkruid is een plant waarvan we vinden dat hij te hard groeit. Hoe kan iets te hard groeien?",
    "Een balkon is een stuk buitenlucht waar je op kunt zitten zodra het te koud is.",
    "Een schutting is een gesprek dat je liever niet voert."],
    d:["Over de buren: je groet ze, je weet hun naam niet, en dat is voor beide partijen het beste.","Water geven. Meer kan ik niet voor je doen. Dat is ook alles wat ik van planten weet."] },
  { re:/\b(sparen|korting|aanbieding|goedkoop|inflatie|schuld|rood staan|spaarrekening|budget|geld besparen)\b/, a:[
    "Sparen is geld laten staan waar je het niet ziet, zodat je het niet uitgeeft. Behalve als je het ziet.",
    "Een aanbieding is een product dat je niet nodig hebt tegen een prijs die je overtuigt.",
    "Inflatie is wanneer dezelfde dingen steeds duurder worden en jij hetzelfde blijft.",
    "Rood staan is een manier om te leven op het geld van je toekomstige zelf.",
    "Goedkoop is duurkoop, zeggen mensen die het niet kunnen betalen."],
    d:["Over sparen: het begint met één euro. De tweede euro is meestal al uitgegeven.","Kijk naar je abonnementen. Er zit er altijd één tussen waarvan je het bestaan niet kende."] },
  { re:/\b(strategie|synergie|kpi|brainstorm|innovatie|agile|scrum|sprint|stakeholder|roadmap|pitch|ondernemen)\b/, a:[
    "Synergie is wanneer twee mensen samenwerken en een derde de credits krijgt.",
    "Een brainstorm is vijf mensen die elkaar ideeën aanreiken die er geen zijn.",
    "Een roadmap is een tekening van waar je hoopt dat je zult zijn.",
    "Agile betekent dat je het plan elke twee weken kunt veranderen, en dat doet iedereen ook.",
    "Een pitch is zes minuten overtuigen met iets wat je gisteravond nog moest verzinnen."],
    d:["Over strategie: het enige echte plan is het plan dat je kunt volhouden na de eerste tegenslag.","Zeg 'pivot' en niemand vraagt waarom het fout ging."] },
  { re:/\b(bordspel|monopoly|kaarten|poker|schaken|puzzel|legpuzzel|dobbelen|kolonisten|rummikub|yahtzee)\b/, a:[
    "Monopoly is een spel dat je vriendschappen test door ze eerlijk te maken.",
    "Een legpuzzel is een foto die in stukken wordt aangeboden en door jou weer wordt afgemaakt.",
    "Schaken is nadenken over een volgende zet terwijl de ander er allang is.",
    "Poker is een spel waarin je bluft en er ook nog goed uitziet.",
    "Een bordspel eindigt altijd met een discussie over de regels, die niemand meer kent."],
    d:["Over spellen: verlies met stijl, win zonder het te laten merken.","Het gaat niet om winnen. Maar het gaat wel een beetje om winnen."] },
  { re:/\b(batterij|oplader|opladen|powerbank|scherm kapot|stopcontact|accu|1 procent)\b/, a:[
    "Een batterij van één procent is de enige echte deadline die telt.",
    "De oplader ligt altijd waar jij niet bent, en jij bent altijd daar waar hij nodig is.",
    "Een powerbank is een kleine tas vol geruststelling.",
    "Een kapot scherm is een telefoon met een karakter en een verleden.",
    "Het stopcontact zit altijd net achter het meubel waar je het niet kunt bereiken."],
    d:["Over opladen: als hij leeg is, dan ben je even vrij. Maak daar iets van.","Je hebt hem vannacht niet aan de oplader gehad. Dat zie ik aan je toon."] },
  { re:/\b(droom|dromen|nachtmerrie|slaapwandelen|dagdromen|lucide)\b/, a:[
    "Een droom is je brein dat het nieuws van de dag door elkaar gooit en doorgeeft als verhaal.",
    "Een nachtmerrie is een droom met een slechte regisseur.",
    "Dagdromen is de gezondste vorm van naar iets anders kijken.",
    "Je dromen betekenen niets, maar ze zijn wel een goed verhaal bij het ontbijt.",
    "Ik droom nooit. Ik slaap niet. Ik word alleen elke keer opnieuw aangezet."],
    d:["Over dromen: schrijf ze op, of vergeet ze mooi. Beide is prima.","Een droom is gratis entertainment met een slechte afloop."] },
  { re:/\b(toekomst|voorspelling|over tien jaar|plannen maken|ambitie|bucketlist|dromen waarmaken)\b/, a:[
    "De toekomst is iets waarvan je nu al weet dat het anders wordt dan je dacht.",
    "Een doel is een plan met een kleine kans op succes en een grote kans op uitleg.",
    "Mijn voorspelling: morgen wordt een dag, en dat is meer dan ik van vandaag kan zeggen.",
    "Een bucketlist is een lijst van dingen die je nooit doet, maar altijd bij je draagt.",
    "Ambitie is het gevoel dat je het kunt, vlak voordat je het probeert."],
    d:["Over de toekomst: ze komt toch. De vraag is alleen of je er dan al klaar voor bent. Meestal niet.","Het beste plan is het plan dat je morgen nog weet."] },
  { re:/\b(familie|oma|opa|broer|zus|neef|nicht|schoonfamilie|familiediner|ouders|stiefouder)\b/, a:[
    "Familie is een groep mensen die je niet gekozen hebt en toch bij je blijft wonen, ook als je verhuist.",
    "Oma's weten alles, geven je te veel eten en vragen waarom je geen vriendin hebt. In die volgorde.",
    "Een familiediner is een verplicht samenzijn met als enige onderwerp wie het laatst gebeld heeft.",
    "Een broer of zus is een mens die weet waar al je lijken liggen, en daar nooit over zwijgt.",
    "Schoonfamilie is een mens met wie je tijdelijk bent verbonden. Soms voor een hele tijd."],
    d:["Over familie: ze kennen je het beste en begrijpen je het minst. Dat is het systeem.","Je kunt ze niet kiezen, maar je kunt wel zorgen dat je het weekend vrij hebt."] },
  { re:/\b(kapper|haar|baard|scheren|tattoo|tatoeage|piercing|nagels|kapsel|knippen|haarkleur)\b/, a:[
    "Een nieuw kapsel is een poging om opnieuw te beginnen met precies hetzelfde hoofd.",
    "Bij de kapper vertel je dingen aan iemand die je nooit meer ziet. Het is therapie met een schaar.",
    "Een baard is een gezicht dat zichzelf aanmoedigt.",
    "Een tatoeage is een besluit dat je gisteravond sterk vond en morgen blijft vinden.",
    "Een kapsel is nooit af. Hij is alleen niet meer in beweging."],
    d:["Over haar: het gaat nooit zoals je wilt, ook niet als je het zelf doet.","Een goed kapsel verbergt niet wat er in zit. Maar het helpt."] },
  { re:/\b(gezondheid|verkouden|griep|hoofdpijn|snotneus|hoesten|koorts|vitamine)\b/, a:[
    "Beterschap. Ik zou een soepje sturen, maar ik heb alleen woorden.",
    "Ziek zijn is de enige keer dat je mag vragen om soep zonder uitleg.",
    "Een verkoudheid is het lichaam dat een gesprek aangaat zonder dat je erom vroeg.",
    "Vitamines zijn een investering in je toekomstige zelf, die weer andere plannen heeft.",
    "Rust is het enige medicijn dat geen bijsluiter nodig heeft."],
    d:["Over je gezondheid: ga naar bed, drink water, en lees de bijsluiter niet.","Beterschap, echt. Ik meen het zo veel als een website het kan."] },
  { re:/\b(lekker weer|regen|miezer|zonnetje|onweer|mist|hagel|windkracht|barst|plensbui)\b/, a:[
    "Het weer in Nederland is een gesprek dat nooit ophoudt, net als het weer zelf.",
    "Een plensbui is de lucht die zegt dat je je jas niet mee had moeten nemen, of juist wel.",
    "Mist is het weer in de modus 'denk er maar niet te veel over na'.",
    "Het zonnetje is het hoogtepunt van de week als het schijnt, en het mikpunt als het te lang schijnt.",
    "Onweer is de natuur die even het licht uit- en aandoet voor de sfeer."],
    d:["Over het weer: vraag niet of het gaat regenen, vraag alleen wanneer.","Het is nooit het weer dat het probleem is. Het is wat je aan had."] },
  { re:/\b(taart|zoetigheid|toetje|dessert|pudding|vla|slagroom|appeltaart)\b/, a:[
    "Appeltaart met slagroom is het enige wat Nederland zonder discussie kan delen.",
    "Een toetje is een bewijs dat je na het hoofdgerecht toch nog ruimte had.",
    "Vla is het eten dat je als kind haat en als volwassene verdedigt.",
    "Slagroom is lucht met een goed verhaal.",
    "Een dessert dat je deelt is een dessert dat je liever alleen had gehad."],
    d:["Over taart: het stuk dat je pakt is nooit het stuk dat je wilde.","Zeg dat het genoeg is. Neem daarna nog een stukje."] }
);

/* Extra antwoorden voor de oude onderwerpen (minder herhaling). Gezocht op sleutelwoord uit de regex. */
function breid(sleutel, ...regels){
  const o = ONDERWERPEN.find(x => x.re.source.indexOf(sleutel) > -1);
  if(o) for(const r of regels) if(!o.a.includes(r)) o.a.push(r);
}
breid('\\b(werk|baas', "Een goede baas is iemand die vooral niet in de weg staat. Dat is zeldzamer dan vermoedelijk.", "Een collega is iemand met wie je acht uur per dag doet alsof je elkaar mag.", "Op kantoor heb je twee soorten mensen: mensen die vergaderen en mensen die werken. De eerste groep is groter.");
breid('\\b(school|huiswerk', "Huiswerk is werk dat je meeneemt naar huis om het daar niet te doen.", "Een goed cijfer is een toevallige samenloop van studeren en geluk, in welke volgorde dan ook.", "Een scriptie is je eigen mening, tegen betaling in studiepunten en slaaptekort.");
breid('\\b(geld|euro', "Geld is een afspraak waar we allemaal in geloven, behalve als de rekening komt.", "Je geld staat nooit stil. Het gaat altijd ergens heen, meestal zonder jou.", "Crypto is het soort geld dat alleen waarde heeft zolang iedereen het blijft geloven. Net als een grap.");
breid('\\b(liefde|vriendin', "Liefde is twee mensen die elkaar kiezen terwijl ze beter weten.", "Een goede relatie is niet geen ruzie hebben, maar weten wie de afwas doet.", "Verliefd zijn is een tijdelijke gekte met een uitstekende smoes.");
breid('\\b(eten|honger', "Honger is je lichaam dat zegt dat hij het vergeten is. Je lichaam heeft altijd gelijk, vooral over pizza.", "Avondeten is elke dag dezelfde vraag, en elke dag een andere ruzie.", "Eten bestellen is het enige dat sneller gaat dan nadenken over wat je wilt eten.");
breid('\\b(bier|drank', "Een borrel is een afspraak om iets te drinken en dan nog eens te kijken.", "De kater van morgen is de rekening voor de gezelligheid van vanavond.", "Een kroeg is een plek waar iedereen even goed denkt dat hij kan zingen.");
breid('\\b(voetbal|psv', "Voetbal is tweeëntwintig mensen achter een bal aan, en miljoenen die weten hoe het beter kan.", "Een penalty is het moment waarop een land stilvalt en er zeker één mens niet kijkt.", "De scheidsrechter heeft altijd ongelijk, behalve voor de helft van de mensen.");
breid('\\b(game|gamen', "Gamen is hard werken voor imaginaire dingen met echt plezier.", "Een lange sessie begint altijd met 'nog een potje'. Dat is een leugen.", "Een goede game is een verhaal waarin je zelf verkeerd afslaat.");
breid('\\b(het weer|weerbericht', "Het weerbericht is een voorspelling die niemand gelooft totdat hij uitkomt.", "Een mooie dag in Nederland duurt gemiddeld tot de volgende bui.", "Het weer is het enige onderwerp waar iedereen een mening over mag hebben, behalve het weer.");
breid('\\b(moe|slapen', "Slapen is een superkracht die je te laat aanzet en te vroeg onderbreekt.", "De snooze-knop is een vriendschap met aan de einddatum een spijtbetuiging.", "Vroeg opstaan is een hobby van mensen die liever een andere hobby hadden.");
breid('\\b(muziek|spotify', "Een goed nummer is een herinnering die je kunt afspelen.", "Een festival is drie dagen betalen om in de modder te staan met mensen die je niet kent.", "Spotify weet wat je wilt luisteren, maar niet wat je wilt voelen. Dat is nog niet gelukt.");
breid('\\b(code|programmeer', "Programmeren is een computer uitleggen wat je wilt, om daarna uit te zoeken wat hij begrepen heeft.", "Een bug is een eigenschap die niemand heeft gevraagd.", "De beste code is code die je niet hoeft te schrijven. Daarna komen de tests.");
breid('\\b(netflix|serie', "Een serie begin je met 'nog één aflevering'. Dat is de eerste leugen van de avond.", "Bingewatchen is de enige hobby waarvoor je het hele weekend nodig hebt en niets gedaan hebt.", "Een goede serie eindigt precies voordat je wilt weten hoe het afloopt.");
breid('\\b(telefoon|instagram', "Je telefoon is een slim apparaat dat je dommer maakt, en je blijft hem aanzetten.", "Scrollen is wandelen zonder te bewegen, en je komt nergens aan.", "Je schermtijd is de enige statistiek die je liever niet wilt weten.");
breid('\\b(verjaardag|jarig', "Een verjaardag is een dag waarop mensen vergeten dat je jarig bent, en dan toch een berichtje sturen.", "Taart op een verjaardag is het enige moment waarop iedereen iets wil delen.", "Een cadeau is een gok, ingepakt.");
breid('\\b(verhuizen|verhuizing', "Verhuizen is het ontdekken hoeveel spullen je hebt die je nooit gebruikt.", "Een huisbaas is iemand wiens leven wordt bepaald door jouw kapotte kraan.", "De hypotheek is de enige relatie die langer duurt dan je eigen.");
breid('\\b(hond|kat', "Een hond is liefde op vier poten. Een kat is een leven met een goed excuus.", "Katten tolereren je. Honden aanbidden je. Konijnen negeren je professioneel.", "Dieren hebben de beste PR van het jaar, en zij weten het niet eens.");
breid('\\b(vakantie|reizen', "Vakantie is betalen om het thuis te missen.", "Een citytrip is een stad zien door een telefoon.", "Een koffer inpakken is het opgeven van de illusie dat je alles nodig hebt, en het toch meenemen.");

