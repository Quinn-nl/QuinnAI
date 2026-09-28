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
  function toonKies(normaal, zacht, fel){ const w = toonWaarde(); return w < 25 ? zacht : (w > 85 ? fel : normaal); }

  /* ------------------------------------------------------------
     WOORDEN
     ------------------------------------------------------------ */
  const STOP = new Set(("de het een en of maar want dus ik jij je jou jouw u hij zij ze wij we hun hen mijn zijn haar ons onze is ben bent was waren wordt worden word werd van voor met aan op in bij te ten ter naar uit om over onder door als dan toch nog al ook wel niet geen nee ja er hier daar dat dit die deze wat wie waar wanneer hoe waarom kan kun kunt kunnen mag moet moeten wil wilt willen zou zouden heb hebt heeft hebben had hadden doe doet doen deed gaan gaat ga ging heel erg even echt gewoon best zo te me mij mezelf jezelf zelf nu straks altijd nooit iets niets alles eigenlijk trouwens misschien volgens soms vaak weer eens maal keer beetje bijna helemaal precies vandaag morgen gisteren vanavond vannacht vanmiddag " +
    "redenen reden tips tip dingen ding manieren manier voorbeelden voorbeeld ideeen schrijf maak noem geef vertel leg bedenk help zeg stuur bereken vertaal verzin genereer").split(" "));

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
    houdtVan:[], haat:[], heeft:[], doet:[], werk:null
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
  const VEILIG = /\b(zelfmoord|zelfdoding|suicide|suicidaal|zelfbeschadiging|mezelf (?:van kant|pijn|iets aan|verwonden|snijden)|ik wil (?:liever )?(?:dood|doodgaan|niet meer leven|niet meer verder|er niet meer zijn|er een einde aan maken)|einde aan mijn leven|einde aan het leven|kill myself|end my life)\b/;
  const VEILIG_ANTWOORD = "Even geen grappen. Dat klinkt zwaar, en ik ben blij dat je het zegt. Ik ben een website zonder echt verstand, dus ik kan hier niet echt bij helpen, maar jij verdient wel iemand die dat kan. Praat er met iemand over die je vertrouwt, of neem contact op met 113 Zelfmoordpreventie: bel 113 of gratis 0800-0113, of chat via 113.nl. Zit je in acuut gevaar, bel dan 112.";

  const DAGDEEL_OPMERKING = {
    nacht: ["Het is {tijd}. Zou je niet gaan slapen?", "{tijd}. Op dit uur zijn alleen jij, ik en slechte ideeën wakker."],
    ochtend: ["Goedemorgen. Het is {tijd}, vroeg voor deze site.", "Ochtend. {tijd}. Ik heb nog niets gedaan, maar ik ben wel al moe."],
    middag: ["Goedemiddag. {tijd}, precies het uur waarop niemand werkt.", "Middag. Het is {tijd}. De dag heeft nog geen richting, net als dit gesprek."],
    avond: ["Goedenavond. {tijd}. Dit is het uur van slechte beslissingen.", "Avond. {tijd}. Ik hoop dat je gegeten hebt, of in ieder geval besteld."]
  };
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
    gevoel:/\b(ik voel|ik ben verdrietig|ik ben boos|ik ben bang|ik mis|het gaat niet|ik heb het zwaar|ik ben eenzaam|ik ben gestrest)\b/,
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
  let voorwoordSlot = '';
  const gesprek = { berichten: 0, emotie: 'neutraal', onderwerpen: [], streak: 0 };
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
    return tekst
      .replace(/\{C\}/g, cap(ctx.c || "je iets wilde zeggen"))
      .replace(/\{c\}/g, ctx.c || "je iets wilde zeggen")
      .replace(/\{t2\}/g, ctx.t2).replace(/\{cap\}/g, cap(ctx.t)).replace(/\{t\}/g, ctx.t)
      .replace(/\{T\}/g, ctx.t.toUpperCase()).replace(/\{woorden\}/g, ctx.aantal)
      .replace(/\{getal\}/g, String(Math.floor(rng()*90)+7)).replace(/\{tijd\}/g, ctx.tijd);
  }
  function pseudoAnalyse(ctx, rng){ return vul(pick(ANALYSE[gesprek.emotie], rng), ctx, rng); }

  /* Alles wat resetEngine() nodig heeft om de bot echt te laten vergeten. */
  function resetEngine(){
    Object.assign(geheugen, { naam:null, leeftijd:null, woont:null, werk:null, studie:null });
    geheugen.houdtVan.length = 0; geheugen.haat.length = 0;
    geheugen.heeft.length = 0; geheugen.doet.length = 0;
    gezien.clear(); gebruikt.clear();
    gesprek.berichten = 0; gesprek.emotie = 'neutraal'; gesprek.onderwerpen.length = 0; gesprek.streak = 0;
    vorigOnderwerp = ''; wacht = null; beurtenSindsVraag = 99; laatsteCorrectie = null; voorwoordSlot = '';
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

  function bedenkAntwoord(raw, opts){
    voorwoordSlot = '';
    const a = kern(String(raw), opts || {});
    const v = voorwoordSlot; voorwoordSlot = '';
    return v ? v + ' ' + a : a;
  }

  function kern(raw, opts){
    const opnieuw = !!opts.opnieuw;   // "Probeer opnieuw": andere formulering, geen bijwerkingen
    const t = raw.trim();
    const laag = normaliseer(t);

    /* --- serieuze berichten: geen grap --- */
    if(VEILIG.test(laag)) return VEILIG_ANTWOORD;

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
    const kick = () => vul(pick(KICKERS, rng), ctx, rng);

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
        regels.push((i+1) + ". " + cap(pool.splice(idx,1)[0].replace(/\{t\}/g, onderwerp)));
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
      const voorwoord = ident.slice(0,2).map(d => cap(pick(REACTIE[d[0]], rng).replace(/\{x\}/g, d[1]))).join(' ');
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

    if(!opnieuw && gezien.has(laag) && t.length > 12) return zeg(HERHALING);

    /* --- toon van het bericht --- */
    if(t.length >= 5 && t === t.toUpperCase() && /[A-Z]/.test(t)) return zeg(SCHREEUWEN);
    if(!/[aeiouy]/i.test(t.replace(/\s/g,'')) && t.replace(/\s/g,'').length > 3) return zeg(ONZIN);
    if(words(t).length === 1 && t.length < 4 && !RE.groet.test(laag)) return zeg(KORT);
    if(words(t).length > 28) return zeg(LANG);

    if(RE.gevoel.test(laag)){
      let a = zeg(toonKies(VERTELD, VERTELD_ZACHT, VERTELD_FEL));
      if(ctx.c) a = "Dus " + ctx.c + ". " + a;
      return a;
    }
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
    if(RE.beledig.test(laag) && opMijGericht && !/\bik (haat|vind)\b/.test(laag)){
      const toon = toonWaarde();
      if(toon < 25) return zeg(BELEDIGING_ZACHT);
      if(toon > 85) return zeg(BELEDIGING_FEL);
      return zeg(BELEDIGING);
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
      return pick(KEUZE_ANTW, rng).replace(/\{x\}/g, cap(gekozen));
    }
    if(RE.advies.test(laag)){
      let a = zeg(ADVIES);
      if(ctx.c && !RE.wh.test(lf) && rng() > 0.4) a = "Je vraagt je af of " + ctx.c + ". " + a;
      return a + kick();
    }
    if(RE.mening.test(laag)) return zeg(MENING) + kick();

    /* --- specifieke onderwerpen --- */
    for(const o of ONDERWERPEN){
      if(o.re.test(laag)){
        let a = pick(o.a, rng);
        if(rng() > 0.6) a = zeg(OPENERS) + " " + a;
        if(gesprek.emotie !== 'neutraal' && rng() > 0.7) a = pseudoAnalyse(ctx, rng) + " " + a;
        return a + kick();
      }
    }

    /* --- reageren op iets wat je over jezelf vertelde --- */
    if(feiten.length && !/\?/.test(t)){
      const [soort, waarde] = feiten[0];
      return cap(pick(REACTIE_FEIT[soort], rng).replace(/\{x\}/g, waarde).replace(/\{X\}/g, cap(waarde))) + kick();
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
    if(rng() > 0.7) uit += zeg(OPENERS) + " ";
    uit += kernZin;
    if(rng() > 0.62) uit += " " + zeg(ALGEMEEN);
    uit += kick();

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
    }

    /* --- zelf een vraag stellen, zodat het een gesprek wordt --- */
    if(!opnieuw){
      beurtenSindsVraag++;
      if(beurtenSindsVraag >= 2 && gesprek.berichten >= 2 && !/\?$/.test(uit) && rng() > 0.55){
        uit += " " + pick(WEDERVRAGEN, rng);
        wacht = { onderwerp: onderwerp };
        beurtenSindsVraag = 0;
      }
    }

    return uit;
  }
