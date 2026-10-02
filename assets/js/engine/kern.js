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

const RE_HULPWW = new RegExp("^(" + HULPWW + ")\\s+(.+)$", "i");   // één keer compileren, niet per bericht

function naarBijzin(rest){
  let m = rest.trim().match(RE_HULPWW);
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
