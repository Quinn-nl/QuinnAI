# QuinnAI engine ("Quinn 6")

`assets/js/engine.js` is de nep-AI. Geen model, geen API: zinsontleding, sjablonen, een klein geheugen en wat trucage.
Eén bestand, gewone global scope (geen modules), geladen vóór `ui.js`. Contract met de UI:
`bedenkAntwoord(tekst, opties)` geeft altijd een **string**; extra's via `laatsteMeta()` en `huidigeStemming()`.

## Lagen (van binnen naar buiten)
1. **Kern** (`bedenkBasis` -> `kern`): veiligheid eerst (`VEILIG`, zachte modus), dan rekenen/vertalen/geheugen, korte reacties, gevoel,
   toon van het bericht, vragen, en **onderwerpen**.
2. **Begrip (v6)**: `herstelWoord/herstelZin` (typfouten, alleen voor herkenning), `stam()`, `scoreOnderwerpen()` (regex-hit = 3,
   zwak sleutelwoord = 2,5, stam-hit = 1-2; bij gelijkspel wint de volgorde in de lijst), combineren van twee onderwerpen,
   doorvragen (`DOORVRAAG`, `DIEPER`, per onderwerp optioneel `d`).
3. **Persoonlijkheid (v6)**: `stemming` (geduld/sympathie/energie -> label), mijlpalen, callbacks, relaties, running gags (`GAGS`),
   kalender (`kalenderRegels`). Wrapper `bedenkAntwoord` voegt hooguit één extra toe aan het basisantwoord.
4. **Theater (v6)**: `laatsteMeta()` met denkstappen, verzonnen bronnen, zekerheid, hallucinatie en soms een zelfcorrectie.

## Harde regels (tests bewaken ze)
- **Crisis, zachte beurten, gevoel/verlies en "Probeer opnieuw": geen enkele extra** (geen stemming, gag, callback, kalender, bronnen, correctie).
  Het gevoel-pad (`RE.gevoel`, incl. overleden/gestorven/kanker/mishandeling) staat vóór alle grappen.
- **Geen persoonsgegevens** over Quinn of wie dan ook in teksten (test `geen persoonsgegevens`). "Quinn" is alleen het fictieve personage.
- Nieuwe willekeur gebruikt een **tweede rng-stroom** (`makeRng(hash(laag + '|x2...'))`); `vul()` doet precies één `rng()`-trekking.
  Daardoor verschuiven de deterministische keuzes van oudere onderdelen niet.
- Gebruikerstekst nooit via `String.replace` met een string-vervanging: altijd een functie-replacer (`$&`, `$'` e.d.).
- Niets wordt opgeslagen (geen localStorage/cookies); alles leeft in het geheugen van het tabblad en verdwijnt bij verversen of "Vergeet alles".
- Typfout-correctie raakt nooit echo, `flip()`, namen of het geheugen: alleen het herkennen van onderwerpen.

## Een onderwerp toevoegen
In `ONDERWERPEN.push({ re:/\b(woord|woord2)\b/, a:[...5+ antwoorden...], d:[...optioneel dieper...] })` (blok "INHOUD (v6)").
- Gebruik enkelvoudige sleutelwoorden in `\b(...)\b`: die worden automatisch woordenschat voor typfouten en stam-herkenning.
- Algemene woorden die vaak toevallig voorkomen horen in `ZWAK_SLEUTELS`.
- De tests controleren: >= 5 antwoorden, geen dubbelen, geen kale `{...}`, lengte 12-300, eindigt op leesteken, onderwerp is triggerbaar.

## Testen
`node tools/test.js` (4500+ tests, incl. 4000 fuzzberichten en 4000 met typfouten) en `node tools/check.js` (hashes, contrast, engine-grootte-budget 200 KB).
