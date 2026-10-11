# Pixel-Stil für Golgotha

Alle neuen Figuren, Böden und Wände folgen diesen Regeln. Sonst entstehen mehrere Stile nebeneinander.

Vorbild für die Stimmung ist Blasphemous: spanisch-gotische Ikonografie, Büßer, Reliquien, Blut, Kerzenlicht, ohne Kantenglättung. Vorbild für die Lesbarkeit in Kämpfen sind Enter the Gungeon und Hades: Jede Figur muss im Gewimmel an ihrem Umriss und ihrer Farbe erkennbar sein.

Die Referenzfiguren sind `PX_HERO.penitent` mit `PX_GUN.revolver` (in `js/px-heroes.js`) und `PX_ENEMY.chaser` (in `js/px-enemies.js`).

## Technik

- **Format:** Eine Figur ist ein Raster aus Zeichenketten. Jedes Zeichen ist ein Bildpunkt aus `PX_PAL` (`js/px-core.js`), ein Punkt (`.`) ist leer. Jede Zeile hat genau `w` Zeichen, jede Bildfolge genau `h` Zeilen.
- **Maßstab:** 1 Bildpunkt = `PX_S` = 2 Spielpixel. Weich gezeichnet wird nichts. Geschnitten und gerundet wird nur in `pxDraw`.
- **Blickrichtung und Anker:** Die Figur blickt nach rechts, links wird gespiegelt. `ax`/`ay` ist der Bildpunkt, der auf der Spielposition liegt, nämlich die Körpermitte. Die Füße liegen etwa `r` Spielpixel darunter.
- **Rand:**
  - Der dunkle Umriss (`'0'`) und ein schwacher heller Lichtsaum kommen automatisch dazu. Nicht selbst zeichnen.
  - Boden, Wände und Geschosse bekommen `halo:false`, weil der Saum dort stört. Wenn eine Figur selbst leuchtet (Geist, Seraph), passt oft auch `outline:false`.
- **Treffer-Blitz:** Die weiße Silhouette entsteht automatisch. Eine eigene Bildfolge `hit` ist freiwillig.
- **Farben:**
  - Nur Farben aus `PX_PAL` verwenden.
  - `pal:{…}` je Figur ist die Ausnahme (höchstens 2 Zusatzfarben). Wird sie gebraucht, kurz begründen.
  - Bei Geschossen stehen `*` `+` `-` für die Waffenfarbe (normal, heller, dunkler).
- **Prüfen:**
  - `node tools/px-sheet.js bogen.png 3` zeichnet alle Figuren mit Blitz und vor jedem Regionsboden und meldet Rasterfehler.
  - `node tools/px-shot.js bild.png 0 chaser,tank` zeigt sie im echten Spielbild. Ein vierter Wert setzt einen Boss, ein fünfter die Station.
  - Beide Bilder ansehen, bevor etwas als fertig gilt.
- **Rückfall:** Fehlt ein Eintrag in `PX_HERO`, `PX_ENEMY`, `PX_BOSS` oder `PX_PROJ`, zeichnet das Spiel die alte Figur aus `sprites.js`. Nichts Altes löschen, solange nicht alles ersetzt ist.

## Größen

| Art | Raster (B×H) | Hinweis |
|---|---|---|
| Held | 14–16 × 18–20 | `ay` ≈ halbe Höhe; `hand:[x,y]` ist der Punkt, an dem die Waffe sitzt |
| Waffe in der Hand | 8–14 × 4–7 | Anker = Griff; zeigt nach rechts, wird in Zielrichtung gedreht und unten/oben gespiegelt |
| Gegner | Breite ≈ `r` (ETYPES) × 1,1 | r 7 → 8–10, r 13 → 14–16, r 20 → 22–24. Elite und Teilungen skaliert das Spiel selbst |
| Boss | 36–56 | r 36 → ~40, r 42–44 → ~48; Teile (Segmente, Arme, Masken) als eigene Figuren |
| Geschoss | 4–12 | `r0` = Trefferradius, für den das Bild gezeichnet ist; `round:true` = nicht drehen |
| Boden-/Wandkachel | 16 × 16 | `halo:false`; siehe KARTEN-VORBILDER.md |

## Zeichenregeln

1. **Erst die Silhouette:** Die Figur muss als schwarzer Fleck erkennbar sein (Haltung, Waffe, Kopfform). Der Blitz-Bogen zeigt das.
2. **Licht von oben links:** Je Material drei Töne (Schatten, Grundton, Licht), etwa Stoff `1/2/3`, Blut `r/R/b`, Holz `w/W/l`, Stahl `s/S/t`. Kein Rauschen aus Einzelpunkten.
3. **Ein Blickfang je Figur:** Ein heller Punkt zieht das Auge, zum Beispiel ein rotes Auge (`B`), eine Kerzenflamme (`k`) oder eine Klinge (`t`). Mehr als zwei grelle Punkte machen die Figur unruhig.
4. **Gegner tragen ihre ETYPES-Farbe als Grundton.** Spieler lernen die Farben, die Figur bleibt im Gewimmel erkennbar.
5. **Dunkel, aber nicht schwarz:**
   - Die Böden sind sehr dunkel (`#120f12` bis `#1c1210`).
   - Große Flächen in `0` oder `1` verschwinden darauf. Grundtöne für Körper sind ab `2`, bei Gegnern besser deutlich heller.
6. **Bildfolgen:**
   - Gegner haben `walk` mit 2–4 Bildern; in jedem Bild ändern sich Beine oder Flügel und der Körper hebt sich um 1 Punkt.
   - Helden haben `idle` mit 2 Bildern (Atmen, 1 Punkt) und `walk` mit 2 Bildern.
   - Bosse haben `idle` mit 2 Bildern, dazu, wenn das Muster es zeigt, einen Angriffs- oder Ladezustand.
7. **Keine Schrift, keine Zahlen, keine Logos.** Kreuze, Dornen, Schädel, Nägel, Kerzen und Weihrauch sind die Bildsprache.

## Bosse

```js
PX_BOSS.maggot={ sprites:{ head:{…}, seg:{…} }, draw(g,e,white,t){ /* g steht auf e.x/e.y; nur pxDraw(g,this.sprites.x,…) und einfache Effekte */ } }
```

- **Zustände:** `draw` liest den Zustand aus `e` (`e.spin`, `e.charging`, `e.shieldT`, `e.hp/e.maxHp`, `e.atkCd` …). Die Muster in `BOSS_AI` werden nicht verändert.
- **Treffer-Blitz:** `white` ist wahr beim Treffer-Blitz und gehört an jedes `pxDraw` (`{white}`).
- **Effekte:** Leuchten und Ringe bleiben erlaubt (Canvas-Kreise, `globalAlpha`), aber sparsam. Die Figur selbst ist Pixelkunst.
