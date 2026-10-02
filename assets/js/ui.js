(function(){
  "use strict";

  /* ============================================================
     1. KLEINE HULPJES
     ============================================================ */
  const $ = s => document.querySelector(s);
  const log = $('#log'), input = $('#input'), sendBtn = $('#send');
  const sarc = $('#sarcasme'), sarcVal = $('#sarc-val'), modelSel = $('#model');
  window.sarc = sarc; window.modelSel = modelSel; // engine.js draait als apart script en heeft dit nodig
  $('#year').textContent = new Date().getFullYear();
  // Bewegingsvoorkeur: mq.matches is live (voor scrollen/typen), reduceerBeweging is de stand bij laden.
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduceerBeweging = mq.matches;
  const scrollGedrag = () => mq.matches ? 'auto' : 'smooth';
  const beweegMinder = () => mq.matches || document.body.classList.contains('pauzeer-animaties');

  // sessie-uptime: puur decoratief, maar hoort bij het "dashboard"-gevoel
  let sessieStart = Date.now();
  const sessUptime = $('#sess-uptime');
  setInterval(() => {
    const sec = Math.floor((Date.now() - sessieStart) / 1000);
    const m = Math.floor(sec / 60), s = sec % 60;
    sessUptime.textContent = m + ':' + String(s).padStart(2,'0');
  }, 1000);

  /* ============================================================
     2. DE CHAT-INTERFACE
     (de taalkundige kern zelf staat in engine.js)
     ============================================================ */
  const DENKSTAPPEN = [
    "'{t}' opzoeken in nul bronnen",
    "context begrijpen",
    "context loslaten",
    "toon kalibreren",
    "empathie overslaan",
    "alternatieven wegstrepen",
    "zelfvertrouwen opbouwen",
    "antwoord verzinnen"
  ];

  // typgeluid: volledig gegenereerd met Web Audio, geen los geluidsbestand nodig.
  // Staat standaard uit — geluid vanzelf laten afspelen is vervelend, dit is een bewuste keuze.
  // Bewust niet bewaard (geen localStorage): de pagina slaat niets op, dus bij verversen staat het weer uit.
  let geluidAan = false;
  let audioCtx = null;
  function speelTik(){
    if(!geluidAan) return;
    try{
      if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if(audioCtx.state === 'suspended') audioCtx.resume();
      const t0 = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = 720 + Math.random()*260;
      gain.gain.setValueAtTime(0.045, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(t0); osc.stop(t0 + 0.035);
    }catch(e){ /* Web Audio niet beschikbaar: geluid blijft gewoon uit */ }
  }
  const soundBtn = $('#sound-btn');
  function ververSoundBtn(){
    soundBtn.setAttribute('aria-pressed', String(geluidAan));
    soundBtn.setAttribute('aria-label', geluidAan ? 'Typgeluid uitschakelen' : 'Typgeluid inschakelen');
  }
  ververSoundBtn();
  soundBtn.addEventListener('click', () => {
    geluidAan = !geluidAan;
    ververSoundBtn();
    if(geluidAan) speelTik();
  });

  function rij(klasse, avatarTekst){
    const r = document.createElement('div');
    r.className = 'row ' + klasse;
    const av = document.createElement('div');
    av.className = 'av ' + (klasse === 'me' ? 'me' : 'ai');
    av.textContent = avatarTekst;
    av.setAttribute('aria-hidden', 'true');
    const b = document.createElement('div');
    b.className = 'bubble';
    // AI-bubbels beginnen verborgen voor screenreaders: het typmachine-effect
    // muteert de tekst tientallen keren per seconde, en dat zou anders per
    // letter worden aangekondigd. Zodra het bericht klaar is, halen we dit weg
    // en kondigen we het complete bericht in één keer aan (zie announce()).
    if(klasse !== 'me') b.setAttribute('aria-hidden', 'true');
    r.appendChild(av); r.appendChild(b);
    log.appendChild(r);
    return b;
  }
  const naarBeneden = () => log.scrollTo({top: log.scrollHeight, behavior: scrollGedrag()});
  const announcer = $('#live-announcer');
  function announce(tekst){ announcer.textContent = ''; setTimeout(() => { announcer.textContent = tekst; }, 40); }

  let bezig = false;
  let teller = 0;

  function typ(el, tekst, klaar){
    let i = 0;
    el.textContent = '';
    // Geen typmachine bij reduced motion of gepauzeerde animaties: tekst staat er direct.
    if(beweegMinder()){
      el.textContent = tekst;
      el.removeAttribute('aria-hidden');
      announce(tekst);
      naarBeneden();
      klaar && klaar();
      return;
    }
    el.setAttribute('aria-hidden', 'true'); // ook bij hergebruik (bv. "Probeer opnieuw") opnieuw verbergen
    const caret = document.createElement('span');
    caret.className = 'caret';
    el.appendChild(caret);
    const stap = () => {
      if(i >= tekst.length){
        caret.remove();
        el.removeAttribute('aria-hidden');
        announce(tekst);
        klaar && klaar();
        return;
      }
      const brok = tekst.slice(i, i + (Math.random() > 0.8 ? 2 : 1));
      caret.insertAdjacentText('beforebegin', brok);
      i += brok.length;
      if(/\S/.test(brok) && i % 2 === 0) speelTik();
      if(i % 8 === 0) naarBeneden();
      setTimeout(stap, tekst[i-1] === '.' ? 90 : 14 + Math.random()*22);
    };
    stap();
  }

  function veiligBericht(bubble, tekst){
    bubble.textContent = '';
    tekst.split(/(0800-0113|113\.nl|112|113)/).forEach((deel, i) => {
      if(i % 2 === 0){ bubble.appendChild(document.createTextNode(deel)); return; }
      const a = document.createElement('a');
      a.textContent = deel;
      if(deel === '113.nl'){ a.href = 'https://113.nl'; a.target = '_blank'; a.rel = 'noopener'; }
      else a.href = 'tel:' + deel;
      bubble.appendChild(a);
    });
    bubble.removeAttribute('aria-hidden');
    announce(tekst);
    bezig = false;
    naarBeneden();
  }

  function aiBericht(vraag){
    const bubble = rij('ai','Q');
    bubble.innerHTML = '<span class="typing-dots"><i></i><i></i><i></i></span>';
    naarBeneden();
    const antwoord = bedenkAntwoord(vraag);
    if(isErnstig()){ veiligBericht(bubble, antwoord); return; }
    const onderwerp = topicOf(vraag);
    const stappen = DENKSTAPPEN
      .slice()
      .sort(() => Math.random() - .5)
      .slice(0, 2 + Math.floor(Math.random()*2))
      .map(s => s.replace('{t}', onderwerp));

    let n = 0;
    const denk = () => {
      if(n < stappen.length){
        bubble.innerHTML = '<span class="think">' + stappen[n] + '…</span>';
        n++;
        setTimeout(denk, 320 + Math.random()*340);
      } else {
        bubble.innerHTML = '';
        typ(bubble, antwoord, () => {
          const meta = document.createElement('div');
          meta.className = 'meta';
          const zekerheid = Math.min(99, 28 + Math.min(vraag.length, 42) +
            (/\?/.test(vraag) ? 12 : 0) + Math.floor(Math.random()*18));
          meta.innerHTML = '<span>zekerheid ' + zekerheid + '%</span><span>' +
            (8 + Math.floor(Math.random()*90)) + ' tokens</span><span>0 bronnen</span>';
          const opnieuw = document.createElement('button');
          opnieuw.textContent = 'Probeer opnieuw';
          opnieuw.onclick = () => {
            if(bezig) return;
            meta.remove();
            bezig = true;
            // andere formulering afdwingen door de vraag minimaal te variëren
            const alt = bedenkAntwoord(vraag, { opnieuw: true });
            typ(bubble, alt, () => { bezig = false; bubble.appendChild(meta); });
          };
          meta.appendChild(opnieuw);
          const kopieer = document.createElement('button');
          kopieer.textContent = 'Kopieer';
          kopieer.onclick = () => {
            const tekst = bubble.textContent.replace(meta.textContent, '').trim();
            navigator.clipboard?.writeText(tekst).then(
              () => { kopieer.textContent = 'Gekopieerd'; setTimeout(() => kopieer.textContent = 'Kopieer', 1600); },
              () => { kopieer.textContent = 'Lukt niet'; }
            );
          };
          meta.appendChild(kopieer);
          bubble.appendChild(meta);
          naarBeneden();
          bezig = false;
        });
      }
    };
    setTimeout(denk, 260);
  }

  const HALLUCINATIES = [
    ["hobby", "postzegels likken in het donker"],
    ["dieet", "lauwe melk en spijt"],
    ["angst", "deurbellen die twee keer rinkelen"],
    ["bijnaam", "de natte handdoek van de groepsapp"],
    ["zwakte", "uitgebreide meningen over dingen die niemand heeft gevraagd"]
  ];
  let gehallucineerd = null;

  // Eén bron voor de profielkaart én het dossier, zodat ze nooit uit elkaar lopen.
  function profielMetHallucinatie(){
    const r = profielRegels();
    if(gehallucineerd) r.push(gehallucineerd);
    return r;
  }
  function ververProfiel(){
    if(!gehallucineerd && teller > 3 && Math.random() > 0.8){
      gehallucineerd = HALLUCINATIES[Math.floor(Math.random() * HALLUCINATIES.length)];
    }
    const regels = profielMetHallucinatie();
    const kaart = $('#profiel'), lijst = $('#profiel-lijst');
    if(!regels.length){ kaart.hidden = true; return; }
    kaart.hidden = false;
    lijst.innerHTML = '';
    regels.forEach(([k,v]) => {
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = v;
      lijst.appendChild(dt); lijst.appendChild(dd);
    });
  }
  $('#download-btn').addEventListener('click', () => {
    const regels = profielMetHallucinatie();
    const nu = new Date().toLocaleString('nl-NL');
    let inhoud =
      "QUINNAI — VERTROUWELIJK DOSSIER\n" +
      "================================\n" +
      "Gegenereerd op: " + nu + "\n" +
      "Bron: dingen die je zelf typte tegen een nepwebsite\n" +
      "Classificatie: volstrekt onbelangrijk\n\n";
    if(!regels.length){
      inhoud += "Geen gegevens. Je hebt niets prijsgegeven. Verstandig, eerlijk gezegd.\n";
    } else {
      regels.forEach(([k,v]) => { inhoud += "- " + k.toUpperCase() + ": " + v + "\n"; });
    }
    if(gehallucineerd) inhoud += "\nLET OP: minstens één regel hierboven is door QuinnAI verzonnen. Dat is geen bug, dat is het product.\n";
    inhoud +=
      "\n--------------------------------\n" +
      "Dit dossier is nooit ergens opgeslagen behalve in je eigen browser,\n" +
      "en bestaat vanaf nu alleen nog in dit bestand op je eigen computer.\n" +
      "QuinnAI wenst je verder een fijne dag, of wat daar op lijkt.\n";
    const blob = new Blob([inhoud], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quinnai-dossier.txt';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  });

  $('#vergeet-btn').addEventListener('click', () => {
    resetEngine();
    gehallucineerd = null;
    ververProfiel();
    teller = 0;
    $('#sess-msgs').textContent = '0';
    sessieStart = Date.now();
    const x = rij('ai','Q');
    typ(x, "Alles vergeten. Dat kostte me nul moeite, want ik hing er toch al niet aan.");
    naarBeneden();
  });

  function stuur(tekst){
    const t = (tekst !== undefined ? tekst : input.value).trim();
    if(!t || bezig || input.disabled) return;
    bezig = true;
    teller++;
    $('#sess-msgs').textContent = teller;
    const b = rij('me','jij');
    b.textContent = t;
    input.value = '';
    naarBeneden();

    setTimeout(() => {
      aiBericht(t);
      gezien.add(normaliseer(t));
      ververProfiel();
      if(teller === 6){
        setTimeout(() => {
          const x = rij('ai','Q');
          x.innerHTML = '<span class="think">notitie</span><br>Dit is je zesde bericht aan een website. Alles goed thuis?';
          x.removeAttribute('aria-hidden');
          announce('Notitie: dit is je zesde bericht aan een website. Alles goed thuis?');
          naarBeneden();
        }, 2600);
      }
    }, 240);
  }

  sendBtn.addEventListener('click', () => stuur());
  input.addEventListener('keydown', e => { if(e.key === 'Enter' && !e.isComposing) stuur(); });
  $('#fake-clip').addEventListener('click', () => {
    if(bezig || input.disabled) return;
    const b = rij('ai','Q');
    typ(b, "Bestand geweigerd. Het was waarschijnlijk te saai, te groot of te ongepast. Ik neem de gok niet.");
    naarBeneden();
  });
  $('#fake-mic').addEventListener('click', () => {
    if(bezig || input.disabled) return;
    const b = rij('ai','Q');
    typ(b, "Quinn luistert in " + new Date().getFullYear() + " niet meer naar stemberichten van langer dan 0 seconden. Typ het uit of hou het voor je.");
    naarBeneden();
  });
  document.querySelectorAll('.chip').forEach(c => {
    c.addEventListener('click', () => {
      if(input.disabled) return;
      stuur(c.textContent);
      document.getElementById('chat').scrollIntoView({block:'center'});
    });
  });
  sarc.addEventListener('input', () => { sarcVal.textContent = sarc.value; });
function pasModelToe(){
    const b = rij('ai','Q');
    const naam = modelSel.value;
    const isOffline = naam.indexOf('offline') > -1;
    
    if (isOffline) {
        b.textContent = "Quinn is niet beschikbaar. Het systeem is vergrendeld ter bescherming van zijn rust.";
        b.removeAttribute('aria-hidden'); announce(b.textContent);
        input.disabled = true;
        sendBtn.disabled = true;
        input.placeholder = "Quinn ligt nog te slapen...";
        input.style.opacity = "0.4";
        sendBtn.style.opacity = "0.4";
        sendBtn.style.cursor = "not-allowed";
        $('#chips').classList.add('locked');
        $('.compose').classList.add('locked');
        // SC 4.1.2: de uitgeschakelde staat van de chips en de bijlage/microfoon-knoppen
        // was alleen visueel (opacity + pointer-events); toetsenbordgebruikers konden er
        // nog naartoe tabben zonder dat ooit werd aangegeven dat ze niets doen.
        document.querySelectorAll('.chip, #fake-clip, #fake-mic').forEach(el => el.setAttribute('aria-disabled', 'true'));
    } else {
        b.textContent = "Overgeschakeld naar " + naam + ". Je merkt er niets van, maar het klinkt duur.";
        b.removeAttribute('aria-hidden'); announce(b.textContent);
        input.disabled = false;
        sendBtn.disabled = false;
        input.placeholder = "Typ iets. Wat dan ook. Hij vindt er toch wel iets van.";
        input.style.opacity = "1";
        sendBtn.style.opacity = "1";
        sendBtn.style.cursor = "pointer";
        $('#chips').classList.remove('locked');
        $('.compose').classList.remove('locked');
        document.querySelectorAll('.chip, #fake-clip, #fake-mic').forEach(el => el.removeAttribute('aria-disabled'));
    }
    naarBeneden();
  }
  // SC 3.2.2: met pijltjestoetsen vuurt <select> bij elke optie een change af. Pas pas toe als de
  // keuze even stilstaat, zodat doorbladeren geen berichten plaatst of de invoer vergrendelt.
  let modelTimer = null;
  modelSel.addEventListener('change', () => {
    clearTimeout(modelTimer);
    modelTimer = setTimeout(pasModelToe, 700);
  });

  // eerste bericht — of een nette melding als engine.js niet geladen is, zodat de chat niet stil breekt
  setTimeout(() => {
    const b = rij('ai','Q');
    if(typeof bedenkAntwoord !== 'function'){
      b.textContent = "Ik ben niet helemaal wakker geworden: engine.js is niet geladen. Ververs de pagina, of probeer het later nog eens.";
      b.removeAttribute('aria-hidden'); announce(b.textContent);
      input.disabled = true; sendBtn.disabled = true;
      input.placeholder = "Chat niet beschikbaar — ververs de pagina";
      $('#chips').classList.add('locked');
      $('.compose').classList.add('locked');
      document.querySelectorAll('.chip, #fake-clip, #fake-mic').forEach(el => el.setAttribute('aria-disabled', 'true'));
      naarBeneden();
      return;
    }
    typ(b, "Systeem wakker. Ik heb je browsergeschiedenis niet gelezen, want dat kan ik niet, maar ik ga er toch iets van vinden. Typ iets.");
  }, 500);

  // demo-knop in de hero
  $('#demo-btn').addEventListener('click', () => {
    document.getElementById('chat').scrollIntoView({block:'center'});
    setTimeout(() => stuur("Leg eens uit waarom ik dit aan het doen ben"), 500);
  });

  /* ============================================================
     3. DE REST VAN DE PAGINA
     ============================================================ */
  // ticker die zichzelf verveelt
  const TICKER = [
    "QuinnAI 5.2 is live. Quinn zelf is dat niet.",
    "Nieuw: het model geeft nu sneller ongelijk toe. Nee, grapje.",
    "Storing opgelost door de pagina te verversen. Zoals altijd.",
    "Onderzoek toont aan: 4 op de 5 antwoorden zijn een antwoord.",
    "We hebben nu een privacybeleid. Het bestaat uit dit zinnetje.",
    "Serverkosten deze maand: €0,00. Dank voor jullie vertrouwen."
  ];
  let ti = 0;
  let tickerTimer = null;
  function tickerStart(){
    if(tickerTimer || reduceerBeweging) return;
    tickerTimer = setInterval(() => {
      ti = (ti + 1) % TICKER.length;
      const el = $('#ticker-text');
      el.style.opacity = 0;
      setTimeout(() => { el.textContent = TICKER[ti]; el.style.opacity = .85; }, 260);
    }, 5200);
  }
  function tickerStop(){ clearInterval(tickerTimer); tickerTimer = null; }
  tickerStart();
  $('#ticker-text').style.transition = 'opacity .26s';

  // WCAG 2.2.2: automatisch bewegende content moet te pauzeren zijn.
  // Werkt met muis (hover) én toetsenbord (de knop zelf, altijd bereikbaar).
  const tickerPauzeBtn = $('#ticker-pauze');
  if(reduceerBeweging){ tickerPauzeBtn.hidden = true; }
  tickerPauzeBtn.addEventListener('click', () => {
    const gepauzeerd = tickerPauzeBtn.getAttribute('aria-pressed') === 'true';
    tickerPauzeBtn.setAttribute('aria-pressed', String(!gepauzeerd));
    tickerPauzeBtn.setAttribute('aria-label', gepauzeerd ? 'Berichtenbalk pauzeren' : 'Berichtenbalk hervatten');
    if(gepauzeerd) tickerStart(); else tickerStop(); document.body.classList.toggle('pauzeer-animaties', !gepauzeerd);
  });
  document.querySelector('.ticker').addEventListener('mouseenter', tickerStop);
  document.querySelector('.ticker').addEventListener('mouseleave', () => {
    if(tickerPauzeBtn.getAttribute('aria-pressed') !== 'true') tickerStart();
  });

  // benchmarks + tellers animeren zodra ze in beeld komen. De eindwaarden staan al in de HTML (geen JS,
  // crawler, schermlezer: altijd het juiste getal); alleen als beweging mag, beginnen we visueel op 0.
  const animeerStats = !reduceerBeweging;
  if(animeerStats){
    document.querySelectorAll('#benchmarks .fill').forEach(f => { f.style.width = '0%'; });
    document.querySelectorAll('[data-count]').forEach(el => {
      const eind = el.textContent.trim();
      el.textContent = '';
      const sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = eind;
      const vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true');
      vis.textContent = '0' + (el.dataset.suffix || '');
      el.append(sr, vis);
      el.visueel = vis;
    });
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if(!e.isIntersecting) return;
      e.target.querySelectorAll('.fill').forEach((f,i) => {
        setTimeout(() => { f.style.width = f.dataset.w + '%'; }, i*120);
      });
      e.target.querySelectorAll('[data-count]').forEach(el => {
        if(!el.visueel) return;
        const doel = parseFloat(el.dataset.count), suffix = el.dataset.suffix || '';
        const decimalen = (el.dataset.count.split('.')[1] || '').length;
        let start = null;
        const duur = 1100;
        const stap = ts => {
          if(!start) start = ts;
          const p = Math.min((ts - start)/duur, 1);
          const v = doel * (1 - Math.pow(1-p, 3));
          el.visueel.textContent = v.toFixed(decimalen).replace('.', ',') + suffix;
          if(p < 1) requestAnimationFrame(stap);
        };
        requestAnimationFrame(stap);
      });
      io.unobserve(e.target);
    });
  }, {threshold:.3});
  if(animeerStats) document.querySelectorAll('#benchmarks .wrap').forEach(el => io.observe(el));

  // faq open/dicht
  document.querySelectorAll('.qa button').forEach(b => {
    b.addEventListener('click', () => {
      const qa = b.parentElement.parentElement;
      const open = qa.hasAttribute('open');
      document.querySelectorAll('.qa').forEach(o => {
        o.removeAttribute('open');
        o.querySelector('button').setAttribute('aria-expanded', 'false');
      });
      if(!open){ qa.setAttribute('open',''); b.setAttribute('aria-expanded','true'); }
    });
  });

  // prijsknoppen sturen hun grap naar de chat
  document.querySelectorAll('[data-say]').forEach(b => {
    b.addEventListener('click', () => {
      document.getElementById('chat').scrollIntoView({block:'center'});
      setTimeout(() => {
        const x = rij('ai','Q');
        typ(x, b.dataset.say);
        naarBeneden();
      }, 500);
    });
  });

  // reveal-on-scroll: zachte fade-up voor kopjes en kaarten, zodra ze in beeld komen
  const revealGroepen = [
    { sel: '.sec-head', stagger: false },
    { sel: '.tier', stagger: true },
    { sel: '.stat', stagger: true },
    { sel: '.qa', stagger: true }
  ];
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if(e.isIntersecting){ e.target.classList.add('in'); revealIO.unobserve(e.target); }
    });
  }, { threshold: .15, rootMargin: '0px 0px -40px 0px' });
  revealGroepen.forEach(({sel, stagger}) => {
    document.querySelectorAll(sel).forEach((el, i) => {
      el.classList.add('reveal');
      if(stagger){ el.classList.add('reveal-stagger'); el.style.setProperty('--i', i % 6); }
      revealIO.observe(el);
    });
  });

  // scroll-spy: markeert het actieve kopje in de nav
  const navLinks = Array.from(document.querySelectorAll('.nav-links a'));
  const spySecties = navLinks
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  const spyIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if(!e.isIntersecting) return;
      const href = '#' + e.target.id;
      navLinks.forEach(a => a.classList.toggle('actief', a.getAttribute('href') === href));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  spySecties.forEach(sec => spyIO.observe(sec));

  // terug-naar-boven: verschijnt pas als je een stuk gescrold hebt
  const naarBovenBtn = $('#naar-boven');
  naarBovenBtn.hidden = false;
  let scrollTimer = null;
  window.addEventListener('scroll', () => {
    if(scrollTimer) return;
    scrollTimer = setTimeout(() => {
      naarBovenBtn.classList.toggle('zichtbaar', window.scrollY > 700);
      scrollTimer = null;
    }, 100);
  }, { passive: true });
  naarBovenBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: scrollGedrag() }));

  // kleine easter egg: konami
  const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let ki = 0;
  window.addEventListener('keydown', e => {
    ki = (e.key === KONAMI[ki]) ? ki+1 : 0;
    if(ki === KONAMI.length){
      ki = 0;
      document.documentElement.style.setProperty('--lime','#ff7d6b');
      $('#ticker-text').textContent = "Godmodus actief. Er verandert niets, maar het is nu oranje.";
      const x = rij('ai','Q');
      typ(x, "Je hebt de Konami-code ingetypt op een nepwebsite. Ik weet niet of ik onder de indruk ben of bezorgd.");
      naarBeneden();
    }
  });
})();
