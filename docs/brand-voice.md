# QuinnAI — merk en stem

> Eén pagina, zodat nieuwe copy en nieuwe onderdelen consistent blijven. Opgezet met het
> brand-framework (voice vs. tone, do/don't, contextaanpassing). De waarden hieronder komen
> uit `assets/css/style.css`; bij twijfel wint de CSS.

## In het kort

| Element | Waarde |
|---|---|
| Wat | Nep-AI als grap voor vrienden. Geen model, geen backend: client-side JS die overtuigend doet alsof |
| Stem | Droog-sarcastisch Nederlands, zelfverzekerd zonder reden |
| Kleuren | `--ink` #0a1017 (achtergrond), `--butter` #f5c451 (accent/knoppen), `--mint` #77d8ae (status/lokaal), `--rose` #ff7d6b (doorhaling/vergeten) |
| Tekst | `--paper` #fff, `--muted` #b0becd, `--muted-3` #9ba8b6 (alles ≥ 4,5:1, bewaakt door `tools/check.js`) |
| Lettertypen | Bricolage Grotesque (koppen), Schibsted Grotesk (tekst), IBM Plex Mono (data/labels), zelf gehost |
| Merk | Gele "Q"-tegel (verloop `--butter` → `--butter-2`, Q in `--on-butter-mark`) + "QuinnAI" |

## Persoonlijkheid (stem)

| Eigenschap | Betekent | Wel | Niet |
|---|---|---|---|
| Droog | Grappen zonder knipoog; nooit uitleggen dat het een grap is | "Zekerheid: 99%. Bronnen: 0." | "Haha, grapje!" |
| Overtuigd | Praat als een serieus product, over onzin | "Antwoordt nu binnen 0,4 seconden." | Twijfelen of verontschuldigen |
| Zelfspot | De grap gaat over Quinn en de AI-hype, niet over de bezoeker | "Quinn zegt dat hij het zo even opzoekt." | Bezoekers kleineren of echt beledigen |
| Kort | Eén scherpe zin wint van drie nette | "Geen bedrijf, geen model, geen aansprakelijkheid." | Lange uitleg of marketingtaal |

## Vaste elementen

- **Quinn** als personage (antwoordt nooit, "zo even opzoeken") en de running gag over de **groepsapp**.
- **"Capitalism"**-prijzenpagina (Gratis / Vriendenprijs / Je ziel) en de **"Do Not Click"**-knop.
- **"100% lokaal"**-badge: er wordt niets verstuurd of opgeslagen (geen localStorage, geen cookies, geen externe requests). Privacy-grappen moeten daarom feitelijk kloppen.
- Disclaimers die zichzelf tegenspreken ("kan eigenlijk alleen maar fouten maken").

## Toon per context

| Context | Toon | Voorbeeld |
|---|---|---|
| Hero, prijzen, footer | Maximaal droog, kort | "Alle abonnementen zijn gratis, want er is geen betaalsysteem." |
| Chat, gewone berichten | Sarcastisch, spiegelt de gebruiker | Antwoord dat jouw eigen woorden terugkaatst |
| Chat, **gevoel of crisis** | **Zacht en serieus, nooit grappen**, klikbare tel:-links, geen "Probeer opnieuw" | Altijd vóór alle toon-grapjes; zachte modus blijft 3 beurten |
| Foutpagina (404) | Droog, zelfde stem als de hero | "QuinnAI heeft gezocht, op één plek." |

## Toegankelijkheid (harde afspraak)

WCAG 2.1 AA / EAA nastreven, nooit "100% compliant" beloven (vereist echte AT-tests). Elk gevonden
probleem echt oplossen met het criterium erbij; **geen overlay-widgets**. Open punt: dubbele
aankondiging door `role="log"`, `aria-live` en `#live-announcer` is alleen met een echte
schermlezer te verifiëren.

## Beeld

Donker thema, veel witruimte, kaarten met 1px rand (`--line-soft`), pillen voor labels, één gele
primaire actie per scherm. Animaties zijn kort (`--dur-fast` 150 ms, `--dur` 220 ms), respecteren
`prefers-reduced-motion` en kunnen gepauzeerd worden (ticker).

## Nieuwe kleur of component toevoegen

1. Nieuwe kleur als token in `:root` en als paar toevoegen aan `tools/check.js` (contrast tegen de **echte** achtergrond).
2. Geen externe fonts, scripts of afbeeldingen.
3. `node tools/check.js --fix` en `node tools/test.js` draaien.
