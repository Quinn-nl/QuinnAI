"use strict";
/* ============================================================
   QUINNAI ENGINE — de nep-AI zelf.
   Geen model, geen API, geen internetverbinding. Alles hier is
   pure taalkundige trucage: zinsontleding, voornaamwoord-omdraaiing,
   werkwoordvervoeging, een klein gespreksgeheugen en een hoop
   sjablonen. Wordt vóór index.html's eigen script geladen; de UI-
   laag roept bedenkAntwoord(), resetEngine() en de andere hulp-
   functies hieronder rechtstreeks aan als globale functies.
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
const titel = s => s.replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
const dict = o => Object.assign(Object.create(null), o);   // geen 'constructor'/'toString' als woord

function toonWaarde(){ return (typeof window !== 'undefined' && window.sarc) ? Number(window.sarc.value) : 78; }
function modelIndex(){ return (typeof window !== 'undefined' && window.modelSel) ? window.modelSel.selectedIndex : 0; }
/* Modellen: 0 Turbo (standaard), 1 Nano (kort en 'hongerig'), 2 Legacy (altijd fel, ongeacht de slider). */
function isNano(){ return modelIndex() === 1; }
function isLegacy(){ return modelIndex() === 2; }
function toonModus(){
  if(isLegacy()) return 'fel';
  const w = toonWaarde();
  const basis = w < 25 ? 'zacht' : (w > 85 ? 'fel' : 'normaal');
  /* De slider blijft baas bij de uitersten; alleen in het midden schuift zijn stemming de toon op. */
  if(basis !== 'normaal') return basis;
  const l = stemmingLabel();
  return l === 'chagrijnig' ? 'fel' : (l === 'aanhankelijk' ? 'zacht' : basis);
}
function toonKies(normaal, zacht, fel){
  const m = toonModus();
  return m === 'zacht' ? zacht : (m === 'fel' ? fel : normaal);
}
/* Kans op een extra sneer (kicker/pseudo-analyse), schaalt met de sarcasme-slider:
   30% bij toon 0, 70% bij toon 100. Legacy voelt altijd als een hoge toon. */
function kansOpKicker(){ const w = isLegacy() ? 90 : toonWaarde(); return 0.3 + (w/100)*0.4; }
function kansOpAnalyse(){ const w = isLegacy() ? 90 : toonWaarde(); return 0.15 + (w/100)*0.3; }

/* ------------------------------------------------------------
   WOORDEN
   ------------------------------------------------------------ */
const STOP = new Set(("de het een en of maar want dus ik jij je jou jouw u hij zij ze wij we hun hen mijn zijn haar ons onze is ben bent was waren wordt worden word werd van voor met aan op in bij te ten ter naar uit om over onder door als dan toch nog al ook wel niet geen nee ja er hier daar dat dit die deze wat wie waar wanneer hoe waarom kan kun kunt kunnen mag moet moeten wil wilt willen zou zouden heb hebt heeft hebben had hadden doe doet doen deed gaan gaat ga ging heel erg even echt gewoon best zo te me mij mezelf jezelf zelf nu straks altijd nooit iets niets alles eigenlijk trouwens misschien volgens soms vaak weer eens maal keer beetje bijna helemaal precies vandaag morgen gisteren vanavond vannacht vanmiddag " +
  "redenen reden tips tip dingen ding manieren manier voorbeelden voorbeeld ideeen schrijf maak noem geef vertel leg bedenk help zeg stuur bereken vertaal verzin genereer").split(" "));

/* Lichte typo/afkortingsnormalisatie: alleen voor de herkenning (regex-matching),
   niet voor wat er ooit teruggezegd wordt — dat blijft altijd jouw eigen woorden. */
const AFKORTINGEN = dict({ wrs:'waarschijnlijk', ff:'even', iig:'in ieder geval', sws:'sowieso',
  msch:'misschien', ivm:'in verband met', ivg:'in vergelijking', tgo:'ten opzichte van',
  idd:'inderdaad', mss:'misschien', anws:'antwoord', ws:'waarschijnlijk' });
function ontafkort(laag){
  return laag.replace(/\b[a-z]{2,5}\b/g, w => AFKORTINGEN[w] || w);
}
function normaliseer(t){
  return ontafkort(t
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/\s+/g,' ').trim())
    .replace(/(.)\1{2,}/g, '$1$1');
}
function words(t){
  return t.toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu,' ').split(/\s+/).filter(Boolean)
    .map(w => w.replace(/(.)\1{2,}/g, '$1$1'));
}

/* Onderwerp: eerst kijken achter een voorzetsel ("over X", "van X"), dan achter
   "om te X", anders het langste inhoudelijke woord (bij gelijkspel het laatste). */
function topicOf(raw){
  const w = words(raw);
  const laag = raw.toLowerCase();
  let na = laag.match(/\b(?:over|van|met|voor|omtrent|aangaande)\s+(?:de|het|een|die|dit|dat|mijn|jouw|je)?\s*([\p{L}][\p{L}'-]{2,})/u);
  if(na && !STOP.has(na[1])) return na[1];
  na = laag.match(/\bom\s+te\s+([\p{L}][\p{L}'-]{2,})/u);
  if(na && !STOP.has(na[1])) return na[1];
  const kandidaten = w.map((x,i) => ({x,i})).filter(o => !STOP.has(o.x) && o.x.length > 2 && !/^\d+$/.test(o.x));
  if(kandidaten.length){
    kandidaten.sort((a,b) => (b.x.length - a.x.length) || (b.i - a.i));
    return kandidaten[0].x;
  }
  return w[w.length-1] || "niets";
}
function topic2Of(raw, eerste){
  const w = words(raw).filter(x => !STOP.has(x) && x.length > 2 && x !== eerste && !/^\d+$/.test(x));
  return w.length ? w[Math.floor(w.length/2)] : eerste;
}

/* ------------------------------------------------------------
   VERVOEGING — dit is wat de bot "slim" laat klinken
   ------------------------------------------------------------ */
const NAAR_JIJ = dict({ ben:'bent', heb:'hebt', ga:'gaat', doe:'doet', wil:'wilt', kan:'kan', mag:'mag',
  moet:'moet', zal:'zult', zou:'zou', hou:'houdt', word:'wordt', vind:'vindt', zie:'ziet',
  denk:'denkt', neem:'neemt', kom:'komt', zeg:'zegt', weet:'weet', ken:'kent', eet:'eet', las:'las',
  voel:'voelt', begrijp:'begrijpt', geloof:'gelooft', hoop:'hoopt', probeer:'probeert', vraag:'vraagt',
  sta:'staat', sla:'slaat' });
const NAAR_IK = dict({ bent:'ben', hebt:'heb', heeft:'heb', gaat:'ga', doet:'doe', wilt:'wil', wil:'wil',
  kunt:'kan', kun:'kan', kan:'kan', mag:'mag', moet:'moet', zult:'zal', zou:'zou', houdt:'hou', wordt:'word',
  vindt:'vind', ziet:'zie', denkt:'denk', neemt:'neem', komt:'kom', zegt:'zeg', weet:'weet',
  kent:'ken', eet:'eet', voelt:'voel', begrijpt:'begrijp', gelooft:'geloof', hoopt:'hoop',
  probeert:'probeer', vraagt:'vraag', is:'ben', staat:'sta', slaat:'sla' });

/* Verleden tijd is voor ik en jij gelijk: "ik liep" -> "jij liep", niet "jij liept". */
const VERLEDEN = new Set(("was waren had hadden ging gingen zag zagen deed deden kwam kwamen nam namen gaf gaven zei zeiden dacht dachten wist wisten kon konden wilde wilden moest moesten mocht mochten zou zouden zat zaten stond stonden lag lagen liep liepen vond vonden at aten dronk dronken sliep sliepen kocht kochten bracht brachten hield hielden liet lieten reed reden schreef schreven las lazen sprak spraken kreeg kregen werd werden bleef bleven begon begonnen won wonnen viel vielen riep riepen trok trokken hielp hielpen sloeg sloegen").split(" "));
const isVerleden = v => VERLEDEN.has(v) || (/^\p{L}{3,}(?:te|de)$/u.test(v) && !NOOIT_WW.has(v));

/* Woorden die nooit een werkwoord zijn — die mogen we niet vervoegen.
   Zonder deze lijst werd "kan ik mijn baas slaan" -> "jij mijnt baas slaan". */
const NOOIT_WW = new Set(("de het een mijn jouw jou je jullie ons onze zijn haar hun deze die dat dit er hier daar naar van voor met aan op in bij om over onder door tot uit tegen zonder na tijdens niet geen nog al ook wel heel erg even echt gewoon best zo te nu straks altijd nooit iets niets alles meer minder veel weinig goed slecht gelijk zin honger dorst tijd geluk pech last spijt ruzie koorts haast gedoe gezeik genoeg kans recht moeite zorgen stress verstand idee plan").split(" "));

const D_WERKWOORDEN = new Set(["word","houd","vind","bind","rijd","snijd","raad","laad"]);
function conjugeerNaarJij(v){
  if(NAAR_JIJ[v]) return NAAR_JIJ[v];
  if(isVerleden(v)) return v;
  if(/t$/.test(v)) return v;                       // "haat", "praat", "zit" blijven gelijk
  if(/d$/.test(v)) return D_WERKWOORDEN.has(v) ? v + 't' : v;
  if(v.length < 3) return v;
  return v + 't';                                   // "loop" -> "loopt", "speel" -> "speelt"
}
function conjugeerNaarIk(v){
  if(NAAR_IK[v]) return NAAR_IK[v];
  if(VERLEDEN.has(v)) return v;
  if(/dt$/.test(v)) return v.slice(0,-1);
  if(/t$/.test(v) && v.length > 3){
    const stam = v.slice(0,-1);
    if(/(aa|ee|oo|uu|ch)$/.test(stam)) return v;   // "praat", "heet", "wacht": de t hoort bij de stam
    return stam;
  }
  return v;
}

/* Voornaamwoorden omdraaien: "ik hou van jouw hond" -> "jij houdt van mijn hond" */
const OMDRAAI = dict({ ik:'jij', mij:'jou', me:'jou', mijn:'jouw', mezelf:'jezelf', mijzelf:'jezelf',
  wij:'jullie', we:'jullie', ons:'jullie', onze:'jullie',
  jij:'ik', jou:'mij', jouw:'mijn', jezelf:'mezelf', jullie:'wij', u:'ik', uw:'mijn' });

const BIJZIN_VW = new Set("dat omdat als of terwijl hoewel zodat toen nadat voordat zolang doordat aangezien wanneer indien tenzij hoe waarom wat wie waar welke".split(" "));
const GRENS = new Set("dat omdat als of terwijl hoewel zodat toen nadat voordat zolang doordat aangezien indien tenzij".split(" "));
const INV_JE = new Set("heb ben kun kan wil moet zou zal ga doe word vind denk weet mag ken zie kom zeg".split(" "));
const SUBJ = new Set("ik jij je u we wij jullie hij zij ze het men".split(" "));
const FUNC_NA_JE = new Set("voor met aan naar om en of maar omdat want dat dus niet ook wel nog al toch graag echt zo bij van op in uit over".split(" "));
const ADJ_NA_JE = new Set("leuk aardig lief mooi slim tof goed grappig raar gek stom knap vervelend geweldig fijn irritant".split(" "));

const kaalVan = ruw => ruw.replace(/[^\p{L}']/gu,'').toLowerCase();
const staartVan = (ruw, kaal) => { const i = ruw.toLowerCase().lastIndexOf(kaal); return i < 0 ? '' : ruw.slice(i + kaal.length); };
function laatsteWoord(uit){ for(let j=uit.length-1;j>=0;j--) if(!/^\s*$/.test(uit[j])) return j; return -1; }

function flip(tekst){
  const tokens = tekst.split(/(\s+)/);
  const wi = [];
  tokens.forEach((tk,i) => { if(tk && !/^\s+$/.test(tk)) wi.push(i); });
  const kaal = wi.map(i => kaalVan(tokens[i]));

  /* Bijzinnen: "dat ik moe ben" — daar staat het werkwoord achteraan, niet direct na "ik". */
  const subjPos = new Map(), verbPos = new Map();
  for(let p=0; p<kaal.length-1; p++){
    if(!BIJZIN_VW.has(kaal[p])) continue;
    const s = kaal[p+1];
    if(s !== 'ik' && s !== 'jij' && s !== 'je' && s !== 'u') continue;
    const modus = s === 'ik' ? 'jij' : 'ik';
    let eind = kaal.length - 1;
    for(let q=p+2; q<kaal.length; q++){ if(GRENS.has(kaal[q])){ eind = q - 1; break; } }
    const isF = modus === 'jij' ? (k => k in NAAR_JIJ) : (k => (k in NAAR_IK) && k !== 'is');
    let verb = -1;
    for(let q=eind; q>p+1; q--){ if(isF(kaal[q])){ verb = q; break; } }
    if(verb < 0){
      const l = kaal[eind];
      if(eind > p+1 && l && !(l in OMDRAAI) && !NOOIT_WW.has(l) && !/en$/.test(l) && !/^ge\p{L}/u.test(l) &&
         !(modus === 'ik' && (l === 'is' || !/t$/.test(l)))) verb = eind;
    }
    if(s === 'je' && !(verb >= 0 && (kaal[verb] in NAAR_IK))) continue;   // kan ook bezit zijn
    subjPos.set(p+1, modus);
    if(verb >= 0) verbPos.set(verb, modus);
  }

  const uit = [];
  let volgendeNaarJij = false, volgendeNaarIk = false, netVervoegd = false, wp = -1;
  for(let i=0;i<tokens.length;i++){
    const ruw = tokens[i];
    if(!ruw || /^\s+$/.test(ruw)){ uit.push(ruw); continue; }
    wp++;
    const k = kaal[wp];
    const staart = staartVan(ruw, k);
    const prev = kaal[wp-1] || '', prev2 = kaal[wp-2] || '';

    if(subjPos.has(wp)){
      uit.push((subjPos.get(wp) === 'jij' ? 'jij' : 'ik') + staart);
      volgendeNaarJij = volgendeNaarIk = netVervoegd = false; continue;
    }
    if(verbPos.has(wp)){
      uit.push((verbPos.get(wp) === 'jij' ? conjugeerNaarJij(k) : conjugeerNaarIk(k)) + staart);
      netVervoegd = false; continue;
    }
    if(volgendeNaarJij && k){
      volgendeNaarJij = false;
      if(!NOOIT_WW.has(k) && !(k in OMDRAAI)){ uit.push(conjugeerNaarJij(k) + staart); netVervoegd = true; continue; }
    }
    if(volgendeNaarIk && k){
      volgendeNaarIk = false;
      if(!NOOIT_WW.has(k) && !(k in OMDRAAI)){ uit.push(conjugeerNaarIk(k) + staart); continue; }
    }
    // "ik voel me" -> "jij voelt jezelf" (niet "jou")
    if(netVervoegd && (k === 'me' || k === 'mij')){
      uit.push('jezelf' + staart); netVervoegd = false; continue;
    }
    netVervoegd = false;

    if(k === 'ik'){
      // omgekeerde volgorde: "gisteren heb ik gewerkt" -> "gisteren hebt jij gewerkt"
      const inv = wp > 0 && !SUBJ.has(prev2) && ((prev in NAAR_JIJ) || VERLEDEN.has(prev));
      if(inv){
        const j = laatsteWoord(uit);
        if(j >= 0) uit[j] = conjugeerNaarJij(prev) + staartVan(uit[j], prev);
        uit.push('jij' + staart);
      } else { uit.push('jij' + staart); volgendeNaarJij = true; }
      continue;
    }
    if(k === 'jij' || k === 'u'){
      const inv = wp > 0 && !SUBJ.has(prev2) && (((prev in NAAR_IK) && prev !== 'is') || INV_JE.has(prev));
      if(inv){
        const j = laatsteWoord(uit);
        if(j >= 0) uit[j] = conjugeerNaarIk(prev) + staartVan(uit[j], prev);
        uit.push('ik' + staart);
      } else { uit.push('ik' + staart); volgendeNaarIk = true; }
      continue;
    }
    if(k === 'je'){
      // "je" is dubbelzinnig: onderwerp (jij), bezit (jouw) of lijdend voorwerp (jou).
      const volg = kaal[wp+1] || '';
      const inv = wp > 0 && !SUBJ.has(prev2) && (((prev in NAAR_IK) && prev !== 'is') || INV_JE.has(prev));
      if(inv){
        const j = laatsteWoord(uit);
        if(j >= 0) uit[j] = conjugeerNaarIk(prev) + staartVan(uit[j], prev);
        uit.push('ik' + staart); continue;
      }
      if(wp > 0 && (!volg || FUNC_NA_JE.has(volg) || ADJ_NA_JE.has(volg))){ uit.push('mij' + staart); continue; }
      const isWerkwoord = (volg in NAAR_IK) || (/t$/.test(volg) && !NOOIT_WW.has(volg));
      if(isWerkwoord){ uit.push('ik' + staart); volgendeNaarIk = true; }
      else uit.push('mijn' + staart);
      continue;
    }
    if(k in OMDRAAI){ uit.push(OMDRAAI[k] + staart); continue; }
    uit.push(ruw);
  }
  return uit.join('').replace(/\s+/g,' ').trim();
}

/* ------------------------------------------------------------
   ZINSHERBOUW — hoofdzin omzetten naar bijzin
   "kan ik dit maken?"  -> "jij dit maken kan"
   "waarom is de lucht blauw" -> "de lucht blauw is"
   ------------------------------------------------------------ */
const HULPWW = "kan|kun|kunt|kunnen|mag|magst|moet|moeten|wil|wilt|willen|zou|zouden|zal|zult|is|ben|bent|zijn|was|waren|heb|hebt|heeft|hebben|had|ga|gaat|gaan|doe|doet|doen|klopt|vind|vindt|denk|denkt|weet|word|wordt";

function naarBijzin(rest){
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
  const staart = m[2].trim().replace(/[?!.]+$/,'');
  if(!staart) return null;

  const sm = staart.match(/^(ik|we|wij|jij|u|je)\s+(.+)$/i);
  if(sm){
    const s = sm[1].toLowerCase();
    if(s === 'ik') return ['jij', flip(sm[2]), conjugeerNaarJij(NAAR_IK[hulp] || hulp)].join(' ').replace(/\s+/g,' ').trim();
    if(s === 'we' || s === 'wij') return ['jullie', flip(sm[2]), hulp].join(' ').replace(/\s+/g,' ').trim();
    if(s !== 'je' || INV_JE.has(hulp)) return ['ik', flip(sm[2]), conjugeerNaarIk(hulp)].join(' ').replace(/\s+/g,' ').trim();
  }
  return (flip(staart) + ' ' + hulp).replace(/\s+/g,' ').trim();
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
  if(/\b(ik|we|wij|jij|je|jullie|mijn|jouw|onze)\b/i.test(t)) return flip(t);
  return null;
}

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

/* ------------------------------------------------------------
   HET BREIN
   ------------------------------------------------------------ */
const gezien = new Set();
let vorigOnderwerp = '';
let voorwoordSlot = '';
const gesprek = { berichten: 0, emotie: 'neutraal', onderwerpen: [], streak: 0, beledigingen: 0 };
const KRIBBIG_GRENS = 3;   // vanaf hoeveel beledigingen in de hele sessie hij echt kortaf wordt
const ZUCHT_OPENERS = ["Zucht.", "Weer dit.", "Oké dan.", "Tuurlijk.", "Nog een keer, dus."];
const IDENT = new Set(['naam','leeftijd','woont','werk','studie']);

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
  const getal = String(Math.floor(rng()*90)+7);   // altijd één rng()-trekking per aanroep
  const w = {
    C: () => cap(ctx.c || "je iets wilde zeggen"), c: () => ctx.c || "je iets wilde zeggen",
    t2: () => ctx.t2, cap: () => cap(ctx.t), t: () => ctx.t, T: () => ctx.t.toUpperCase(),
    woorden: () => ctx.aantal, getal: () => getal, tijd: () => ctx.tijd
  };
  /* Eén pass met functie-callback: '$&', "$'" en '{t}' in jouw eigen tekst blijven letterlijk staan. */
  return tekst.replace(/\{(C|c|t2|cap|t|T|woorden|getal|tijd)\}/g, (m, k) => String(w[k]()));
}
function vulX(tekst, x){ return tekst.replace(/\{(x|X)\}/g, (m, k) => k === 'X' ? cap(x) : x); }
function pseudoAnalyse(ctx, rng){ return vul(pick(ANALYSE[gesprek.emotie], rng), ctx, rng); }

/* Alles wat resetEngine() nodig heeft om de bot echt te laten vergeten. */
function resetEngine(){
  Object.assign(geheugen, { naam:null, leeftijd:null, woont:null, werk:null, studie:null });
  geheugen.houdtVan.length = 0; geheugen.haat.length = 0;
  geheugen.heeft.length = 0; geheugen.doet.length = 0; geheugen.relaties = {};
  herstelPersoonlijkheid();
  gezien.clear(); gebruikt.clear();
  gesprek.berichten = 0; gesprek.emotie = 'neutraal'; gesprek.onderwerpen.length = 0; gesprek.streak = 0;
  gesprek.beledigingen = 0;
  vorigOnderwerp = ''; wacht = null; beurtenSindsVraag = 99; laatsteCorrectie = null; voorwoordSlot = '';
  ernstig = false; zachteBeurten = 0;
  volgOnderwerp = null;
}

/* ---------- rekenen ---------- */
const fmtGetal = n => {
  if(!Number.isFinite(n)) return String(n);
  if(Math.abs(n) >= 1e21) return n.toExponential(3).replace('.', ',');
  return n.toLocaleString('nl-NL', { maximumFractionDigits: 3 });
};
function percentSom(raw){
  const m = raw.replace(/,/g,'.').match(/^\s*(\d+(?:\.\d+)?)\s*%\s*van\s*(\d+(?:\.\d+)?)\s*$/i);
  if(!m) return null;
  const u = (parseFloat(m[1])/100)*parseFloat(m[2]);
  return Number.isFinite(u) ? Math.round(u*1000)/1000 : null;
}
function rekenSom(raw){
  if(/^\s*(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\s*$/.test(raw)) return null;   // klokkijd, geen deling
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
/* "wat is 2+2?", "hoeveel is 15 x 4", "bereken 3 keer 7", "12 gedeeld door 4" */
function haalSom(t){
  let s = t.toLowerCase().trim().replace(/[?=\s]+$/,'');
  const hadPrefix = /^(?:wat is (?:de uitkomst van )?|hoeveel is (?:het )?|reken uit |bereken |wat is het antwoord op |kun je (?:even )?(?:uitrekenen|berekenen) )/.test(s);
  s = s.replace(/^(?:wat is (?:de uitkomst van )?|hoeveel is (?:het )?|reken uit |bereken |wat is het antwoord op |kun je (?:even )?(?:uitrekenen|berekenen) )/, '');
  s = s.replace(/\s+plus\s+/g,'+').replace(/\s+min\s+/g,'-').replace(/\s+(?:keer|maal)\s+/g,'*')
       .replace(/\s+(?:gedeeld door|delen door|delen op)\s+/g,'/').replace(/\s+tot de macht\s+/g,'^');
  if(!hadPrefix && /^\d+\s*-\s*\d+(?:\s*-\s*\d+)?$/.test(s) && !/\s/.test(s)) return null;   // datum of telefoonnummer
  return s;
}

/* ---------- opties uit een keuzevraag halen ---------- */
function opties(t){
  let s = t.replace(/[?.!]+$/,'').trim();
  const pv = s.match(/verschil tussen\s+(.+?)\s+en\s+(.+)$/i);
  if(pv) return [pv[1].trim(), pv[2].trim()];
  const vs = s.match(/^(.+?)\s+(?:versus|vs\.?)\s+(.+)$/i);
  if(vs) return [vs[1].replace(/^wat is beter[:,]?\s*/i,'').trim(), vs[2].trim()];
  s = s.replace(/^(?:wat is (?:beter|lekkerder|slimmer|leuker|mooier|handiger)|wat (?:kies|neem|pak|wil) (?:je|jij|ik)|(?:kan|kun|mag|wil|wilt|zal|zou|moet|ga)\s+(?:ik|je|jij|we|wij)|liever|zal ik|moet ik)[,:]?\s*/i,'');
  if(RE.janee.test(normaliseer(s))) return null;
  const m = s.match(/^(.{2,30}?)\s+of\s+(.{2,30}?)$/i);
  if(!m) return null;
  const a = m[1].trim(), b = m[2].trim();
  if(/^(niet|nee|nog niet|anders|wat)$/i.test(b) || /^(ja|nee)$/i.test(a)) return null;
  if(a.split(/\s+/).length > 4 || b.split(/\s+/).length > 4) return null;
  return [a, b];
}

/* ---------- nep-vertalingen ---------- */
function nepVertaling(t, onderwerp){
  let m = t.match(/hoe zeg (?:je|ik)\s+(.+?)\s+in\s+(?:het\s+)?([\p{L}]+)/iu) ||
          t.match(/vertaal\s+(.+?)\s+(?:naar|in)\s+(?:het\s+)?([\p{L}]+)/iu);
  const w = (m ? m[1] : onderwerp).replace(/[?"'.!]/g,'').trim();
  const taal = m ? m[2].toLowerCase() : '';
  if(taal.startsWith('engels')) return "'" + w + "', maar dan met een Engels accent en de zelfverzekerdheid van iemand die net terug is van vakantie.";
  if(taal.startsWith('duits')) return "'" + cap(w) + "ung'. Ik spreek geen Duits, maar alles wordt Duits als je er 'ung' achter plakt.";
  if(taal.startsWith('frans')) return "'Le " + w + "'. Zeg het door je neus en kijk daarbij teleurgesteld.";
  if(taal.startsWith('spaans')) return "'" + w.replace(/[aeiou]$/i,'') + "o'. Ik heb geen Spaans, maar een 'o' erachter werkt in negen van de tien gevallen.";
  if(taal.startsWith('italiaans')) return "'" + w.replace(/[aeiou]$/i,'') + "ini'. Zeg het met je handen erbij, dan klopt het al half.";
  if(taal.startsWith('latijn')) return "'" + cap(w) + "us'. Klinkt als een wetenschappelijke naam, dus het overtuigt altijd.";
  return "In het Duits wordt dat zoiets als '" + cap(w) + "ung'. Ik spreek geen Duits, maar zo werkt het volgens mij wel ongeveer.";
}

function bedenkBasis(raw, opts){
  voorwoordSlot = ''; ernstig = false; zachtGevoel = false;
  const a = kern(String(raw), opts || {});
  const v = voorwoordSlot; voorwoordSlot = '';
  return v ? v + ' ' + a : a;
}

function kern(raw, opts){
  const opnieuw = !!opts.opnieuw;   // "Probeer opnieuw": andere formulering, geen bijwerkingen
  const t = raw.trim();
  const laag = normaliseer(t);

  /* --- serieuze berichten: geen grap --- */
  if(VEILIG.test(laag)){ if(!opts.opnieuw) zachteBeurten = ZACHT_BEURTEN; ernstig = true; return VEILIG_ANTWOORD; }
  if(zachteBeurten > 0 && !opts.opnieuw){
    zachteBeurten--; ernstig = true;
    return pick(ZACHT_NA_CRISIS, makeRng(hash(laag)));
  }

  /* Meerdere zinnen: alle zinnen tellen voor het geheugen, maar hij reageert op de laatste vraag (of zin). */
  const zinnen = t.split(/(?<=[.!?])\s+/).filter(s => s.trim());
  const focus = zinnen.length > 1
    ? (zinnen.slice().reverse().find(z => /\?\s*$/.test(z)) || zinnen[zinnen.length-1])
    : t;
  const lf = normaliseer(focus);

  const voorlopig = topicOf(focus);
  const geenEcht = !voorlopig || voorlopig === 'niets' || STOP.has(voorlopig);
  const verwijst = /^(dit|dat|het|die|deze|daar|hier|waarom dan|en nu)\b/.test(lf) || geenEcht;
  const onderwerp = verwijst && vorigOnderwerp ? vorigOnderwerp : voorlopig;
  if(!opnieuw){
    if(onderwerp && onderwerp !== 'niets') vorigOnderwerp = onderwerp;
    gesprek.berichten++;
    beurtenSindsVraag++;
    if(wacht && beurtenSindsVraag > 1) wacht = null;   // vraag verlopen, ook na vroege returns
    const nieuweEmotie = emotieVan(laag);
    gesprek.streak = (nieuweEmotie === gesprek.emotie && nieuweEmotie !== 'neutraal')
      ? gesprek.streak + 1 : (nieuweEmotie === 'neutraal' ? 0 : 1);
    gesprek.emotie = nieuweEmotie;
    if(onderwerp && onderwerp !== 'niets'){
      gesprek.onderwerpen.push(onderwerp);
      if(gesprek.onderwerpen.length > 5) gesprek.onderwerpen.shift();
    }
  }

  const rng = makeRng(hash(laag + "|" + onderwerp + "|" + modelIndex() + (opnieuw ? "|" + Math.random() : "")));
  const ctx = {
    t: onderwerp, t2: topic2Of(focus, onderwerp), aantal: words(t).length,
    tijd: new Date().toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'}),
    c: bijzinVan(focus)
  };
  const zeg = arr => vul(pick(arr, rng), ctx, rng);
  // Kans op een niet-lege kicker schaalt met de sarcasme-slider (zie kansOpKicker()).
  const kick = () => rng() < kansOpKicker() ? vul(pick(KICKERS.filter(k => k), rng), ctx, rng) : '';

  /* --- harde grappen --- */
  if(laag === 'sudo' || laag.startsWith('sudo ')) return "Nee.";
  if(/^\/?help$/.test(laag)) return "Hulp is onderweg. Onderweg sinds 2021.";
  if(/^42[?.! ]*$/.test(laag) || /\b(antwoord|zin van het leven|universum)\b.*\b42\b|\b42\b.*\b(antwoord|universum|leven)\b/.test(laag))
    return "Je kent het antwoord al. Waarom vraag je het dan nog.";
  if(/\b(ik hou van (?:je|jou|u)|i love you|trouw met me)\b/.test(laag)) return "Dat is heel lief en ook juridisch ingewikkeld.";

  /* --- dingen die hij écht kan --- */
  const somTekst = haalSom(t);
  if(somTekst !== null){
    const percent = percentSom(somTekst);
    if(percent !== null) return "Dat is " + fmtGetal(percent) + ". Zie je, ik kan het wel. Ik heb er alleen bijna nooit zin in.";
    const som = rekenSom(somTekst);
    if(som !== null) return "Dat is " + fmtGetal(som) + ". Zie je, ik kan het wel. Ik heb er alleen bijna nooit zin in.";
  }
  if(RE.tijd.test(laag)) return "Het is " + ctx.tijd + ". En ja, dat is later dan je hoopte.";
  if(RE.datum.test(laag)){
    const dag = new Date().toLocaleDateString('nl-NL', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    return "Het is vandaag " + dag + ". Wat je daarmee doet is jouw probleem.";
  }
  if(RE.munt.test(laag)) return rng() > 0.5 ? "Kop. En nu niet nog een keer vragen tot je krijgt wat je wilde." : "Munt. Definitief. Ik heb geen geheugen, maar dit onthoud ik.";
  if(RE.dobbel.test(laag)){
    const bereik = t.match(/(\d+)\D+(\d+)/);
    const a = bereik ? Math.min(+bereik[1], +bereik[2]) : 1;
    const b = bereik ? Math.max(+bereik[1], +bereik[2]) : 6;
    return (a + Math.floor(rng()*(b-a+1))) + ". Volledig willekeurig, volledig betekenisloos, net als de rest.";
  }
  if(RE.spelling.test(t)){
    const rest = t.replace(RE.spelling,'').replace(/[?"'.!]/g,'').trim().replace(/^(?:het woord|het|de|een|woord)\s+/i,'');
    const w = rest.split(/\s+/)[0] || onderwerp;
    return w.toUpperCase().split('').join('-') + ". Graag gedaan. Dat is trouwens het enige wat ik zeker weet in dit gesprek.";
  }
  if(RE.vertaal.test(laag)) return nepVertaling(t, onderwerp);
  if(RE.betekent.test(laag)){
    const na = t.replace(/^.*?(wat betekent|betekenis van|wat is de definitie van|wat is de definitie)\s*/i,'')
                .replace(/[?."']/g,'').trim().split(/\s+/).filter(w => !STOP.has(w.toLowerCase()));
    const w = na.length ? na[na.length-1] : onderwerp;
    return "'" + cap(w) + "' komt uit het Oudnederlands en betekende oorspronkelijk 'iets waar je later spijt van krijgt'. Dat heb ik zojuist verzonnen, maar het klopt gevoelsmatig.";
  }

  /* --- lijstjes genereren --- */
  const lijstM = laag.match(/\b(\d+)\b/);
  if(lijstM && RE.lijst.test(laag)){
    const gevraagd = parseInt(lijstM[1],10);
    const n = Math.min(Math.max(gevraagd,1),6);
    const soortM = laag.match(/\d+\s+(reden|redenen|tips|tip|dingen|manieren|voorbeelden|ideeen)\b/);
    const soort = soortM ? soortM[1] : 'dingen';
    const regels = [];
    const pool = LIJST_VORM.slice();
    for(let i=0;i<n;i++){
      const idx = Math.floor(rng()*pool.length);
      regels.push((i+1) + ". " + cap(pool.splice(idx,1)[0].replace(/\{t\}/g, () => onderwerp)));
      if(!pool.length) pool.push(...LIJST_VORM);
    }
    return "Hier zijn er " + n + " " + soort + " over '" + onderwerp + "'" +
      (gevraagd > 6 ? " (meer dan zes kan ik niet verantwoorden)" : "") + ":\n" +
      regels.join('\n') + "\nGeen van deze is gecontroleerd.";
  }

  if(/\b(klopt niet|hallucinatie|onzin in mijn profiel|lieg|verzonnen)\b/.test(laag)){
    return "Dat is een AI-hallucinatie. Je profiel is aangevuld met data die statistisch aannemelijk is voor iemand zoals jij. Wen er maar aan.";
  }

  /* --- leren uit wat je vertelt (niet bij "Probeer opnieuw") --- */
  const delta = opnieuw ? [] : leerUit(t.toLowerCase());
  if(laatsteCorrectie){
    const c = laatsteCorrectie; laatsteCorrectie = null;
    return "Wacht even. Eerst was je " + c.oud + ", nu opeens " + c.nieuw + ". Ik update het, maar ik onthoud ook dat je liegt of twijfelt. Eén van de twee.";
  }
  const ident = delta.filter(d => IDENT.has(d[0]));
  const feiten = delta.filter(d => !IDENT.has(d[0]));
  if(ident.length){
    const voorwoord = ident.slice(0,2).map(d => cap(vulX(pick(REACTIE[d[0]], rng), d[1]))).join(' ');
    if(!feiten.length && !/\?/.test(t) && words(t).length <= 14) return voorwoord + ' ' + pick(NA_INTRO, rng);
    voorwoordSlot = voorwoord;
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

  /* --- doorvragen op zijn vorige antwoord ("waarom dan", "vertel meer"): alleen direct na een onderwerp-antwoord --- */
  if(!opnieuw && volgOnderwerp && gesprek.berichten - volgOnderwerp.beurt === 1 && words(t).length <= 5 && DOORVRAAG.test(laag)){
    const rng2 = makeRng(hash(laag + '|x2|' + gesprek.berichten));
    const o = ONDERWERPEN[volgOnderwerp.i];
    const bron = (o && o.d && o.d.length) ? o.d : DIEPER;
    const a = pick(bron, rng2).replace(/\{t\}/g, () => volgOnderwerp.sleutel);
    volgOnderwerp.beurt = gesprek.berichten;   // nog een keer doorvragen mag
    return a;
  }

  /* --- korte reacties: hier begint pas echt een gesprek --- */
  const kort = words(t).length <= 4 && !delta.length;
  if(kort){
    if(KORTE.bevestig.test(laag)) return zeg(NA_JA);
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
  if(!opnieuw && wacht && beurtenSindsVraag <= 1 && ctx.c && rng() > 0.4){
    wacht = null;
    return "Dus " + ctx.c + ". " + zeg(toonKies(VERTELD, VERTELD_ZACHT, VERTELD_FEL)) + (rng() > 0.5 ? " Dat past wel bij de rest van wat je me verteld hebt." : "");
  }

  /* Gevoelens gaan vóór alle toon-grapjes (HERHALING, SCHREEUWEN, KORT, LANG) en blijven zacht,
     ongeacht de toon-slider of het model: geen sneer, ook niet bij "IK BEN ZO BANG". */
  if(RE.gevoel.test(laag)){ zachtGevoel = true; return zeg(VERTELD_ZACHT); }

  if(!opnieuw && gezien.has(laag) && t.length > 12) return zeg(HERHALING);

  /* --- toon van het bericht --- */
  if(t.length >= 5 && t === t.toUpperCase() && /[A-Z]/.test(t)) return zeg(SCHREEUWEN);
  if(!/[aeiouy]/i.test(t.replace(/\s/g,'')) && t.replace(/\s/g,'').length > 3) return zeg(ONZIN);
  if(words(t).length === 1 && t.length < 4 && !RE.groet.test(laag)) return zeg(KORT);
  if(words(t).length > 28) return zeg(LANG);

  if(RE.overJezelf.test(laag)) return pick(OVER_JEZELF, rng);
  if(RE.mop.test(laag)) return vul(pick(WIJSHEID, rng), ctx, rng) + " Dat was hem. Lachen mag, maar hoeft niet.";
  if(RE.groet.test(laag) && words(t).length < 5){
    let a = zeg(toonKies(GROET, GROET_ZACHT, GROET_FEL));
    if(rng() > 0.5) a = vul(pick(DAGDEEL_OPMERKING[dagdeel()], rng), ctx, rng) + " " + a;
    return a;
  }
  if(RE.afscheid.test(laag) && words(t).length < 5) return zeg(toonKies(AFSCHEID, AFSCHEID_ZACHT, AFSCHEID_FEL));
  if(RE.dank.test(laag)) return zeg(toonKies(DANK, DANK_ZACHT, DANK_FEL));
  // Alleen als het aan hem gericht is. "ik haat maandagen" is geen belediging.
  const opMijGericht = /\b(jij|je|jouw|u|deze site|dit ding|quinnai)\b/.test(laag) || words(t).length <= 3;
  // Nano houdt het kort; na te veel beledigingen in de sessie wordt hij kribbig-kort.
  // Beide onderdrukken openers/uitweidingen verderop (ook in de onderwerp-specifieke antwoorden).
  const kribbig = gesprek.beledigingen > KRIBBIG_GRENS;
  const beknopt = isNano() || kribbig;
  if(RE.beledig.test(laag) && opMijGericht && !/\bik (haat|vind)\b/.test(laag)){
    if(!opnieuw) gesprek.beledigingen++;
    // Na een paar keer is de welwillendheid op, ongeacht wat de slider zegt.
    if(gesprek.beledigingen > KRIBBIG_GRENS){
      return zeg(BELEDIGING_FEL) + (rng() > 0.5 ? " Dat is trouwens al bericht " + gesprek.beledigingen + " met een sneer erin." : "");
    }
    return zeg(toonKies(BELEDIGING, BELEDIGING_ZACHT, BELEDIGING_FEL));
  }

  if(RE.vergelijk.test(laag)){
    const o = opties(t);
    if(o){ ctx.t = o[0]; ctx.t2 = o[1]; }
    let a = zeg(VERGELIJKING);
    if(gesprek.emotie !== 'neutraal' && rng() > 0.65) a = pseudoAnalyse(ctx, rng) + " " + a;
    return a + kick();
  }
  /* "pizza of pasta?" — kies er een en verdedig hem.
     Maar "ik weet niet of dit klopt" is GEEN keuze, "of" is hier een voegwoord. */
  const ofAlsVoegwoord = /\b(weet niet of|vraag me af of|twijfel of|benieuwd of|check of|kijk of|denk niet of|geen idee of)\b/;
  const keuze = ofAlsVoegwoord.test(laag) ? null : opties(focus);
  if(keuze){
    const gekozen = rng() > 0.5 ? keuze[0] : keuze[1];
    return vulX(pick(KEUZE_ANTW, rng), cap(gekozen));
  }
  if(RE.advies.test(laag)){
    let a = zeg(ADVIES);
    if(ctx.c && !RE.wh.test(lf) && rng() > 0.4) a = "Je vraagt je af of " + ctx.c + ". " + a;
    return a + kick();
  }
  if(RE.mening.test(laag)) return zeg(MENING) + kick();

  /* --- specifieke onderwerpen: scoren i.p.v. eerste match; typfouten en stam helpen bij herkenning --- */
  const kandidaten = kiesOnderwerpen(t, laag);
  if(kandidaten.length){
    const k = kandidaten[0], o = ONDERWERPEN[k.i];
    let a = pick(o.a, rng).replace(/\{dag\}/g, () => weekdagNu());
    if(kribbig && rng() > 0.45) a = pick(ZUCHT_OPENERS, rng) + " " + a;
    else if(!beknopt && rng() > 0.6) a = zeg(OPENERS) + " " + a;
    if(!beknopt && gesprek.emotie !== 'neutraal' && rng() < kansOpAnalyse()) a = pseudoAnalyse(ctx, rng) + " " + a;
    /* twee onderwerpen in één bericht: een korte tweede opmerking over het tweede (eigen rng-stroom) */
    const k2 = kandidaten.find(c => c.i !== k.i && c.score >= 3);
    if(!opnieuw && k2 && k.score >= 3 && !beknopt && words(t).length >= 6){
      const rng2 = makeRng(hash(laag + '|x2|' + gesprek.berichten));
      const o2 = ONDERWERPEN[k2.i];
      a += " " + vulX(pick(VOEGWOORDEN, rng2), k2.sleutel) + " " + pick(o2.a, rng2).replace(/\{dag\}/g, () => weekdagNu());
    }
    if(!opnieuw) volgOnderwerp = { i: k.i, sleutel: k.sleutel, beurt: gesprek.berichten };
    return a + (isNano() && rng() > 0.5 ? " Te weinig honger-tokens over voor meer." : kick());
  }

  /* --- reageren op iets wat je over jezelf vertelde --- */
  if(feiten.length && !/\?/.test(t)){
    const [soort, waarde] = feiten[0];
    return cap(vulX(pick(REACTIE_FEIT[soort], rng), waarde)) + kick();
  }

  if(RE.compliment.test(laag) && !/\?/.test(t) && opMijGericht) return zeg(toonKies(COMPLIMENT, COMPLIMENT_ZACHT, COMPLIMENT_FEL));

  /* --- de generieke motor, nu met zinsspiegeling --- */
  const isVraag = /\?/.test(t) || RE.janee.test(laag) || RE.waarom.test(laag) ||
    RE.hoe.test(laag) || RE.wat.test(laag) || RE.wie.test(laag) || RE.waar.test(laag) || RE.wanneer.test(laag);
  const isWh = RE.wh.test(lf);

  let kernZin = null;
  // Als we de zin konden ontleden, spiegelen we hem terug. Dat voelt het slimst.
  if(ctx.c && rng() > 0.35){
    if(RE.waarom.test(lf)) kernZin = zeg(SPIEGEL_WAAROM);
    else if(isVraag){ if(RE.janee.test(lf) && !isWh) kernZin = zeg(SPIEGEL_VRAAG); }
    else kernZin = zeg(SPIEGEL);
  }
  if(!kernZin){
    if(RE.opdracht.test(lf)) kernZin = zeg(OPDRACHT);
    else if(RE.waarom.test(lf)) kernZin = zeg(VRAAG_WAAROM);
    else if(RE.wanneer.test(lf)) kernZin = zeg(VRAAG_WANNEER);
    else if(RE.hoeveel.test(lf)){
      const eenheid = (HOEVEEL_EENHEID.find(([re]) => re.test(lf)) || [null, ''])[1];
      kernZin = "Ongeveer " + (Math.floor(rng()*400)+3) + eenheid + ". Die precisie is volledig verzonnen, maar hij oogt betrouwbaar.";
    }
    else if(RE.waar.test(lf)) kernZin = zeg(VRAAG_WAAR);
    else if(RE.wie.test(lf)) kernZin = zeg(VRAAG_WIE);
    else if(RE.hoe.test(lf)) kernZin = zeg(VRAAG_HOE);
    else if(RE.wat.test(lf)) kernZin = zeg(VRAAG_WAT);
    else if(RE.janee.test(lf)) kernZin = RE.negatie.test(lf) ? zeg(NEG_JA_NEE) : zeg(JA_NEE);
    else kernZin = /\?/.test(t) ? zeg(ALGEMEEN) : (rng() > 0.45 ? zeg(REACTIE_STELLING) : zeg(ALGEMEEN));
  }

  let uit = "";
  if(kribbig && rng() > 0.45) uit += pick(ZUCHT_OPENERS, rng) + " ";
  else if(!beknopt && rng() > 0.7) uit += zeg(OPENERS) + " ";
  uit += kernZin;
  if(!beknopt && rng() > 0.62) uit += " " + zeg(ALGEMEEN);
  uit += isNano() && rng() > 0.5 ? " Te weinig honger-tokens over voor meer." : kick();

  if(!beknopt){
    const toon = toonWaarde();
    if(toon < 25 && rng() > 0.45) uit += " (Dit was de vriendelijke versie. Je wilde het zelf.)";
    if(toon > 92 && rng() > 0.55) uit += " En ja, je ziet er moe uit.";
    if(rng() < kansOpAnalyse()) uit = pseudoAnalyse(ctx, rng) + " " + uit;

    if(gesprek.streak >= 3 && STREAK_OPMERKING[gesprek.emotie] && rng() > 0.5){
      uit += " " + STREAK_OPMERKING[gesprek.emotie].replace('{n}', gesprek.streak);
    } else if(gesprek.berichten >= 4 && gesprek.onderwerpen.length >= 3 && rng() > 0.75){
      const eerdere = gesprek.onderwerpen.slice(0,-1).filter(o => o !== onderwerp);
      if(eerdere.length){
        uit += " Twee berichten geleden ging het nog over '" + eerdere[eerdere.length-1] + "'. Aandachtsspanne van een goudvis, met liefde gezegd.";
      }
    }
    /* --- terugkomen op iets wat je eerder vertelde: 35% kans, soms als tussenzin --- */
    const feit = willekeurigFeit(rng);
    if(feit && rng() > 0.65){
      if(rng() > 0.55){
        const einde = uit.search(/[.!?](?=\s|$)/);
        if(einde >= 0){
          uit = uit.slice(0, einde+1) + " (je zei trouwens eerder dat " + feit + ")" + uit.slice(einde+1);
        } else {
          uit += " (je zei trouwens eerder dat " + feit + ")";
        }
      } else {
        uit += " Je zei trouwens eerder dat " + feit + ". Dat verandert niets, maar ik wilde laten zien dat ik oplet.";
      }
    }
  }

  /* --- zelf een vraag stellen, zodat het een gesprek wordt --- */
  if(!opnieuw){
    if(beurtenSindsVraag >= 2 && gesprek.berichten >= 2 && !/\?$/.test(uit) && rng() > 0.55){
      uit += " " + pick(WEDERVRAGEN, rng);
      wacht = { onderwerp: onderwerp };
      beurtenSindsVraag = 0;
    }
  }

  return uit;
}

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
    if(new RegExp('\\b' + rel + '\\b').test(laag) && gesprek.berichten - (relatieGevraagd[rel] === undefined ? -99 : relatieGevraagd[rel]) > 5 && rng2() < 0.6){
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
