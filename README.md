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

* `index.html` bevat de opmaak, de CSS en de UI-laag (chat, profielkaart, knoppen).
* `engine.js` is de nep-AI zelf: zinsontleding, voornaamwoord-omdraaiing, werkwoordvervoeging, gespreksgeheugen en een hoop sjablonen. Wordt vóór het inline script in `index.html` geladen, met een versie-hash (`engine.js?v=…`) tegen verouderde caches.
* `fonts/` bevat de zelf gehoste lettertypen (woff2, latin-subset, OFL-licentie), zodat de pagina geen verbinding met Google Fonts maakt.
* `404.html` is de foutpagina die GitHub Pages zelf serveert bij een onbekend adres.

Host het simpelweg via GitHub Pages, open de link en laat je beledigen.

## 🛠️ Disclaimer
Dit is een grap van en voor vrienden. Er wordt niets verstuurd, opgeslagen of geanalyseerd. Alles wat je hier leest is verzonnen, inclusief de benchmarks, de certificeringen en het zelfvertrouwen.

## 🧪 Testen
`engine.js` heeft een testsuite die los van de browser draait (in Node, via een losse VM-context).

    node test.js

Test de taalkunde (voornaamwoord-omdraaiing, vervoeging), het geheugen, rekenkunde, de
veiligheidsmodus en 4000 willekeurige berichten op crashes. Exitcode 0 = alles groen.

    node check.js

Controleert of de inline scripts syntactisch kloppen, of alle lokale bestanden waarnaar
verwezen wordt (fonts, iconen, og-image) bestaan en of `index.html` `engine.js` met de juiste
versie-hash laadt. Heb je `engine.js` aangepast? Draai dan `node check.js --fix` om die hash
bij te werken. Beide scripts draaien ook automatisch via GitHub Actions
(`.github/workflows/test.yml`) bij elke push.