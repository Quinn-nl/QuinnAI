# QuinnAI — merk en stem

> Eén pagina, zodat nieuwe copy en nieuwe onderdelen consistent blijven. Opgezet met het
> brand-framework (voice vs. tone, do/don't, contextaanpassing). De waarden hieronder komen
> uit `assets/css/style.css`; bij twijfel wint de CSS.

## In het kort

| Element | Waarde |
|---|---|
| Wat | Nep-AI als grap voor vrienden. Geen model, geen backend: client-side JS die overtuigend doet alsof |
| Stem | Droog-sarcastisch Nederlands, zelfverzekerd zonder reden |
| Kleuren | zie `docs/brand-identity.md` (AI Arcade: lime, pink, violet, cyan op bijna-zwart) |
| Tekst | `--paper`, `--muted`, `--muted-3` (alles ≥ 4,5:1, bewaakt door `tools/check.js`) |
| Lettertypen | zie `docs/brand-identity.md` (Bricolage, Boldonse, Pixelify Sans, Instrument Serif, Schibsted, Plex Mono; alle zelf gehost) |
| Merk | Q-tegel met lime-cyan verloop en roze harde schaduw + "QuinnAI" |

## Persoonlijkheid (stem)

| Eigenschap | Betekent | Wel | Niet |
|---|---|---|---|
| Droog | Grappen zonder knipoog; nooit uitleggen dat het een grap is | "Zekerheid: 99%. Bronnen: 0." | "Haha, grapje!" |
| Overtuigd | Praat als een serieus product, over onzin | "Antwoordt nu binnen 0,4 seconden." | Twijfelen of verontschuldigen |
| Zelfspot | De grap gaat over Quinn en de AI-hype, niet over de bezoeker | "Quinn zegt dat hij het zo even opzoekt." | Bezoekers kleineren of echt beledigen |
| Kort | Eén scherpe zin wint van drie nette | "Geen bedrijf, geen model, geen aansprakelijkheid." | Lange uitleg of marketingtaal |

## Vaste elementen

- **Quinn** als personage (antwoordt nooit, "zo even opzoeken") en de running gag over de **groepsapp**.
- **"Capitalism"**-prijzenpagina (Gratis / Vriendenprijs / Je ziel) en de **"Do Not Click"**-knop (footer: schudt en toont een nep-BSOD; nooit tijdens een crisis-gesprek).
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

Concept: **AI Arcade**, een neon-arcadeautomaat die doet alsof hij een AI is, met een terminal eronder die eerlijk blijft. Uitwerking in `docs/brand-identity.md`.

Donker thema, harde offset-schaduwen, stickers, één lime primaire actie per scherm. Animaties zijn kort,
respecteren `prefers-reduced-motion` en kunnen gepauzeerd worden (ticker).

## Privacy (technisch afgedwongen)

- Strenge Content-Security-Policy (meta): `default-src 'none'`, alleen `'self'` voor script/style/font, `connect-src 'none'`. De browser blokkeert dus zelf elke externe verbinding.
- `referrer: no-referrer`, geen cookies, geen localStorage/sessionStorage.
- `assets/js/proof.js` meet live op de pagina zelf: externe verzoeken, cookies en opgeslagen bytes (nu overal 0).
- Daarom: geen inline `<style>`/`<script>`/`style=""` in de HTML, en geen externe fonts, scripts of afbeeldingen.

## Nieuwe kleur of component toevoegen

1. Nieuwe kleur als token in `:root` en als paar toevoegen aan `tools/check.js` (contrast tegen de **echte** achtergrond).
2. Geen externe fonts, scripts of afbeeldingen.
3. `node tools/check.js --fix` en `node tools/test.js` draaien.
