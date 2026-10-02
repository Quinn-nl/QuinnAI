"use strict";
/* QuinnAI engine — het brein: gesprek, rekenen, opties, vertalen, bedenkBasis en kern. Classic script: deelt globals met de andere engine-bestanden, laadvolgorde staat in tools/engine-files.js. */
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
