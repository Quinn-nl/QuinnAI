# QuinnAI 🧠

**Het taalmodel dat je liever niet had gehad.**

QuinnAI is een "volledig kunstmatige intelligentie, waarbij vooral het woord *kunstmatig* goed is gelukt". Geen zware taalmodellen, geen peperdure API's, en absoluut geen intelligentie. Gewoon 100% lokale JavaScript-if-statements met een flinke dosis sarcasme.

Getraind op 14 jaar groepsapp. Antwoordt binnen 0,4 seconden. Zelden nuttig.

## ✨ Features
* **Razendsnel:** Antwoordt in 0,4 seconden, puur omdat de code geen tijd verspilt aan daadwerkelijk nadenken.
* **Privacy by Design:** Alles gebeurt lokaal in je browser. "Zodra je de pagina ververst is alles weg, inclusief de dingen waar je nu spijt van hebt". We slaan niks op, want we hebben niet eens een database.
* **Lokaal Geheugen:** Onthoudt wat je zegt tijdens één sessie, puur om het later passief-agressief tegen je te gebruiken.
* **Benchmarks:** Verslaat de concurrentie moeiteloos op de enige metriek die telt: 'Zelfvertrouwen zonder onderbouwing' (99,4%).

## 🚀 Hoe werkt het?
Dit project heeft geen backend, geen server en geen internetverbinding nodig na het laden. Er is ook geen build-stap en geen framework:

* `index.html` bevat alleen de opmaak (markup); de rest staat in `assets/`.
* `assets/css/style.css` is de styling.
* `assets/js/engine.js` is de nep-AI zelf: zinsontleding, voornaamwoord-omdraaiing, werkwoordvervoeging, gespreksgeheugen en een hoop sjablonen. Wordt vóór `ui.js` geladen.
* `assets/js/ui.js` is de UI-laag (chat, profielkaart, knoppen).
* `assets/js/arcade.js` (spotlight, tilt, chat-glow, flits) en `assets/js/bsod.js` (Do Not Click) zijn de effecten-laag.
* `assets/js/proof.js` meet live wat de pagina zelf doet (externe verzoeken, cookies, opgeslagen bytes) en toont dat.
* `assets/css/404.css` en `assets/js/404.js` horen bij de foutpagina (geen inline code, vanwege de CSP).
* `assets/fonts/` bevat de zelf gehoste lettertypen (woff2, latin-subset, OFL-licentie), zodat de pagina geen verbinding met Google Fonts maakt.
* `assets/img/` bevat `og-image.png` en `apple-touch-icon.png`.
* `docs/` bevat de merkstem (`brand-voice.md`) en de huisstijl (`brand-identity.md`).
* `tools/` bevat `test.js` en `check.js` (zie Testen).
* `404.html` is de foutpagina die GitHub Pages zelf serveert bij een onbekend adres. Hij deelt `style.css` met de homepage, zodat ticker, navigatie en knoppen op exact dezelfde plek en met dezelfde animatie staan.
* `style.css`, `engine.js` en `ui.js` worden met een versie-hash geladen (`?v=…`, eerste 8 tekens van de sha1) tegen verouderde caches.

Host het simpelweg via GitHub Pages, open de link en laat je beledigen.

## 🔒 Privacy
De pagina draagt een strenge Content-Security-Policy (meta-tag): alles komt van de eigen herkomst en `connect-src` is dicht, dus de browser blokkeert elke externe verbinding. Er zijn geen cookies en geen localStorage. In de hero en de footer staat een live meting.

## 🛠️ Disclaimer
Dit is een grap van en voor vrienden. Er wordt niets verstuurd, opgeslagen of geanalyseerd. Alles wat je hier leest is verzonnen, inclusief de benchmarks, de certificeringen en het zelfvertrouwen.

## 🧪 Testen
`assets/js/engine.js` heeft een testsuite die los van de browser draait (in Node, via een losse VM-context).

    node tools/test.js

Test de taalkunde (voornaamwoord-omdraaiing, vervoeging), het geheugen, rekenkunde, de
veiligheidsmodus en 4000 willekeurige berichten op crashes. Exitcode 0 = alles groen.

    node tools/check.js

Controleert of de scripts syntactisch kloppen, of alle lokale bestanden waarnaar verwezen wordt
(fonts, iconen, og-image) bestaan, of `style.css`, `engine.js` en `ui.js` met de juiste
versie-hash geladen worden en of de kleurparen uit `:root` hun WCAG-contrastdrempel halen
(4,5:1 voor tekst, 3:1 voor randen). Heb je een van die bestanden aangepast? Draai dan
`node tools/check.js --fix` om de hashes bij te werken. Beide scripts draaien ook automatisch via GitHub Actions
(`.github/workflows/test.yml`) bij elke push.