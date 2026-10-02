(function(){
  var pad = '';
  try{ pad = decodeURIComponent(location.pathname + location.search); }catch(e){ /* kapotte URL-codering: dan maar zonder pad */ }
  var padEl = document.getElementById('pad');
  if(pad && pad !== '/'){
    padEl.textContent = pad;
    document.getElementById('pad-regel').hidden = false;
  }

  /* Wisselende droge regel (alleen weergave, niets wordt opgeslagen). De HTML-tekst blijft de standaard zonder JS. */
  var regels = [
    'QuinnAI heeft gezocht, op één plek. Daar stond niets. Quinn zegt dat hij het “zo even opzoekt”.',
    'Deze pagina is net zo echt als de bronnen van QuinnAI.',
    'Quinn zegt dat hij het zo even opzoekt. Dat zegt hij al sinds 2019.',
    'QuinnAI heeft deze pagina nooit gezien, maar is er wel 99% zeker van dat hij bestaat.',
    'Waarschijnlijk is dit de schuld van de groepsapp.',
    'Hier stond ooit iets. Of nooit. QuinnAI weet het niet meer.'
  ];
  document.getElementById('nf-regel').textContent = regels[Math.floor(Math.random() * regels.length)];

  /* "Bedoelde je ...?": dichtste bestemming bij het getypte pad, puur lokaal. */
  var bestemmingen = [
    { naam: 'de chat',       href: '/#chat',       woorden: ['chat','gesprek','praat','praten','home','index','start','quinn','ai','bot'] },
    { naam: 'de benchmarks', href: '/#benchmarks', woorden: ['benchmarks','benchmark','bench','cijfers','scores','stats','statistieken','resultaten'] },
    { naam: 'de prijzen',    href: '/#prijzen',    woorden: ['prijzen','prijs','price','prices','pricing','kosten','abonnement','abonnementen','betalen','capitalism','tikkie'] },
    { naam: 'de vragen',     href: '/#vragen',     woorden: ['vragen','vraag','faq','help','contact','support','info','about','over','privacy'] }
  ];
  function afstand(a, b){
    var m = a.length, n = b.length, d = [], i, j;
    for(i = 0; i <= m; i++){ d[i] = [i]; }
    for(j = 1; j <= n; j++){ d[0][j] = j; }
    for(i = 1; i <= m; i++){
      for(j = 1; j <= n; j++){
        d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a.charAt(i-1) === b.charAt(j-1) ? 0 : 1));
      }
    }
    return d[m][n];
  }
  function score(token, woord){
    if(token === woord) return 3;
    if(token.length >= 3 && woord.length >= 3 && (woord.indexOf(token) === 0 || token.indexOf(woord) === 0)) return 2;
    if(token.length >= 4 && woord.length >= 4 && afstand(token, woord) <= Math.max(1, Math.floor(Math.min(token.length, woord.length) / 4))) return 1;
    return 0;
  }
  var tokens = pad.toLowerCase().split(/[^a-zà-ÿ]+/).filter(Boolean);
  var beste = null, bestScore = 0;
  bestemmingen.forEach(function(b){
    var s = 0;
    tokens.forEach(function(t){ b.woorden.forEach(function(w){ s = Math.max(s, score(t, w)); }); });
    if(s > bestScore){ bestScore = s; beste = b; }
  });
  if(beste){
    var hoofd = document.getElementById('nf-hoofd'), tweede = document.getElementById('nf-tweede');
    hoofd.href = beste.href;
    hoofd.textContent = 'Bedoelde je ' + beste.naam + '?';
    if(beste.href === '/#chat'){ /* tweede knop blijft de prijzen */ }
    else { tweede.href = '/#chat'; tweede.textContent = 'Terug naar de chat'; }
    document.getElementById('nf-klein').textContent = 'QuinnAI is er ' + (bestScore === 3 ? '99' : '87') + '% zeker van. Bronnen: 0.';
  }

  /* WCAG 2.2.2: de knipperende stip in de ticker en de cursor kunnen gepauzeerd worden */
  var knop = document.getElementById('ticker-pauze');
  knop.addEventListener('click', function(){
    var aan = knop.getAttribute('aria-pressed') !== 'true';
    knop.setAttribute('aria-pressed', String(aan));
    knop.setAttribute('aria-label', aan ? 'Berichtenbalk hervatten' : 'Berichtenbalk pauzeren');
    document.body.classList.toggle('pauzeer-animaties', aan);
  });
  var jaar = document.getElementById('year'); if(jaar) jaar.textContent = new Date().getFullYear();
})();
