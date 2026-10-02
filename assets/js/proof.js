/* Privacy-meting: laat zien wat deze pagina zelf meet, niet wat ze beweert.
   - externe verzoeken: alle resources die niet van deze herkomst komen (PerformanceObserver)
   - cookies: wat document.cookie ziet
   - bytes opgeslagen: localStorage + sessionStorage (de pagina schrijft daar niets)
   Dit script doet zelf geen verzoeken en slaat niets op. */
(function(){
  "use strict";
  var ext = document.querySelectorAll('[data-proof="ext"]');
  var cookie = document.querySelectorAll('[data-proof="cookie"]');
  var opslag = document.querySelectorAll('[data-proof="opslag"]');
  if(!ext.length && !cookie.length && !opslag.length) return;

  function zet(lijst, waarde){ for(var i = 0; i < lijst.length; i++) lijst[i].textContent = String(waarde); }
  function extern(){
    var n = 0, lijst = performance.getEntriesByType('resource');
    for(var i = 0; i < lijst.length; i++){
      try{ if(new URL(lijst[i].name).origin !== location.origin) n++; }catch(e){ n++; }
    }
    return n;
  }
  function koekjes(){ return document.cookie ? document.cookie.split(';').length : 0; }
  function bytes(){
    var n = 0;
    try{
      [localStorage, sessionStorage].forEach(function(s){
        for(var i = 0; i < s.length; i++){ var k = s.key(i); n += k.length + (s.getItem(k) || '').length; }
      });
    }catch(e){ /* opslag geblokkeerd: dan staat er in elk geval niets van ons in */ }
    return n;
  }
  function meet(){ zet(ext, extern()); zet(cookie, koekjes()); zet(opslag, bytes()); }
  meet();
  try{ new PerformanceObserver(meet).observe({ type: 'resource', buffered: true }); }catch(e){ /* oudere browsers: eenmalige meting volstaat */ }
  window.addEventListener('load', function(){ setTimeout(meet, 400); });
})();
