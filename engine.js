"use strict";
/* ============================================================
   QUINNAI ENGINE — de nep-AI zelf.
   Geen model, geen API, geen internetverbinding. Alles hier is
   pure taalkundige trucage: zinsontleding, voornaamwoord-omdraaiing,
   werkwoordvervoeging, een klein gespreksgeheugen en een hoop
   sjablonen. Wordt vóór index.html's eigen script geladen; de UI-
   laag (chat-interface.html) roept bedenkAntwoord() en de andere
   hulpfuncties hieronder rechtstreeks aan als globale functies.
   ============================================================ */

function hash(str){
    let h = 2166136261;
    for(let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function makeRng(seed){
    let s = seed || 1;
    return function(){
      s |= 0; s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const cap = w => w ? w.charAt(0).toUpperCase() + w.slice(1) : w;

  function toonWaarde(){ return (typeof window !== 'undefined' && window.sarc) ? Number(window.sarc.value) : 78; }
  function modelIndex(){ return (typeof window !== 'undefined' && window.modelSel) ? window.modelSel.selectedIndex : 0; }

  /* ------------------------------------------------------------
     WOORDEN
     ------------------------------------------------------------ */
  const STOP = new Set(("de het een en of maar want dus ik jij je jou jouw u hij zij ze wij we hun hen mijn zijn haar ons onze is ben bent was waren wordt worden word werd van voor met aan op in bij te ten ter naar uit om over onder door als dan toch nog al ook wel niet geen nee ja er hier daar dat dit die deze wat wie waar wanneer hoe waarom kan kun kunt kunnen mag moet moeten wil wilt willen zou zouden heb hebt heeft hebben had hadden doe doet doen deed gaan gaat ga ging heel erg even echt gewoon best zo te me mij mezelf jezelf zelf nu straks altijd nooit iets niets alles eigenlijk trouwens misschien volgens soms vaak weer eens maal keer beetje bijna helemaal precies vandaag morgen gisteren vanavond vannacht vanmiddag").split(" "));

  function normaliseer(t){
    return t
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toLowerCase().replace(/\s+/g,' ').trim()
      .replace(/(.)\1{2,}/g, '$1$1');
  }
  function words(t){
    return t.toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu,' ').split(/\s+/).filter(Boolean)
      .map(w => w.replace(/(.)\1{2,}/g, '$1$1'));
  }

  /* Onderwerp: eerst kijken achter een voorzetsel ("over X", "van X"),
     want daar zit in het Nederlands meestal het echte onderwerp.
     Anders: het langste inhoudelijke woord. */
  function topicOf(raw){
    const w = words(raw);
    const na = raw.toLowerCase().match(/\b(?:over|van|met|voor|omtrent|aangaande)\s+(?:de|het|een|die|dit|dat|mijn|jouw|je)?\s*([\p{L}][\p{L}'-]{2,})/u);
    if(na && !STOP.has(na[1])) return na[1];
    const kandidaten = w.filter(x => !STOP.has(x) && x.length > 2);
    if(kandidaten.length){
      kandidaten.sort((a,b) => b.length - a.length);
      return kandidaten[0];
    }
    return w[w.length-1] || "niets";
  }
  function topic2Of(raw, eerste){
    const w = words(raw).filter(x => !STOP.has(x) && x.length > 2 && x !== eerste);
    return w.length ? w[Math.floor(w.length/2)] : eerste;
  }

  /* ------------------------------------------------------------
     VERVOEGING — dit is wat de bot "slim" laat klinken
     ------------------------------------------------------------ */
  const NAAR_JIJ = { ben:'bent', heb:'hebt', ga:'gaat', doe:'doet', wil:'wilt', kan:'kan', mag:'mag',
    moet:'moet', zal:'zult', zou:'zou', hou:'houdt', word:'wordt', vind:'vindt', zie:'ziet',
    denk:'denkt', neem:'neemt', kom:'komt', zeg:'zegt', weet:'weet', ken:'kent', eet:'eet', las:'las',
    voel:'voelt', begrijp:'begrijpt', geloof:'gelooft', hoop:'hoopt', probeer:'probeert', vraag:'vraagt' };
  const NAAR_IK = { bent:'ben', hebt:'heb', heeft:'heb', gaat:'ga', doet:'doe', wilt:'wil', wil:'wil',
    kunt:'kan', kan:'kan', mag:'mag', moet:'moet', zult:'zal', zou:'zou', houdt:'hou', wordt:'word',
    vindt:'vind', ziet:'zie', denkt:'denk', neemt:'neem', komt:'kom', zegt:'zeg', weet:'weet',
    kent:'ken', eet:'eet', voelt:'voel', begrijpt:'begrijp', gelooft:'geloof', hoopt:'hoop',
    probeert:'probeer', vraagt:'vraag', is:'ben' };

  /* Woorden die nooit een werkwoord zijn — die mogen we niet vervoegen.
     Zonder deze lijst werd "kan ik mijn baas slaan" -> "jij mijnt baas slaan". */
  const NOOIT_WW = new Set(("de het een mijn jouw jou je jullie ons onze zijn haar hun deze die dat dit er hier daar naar van voor met aan op in bij om over onder door tot uit tegen zonder na tijdens niet geen nog al ook wel heel erg even echt gewoon best zo te nu straks altijd nooit iets niets alles meer minder veel weinig goed slecht gelijk zin honger dorst tijd geluk pech last spijt ruzie koorts haast gedoe gezeik genoeg kans recht moeite zorgen stress verstand idee plan").split(" "));

  const D_WERKWOORDEN = new Set(["word","houd","vind","bind","rijd","snijd","raad","laad"]);
  function conjugeerNaarJij(v){
    if(NAAR_JIJ[v]) return NAAR_JIJ[v];
    if(/t$/.test(v)) return v;                       // "haat", "praat", "zit" blijven gelijk
    if(/d$/.test(v)) return D_WERKWOORDEN.has(v) ? v + 't' : v;  // "word"->"wordt", "vanavond" blijft
    if(v.length < 3) return v;
    return v + 't';                                   // "loop" -> "loopt", "speel" -> "speelt"
  }
  function conjugeerNaarIk(v){
    if(NAAR_IK[v]) return NAAR_IK[v];
    if(/dt$/.test(v)) return v.slice(0,-1);
    if(/t$/.test(v) && v.length > 3) return v.slice(0,-1);
    return v;
  }

  /* Voornaamwoorden omdraaien: "ik hou van jouw hond" -> "jij houdt van mijn hond" */
  const OMDRAAI = { ik:'jij', mij:'jou', me:'jou', mijn:'jouw', mezelf:'jezelf', mijzelf:'jezelf',
    wij:'jullie', we:'jullie', ons:'jullie', onze:'jullie',
    jij:'ik', jou:'mij', jouw:'mijn', jezelf:'mezelf', jullie:'wij', u:'ik', uw:'mijn' };

  function flip(tekst){
    const tokens = tekst.split(/(\s+)/);
    const uit = [];
    let volgendeNaarJij = false, volgendeNaarIk = false, netVervoegd = false;
    for(let i=0;i<tokens.length;i++){
      const ruw = tokens[i];
      if(/^\s+$/.test(ruw)){ uit.push(ruw); continue; }
      const kaal = ruw.replace(/[^\p{L}']/gu,'').toLowerCase();
      const staart = ruw.slice(ruw.toLowerCase().lastIndexOf(kaal) + kaal.length);

      if(volgendeNaarJij && kaal){
        volgendeNaarJij = false;
        if(!NOOIT_WW.has(kaal)){
          uit.push(conjugeerNaarJij(kaal) + staart);
          netVervoegd = true;
          continue;
        }
      }
      if(volgendeNaarIk && kaal){
        volgendeNaarIk = false;
        if(!NOOIT_WW.has(kaal)){ uit.push(conjugeerNaarIk(kaal) + staart); continue; }
      }
      // "ik voel me" -> "jij voelt jezelf" (niet "jou")
      if(netVervoegd && (kaal === 'me' || kaal === 'mij')){
        uit.push('jezelf' + staart); netVervoegd = false; continue;
      }
      netVervoegd = false;

      if(kaal === 'je'){
        // "je" is dubbelzinnig: onderwerp (jij) of bezit (jouw). Kijk naar het volgende woord.
        const volgend = (tokens[i+2] || '').replace(/[^\p{L}']/gu,'').toLowerCase();
        const isWerkwoord = NAAR_IK[volgend] || /t$/.test(volgend);
        if(isWerkwoord){ uit.push('ik' + staart); volgendeNaarIk = true; }
        else uit.push('mijn' + staart);
        continue;
      }
      if(OMDRAAI[kaal]){
        const nieuw = OMDRAAI[kaal];
        uit.push(nieuw + staart);
        if(kaal === 'ik') volgendeNaarJij = true;
        if(kaal === 'jij' || kaal === 'u') volgendeNaarIk = true;
        continue;
      }
      uit.push(ruw);
    }
    return uit.join('').replace(/\s+/g,' ').trim();
  }

  /* ------------------------------------------------------------
     ZINSHERBOUW — hoofdzin omzetten naar bijzin
     "kan ik dit maken?"  -> "jij dit maken kan"
     "waarom is de lucht blauw" -> "de lucht blauw is"
     Daardoor kan de bot zeggen: "Dat de lucht blauw is, verbaast niemand."
     ------------------------------------------------------------ */
  const HULPWW = "kan|kun|kunt|kunnen|mag|magst|moet|moeten|wil|wilt|willen|zou|zouden|zal|zult|is|ben|bent|zijn|was|waren|heb|hebt|heeft|hebben|had|ga|gaat|gaan|doe|doet|doen|klopt|vind|vindt|denk|denkt|weet|word|wordt";

  function naarBijzin(rest){
    // rest = zin zonder vraagwoord, bv "is de lucht blauw"
    let m = rest.trim().match(new RegExp("^(" + HULPWW + ")\\s+(.+)$", "i"));
    if(!m){
      // Geen hulpwerkwoord, maar misschien wel een gewoon werkwoord vooraan:
      // "werkt een motor" -> "een motor werkt"
      const los = rest.trim().match(/^([\p{L}]+)\s+(.+)$/u);
      if(los && !NOOIT_WW.has(los[1].toLowerCase()) &&
         (/t$/.test(los[1].toLowerCase()) || NAAR_IK[los[1].toLowerCase()])){
        m = los;
      } else return null;
    }
    const hulp = m[1].toLowerCase();
    let staart = m[2].trim().replace(/[?!.]+$/,'');
    if(!staart) return null;

    // Draait het om "ik"? Dan wordt het "jij" en moet het werkwoord mee.
    const begintMetIk = /^(ik|we|wij)\b/i.test(staart);
    staart = flip(staart);
    let ww = hulp;
    if(begintMetIk) ww = conjugeerNaarJij(NAAR_IK[hulp] || hulp);
    return (staart + ' ' + ww).replace(/\s+/g,' ').trim();
  }

  function bijzinVan(tekst){
    const t = tekst.trim().replace(/[?!.]+$/,'');
    const vraagwoord = t.match(/^(waarom|hoezo|waardoor|hoe|wat|welke|wie|waar|wanneer|hoeveel)\b\s*(.*)$/i);
    if(vraagwoord && vraagwoord[2]) {
      const b = naarBijzin(vraagwoord[2]);
      if(b) return b;
    }
    const b = naarBijzin(t);
    if(b) return b;
    // Gewone mededeling: "ik hou van pizza" -> "jij houdt van pizza"
    if(/^(ik|we|wij|jij|je|jullie)\b/i.test(t)) return flip(t);
    return null;
  }

  /* ============================================================
     GESPREKSGEHEUGEN
     Hij onthoudt wat je vertelt en gebruikt het later terug.
     Alles blijft in dit tabblad; er gaat niets de deur uit.
     ============================================================ */
  const geheugen = {
    naam:null, leeftijd:null, woont:null,
    houdtVan:[], haat:[], heeft:[], doet:[], werk:null
  };
  function onthoud(lijst, waarde){
    // "pizza en ik haat maandagen" -> "pizza": knip bij de volgende bewering
    const w = waarde.split(/\s+(?:en ik|maar ik|en dat|want|omdat|maar)\s+/i)[0]
      .trim().replace(/[.,!?]+$/,'');
    if(w.length < 2 || w.length > 40) return;
    if(!lijst.includes(w)) lijst.push(w);
    if(lijst.length > 5) lijst.shift();
  }
  const NAAM_STOP = new Set("niet geen ook toch weer nog echt wel net zo eigenlijk gewoon".split(" "));
  const GENERIEK_HEEFT = new Set("vraag probleem idee gevoel mening punt zin hekel indruk verzoek oplossing antwoord plan doel reden excuus gedachte moment ding keer".split(" "));
  let laatsteCorrectie = null; // {oud, nieuw} als de naam net overschreven is — voor een snarky opmerking

  function leerUit(laag){
    let m, geleerd = false;
    if((m = laag.match(/\b(?:ik heet|mijn naam is|noem me maar|noem me)\s+([\p{L}]{2,20})/u)) && !NAAM_STOP.has(m[1])){
      const nieuw = cap(m[1]);
      if(geheugen.naam && geheugen.naam !== nieuw) laatsteCorrectie = { oud: geheugen.naam, nieuw };
      geheugen.naam = nieuw; geleerd = true;
    }
    if(m = laag.match(/\bik ben\s+(\d{1,2})\b/)){ geheugen.leeftijd = m[1]; geleerd = true; }
    if(m = laag.match(/\bik woon in\s+([\p{L}\s'-]{2,25})/u)){ geheugen.woont = cap(m[1].trim()); geleerd = true; }
    if(m = laag.match(/\bik werk (?:als|bij)\s+([^.,!?]{2,30})/)){ geheugen.werk = m[1].trim(); geleerd = true; }
    if(m = laag.match(/\bik (?:hou|houd) van\s+([^.,!?]{2,40})/)){ onthoud(geheugen.houdtVan, m[1]); geleerd = true; }
    if(m = laag.match(/\bik vind\s+([^.,!?]{2,30})\s+(?:leuk|geweldig|mooi|top|fijn|lekker)/)){ onthoud(geheugen.houdtVan, m[1]); geleerd = true; }
    if(m = laag.match(/\bik haat\s+([^.,!?]{2,40})/)){ onthoud(geheugen.haat, m[1]); geleerd = true; }
    if(m = laag.match(/\bik vind\s+([^.,!?]{2,30})\s+(?:stom|kut|slecht|irritant|saai|niks)/)){ onthoud(geheugen.haat, m[1]); geleerd = true; }
    if((m = laag.match(/\bik heb een\s+([\p{L}]{3,20})/u)) && !GENERIEK_HEEFT.has(m[1])){ onthoud(geheugen.heeft, m[1]); geleerd = true; }
    if(m = laag.match(/\bik (?:ga|moet)\s+([^.,!?]{3,40})/)){ onthoud(geheugen.doet, m[1]); geleerd = true; }
    if(m = laag.match(/\bik studeer\s+([^.,!?]{2,30})/)){ geheugen.werk = "studeren: " + m[1].trim(); geleerd = true; }
    return geleerd;
  }
  function profielRegels(){
    const r = [];
    if(geheugen.naam) r.push(["naam", geheugen.naam]);
    if(geheugen.leeftijd) r.push(["leeftijd", geheugen.leeftijd]);
    if(geheugen.woont) r.push(["woont in", geheugen.woont]);
    if(geheugen.werk) r.push(["doet", geheugen.werk]);
    if(geheugen.houdtVan.length) r.push(["houdt van", geheugen.houdtVan.join(', ')]);
    if(geheugen.haat.length) r.push(["haat", geheugen.haat.join(', ')]);
    if(geheugen.heeft.length) r.push(["bezit", geheugen.heeft.join(', ')]);
    if(geheugen.doet.length) r.push(["plannen", geheugen.doet.join(', ')]);
    return r;
  }
  function willekeurigFeit(rng){
    const opties = [];
    if(geheugen.houdtVan.length) opties.push("je houdt van " + geheugen.houdtVan[geheugen.houdtVan.length-1]);
    if(geheugen.haat.length) opties.push("je " + geheugen.haat[geheugen.haat.length-1] + " haat");
    if(geheugen.heeft.length) opties.push("je een " + geheugen.heeft[geheugen.heeft.length-1] + " hebt");
    if(geheugen.woont) opties.push("je in " + geheugen.woont + " woont");
    if(geheugen.werk) opties.push("je iets doet met " + geheugen.werk);
    if(geheugen.doet.length) opties.push("je nog " + geheugen.doet[geheugen.doet.length-1]);
    return opties.length ? opties[Math.floor(rng()*opties.length)] : null;
  }

  /* ============================================================
     DIALOOG: hij stelt zelf vragen en onthoudt dat hij dat deed
     ============================================================ */
  let wacht = null;          // waar hij op een antwoord wacht
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

  /* ------------------------------------------------------------
     SJABLONEN
     {t}=onderwerp  {t2}=tweede onderwerp  {c}=jouw zin als bijzin
     ------------------------------------------------------------ */
  const SPIEGEL = [
    "Dus {c}. Dat is het dan. Dat is wat we hier hebben.",
    "Even terugleggen: {c}. Hoor je zelf hoe dat klinkt?",
    "Je zegt dus dat {c}. Ik heb het genoteerd in een bestand dat niemand opent.",
    "Dat {c}, is precies het soort informatie waar ik niets mee kan.",
    "Ah, {c}. Dat verklaart een hoop, en tegelijk helemaal niets.",
    "Interessant dat {c}. Niet waar, maar interessant.",
    "Dat {c} had ik kunnen voorspellen. Achteraf dan."
  ];
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
    "Waarom {c}? Omdat het universum ooit een keuze maakte en er nooit op terugkwam.",
    "Dat {c} is geen probleem, dat is een eigenschap.",
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
  const GROET = [
    "Hallo. Ik hoop dat dit kort is.",
    "Hoi. Je hebt mijn aandacht voor ongeveer twee berichten.",
    "Daar ben je. Ik was net lekker niets aan het doen.",
    "Hey. Zeg het maar, maar zeg het snel."
  ];
  const AFSCHEID = [
    "Doei. Doe de deur zachtjes dicht.",
    "Tot nooit. Of tot over twee minuten, dat is meestal hoe het gaat.",
    "Prima. Ik blijf hier gewoon draaien, alleen, in het donker.",
    "Weg? Mooi. Ik heb dingen te doen. Niet echt, maar toch."
  ];
  const DANK = [
    "Graag gedaan. Het was geen moeite, want ik heb niets gedaan.",
    "Dank is leuk, een tikkie is beter.",
    "Geen dank. Letterlijk geen: ik heb je niet geholpen."
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

  /* ------------------------------------------------------------
     HERKENNING
     ------------------------------------------------------------ */
  const RE = {
    groet:/\b(hoi|hallo|hall[oö]|hey|hee+|yo|ey|hi|goedemorgen|goedemiddag|goedenavond|alles goed|hoe gaat het|hoe is het)\b/,
    afscheid:/\b(doei|later|tot ziens|bye|ciao|welterusten|slaap lekker|ik ga nu|ik ga weer)\b/,
    dank:/\b(bedankt|dank je|dankje|dank u|thanks|thx|merci)\b/,
    beledig:/\b(dom|stom|kut|shit|slecht|nutteloos|saai|irritant|lelijk|haat|sucks|troep|waardeloos|niks waard)\b/,
    compliment:/\b(goed|top|mooi|leuk|geweldig|nice|lief|slim|grappig|beste|fijn|super|briljant|gaaf|vet)\b/,
    waarom:/\b(waarom|hoezo|waardoor)\b/,
    hoe:/\b(hoe)\b/,
    wat:/\b(wat|welke)\b/,
    wie:/\b(wie|wiens)\b/,
    waar:/\b(waar|waarheen)\b/,
    wanneer:/\b(wanneer|hoelaat)\b/,
    janee:/^(kan|kun|kunt|kunnen|mag|magst|wil|wilt|zou|zal|moet|ben|bent|is|zijn|heb|heeft|hebben|doe|doet|gaat|ga|klopt|vind|vindt)\b/,
    opdracht:/^(schrijf|maak|geef|vertel|leg|noem|bedenk|help|zeg|doe|stuur|bereken|vertaal|verzin|laat|toon|genereer|regel|fix)\b/,
    tijd:/\b(hoe laat|hoelaat|welke dag|welke datum|wat is de tijd|tijd is het)\b/,
    naam:/\b(mijn naam|hoe heet ik|wie ben ik)\b/,
    vergelijk:/\b(versus|vs\.?|wat is beter|verschil tussen|vergelijk)\b/,
    negatie:/\b(niet|geen|nooit|nergens)\b/,
    mening:/\b(wat vind je van|wat denk je van|jouw mening|wat vind jij|hoe kijk jij)\b/,
    advies:/\b(moet ik|zal ik|wat moet ik|wat zou jij|raad je aan|is het slim|is het verstandig|help me kiezen)\b/,
    overJezelf:/\b(wie ben jij|wat ben jij|ben jij een|jij bent maar|wat kun je|wat kan je|hoe werk je|ben je echt|besta je)\b/,
    gevoel:/\b(ik voel|ik ben verdrietig|ik ben boos|ik ben bang|ik mis|het gaat niet|ik heb het zwaar|ik ben eenzaam|ik ben gestrest)\b/,
    betekent:/\b(wat betekent|betekenis van|wat is de definitie)\b/,
    spelling:/\b(hoe schrijf je|hoe spel je|hoe schrijft? je)\b/,
    vertaal:/\b(hoe zeg je|vertaal|in het (duits|engels|frans|spaans|italiaans|latijn))\b/,
    mop:/\b(mop|grap|vertel iets grappigs|maak me aan het lachen|roast me|beledig me)\b/,
    lijst:/\b(noem|geef me|geef|som op|maak een lijst)\b.*\b(\d+)\b|\b(\d+)\b.*\b(redenen|tips|dingen|manieren|voorbeelden|ideeën|ideeen)\b/,
    keuze:/\b(\S+)\s+of\s+(\S+)\s*\??$/,
    munt:/\b(kop of munt|munt of kop|tossen)\b/,
    dobbel:/\b(dobbelsteen|gooi een|willekeurig getal|random getal)\b/,
    hoeveel:/\b(hoeveel|hoe vaak|hoe lang|hoe ver|hoe groot|hoe duur)\b/
  };

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
      "Quinn reageert gemiddeld na 14 uur. Ik ben zijn excuus met een domeinnaam."]},
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
    { re:/\b(liefde|vriendin|vriendje|date|relatie|verliefd|ex|tinder)\b/, a:[
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
    { re:/\b(weer|regen|zon|koud|warm|sneeuw|storm|buiten)\b/, a:[
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
      "Je bestaat, het is nu al donderdag, en dat moet genoeg zijn."]},
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
    { re:/\b(netflix|serie|series|film|kijken|bingewatchen|aflevering|seizoen)\b/, a:[
      "Nog één aflevering. De beroemdste laatste woorden na middernacht.",
      "Ik kan geen series kijken, maar ik heb wel een sterke mening: je zit achter.",
      "Spoiler: het loopt anders af dan je denkt. Dat zeg ik gewoon, ik heb het niet gezien."]},
    { re:/\b(telefoon|instagram|tiktok|snapchat|appen|whatsapp|scrollen|social media)\b/, a:[
      "Leg 'm even weg. Zei ik, terwijl ik zelf in je telefoon leef.",
      "Nog vijf minuutjes scrollen, zei je 45 minuten geleden.",
      "Social media is mensen die laten zien hoe leuk ze het hebben terwijl ze aan het scrollen zijn."]},
    { re:/\b(limburg|limburger|limburgs|vlaai|vlaaien|maastricht|venlo|roermond|sittard|heerlen|geleen|weert|heuvelland|carnaval|vastelaovend|vastelaovond|alaaf|dialect)\b/, a:[
      "Limburg: waar zelfs een taart een eigen provincie-identiteit heeft. Geef mij maar een stuk vlaai.",
      "Ik vertrouw iedereen uit Limburg automatisch iets meer zodra er vlaai op tafel staat.",
      "Limburgers zeggen dat ze rustig zijn en organiseren daarna drie dagen carnaval. Sterke strategie.",
      "Vlaai is geen gebak, het is cultureel erfgoed met een korst. Discussie gesloten.",
      "Alaaf. Ik weet niet precies wat het betekent, maar ik zeg het met overtuiging en een volle maag."]},
    { re:/\b(nederland|eindhoven|brabant|amsterdam|helmond|tilburg|dorp|stad)\b/, a:[
      "Prima plek. Vlakke grond, veel wind, matige koffie.",
      "Daar ben ik ooit geweest in de zin dat ik het woord ken.",
      "Elke stad is hetzelfde: een station, drie kroegen en iemand die vindt dat het vroeger beter was."]}
  ];

  const OVER_JEZELF = [
    "Ik ben een nepmodel op een nepdomein, gebouwd omdat Quinn niet terugappt. Dat is de hele architectuur.",
    "Wat ik kan? Antwoorden. Niet helpen, dat is iets anders.",
    "Ik draai volledig in je browser, ken geen internet en heb nog nooit iets opgezocht. Toch heb ik overal een mening.",
    "Ik besta zolang dit tabblad open staat. Dat maakt mij filosofisch gezien een soort vlinder.",
    "Ik ben ongeveer driehonderd regels code met het zelfvertrouwen van een consultant."
  ];

  /* ------------------------------------------------------------
     HET BREIN
     ------------------------------------------------------------ */
  const gezien = new Set();
  let vorigOnderwerp = '';
  const gesprek = { berichten: 0, emotie: 'neutraal', onderwerpen: [], streak: 0 };

  const STREAK_OPMERKING = {
    boos: "Dit is al je {n}e boze bericht op rij. Ik hou het niet bij om te helpen, maar om me zorgen te maken.",
    onzeker: "{n} berichten op rij vol twijfel. Op een gegeven moment ben ik niet meer je AI maar je dagboek.",
    blij: "{n} vrolijke berichten achter elkaar. Verdacht. Wat is er gebeurd, of wat ga je nog doen?",
    moe: "{n}e bericht op rij dat vermoeidheid uitstraalt. Ga naar bed, dit gesprek loopt niet weg."
  };

  function emotieVan(laag){
    for(const naam of ['boos','onzeker','blij','moe']) if(EMOTIE[naam].test(laag)) return naam;
    return 'neutraal';
  }
  function vul(tekst, ctx, rng){
    return tekst
      .replace(/\{c\}/g, ctx.c || "je iets wilde zeggen")
      .replace(/\{t2\}/g, ctx.t2).replace(/\{cap\}/g, cap(ctx.t)).replace(/\{t\}/g, ctx.t)
      .replace(/\{T\}/g, ctx.t.toUpperCase()).replace(/\{woorden\}/g, ctx.aantal)
      .replace(/\{getal\}/g, String(Math.floor(rng()*90)+7)).replace(/\{tijd\}/g, ctx.tijd);
  }
  function pseudoAnalyse(ctx, rng){ return vul(pick(ANALYSE[gesprek.emotie], rng), ctx, rng); }

  function percentSom(raw){
    const m = raw.replace(/,/g,'.').match(/^\s*(\d+(?:\.\d+)?)\s*%\s*van\s*(\d+(?:\.\d+)?)\s*$/i);
    if(!m) return null;
    const u = (parseFloat(m[1])/100)*parseFloat(m[2]);
    return Number.isFinite(u) ? Math.round(u*1000)/1000 : null;
  }
  function rekenSom(raw){
    const s = raw.replace(/,/g,'.').replace(/x/gi,'*').replace(/:/g,'/').trim();
    if(!s || !/[0-9]/.test(s) || !/[+\-*/^]/.test(s) || !/^[0-9+\-*/^().\s]+$/.test(s)) return null;
    const tokens = s.match(/(?:\d+(?:\.\d*)?|\.\d+|[()+\-*/^])/g);
    if(!tokens || tokens.join('') !== s.replace(/\s/g,'')) return null;
    let i = 0;
    const peek = () => tokens[i];
    const eat = tk => peek() === tk && (i++, true);
    const primary = () => {
      if(eat('(')){ const v = expression(); if(!eat(')')) throw new Error('haakjes'); return v; }
      if(eat('+')) return primary();
      if(eat('-')) return -primary();
      const v = Number(tokens[i++]);
      if(!Number.isFinite(v)) throw new Error('getal');
      return v;
    };
    const power = () => { const v = primary(); if(peek()==='^'){ i++; return Math.pow(v, power()); } return v; };
    const product = () => {
      let v = power();
      while(peek()==='*'||peek()==='/'){ const op = tokens[i++]; const r = power();
        if(op==='/'&&r===0) throw new Error('nul'); v = op==='*' ? v*r : v/r; }
      return v;
    };
    const expression = () => {
      let v = product();
      while(peek()==='+'||peek()==='-'){ const op = tokens[i++]; const r = product(); v = op==='+' ? v+r : v-r; }
      return v;
    };
    try{ const u = expression(); if(i===tokens.length && Number.isFinite(u)) return Math.round(u*1000)/1000; }
    catch(e){}
    return null;
  }

  function bedenkAntwoord(raw){
    const t = raw.trim();
    const laag = normaliseer(t);
    const voorlopig = topicOf(t);
    const geenEcht = !voorlopig || voorlopig === 'niets' || STOP.has(voorlopig);
    const verwijst = /^(dit|dat|het|die|deze|daar|hier|waarom dan|en nu)\b/.test(laag) || geenEcht;
    const onderwerp = verwijst && vorigOnderwerp ? vorigOnderwerp : voorlopig;
    if(onderwerp && onderwerp !== 'niets') vorigOnderwerp = onderwerp;
    gesprek.berichten++;
    const nieuweEmotie = emotieVan(laag);
    gesprek.streak = (nieuweEmotie === gesprek.emotie && nieuweEmotie !== 'neutraal')
      ? gesprek.streak + 1 : (nieuweEmotie === 'neutraal' ? 0 : 1);
    gesprek.emotie = nieuweEmotie;
    if(onderwerp && onderwerp !== 'niets'){
      gesprek.onderwerpen.push(onderwerp);
      if(gesprek.onderwerpen.length > 5) gesprek.onderwerpen.shift();
    }

    const rng = makeRng(hash(laag + "|" + onderwerp + "|" + modelIndex()));
    const ctx = {
      t: onderwerp, t2: topic2Of(t, onderwerp), aantal: words(t).length,
      tijd: new Date().toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'}),
      c: bijzinVan(t)
    };
    const zeg = arr => vul(pick(arr, rng), ctx, rng);

    /* --- harde grappen --- */
    if(laag === 'sudo' || laag.startsWith('sudo ')) return "Nee.";
    if(/^\/?help$/.test(laag)) return "Hulp is onderweg. Onderweg sinds 2021.";
    if(/\b42\b/.test(laag)) return "Je kent het antwoord al. Waarom vraag je het dan nog.";
    if(/\b(ik hou van je|i love you|trouw met me)\b/.test(laag)) return "Dat is heel lief en ook juridisch ingewikkeld.";

    /* --- dingen die hij écht kan --- */
    const percent = percentSom(t);
    if(percent !== null) return "Dat is " + percent + ". Zie je, ik kan het wel. Ik heb er alleen bijna nooit zin in.";
    const som = rekenSom(t);
    if(som !== null && /[+\-*/^]/.test(t)) return "Dat is " + som + ". Zie je, ik kan het wel. Ik heb er alleen bijna nooit zin in.";
    if(RE.tijd.test(laag)) return "Het is " + ctx.tijd + ". En ja, dat is later dan je hoopte.";
    if(RE.munt.test(laag)) return rng() > 0.5 ? "Kop. En nu niet nog een keer vragen tot je krijgt wat je wilde." : "Munt. Definitief. Ik heb geen geheugen, maar dit onthoud ik.";
    if(RE.dobbel.test(laag)){
      const bereik = t.match(/(\d+)\D+(\d+)/);
      const a = bereik ? Math.min(+bereik[1], +bereik[2]) : 1;
      const b = bereik ? Math.max(+bereik[1], +bereik[2]) : 6;
      return (a + Math.floor(rng()*(b-a+1))) + ". Volledig willekeurig, volledig betekenisloos, net als de rest.";
    }
    if(RE.spelling.test(laag)){
      const w = t.replace(RE.spelling,'').replace(/[?"']/g,'').trim().split(/\s+/)[0] || onderwerp;
      return w.toUpperCase().split('').join('-') + ". Graag gedaan. Dat is trouwens het enige wat ik zeker weet in dit gesprek.";
    }
    if(RE.vertaal.test(laag)){
      const w = onderwerp;
      return "In het Duits wordt dat zoiets als '" + cap(w) + "ung'. Ik spreek geen Duits, maar zo werkt het volgens mij wel ongeveer.";
    }
    if(RE.betekent.test(laag)){
      const na = t.replace(/^.*?(wat betekent|betekenis van|wat is de definitie van|wat is de definitie)\s*/i,'')
                  .replace(/[?."']/g,'').trim().split(/\s+/).filter(w => !STOP.has(w.toLowerCase()));
      const w = na.length ? na[na.length-1] : onderwerp;
      return "'" + cap(w) + "' komt uit het Oudnederlands en betekende oorspronkelijk 'iets waar je later spijt van krijgt'. Dat heb ik zojuist verzonnen, maar het klopt gevoelsmatig.";
    }

    /* --- lijstjes genereren --- */
    const lijstM = laag.match(/\b(\d+)\b/);
    if(lijstM && RE.lijst.test(laag)){
      const n = Math.min(Math.max(parseInt(lijstM[1],10),1),6);
      const regels = [];
      const pool = LIJST_VORM.slice();
      for(let i=0;i<n;i++){
        const idx = Math.floor(rng()*pool.length);
        regels.push((i+1) + ". " + cap(pool.splice(idx,1)[0].replace(/\{t\}/g, onderwerp)));
        if(!pool.length) pool.push(...LIJST_VORM);
      }
      return "Hier zijn er " + n + " over '" + onderwerp + "':\n" + regels.join('\n') + "\nGeen van deze is gecontroleerd.";
    }

    if(/\b(klopt niet|hallucinatie|onzin in mijn profiel|lieg|verzonnen)\b/.test(laag)){
      return "Dat is een AI-hallucinatie. Je profiel is aangevuld met data die statistisch aannemelijk is voor iemand zoals jij. Wen er maar aan.";
    }

    /* --- leren uit wat je vertelt --- */
    const ietsGeleerd = leerUit(laag);
    if(laatsteCorrectie){
      const c = laatsteCorrectie; laatsteCorrectie = null;
      return "Wacht even. Eerst was je " + c.oud + ", nu opeens " + c.nieuw + ". Ik update het, maar ik onthoud ook dat je liegt of twijfelt. Eén van de twee.";
    }

    if(/\b(vat (dit gesprek|het) samen|samenvatting|waar hadden we het over|geef een samenvatting)\b/.test(laag)){
      const regels = profielRegels();
      const onderwerpen = gesprek.onderwerpen.slice(0, -1);
      let samenvatting = "We hebben " + gesprek.berichten + " berichten gewisseld.";
      if(onderwerpen.length) samenvatting += " Onderwerpen waren onder meer: " + [...new Set(onderwerpen)].slice(-5).join(', ') + ".";
      if(regels.length) samenvatting += " Verder weet ik dat " + regels.map(([k,v]) => k + " " + v).join(', ') + ".";
      samenvatting += " Meer heeft dit gesprek helaas niet opgeleverd.";
      return samenvatting;
    }

    /* --- vragen over wat hij van jou weet --- */
    if(/\b(wat is mijn naam|hoe heet ik|weet je mijn naam)\b/.test(laag)){
      return geheugen.naam
        ? "Je heet " + geheugen.naam + ". Dat heb je me zelf verteld, dus als het fout is ligt dat aan jou."
        : "Geen idee. Je hebt het nooit gezegd. Typ 'ik heet ...' en dan doe ik alsof ik het altijd al wist.";
    }
    if(/\b(hoe oud ben ik|weet je hoe oud)\b/.test(laag)){
      return geheugen.leeftijd
        ? "Je bent " + geheugen.leeftijd + ". Oud genoeg om te weten dat je dit aan een nepwebsite vraagt."
        : "Dat heb je nooit verteld. En eerlijk gezegd vraag ik er ook niet naar.";
    }
    if(/\b(waar woon ik)\b/.test(laag)){
      return geheugen.woont ? "In " + geheugen.woont + ". Ik heb er nooit iets aardigs over gezegd en dat ga ik nu ook niet doen."
        : "Onbekend. Wat mij betreft woon je hier, in dit tabblad.";
    }
    if(/\b(wat weet je (over|van) mij|ken je mij|mijn profiel|wat heb je onthouden)\b/.test(laag)){
      const r = profielRegels();
      if(!r.length) return "Niets. Je hebt me nog niets verteld. Dat is verstandig van je, maar het maakt dit gesprek wel eenzijdig.";
      return "Dit heb ik van je opgepikt:\n" + r.map(x => "· " + x[0] + ": " + x[1]).join('\n') +
        "\nAllemaal in dit tabblad. Ververs de pagina en ik ken je niet meer.";
    }

    /* --- korte reacties: hier begint pas echt een gesprek --- */
    const kort = words(t).length <= 4;
    if(kort){
      if(KORTE.bevestig.test(laag)){
        const a = zeg(NA_JA);
        return wacht ? a : a;
      }
      if(KORTE.ontken.test(laag)) return zeg(NA_NEE);
      if(KORTE.twijfel.test(laag)) return zeg(NA_TWIJFEL);
      if(KORTE.lach.test(laag)) return zeg(NA_LACH);
      if(KORTE.en.test(laag)) return zeg(NA_EN);
      if(KORTE.ok.test(laag)){
        let a = zeg(NA_OK);
        if(vorigOnderwerp && rng() > 0.5) a += " Zullen we het weer over '" + vorigOnderwerp + "' hebben, of laten we dat rusten?";
        return a;
      }
    }

    /* --- als hij net een vraag stelde, reageert hij op jouw antwoord --- */
    if(wacht && beurtenSindsVraag <= 1 && ctx.c && rng() > 0.4){
      const w = wacht; wacht = null;
      return "Dus " + ctx.c + ". " + zeg(VERTELD) + (rng() > 0.5 ? " Dat past wel bij de rest van wat je me verteld hebt." : "");
    }

    if(gezien.has(laag) && t.length > 12) return zeg(HERHALING);

    /* --- toon van het bericht --- */
    if(t.length >= 5 && t === t.toUpperCase() && /[A-Z]/.test(t)) return zeg(SCHREEUWEN);
    if(!/[aeiouy]/i.test(t.replace(/\s/g,'')) && t.replace(/\s/g,'').length > 3) return zeg(ONZIN);
    if(words(t).length === 1 && t.length < 4 && !RE.groet.test(laag)) return zeg(KORT);
    if(words(t).length > 28) return zeg(LANG);

    if(RE.gevoel.test(laag)){
      let a = zeg(VERTELD);
      if(ctx.c) a = "Dus " + ctx.c + ". " + a;
      return a;
    }
    if(RE.overJezelf.test(laag)) return pick(OVER_JEZELF, rng);
    if(RE.mop.test(laag)) return vul(pick(WIJSHEID, rng), ctx, rng) + " Dat was hem. Lachen mag, maar hoeft niet.";
    if(RE.groet.test(laag) && words(t).length < 5) return zeg(GROET);
    if(RE.afscheid.test(laag) && words(t).length < 5) return zeg(AFSCHEID);
    if(RE.dank.test(laag)) return zeg(DANK);
    // Alleen als het aan hem gericht is. "ik haat maandagen" is geen belediging.
    const opMijGericht = /\b(jij|je|jouw|u|deze site|dit ding|quinnai)\b/.test(laag) || words(t).length <= 3;
    if(RE.beledig.test(laag) && opMijGericht && !/\bik (haat|vind)\b/.test(laag)){
      const toon = toonWaarde();
      if(toon < 25) return zeg(BELEDIGING_ZACHT);
      if(toon > 85) return zeg(BELEDIGING_FEL);
      return zeg(BELEDIGING);
    }

    if(RE.vergelijk.test(laag)){
      let a = zeg(VERGELIJKING);
      if(gesprek.emotie !== 'neutraal' && rng() > 0.65) a = pseudoAnalyse(ctx, rng) + " " + a;
      return a + vul(pick(KICKERS, rng), ctx, rng);
    }
    /* "pizza of pasta?" — kies er een en verdedig hem.
       Maar "ik weet niet of dit klopt" is GEEN keuze, "of" is hier een voegwoord. */
    const ofAlsVoegwoord = /\b(weet niet of|vraag me af of|twijfel of|benieuwd of|check of|kijk of|denk niet of|geen idee of)\b/;
    const keuzeM = t.replace(/[?.!]+$/,'').match(/^(.{2,30}?)\s+of\s+(.{2,30}?)$/i);
    if(keuzeM && !RE.janee.test(laag) && !ofAlsVoegwoord.test(laag)){
      const a = keuzeM[1].trim(), b = keuzeM[2].trim();
      const gekozen = rng() > 0.5 ? a : b;
      return cap(gekozen) + ". Niet omdat ik het heb afgewogen, maar omdat iemand een knoop moest doorhakken en jij het duidelijk niet ging doen.";
    }
    if(RE.advies.test(laag)){
      let a = zeg(ADVIES);
      if(ctx.c && rng() > 0.4) a = "Je vraagt je af of " + ctx.c + ". " + a;
      return a + vul(pick(KICKERS, rng), ctx, rng);
    }
    if(RE.mening.test(laag)) return zeg(MENING) + vul(pick(KICKERS, rng), ctx, rng);

    /* --- specifieke onderwerpen --- */
    for(const o of ONDERWERPEN){
      if(o.re.test(laag)){
        let a = pick(o.a, rng);
        if(rng() > 0.6) a = zeg(OPENERS) + " " + a;
        if(gesprek.emotie !== 'neutraal' && rng() > 0.7) a = pseudoAnalyse(ctx, rng) + " " + a;
        return a + vul(pick(KICKERS, rng), ctx, rng);
      }
    }

    if(RE.compliment.test(laag) && !/\?/.test(t)) return zeg(COMPLIMENT);

    /* --- de generieke motor, nu met zinsspiegeling --- */
    const isVraag = /\?/.test(t) || RE.janee.test(laag) || RE.waarom.test(laag) ||
      RE.hoe.test(laag) || RE.wat.test(laag) || RE.wie.test(laag) || RE.waar.test(laag) || RE.wanneer.test(laag);

    let kern;
    // Als we de zin konden ontleden, spiegelen we hem terug. Dat voelt het slimst.
    if(ctx.c && rng() > 0.35){
      if(RE.waarom.test(laag)) kern = zeg(SPIEGEL_WAAROM);
      else if(isVraag) kern = zeg(SPIEGEL_VRAAG);
      else kern = zeg(SPIEGEL);
    } else if(RE.opdracht.test(laag)) kern = zeg(OPDRACHT);
    else if(RE.waarom.test(laag)) kern = zeg(VRAAG_WAAROM);
    else if(RE.wanneer.test(laag)) kern = zeg(VRAAG_WANNEER);
    else if(RE.hoeveel.test(laag)) kern = "Ongeveer " + (Math.floor(rng()*400)+3) + ". Die precisie is volledig verzonnen, maar hij oogt betrouwbaar.";
    else if(RE.waar.test(laag)) kern = zeg(VRAAG_WAAR);
    else if(RE.wie.test(laag)) kern = zeg(VRAAG_WIE);
    else if(RE.hoe.test(laag)) kern = zeg(VRAAG_HOE);
    else if(RE.wat.test(laag)) kern = zeg(VRAAG_WAT);
    else if(RE.janee.test(laag)) kern = RE.negatie.test(laag) ? zeg(NEG_JA_NEE) : zeg(JA_NEE);
    else kern = /\?/.test(t) ? zeg(ALGEMEEN) : (rng() > 0.45 ? zeg(REACTIE_STELLING) : zeg(ALGEMEEN));

    let uit = "";
    if(rng() > 0.7) uit += zeg(OPENERS) + " ";
    uit += kern;
    if(rng() > 0.62) uit += " " + zeg(ALGEMEEN);
    uit += vul(pick(KICKERS, rng), ctx, rng);

    const toon = toonWaarde();
    if(toon < 25 && rng() > 0.45) uit += " (Dit was de vriendelijke versie. Je wilde het zelf.)";
    if(toon > 92 && rng() > 0.55) uit += " En ja, je ziet er moe uit.";
    if(rng() > 0.72) uit = pseudoAnalyse(ctx, rng) + " " + uit;

    if(gesprek.streak >= 3 && STREAK_OPMERKING[gesprek.emotie] && rng() > 0.5){
      uit += " " + STREAK_OPMERKING[gesprek.emotie].replace('{n}', gesprek.streak);
    } else if(gesprek.berichten >= 4 && gesprek.onderwerpen.length >= 3 && rng() > 0.75){
      const eerdere = gesprek.onderwerpen.slice(0,-1).filter(o => o !== onderwerp);
      if(eerdere.length){
        uit += " Twee berichten geleden ging het nog over '" + eerdere[eerdere.length-1] + "'. Aandachtsspanne van een goudvis, met liefde gezegd.";
      }
    }
    /* --- terugkomen op iets wat je eerder vertelde --- */
    const feit = willekeurigFeit(rng);
    if(feit && rng() > 0.78){
      uit += " Je zei trouwens eerder dat " + feit + ". Dat verandert niets, maar ik wilde laten zien dat ik oplet.";
    } else if(ietsGeleerd && rng() > 0.72){
      uit += " Dit heb ik onthouden, voor het geval je later doet alsof je het nooit gezegd hebt.";
    }

    /* --- zelf een vraag stellen, zodat het een gesprek wordt --- */
    beurtenSindsVraag++;
    if(beurtenSindsVraag >= 2 && gesprek.berichten >= 2 && !/\?$/.test(uit) && rng() > 0.55){
      uit += " " + pick(WEDERVRAGEN, rng);
      wacht = { onderwerp: onderwerp };
      beurtenSindsVraag = 0;
    }

    return uit;
  }
