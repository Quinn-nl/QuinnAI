# QuinnAI — huisstijl "AI Arcade"

> Visuele identiteit. De waarden komen uit `assets/css/style.css` (`:root`); bij twijfel wint de CSS.
> Contrast wordt bewaakt door `tools/check.js` (30 paren, fout = CI rood).

## Concept
Een **neon-arcadeautomaat die doet alsof hij een AI is**. Luid, glossy en ironisch aan de buitenkant, met een
terminal eronder die eerlijk blijft (de privacy-meting, "100% lokaal"). Basis: Retro-Futurism / Cyberpunk UI,
laag erop: Gen-Z-stickers, neubrutalist harde schaduwen.

## Kleuren
| Token | Hex | Gebruik | Contrast op `--ink` |
|---|---|---|---|
| `--ink` | `#07070d` | achtergrond | - |
| `--ink-2` / `--ink-3` | `#0e0e19` / `#171726` | kaarten / verhoogde vlakken | - |
| `--lime` | `#c6ff3d` | primair: CTA's, accent, "winnen", serif-pointe | 17,0 |
| `--pink` | `#ff2e93` | secundair: stickers, harde schaduwen, gevaar, Do Not Click | 5,8 |
| `--violet` | `#8b5cff` | aurora, retro-grid, schaduw van secundaire knoppen | 4,85 |
| `--cyan` | `#22e6ff` | data, status, links, chat-glow (laag), verloop met lime | 13,2 |
| `--orange` | `#ff7a1a` | warm accent in verlopen | 7,7 |
| `--paper` | `#f4f4f8` | tekst | 18,3 |
| `--muted` / `--muted-3` | `#a9a9bd` / `#8e8ea3` | secundaire tekst | 8,7 / 6,3 |
| `--on-lime` | `#0b0b12` | donkere tekst op lime/cyan/pink/orange | 5,7 - 16,6 |
| `--bsod` | `#0a3fd1` | alleen de nep-crash (witte tekst) | - |
Merkverloop: `lime -> cyan`. Stickers: `pink` (hoofd), `lime`, `cyan`. Nieuwe kleur? Eerst als token in `:root`
en als paar in `tools/check.js`.

## Typografie (alles zelf gehost, OFL, `assets/fonts/`)
| Rol | Lettertype | Waar |
|---|---|---|
| Koppen | Bricolage Grotesque | h1/h2/h3, merknaam |
| Poster-display | Boldonse | alleen korte stukken: cijfers (stats), prijzen, "404" |
| Pixel/arcade | Pixelify Sans | stickers, eyebrows (`01 · Benchmarks`), FAQ-nummers, marquee, scoreboard, Do Not Click |
| Pointe | Instrument Serif (cursief) | één woord per kop, altijd `--lime` (`.serif`) |
| Tekst | Schibsted Grotesk | lopende tekst |
| Data/terminal | IBM Plex Mono | chat-titel, prompt-pil, pad op de 404 |
Boldonse is erg breed: nooit voor lopende tekst of meer dan een paar woorden.

## Vorm en beeld
- **Harde schaduwen** (`--hard`, 4px): knoppen, kaarten, stats, chat, stickers; hover = schaduw groeit en element schuift, active = indrukken.
- **Stickers**: schuin (-9 tot +7 graden), pixel-lettertype, 2px donkere rand.
- **Retro-grid** onder de hero, **aurora** (violet/cyan/pink), **scanlines** in de chat, **cursor-spotlight** op de hero.
- **Marquee** i.p.v. losse badges; **chat-glow** volgt de toon-slider (cyaan = braaf, roze = sarcasme).
- Geen emoji als icoon; inline SVG. Footer sluit af met een omlijnd woordmerk.

## Beweging (max 1-2 sleutelelementen per zicht)
Hero: glitch op "0,4 seconden." (hover/focus), cursor, retro-grid. Marquee. Tilt op prijskaarten (alleen muis).
Alles staat uit bij `prefers-reduced-motion` en na de pauzeknop in de ticker (ook pseudo-elementen). Niets flitst vaker dan 3x/s.

## Onderdelen met gedrag
- **Do Not Click** (footer): schudt, dan een nep-BSOD met oplopende grappen per klik (1x, 2x, 3x, 4e+ klik), nep-QR, stopcode.
  Sluit met Esc of de knop (geen tijdslimiet), focus keert terug, achtergrond is `inert`. **Nooit tijdens een crisis-gesprek** (`isErnstig()`).
- **Konami-code** (bestaat), **privacy-meting** (hero + footer), **404 "Game over"** met "Bedoelde je ...?".

## Gedeelde assets
`og-image` en `apple-touch-icon` worden gerenderd uit `tools/og-image.html` en `tools/icon.html` met `node tools/render-og.js`.
Favicon is een inline SVG in `index.html`/`404.html`.
