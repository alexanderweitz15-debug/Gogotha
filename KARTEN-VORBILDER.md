# Karten: Vorbilder und Vorschlag je Region

Entscheidung: Die Räume bleiben (eine Station = ein Raum, Vorlagen in `js/map.js`), werden aber besser gestaltet. Die Kollision bleibt bei den Kreisketten in `obstacles`. Prüfung (`mapCheck`), Wegraster und Grobraster bleiben unverändert.

## Was die Vorbilder lehren

Quellen sind Suchergebnisse und Artikel. Einige Seiten waren aus dieser Umgebung nicht direkt abrufbar, deshalb steht hier nur, was in den Zusammenfassungen belegt ist.

**Enter the Gungeon**
- Räume sind von Hand gebaut und einzeln getestet. Das Spiel setzt sie nur prozedural zusammen.
- Je Etage gibt es eine Handvoll Ablauf-Muster („flows“).
- Der Bossraum liegt weit vom Start. Truhen liegen hinter Schleifen.
- Lehre für uns: lieber mehr kleine, durchdachte Vorlagen je Region als ein großer Zufallsgenerator.
- Quellen:
  - https://en.wikipedia.org/wiki/Enter_the_Gungeon
  - https://www.boristhebrave.com/2019/07/28/dungeon-generation-in-enter-the-gungeon
  - https://80.lv/articles/studying-dungeon-generation-in-enter-the-gungeon/

**Hades**
- Ein Raum heißt: eintreten, Wellen bekämpfen, Belohnung wählen. Die Belohnung ist vor dem Betreten sichtbar.
- Die Kampfräume sind Arenen beziehungsweise „Kessel“. Die runde Bossarena hält den Boss immer im Blick.
- Lehre für uns: Jeder Raumtyp braucht eine erkennbare Form, und Bossarenen bekommen eine eigene Form statt „leer mit Eckdeko“.
- Quellen:
  - https://itch.io/blog/772262/blog-post-1-exploring-the-core-systems-and-loops-in-hades
  - https://www.gamedeveloper.com/design/the-door-problem-of-combat-design
  - https://criticalvideogamestudies.com/?p=2994

**The Binding of Isaac**
- Räume bestehen aus einem Raster aus Objekten, Gegnern und Wänden.
- Hindernisse blockieren Wege, manche schaden oder bremsen. Wie oft welche vorkommen, hängt von der Etage ab.
- Lehre für uns: Die Gefahren der Region gehören in die Raumvorlage (fester Stacheldraht, Gruben, Blutrinnen), nicht nur als Zufallszonen.
- Quellen:
  - https://bindingofisaacrebirth.wiki.gg/wiki/Talk:Level_Generation
  - https://bindingofisaacrebirth.wiki.gg/fr/wiki/Obstacles

**Blasphemous**
- „Puristische“ Pixelkunst mit spanisch-gotischer Architektur und Ikonografie.
- Kachelsätze entstehen aus Entwurfsbildern. Gotische 16×16-Sätze arbeiten mit fester Palette und ohne Kantenglättung.
- Lehre für uns: 16×16-Kacheln aus `PX_PAL`, wenige wiederkehrende Motive je Region.
- Quellen:
  - https://www.hollywoodreporter.com/heat-vision/blasphemous-designer-purist-approach-games-pixel-art-style-1238370
  - https://csaf.itch.io/verdant-06-gothic

## Regeln für alle Regionen

1. **Boden aus Kacheln:**
   - Der Boden besteht aus 16×16-Pixelkacheln (`PX_TILE`, 32 Spielpixel), dazu 3–4 Varianten und seltene Zierkacheln (Riss, Blutfleck, Gitter).
   - Die Kacheln werden einmal in das vorhandene Bodenbild (`MAP.floor`) gebacken; keine Kosten pro Bild.
2. **Wände und Deckung:**
   - Wände und Deckung werden pixelig gezeichnet, behalten aber die Kreisketten als Kollision.
   - Die Optik darf über die Kreise hinausragen, höchstens um 4 Spielpixel. Sonst wirkt Deckung durchlässig.
3. **Wiedererkennbares Merkmal:**
   - Jede Vorlage hat ein Merkmal, an dem man den Raumtyp sofort erkennt (Altar, Kanzel, Operationstisch, Fleischerhaken-Schiene, Kreuzhügel).
   - Statt 3 Vorlagen je Region gibt es 4–5, weil die Abwechslung aus mehr Vorlagen kommt, nicht aus mehr Zufall.
4. **Bossarena mit eigener Form je Region:**
   - Ring aus Pfeilern, Grubenrand, Kreuzkreis oder Ähnliches.
   - Die Mitte bleibt frei, der Boss bleibt immer sichtbar.
5. **Kontrast:**
   - Der Boden bleibt dunkel und ruhig (wenige helle Punkte). Wände sind 1–2 Stufen heller als der Boden.
   - Figuren müssen davor klar herausstechen. Mit `tools/px-shot.js` prüfen.
6. **Licht:** Kerzen, Glut und Lampen bleiben die vorhandenen Lichtpunkte (`MAP.lights`), die Kacheln selbst leuchten nicht.

## Vorschlag je Region

| Region | Boden | Wände und Deckung | Merkmale (neue oder bessere Vorlagen) | Bossarena |
|---|---|---|---|---|
| **Die Gräben** | Schlamm mit Pfützen, Laufroste aus Holz, Patronenhülsen | Sandsäcke, Holzverschalung, Stacheldrahtrollen als feste Hindernisse | Grabenkreuzung mit Unterstand; Granattrichter (Ring aus Erdwall); Niemandsland mit verkeiltem Stacheldraht | Granattrichter: Erdwall-Ring mit 4 Lücken |
| **Die Katakomben** | Steinplatten, Knochenstaub, Grabplatten mit Kreuz | Pfeiler, Schädelwände (Ossuarium), Sarkophage | Ossuarium-Halle mit Knochennischen; Krypta mit Sarkophag-Reihe; Kapelle mit Altar und Kerzen | Pfeilerring mit Altar am oberen Rand |
| **Das Lazarett** | Fliesen im Schachbrett, Abflussrinnen, Blutspuren | Betten, Paravents, Schränke, Operationstische | Krankensaal (Bettreihen); Operationssaal (Tisch und Lampenkreis); Leichenkammer (Bahrenreihen) | Operationstheater: Halbrund aus Schränken |
| **Der Schlachthof** | rote Fliesen, Gitterroste, Blutrinnen | Hakenschienen, Schlachtbänke, Fässer | Kühlhaus (Hakenreihen); Schlachtgang (Bänke mit Rinne); Kesselraum | Grube: Rinnenring um eine freie Mitte |
| **Golgotha** | Fels, Asche, Glutrisse | Felsen, Kreuze, Totenschädel-Hügel | Kreuzhügel (drei Kreuze); Schädelfeld; Pilgerpfad mit Steinkreisen | Gipfel: Ring aus Kreuzen um eine Felsplatte |

## Umsetzung (Agent D)

- **Kacheln:** `PX_TILE` in `js/px-tiles.js`, je Region `floor:[3–4 Kacheln]`, `deco:[2–4]`, `wall:{…}` je Hindernisstil.
- **map.js:**
  - Das Bodenbild aus den Kacheln backen (statt Rauschen und Flecken).
  - `MAP_STYLE` je Stil pixelig zeichnen.
  - Je Region 1–2 neue Vorlagen und eine eigene Bossarena.
  - Prüfung, Flutung, Bins und Wegraster bleiben, wie sie sind.
- **Prüfen:**
  - `node tools/px-shot.js bild.png 0 chaser,tank '' <Station>` für Station 3, 13, 23, 33, 43 und je eine Bossstation (5, 15, 25, 35, 45).
  - Danach den Bot-Lauf: Der Anteil der Stationen, die die Prüfung beim ersten Versuch bestehen, darf nicht sinken.
