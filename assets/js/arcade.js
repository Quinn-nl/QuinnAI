/* Arcade-effecten: puur visueel, geen verzoeken, niets opgeslagen.
   - cursor-spotlight op de hero
   - 3D-tilt op prijskaarten
   - chat-glow volgt de toon-slider (cyaan = braaf, roze = sarcasme)
   - korte "insert coin"-flits bij verzenden
   Alles uit bij prefers-reduced-motion en na de pauzeknop (body.pauzeer-animaties). */
(function(){
  "use strict";
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fijn = window.matchMedia('(hover: hover) and (pointer: fine)');
  function stil(){ return reduce.matches || document.body.classList.contains('pauzeer-animaties'); }

  /* cursor-spotlight */
  var hero = document.getElementById('top');
  if(hero && fijn.matches){
    hero.addEventListener('pointermove', function(e){
      if(stil() || e.pointerType !== 'mouse') return;
      var r = hero.getBoundingClientRect();
      hero.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      hero.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  }

  /* 3D-tilt op prijskaarten */
  if(fijn.matches){
    document.querySelectorAll('.tier').forEach(function(k){
      k.addEventListener('pointermove', function(e){
        if(stil() || e.pointerType !== 'mouse') return;
        var r = k.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        k.style.setProperty('--ry', (x * 7).toFixed(2) + 'deg');
        k.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg');
      });
      k.addEventListener('pointerleave', function(){
        k.style.removeProperty('--rx'); k.style.removeProperty('--ry');
      });
    });
  }

  /* chat-glow volgt de toon */
  var shell = document.querySelector('.chat-shell'), toon = document.getElementById('sarcasme');
  function zetToon(){ if(shell && toon) shell.style.setProperty('--tone', String(Math.max(0, Math.min(1, toon.value / 100)))); }
  if(toon){ toon.addEventListener('input', zetToon); zetToon(); }

  /* flits bij verzenden */
  function flits(){
    if(!shell || stil()) return;
    shell.classList.remove('flits'); void shell.offsetWidth; shell.classList.add('flits');
  }
  var send = document.getElementById('send'), invoer = document.getElementById('input');
  if(send) send.addEventListener('click', flits);
  if(invoer) invoer.addEventListener('keydown', function(e){ if(e.key === 'Enter' && !e.isComposing && invoer.value.trim()) flits(); });
  document.querySelectorAll('.chip').forEach(function(c){ c.addEventListener('click', flits); });
  if(shell) shell.addEventListener('animationend', function(e){ if(e.animationName === 'flits') shell.classList.remove('flits'); });
})();
