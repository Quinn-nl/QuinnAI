/* Do Not Click: nep-BSOD. Volledig lokaal, niets opgeslagen (de teller leeft alleen in dit geheugen).
   - Esc of de knop sluit; focus gaat terug naar de knop; achtergrond is inert zolang de crash open staat
   - bij reduced motion / gepauzeerde animaties: geen schudden, voortgang meteen op 100%
   - nooit tijdens een crisis-gesprek (isErnstig() uit de engine): dan alleen een zachte zin
   - geen tijdslimiet: de crash sluit nooit vanzelf (WCAG 2.2.1) */
(function(){
  "use strict";
  var knop = document.getElementById('do-not-click');
  var dlg = document.getElementById('bsod');
  if(!knop || !dlg) return;
  var tekst = document.getElementById('bsod-tekst'), pctEl = document.getElementById('bsod-pct'),
      codeEl = document.getElementById('bsod-code'), sluit = document.getElementById('bsod-sluit'),
      qr = document.getElementById('bsod-qr'), ticker = document.getElementById('ticker-text');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var teller = 0, timer = null, vorige = null, titel = document.title;

  var CODES = ['GROEPSAPP_ZEI_DAT_JE_NIET_MOEST_KLIKKEN', 'QUINN_ANTWOORDT_NOOIT_EXCEPTION', 'GEEN_BRONNEN_MAAR_WEL_ZELFVERTROUWEN',
               'DEZE_KNOP_STOND_ER_NIET_VOOR_NIETS', 'ZPFA_OVERFLOW_ZELFVERTROUWEN_PER_FOUTIEF_ANTWOORD', 'KUNSTMATIG_INTELLIGENT_NOT_FOUND'];
  var TEKSTEN = [
    'Er stond op de knop dat je niet moest klikken. We verzamelen nu wat foutinformatie. Dat is niets, want we houden niets bij, dus dit duurt niet lang.',
    'Je hebt het nog een keer gedaan. QuinnAI heeft hier geen procedure voor, dus hij verzint er nu een.',
    'Drie keer. Quinn is hiervan op de hoogte gebracht, via de groepsapp. Hij heeft het gelezen en niet gereageerd.',
    'Je staat inmiddels op plek 4 van de ranglijst van mensen die dit deden. Plek 1 is Quinn. Hij klikte erop om te kijken wat er zou gebeuren.'
  ];
  function stil(){ return reduce.matches || document.body.classList.contains('pauzeer-animaties'); }
  function crisis(){ return typeof isErnstig === 'function' && isErnstig(); }

  function tekenQr(){
    var n = 25, c = qr.getContext('2d'); if(!c) return;
    c.clearRect(0, 0, n, n); c.fillStyle = '#0a3fd1';
    function vast(x, y){ c.fillRect(x, y, 7, 7); c.clearRect(x + 1, y + 1, 5, 5); c.fillRect(x + 2, y + 2, 3, 3); }
    for(var y = 0; y < n; y++) for(var x = 0; x < n; x++){
      var hoek = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
      if(!hoek && Math.random() < .5) c.fillRect(x, y, 1, 1);
    }
    vast(0, 0); vast(n - 7, 0); vast(0, n - 7);
  }

  function achtergrond(inert){
    for(var i = 0; i < document.body.children.length; i++){
      var el = document.body.children[i];
      if(el === dlg || el.tagName === 'SCRIPT') continue;
      if(inert) el.setAttribute('inert', ''); else el.removeAttribute('inert');
    }
  }

  function toon(){
    vorige = document.activeElement;
    tekst.textContent = TEKSTEN[Math.min(teller - 1, TEKSTEN.length - 1)];
    codeEl.textContent = CODES[Math.floor(Math.random() * CODES.length)];
    pctEl.textContent = '0';
    tekenQr();
    achtergrond(true);
    dlg.hidden = false;
    document.title = 'QuinnAI — FATAL ERROR';
    sluit.focus();
    clearInterval(timer);
    if(stil()){ pctEl.textContent = '100'; return; }
    var pct = 0;
    timer = setInterval(function(){
      pct = Math.min(100, pct + 2 + Math.floor(Math.random() * 9));
      pctEl.textContent = String(pct);
      if(pct >= 100) clearInterval(timer);
    }, 90);
  }

  function dicht(){
    clearInterval(timer);
    dlg.hidden = true;
    achtergrond(false);
    document.title = titel;
    document.body.classList.remove('schud');
    if(ticker) ticker.textContent = 'Systeem hersteld. Zoals altijd: door er niets aan te doen.';
    if(vorige && vorige.focus) vorige.focus(); else knop.focus();
  }

  knop.addEventListener('click', function(){
    if(crisis()){ if(ticker) ticker.textContent = 'Even niet. Eerst serieus, daarna weer knoppen.'; return; }
    teller++;
    if(stil()){ toon(); return; }
    document.body.classList.add('schud');
    setTimeout(toon, 560);
  });
  sluit.addEventListener('click', dicht);
  dlg.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){ e.preventDefault(); dicht(); }
    else if(e.key === 'Tab'){ e.preventDefault(); sluit.focus(); }   /* één focusbaar element: de focus blijft in de dialoog */
  });
})();
