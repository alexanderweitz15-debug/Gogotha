# GOLGOTHA – Waffen, Gaben, Boni: bereinigter Plan

Stand: 08.10.2026. Grundlage ist die Ideensammlung „Waffen, Items, Boni“, abgeglichen mit dem tatsächlichen Code (`game.js`, Commit `8422146`).
Dopplungen sind gestrichen. Ideen, die Werte voraussetzen, die es nicht gibt, sind gestrichen oder als eigener Umbau ausgewiesen.
Jede verbleibende Idee ist an Funktionen im Code gebunden und hat eine Aufwandsschätzung.

**Aufwand:** S = bis ca. 30 Zeilen, M = 30–150 Zeilen, L = mehr als 150 Zeilen oder neues System. Das sind Schätzungen, nicht gemessen.
**Zahlen:** Alle Werte sind Startwerte zum Testen.

---

## 0. Vier Entscheidungen

**Entschieden am 08.10.2026: Die Empfehlung wird in allen vier Punkten übernommen.**

| # | Frage | Meine Empfehlung | Warum |
|---|---|---|---|
| E1 | Seelenschmiede gibt bis +100 % Schaden/Leben dauerhaft. Behalten? | Schaden und Leben auf 5 Stufen (+25 %) deckeln, Gold/XP/Tempo/Feuerrate lassen | Mit +100 % ist jede Schwierigkeitsstufe nach 30 Läufen eine andere. Balancing wird Raten. |
| E2 | Zielsuchende Geschosse wurden bewusst entfernt (`game.js:991`). Bleibt das so? | Ja | Psalter und „Gelenkte Hand“ fallen dann weg. Kein Verlust. |
| E3 | Nahkampfwaffen (Bogen-Hitboxen) einbauen? | Nicht jetzt | Neues Angriffssystem (L). Erst wenn die Systeme unten stehen und sich Fernkampf-Builds zu ähnlich anfühlen. |
| E4 | Flüche bleiben zufällig beim Laufstart? | Zur Wahl machen: Fluch wird angeboten, Spieler nimmt an oder lehnt ab | Ein Risiko, das man nicht wählt, ist keine Entscheidung. Aufwand S. |

---

## 1. Was der Code schon hat (Kurzinventar)

| Bereich | Bestand |
|---|---|
| Waffen | 38, davon 28 im Shop, 5 Verschmelzungen (2 Waffen ≥ St. 5 → 1 Waffe), 5 Boss-Waffen. Alle automatisch zielend, keine Nahkampfwaffe. |
| Waffen-Effekte | Feste Schalter pro Geschoss: `burn`, `slow`, `chain` (2 Sprünge, 140 px), `explosive` (60 px), `puddle`, `beam`, `ramp`, `deploy` |
| Charakter-Upgrades | 16 Karten über Stufenaufstieg, 8 Seltenheiten |
| Fähigkeiten | 16 + 3 Verschmelzungen, auf Stufe 10/20/30/40/50 |
| Flüche | 7 (Blutpakt, Sünde aus Glas, Ruf der Verdammten, Verbotenes Wissen, Eiserne Gier, Märtyrertum, Rücksichtslose Wut) |
| Spielerwerte | Leben, Schild, Rüstung, Tempo, Schaden, Feuerrate, Krit, Krit-Schaden, Durchschlag, Mehrschuss, Projektiltempo/-größe, Rückstoß, Lebensraub (fest pro Kill), Dornen, Glück, Gold-/XP-Multiplikator |
| **Nicht vorhanden** | Reichweite, Sichtweite, Lebensregeneration, Sammelradius (fest: 105/80 px), Ausweich-Chance, Betäubung, Gift auf Gegnern, Item-Kauf, Item-Verkauf, Boss-Belohnung |

---

## 2. Gestrichen

| Idee | Grund |
|---|---|
| Union (Weihrauchfass + Kerzenleuchter) | Die Verschmelzung existiert genau so |
| Pakt des Blutes / des Glases / der Eile | = Blutpakt / Sünde aus Glas / Rücksichtslose Wut |
| Pakt der Finsternis, Schnabelmaske, Fackel des Wächters | Brauchen Sichtweite |
| Segen-Seltenheiten (6.1) | 8 Seltenheiten gibt es schon |
| Dornenkrone (Waffe) | Name belegt (Upgrade), Effekt ≈ Fähigkeit „Wächterklingen“ |
| Rosenkranz, Büßerkette | ≈ Heiliger Reigen / Wächterklingen |
| Knochenflöte, Totenlaterne | ≈ Höllenbrut (Begleiter) |
| Kerzenleuchter, Scheiterhaufen, Glockenklöppel | ≈ Geschützturm, Totem der Qual, Zornnova |
| Kettenblitz-Reliquie | Kettenblitz gibt es; wird Klassenbonus „Blitz“ (Abschnitt 4) |
| Zwillingssiegel, Wetzstein | ≈ Vielfache Sünde / Salve, Durchschlag |
| Letzte Ölung, Dritter Tag | ≈ Wiedergänger |
| Märtyrerblut-Set, Opfermesser | ≈ Raserei + Fluch Märtyrertum |
| Silberner Kelch | ≈ Aegis |
| Kreuznägel, Armbrust des Inquisitors | ≈ Nagelkanzel, Schienennagel, Geißelbogen |
| Psalter, Gelenkte Hand | Zielsuche (E2) |
| Hehlerware | Kein Verkauf im Spiel |
| Leichentuch, Stundenglas | Gegner-KI bzw. neue Taste nötig, wenig Nutzen pro Aufwand |
| Alle 7 Nahkampfwaffen + Wandlungen dazu | E3 |
| Set-Verwandlungen (6.3) | Erst sinnvoll, wenn es genug Gaben gibt; später |
| Koop-Items | Koop hat noch Bug 9 (Effekte gehören Spieler 1) |
| Waffenklasse „Fernkampf“ | Jede Waffe ist Fernkampf, die Klasse wäre immer voll |

---

## 3. Fundament (vor jedem neuen Inhalt)

### 3.1 Bugs aus `IST-ZUSTAND.md` beheben — S je Punkt
Punkte 1, 2, 5, 6, 8. Ohne korrekte Statistik sind Freischaltungen und das Messwerkzeug wertlos.

### 3.2 Debug-Overlay „Schaden pro Quelle“ — M
- `damageEnemy(e,dmg,ang,kb,fromBullet)` bekommt einen Parameter `src`.
- Gezählt wird nur echter Schaden: `min(dmg, e.hp vorher)`, sonst zählen Overkills auf sterbende Gegner.
- Quellen: Waffen-ID, `orbit`, `nova`, `aura`, `burn`, `puddle`, `thorns`, `chain`, `explode`, `exec`.
  Heute ziehen `burn` (`game.js:824`), Aura (`game.js:756`) und Pfützen (`game.js:1053`) Leben direkt ab, an `damageEnemy` vorbei. Das muss zuerst über `damageEnemy` laufen.
- Anzeige mit F3: Tabelle mit Quelle, Schaden, Anteil %, DPS (Schaden / `G.time`), Kills.
- Am Laufende den Datensatz in `localStorage` (`golgotha_balance`, letzte 50 Läufe) ablegen, mit Knopf „als JSON kopieren“.
- **Regel:** Mehr als 40 % des Gesamtschadens über 20 Läufe = zu stark. Wird in 20 Läufen nie gewählt = zu schwach oder unverständlich.

### 3.3 Geschosse bekommen Besitzer und Effektliste — M
Heute: Ein Geschoss hat feste Schalter, und Kill-Effekte lesen die globale Variable `player`.
Das ist auch die Ursache von Koop-Bug 9.

Umbau:
```js
bullet = { ..., owner: p, depth: 0, fx: ['burn','chain', ...] }

const BULLET_FX = {
  burn:    { hit(b,e){...} },
  slow:    { hit(b,e){...} },
  explode: { hit(b,e){...} },       // heute explodeBullet()
  chain:   { hit(b,e){...} },       // heute chainLightning()
  puddle:  { hit(b,e){...} },
  // neu, Abschnitt 5:
  ricochet:{ wall(b,ob){...} },
  ghost:   { obstacle(b,ob){ return 'ignore'; } },
  split:   { hit(b,e){...} },
  pitch:   { hit(b,e){...}, expire(b){...} },
  falloff: { dmg(b,d){...} },
};
```
- `fx` wird beim Abfeuern aus Waffe + Spieler zusammengesetzt (`fireWeapon`, `deployShoot`).
- Hooks: `fly`, `dmg` (Schaden ändern), `hit`, `wall`, `obstacle`, `expire`.
- Lebensraub, Hinrichtung und Waffen-Kills laufen über `b.owner` statt `player`.
- **Bremse für Ketten (`depth`):** Ein Treffer mit `depth` 0 löst Effekte voll aus. Bei `depth` 1 lösen Auslöser-Gaben nur mit 20 % ihrer Chance aus. Ab `depth` 2 wird nichts mehr ausgelöst. Splitter, Ketten und Explosionen erhöhen `depth` um 1.
- **Abnahme:** Mit den alten Waffen spielt sich alles gleich. Prüfen über das Overlay: Verteilung vor/nach dem Umbau über je 5 Läufe vergleichen.

---

## 4. Waffenklassen — M

Jede Waffe bekommt 1–2 Klassen (`cls:[...]` im `WEAPONS`-Eintrag).
Mit 5 Slots gibt es Stufen bei 2/3/4/5 Waffen derselben Klasse.
Alle Boni greifen in vorhandene Werte, es braucht keine neuen Spielerwerte.

### 4.1 Boni

| Klasse | 2 / 3 / 4 / 5 Waffen | Nachteil | Greift in |
|---|---|---|---|
| **Pulver** | Feuerrate +5 / 10 / 15 / 25 % | Streuung +10 / 20 / 30 / 40 % | `fireWeapon`: `w.fr`, `w.spread` |
| **Eisen** | Durchschlag +1 / 1 / 2 / 3, Rückstoß +10 / 20 / 30 / 40 % | – | `pierce`, `kb` |
| **Feuer** | Brand +0,5 / 1 / 1,5 / 2,5 s, Brandschaden +0 / 10 / 20 / 40 % | – | `e.burnT`, `e.burnDmg` |
| **Seuche** | Pfützen +25 / 50 / 75 / 120 % Dauer, ab 4: +30 % Radius | – | `spawnPuddle` |
| **Frost** | Verlangsamung 55 → 60 / 65 / 70 / 75 %, Dauer +0,3 / 0,6 / 0,9 / 1,4 s | – | `e.slowT`, Faktor `0.45` in `updateEnemy` |
| **Blitz** | Kettensprünge 2 → 3 / 3 / 4 / 5, Reichweite +0 / 20 / 40 / 60 px | – | `chainLightning` |
| **Heilig** | +10 / 20 / 30 / 45 % Schaden gegen Bosse und Elite | −5 / 10 / 15 / 20 % gegen normale Gegner | Faktor in `damageEnemy` |
| **Konstrukt** | Lebensdauer +15 / 30 / 45 / 70 %, bei 3 und 5 je +1 Maximum | – | `deployLife`, `deployMax` |

### 4.2 Einordnung aller 38 Waffen

| Waffe | Klassen | Waffe | Klassen |
|---|---|---|---|
| Rostiger Revolver | Pulver | Jüngstes Gericht | Heilig |
| Schädelbrecher | Pulver | Sturm der Engel | Blitz |
| Hexenfeuer | Seuche | Apokalypse | Feuer |
| Nagelkanzel | Pulver, Eisen | Schlund der Leere | Eisen |
| Donnerbüchse | Pulver | Hand Gottes | Heilig, Blitz |
| Geißelbogen | Eisen | Geschützturm | Konstrukt, Pulver |
| Läuterungsflamme | Feuer | Totem der Qual | Konstrukt, Feuer |
| Seuchenmörser | Seuche | Minenleger | Konstrukt, Pulver |
| Dreifaltigkeit | Heilig | Höllenbrut | Konstrukt |
| Zorn des Heiligen | Blitz, Heilig | Läuterungsstrahl | Feuer |
| Weihrauch-Gatling | Pulver | Schienennagel | Eisen |
| Heilige Lanze | Heilig, Eisen | Sturmrufer | Blitz |
| Splittersturm | Frost | *Seuchenschlund (Evo)* | Seuche, Feuer |
| Frostpike | Frost, Eisen | *Vergeltung (Evo)* | Blitz, Eisen |
| Sensenwurf | Eisen | *Höllenhexe (Evo)* | Feuer, Seuche |
| Seraphsalve | Heilig | *Sturmnagler (Evo)* | Eisen, Frost |
| *Götterzorn (Evo)* | Heilig, Blitz | *Predigtkreis (Boss)* | Heilig |
| *Madenbrut (Boss)* | Seuche | *Skalpellfächer (Boss)* | Frost, Eisen |
| *Wollgeißel (Boss)* | Eisen | *Kreuzsalve (Boss)* | Heilig |

**Waffen pro Klasse im Shop:** Pulver 7, Eisen 7, Heilig 6, Feuer 4, Blitz 4, Konstrukt 4, **Seuche 2, Frost 2**.
Seuche und Frost lassen sich mit Shop-Waffen nicht über Stufe 2 bringen. **Deshalb gehen die neuen Waffen (Abschnitt 6) gezielt dorthin**, nicht in beliebige Richtungen.

### 4.3 Shop und Anzeige
- In `rollShop`: Mit 25 % Chance pro Angebot wird der Pool auf Waffen beschränkt, die eine Klasse mit einer getragenen Waffe teilen (falls der eingeschränkte Pool leer ist, normal würfeln).
- Shopkarte: Klassen-Symbole und Fortschritt, z. B. „Feuer 2 → 3 / 5“.
- Waffenleiste im HUD: aktive Klassenstufen als kleine Plaketten.
- Werte-Panel (`fillStats`): aktive Klassenboni im Klartext.

---

## 5. Geschoss-Modifikatoren — S je Modifikator (nach 3.3)

Sie kommen als **Gaben in den Upgrade-Pool** (`UPGRADE_DEFS`), jeweils höchstens 1-mal pro Lauf.
Dafür braucht `rollUpgrades` eine Sperre für schon genommene Karten (`max:1`, gezählt in `player.taken`).
Ein eigener Item-Shop ist dafür nicht nötig.

| Name | Ab Seltenheit | Effekt | Hook |
|---|---|---|---|
| **Querschläger** | Selten | Geschosse prallen 1-mal von Raumrand und Hindernissen ab (Spiegelung an der Normalen) | `wall`, `obstacle` |
| **Geisterhand** | Selten | Geschosse fliegen durch Hindernisse, −15 % Schaden | `obstacle`, `dmg` |
| **Splitterknochen** | Episch | Beim Treffer 3 Splitter (je 30 % Schaden, ±35°, 0,35 s Flugzeit, kein Durchschlag). Splitter erben Brand/Frost, nicht Explosion | `hit` |
| **Pechfass** | Ungewöhnlich | Einschlag hinterlässt Brandpfütze (25 % Schaden/s, 1,5 s). Höchstens 1 Pfütze pro Waffe alle 0,2 s | `hit`, `expire` |
| **Schwere Kugeln** | Selten | Größe +40 %, Tempo −25 %; Schaden nach Flugstrecke: +60 % bei 0 px bis −30 % ab 600 px | `fly`, `dmg` |

Kombinationen, die von selbst entstehen: Splitterknochen + Feuer-Klasse ergibt Flächenbrand, Querschläger + Eisen ergibt Abpraller mit Durchschlag in engen Räumen.
Das Overlay zeigt, ob eine davon kippt.

---

## 6. Neue Waffen (erste Welle: 6) — M gesamt

Voraussetzung: **Gift als Gegner-Status** (S), analog zu `burnT`: `e.poisonT`, `e.poisonDps`, stapelbar bis 3-fach (Seuche-Bonus erhöht das Maximum).

| Name | Klassen | Seltenheit | Verhalten | Technik |
|---|---|---|---|---|
| **Pestflasche** | Seuche | Gewöhnlich | Wurf auf das Ziel, Giftwolke 2,5 s. Stirbt ein vergifteter Gegner, springt das Gift auf den nächsten Nachbarn (1-mal) | Geschoss mit `lob` wie bei der Pestbeule, Pfütze mit `effect:'poison'` |
| **Rattenkäfig** | Seuche, Konstrukt | Selten | Setzt 3 Ratten frei, die 5 s lang Gegner anlaufen und vergiften | `deploy:'companion'`, Ziel = nächster Gegner statt Kreisbahn |
| **Eisige Litanei** | Frost | Ungewöhnlich | 8 Splitter im Vollkreis um dich, verlangsamen | `count:8`, `spread:π`, `pattern:'even'` – nur Daten |
| **Gefrorene Tränen** | Frost | Selten | Wirft Frostpfützen, Gegner darin stark verlangsamt | Pfütze mit `effect:'chill'` |
| **Brandpfeil** | Feuer | Gewöhnlich | Normaler Schuss, entzündet. Brennende Gegner stecken beim Tod 1 Nachbarn an | Kill-Hook in `killEnemy` |
| **Schädelschleuder** | Eisen | Ungewöhnlich | Prallt 2-mal zwischen Gegnern ab (neues Ziel im Umkreis 160 px) | neuer `fx: 'bounce'` |

Danach im Shop: Seuche 4, Frost 4, Feuer 5, Eisen 8, Konstrukt 5. Alle Klassen sind dann bis Stufe 4 erreichbar.

---

## 7. Tausch-Gaben — M gesamt

Sie gehen in den Upgrade-Pool, Kennzeichen `trade:true`. Die Karte zeigt das Minus in Rot.
Pro Upgrade-Wahl ist höchstens 1 von 3 Karten eine Tausch-Gabe (25 % Chance).
Nur Werte, die existieren, plus zwei neue kleine Werte (Sammelradius, Preisfaktor), je S.

| Name | Plus | Minus | Neuer Wert nötig |
|---|---|---|---|
| Bußgürtel | +15 % Schaden | −10 Max-Leben | – |
| Bleischuhe | +5 Rüstung | −12 % Tempo | – |
| Pilgerstab | +10 % Tempo | −3 Rüstung | – |
| Rostige Kette | +30 % Rückstoß | −8 % Feuerrate | – |
| Totenschädel | +1 % Schaden je 25 Kills im Lauf (max. 40 %) | −10 Max-Leben | – |
| Schwarze Kapuze | +10 % Krit | −20 % Sammelradius | Sammelradius |
| Almosenbeutel | +30 % Sammelradius | −5 % Schaden | Sammelradius |
| Ablassbrief | +25 % Gold | Shop-Preise +10 % | Preisfaktor |

---

## 8. Boss-Reliquien — M

Nach jeder Boss-Station kommt ein neuer Schritt in `postQueue`: **„Reliquie“, 1 aus 3**.
Reliquien sind einzigartig (jede nur einmal pro Lauf). Hier landen die Auslöser- und Einzigartig-Ideen.
Auslöser beachten die `depth`-Bremse aus 3.3.

| Name | Typ | Effekt | Technik |
|---|---|---|---|
| Hammer des Zimmermanns | Bei Treffer, 10 % | +50 % Bonusschaden, Gegner 0,5 s festgenagelt | neuer Wert `e.rootT` (S) |
| Totenglocke | Bei Kill | Schallwelle (90 px) mit 30 % des Overkill-Schadens | Overkill = `-e.hp` nach Treffer |
| Aschenurne | Bei Kill eines brennenden Gegners | Explosion 60 px, 40 % des letzten Treffers | `killEnemy`: `e.burnT>0` |
| Krähenfeder | Bei Krit | Nächster Schuss derselben Waffe +2 Durchschlag | Merker pro Waffe |
| Märtyrerblut | Bei erlittenem Schaden | 2 s lang +30 % Schaden | `hurtPlayer` |
| Beichtstuhl | Welle ohne Treffer | +5 Gold, +2 Max-Leben | Merker in `hurtPlayer`, Auswertung in `onCleared` |
| Lanze des Wächters | Passiv | Bosse starten mit −10 % Leben | `spawnBoss` |
| Würfel des Soldaten | Passiv | Erster Reroll pro Shop gratis | `#shopReroll` |
| Opferstock | Passiv | Am Wellenende +5 % Zinsen auf Gold, max. 20 pro Welle | `onCleared` |
| Schlüssel des Türhüters | Passiv | 4. verdecktes Shop-Angebot zum halben Preis | `rollShop`, `renderShop` |

**Verschmelzung mit Reliquie (S):** Die vorhandene Verschmelzung bekommt eine zweite Rezeptform `{a: waffe, relic: id}`.
Sie erscheint im Shop wie heute als Karte „Verschmelzung“, wenn die Waffe Stufe 10 hat und die Reliquie im Besitz ist. Das ist kein zweites System.

| Waffe St. 10 | + Reliquie | → | Effekt |
|---|---|---|---|
| Pestflasche | Aschenurne | **Schwarzer Tod** | Gift springt unbegrenzt weiter (mit `depth`-Bremse) |
| Schädelschleuder | Krähenfeder | **Knochenhagel** | 4 Abpraller, jeder Abpraller +15 % Schaden |
| Brandpfeil | Totenglocke | **Scheiterhaufen-Salve** | 3 Pfeile, Ansteckung auf 2 Nachbarn |

---

## 9. Fluch-Wahl und zwei neue Pakte — S

- Laufstart: Statt den Fluch zufällig zu verhängen, wird er angeboten (annehmen = Fluch + ×1,35 Beute wie heute, ablehnen = normaler Lauf). Siehe E4.
- Zwei neue Einträge in `CURSE_DEFS`:
  - **Pakt der Gier:** doppeltes Gold, Gegner +30 % Leben.
  - **Pakt des Schweigens:** +1 Waffenslot (`WEAPON_CAP` pro Spieler), Shop nur nach jeder zweiten Welle.

---

## 10. Schreine — M

Auf Nicht-Boss-Stationen erscheint mit 35 % Chance ein Schrein. Aktiviert wird er, indem man 1,5 s darin steht (Ring füllt sich), es braucht keine neue Taste.

| Schrein | Effekt |
|---|---|
| Blutschrein | −10 Max-Leben, dafür sofort eine Boss-Reliquie (1 aus 3) |
| Schrein der Gier | Alle lebenden Gegner +50 % Leben, Gold dieser Welle ×2 |

Später (je M): Schrein des Vergessens (Waffe opfern, Rest +1 Stufe; braucht Auswahlfenster), Beinhaus (Skelett-Verbündete; braucht verbündete Nahkämpfer).

---

## 11. Profile für die 12 Zusatz-Charaktere — M (größtenteils Daten)

Heute haben sie keinen eigenen Fähigkeiten-Pool (Fallback auf den Büßer, `game.js:1347`).
Jede Figur bekommt einen Pool aus vorhandenen Fähigkeiten und eine **Klassen-Affinität**: Die Klasse zählt eine Waffe mehr.
Das kostet nach Abschnitt 4 fast nichts und gibt jeder Figur eine Richtung.

| Figur | Startwaffe | Affinität | Nachteil | Fähigkeiten-Pool |
|---|---|---|---|---|
| Kreuzritter | Donnerbüchse | Pulver | – | aegis, frenzy, juggernaut, nova, exec, guardianorbit, thornmantle, revenant |
| Flagellant | Nagelkanzel | Eisen | Heilung −30 % | frenzy, bloodlust, thornmantle, critstorm, volley, overload, aegis, exec |
| Inquisitor | Geißelbogen | Heilig | – | exec, soulharvest, critstorm, inferno, nova, volley, overload |
| Märtyrerin | Heilige Lanze | Heilig | Max-Leben −15 % | frenzy, aegis, revenant, bloodlust, critstorm, orbital, nova, overload |
| Geheiligter | Zorn des Heiligen | Blitz | – | orbital, nova, overload, critstorm, volley, inferno, aegis, guardianorbit |
| Revolverheld | Dreifaltigkeit | Pulver | – | volley, critstorm, overload, frenzy, aegis, bloodlust, exec |
| Scheiterhexe | Läuterungsflamme | Feuer | – | inferno, plagueaura, nova, orbital, frenzy, soulharvest, exec |
| Predigt-Echo | Predigtkreis | Heilig | – | nova, orbital, guardianorbit, aegis, exec, soulharvest, overload |
| Madenfürst | Madenbrut | Seuche | – | plagueaura, soulharvest, exec, juggernaut, inferno, bloodlust, nova |
| Chirurgen-Schemen | Skalpellfächer | Frost | – | critstorm, exec, soulharvest, volley, frenzy, aegis |
| Schlachtlamm | Wollgeißel | Eisen | – | frenzy, aegis, bloodlust, volley, critstorm, orbital, nova, revenant |
| Gekreuzigtes Echo | Kreuzsalve | Heilig | – | revenant, aegis, frenzy, nova, orbital, juggernaut, guardianorbit, overload |

Jeder Pool enthält mindestens ein Paar für eine Fähigkeits-Verschmelzung (orbital+nova, aegis+frenzy oder exec+soulharvest).

### 11.1 Ausbau zu Brotato-Profilen (09.10.2026, umgesetzt)

Die Affinität allein war zu schwach, um eine Figur anders spielen zu lassen. Jetzt hat jede der 16 Figuren eine Spielweise mit Stärke und Schwäche,
sichtbar auf der Karte (grün/rot) und im Werte-Panel. Daten in `CHAR_PROFILE` (`js/data.js`), Auswertung in `charDmgMul`, `charCdMul`, `charShots`, `charHitMul`.
Die Shop-Neigung bietet zusätzlich die Klassen an, die die Figur mag.

| Figur | Stärke | Schwäche |
|---|---|---|
| Büßer | +6 % Schaden je verschiedener Waffenklasse | – |
| Henker | +35 % Schaden auf nahe Gegner (< 170 px) | −25 % auf große Entfernung (> 320 px) |
| Ketzerin | Feuer/Seuche/Frost/Blitz +25 % | Pulver/Eisen −30 % |
| Pestpriester | Seuche +25 %, Pfützen/Wolken +50 % Dauer | Pulver −20 % |
| Kreuzritter | Pulver +20 %, Rückstoß +50 % | andere Waffen feuern 10 % langsamer |
| Flagellant | Eisen +20 %, +0,6 % Schaden je 1 % fehlender LP | Heilung −30 % |
| Inquisitor (Start jetzt Dreifaltigkeit) | Heilig +25 %, +30 % gegen Elite/Bosse | nur 4 Waffenplätze |
| Märtyrerin | unter 50 % LP +35 % Schaden und Feuerrate | Max-LP −15 % |
| Geheiligter | Blitz +30 %, Kettenblitz +1 Sprung | alle anderen −20 % |
| Revolverheld (Start jetzt Revolver) | Pulver +1 Geschoss, 10 % schneller | alle anderen −25 % |
| Scheiterhexe | Feuer +25 %, Brand +1 s, brennende Gegner +20 % Schaden | Frost −50 % |
| Predigt-Echo | Waffen mit 3+ Geschossen +1 Geschoss | −15 % Schaden |
| Madenfürst | Seuche +20 %, +2 LP/s in eigenen Pfützen | langsam |
| Chirurgen-Schemen | +12 % Krit, +50 % Krit-Schaden, Krits verlangsamen | Max-LP −10 % |
| Schlachtlamm | in Bewegung +20 % | im Stehen −20 % |
| Gekreuzigtes Echo | steht einmal pro Lauf wieder auf, Heilig +15 % | Heilung −25 % |

Werte sind Startwerte; sie sind nicht in echten Läufen gemessen.

### 11.2 Gegenstände im Shop (09.10.2026, umgesetzt)

Wie in Brotato: 21 Gegenstände (`ITEMS` in `js/data.js`), zwei Angebote je Shop-Besuch in einer eigenen Reihe, **beliebig viele Käufe** –
der Besuch endet erst mit einem Waffenkauf oder „Weiter“ (Waffen bleiben bei einem Kauf pro Besuch). Stapelbar, Kelch und Waage höchstens 1×.
Preis 55 % des Waffenpreises gleicher Seltenheit; Seltenheit gewürfelt wie bei Waffen (Glück wirkt), höchstens legendär.

- Gewöhnlich: Fastenbrot, Rosenkranz, Altarkerze, Pilgersandalen, Silberling
- Ungewöhnlich: je Klasse ein Gegenstand mit +10 % Schaden für Waffen dieser Klasse (passt zu den Charakter-Boni), Kettenhemd
- Selten: Lupe des Inquisitors, Sanduhr, Blutphiole, Opferschale
- Episch: Zerbrochener Heiligenschein, Waage des Gerichts · Legendär: Blutiger Kelch

Ungemessen. Risiko: Gold war bisher knapp an Ausgaben gebunden (ein Kauf pro Besuch); mit Gegenständen wird überschüssiges Gold zu Stärke.
Wenn Läufe dadurch zu leicht werden, zuerst `itemPrice` (Faktor 0,55) anheben.

### 11.3 Bot-Messung der Schwierigkeit (10.10.2026)

`tools/bot-run.js` spielt ganze Läufe (4 Figuren × 5 feste Zufallsfolgen je Grad) und vergleicht den Stand vor dem großen Feature-Paket (`73967bb`) mit dem Stand danach.
Erste Messung: der neue Stand war deutlich schwerer (Schwer: 5 statt 14 von 20 Läufen gewonnen). Abschalt-Versuche (ohne neue Gegner / ohne Gefahren / ohne neue Karten) zeigten die Ursachen:
Golgotha durch die neuen Gegner, Katakomben durch die einstürzende Decke; die Karten nicht. Behoben bzw. entschärft:

- Treffer aus nächster Nähe: Geschosse übersprangen Gegner, die am Spieler klebten (alter Fehler; Gruftgeist 31 s → 2,6 s bis zum Tod)
- Kreuzträger war bei automatischem Zielen unverwundbar → Kreuz fängt 6 Treffer, dann 2 s Taumeln
- Einstürzende Decke: 2 Kreise, 1,7 s Vorwarnung, Schaden 10
- Fernkämpfer und Knochenwände hielten hinter Kartenwänden Abstand → Stationen endeten nie; jetzt Wegfindung um Wände

| gewonnen von 20 | vorher (alt) | neu, erste Messung | neu, nach Korrekturen |
|---|---|---|---|
| Mittel | 16 | 5 | 12 (7 Läufe hängen am ersten Boss: Bot-Schwäche mit Kurzstrecken-Waffe, im alten Stand ebenso) |
| Schwer | 14 | 5 | 17 |
| Sehr schwer | 12 | 1 | 13 |

Grenzen: Der Bot weicht besser aus als ein Mensch und spielt taktisch schlechter (kauft einfach, wählt Gaben zufällig). Er ersetzt keine echten Läufe.

---

## 12. Später, erst nach Messung

| Idee | Voraussetzung | Aufwand |
|---|---|---|
| ~~Duo-Segen~~ ✓ (09.10.) | Umgesetzt, siehe 12.2 | M |
| ~~Set-Verwandlungen~~ ✓ (09.10.) | Umgesetzt, siehe 12.3 | M |
| ~~Nahkampf als Angriffsart~~ ✓ (09.10.) | Umgesetzt, siehe 12.1 | L |
| ~~Lebensregeneration~~ ✓ (09.10.) | Umgesetzt als Weihwasserflasche + Gabe, siehe 12.4 | S |
| ~~Koop-Gaben~~ ✓ (09.10.) | Umgesetzt als Gaben, die nur im Koop erscheinen: **Verbundene Kette** (Kette zwischen beiden Spielern bis 520 px, 20+8×Seltenheit Schaden/s, stapelbar) und **Seelenband** (fällt der Gefährte, holen ihn 20 eigene Tötungen sofort mit 50 % LP zurück) | M |

### 12.1 Nahkampfwaffen (09.10.2026, umgesetzt) — `js/melee.js`

Neue Angriffsart `w.melee`: **Schwung** (Kreissektor), **Stoß** (Kapsel), **Bodenschlag** (wachsende Scheibe), **Kette** (kreisende Kugel an einer Kette).
Die Trefferzone ist genau die gezeichnete Fläche; geschwungen wird nur, wenn ein Gegner in Reichweite ist (sonst bleibt die Waffe bereit).
Treffer laufen über `damageEnemy(src = Waffe, owner)`: Henker-Nähe, Klassenboni und Klassen-Gegenstände, Krit, Lebensraub, Brand/Frost/Höllenfeuer-Gaben,
Hinrichtung, Reliquien (Hammer, Krähenfeder beim Stoß), F3-Messung und Waffen-Kills greifen. Zusatzgeschosse: breiterer Bogen / +Durchschlag / größerer Ring / mehr Kugeln;
Projektilgröße: +halbe Größe als Reichweite. Geschoss-Modifikatoren (Pechfass, Splitter …) gelten nicht (kein Geschoss).

Benchmark (`tools/balance-bench.js`, 30 s, Stufe 10, Faktor zum Median der Seltenheit). Im Einzelziel steht der Spieler in Reichweite und das Ziel wird nach Rückstoß zurückgesetzt;
in der Welle kitet der Spieler im Kreis und hängt die Verfolger ab — das benachteiligt Nahkampf, daher sind die Wellenwerte bewusst niedriger.

| Waffe | Seltenheit | Klassen | Art | Besonderheit | Welle L10 | Ziel L10 | × Welle | × Ziel |
|---|---|---|---|---|---|---|---|---|
| Geißel | gewöhnlich | Eisen | Schwung 69°, 165 px | trifft bis zu 2; jeder 3. Hieb doppelt, kostet 1 LP | 68 | 125 | 0,69 | 1,21 |
| Opfermesser | gewöhnlich | Seuche | Stoß 95 px | +1 % Schaden je 1 % fehlender LP, Gift | 43 | 143 | 0,43 | 1,39 |
| Ketzergabel | ungewöhnlich | Feuer | Stoß 140 px | durchbohrt 2, Brand, Brennende fliegen doppelt weit | 93 | 152 | 0,60 | 1,55 |
| Büßerkette | selten | Blitz, Eisen | Kette 86 px | Radius wächst mit dem Tempo, 35 % Kettenblitz je Treffer | 131 | 134 | 0,65 | 0,94 |
| Glockenklöppel | selten | Heilig | Bodenschlag 130 px | betäubt 0,5 s, Bosse nur verlangsamt | 167 | 142 | 0,82 | 1,00 |
| Henkersbeil | ultraselten | Eisen, Heilig | Schwung 149°, 130 px | richtet unter 15 % LP hin (nicht Bosse) | 475 | 289 | 0,91 | 1,41 |
| Sense des Totengräbers | episch | Frost | Schwung 180°, 150 px | verlangsamt; Kills geben Seelen, 10 Seelen heilen 6 LP | 300 | 279 | 0,88 | 1,35 |

Einzelziel 0,94–1,55, Welle 0,43–0,91 (Opfermesser mit der kürzesten Reichweite am stärksten benachteiligt). Nebenwirkung: Die Nahkampfwaffen heben die
Einzelziel-Mediane einiger Seltenheiten (gewöhnlich 87 → 103; ultraselten hat nur drei Waffen, dort sinkt Splittersturm auf 0,45). Ungemessen in echten Läufen.
`tools/weapon-audit.js` prüft je Nahkampfwaffe 14–16 Punkte: trifft vorn, nicht dahinter (Bodenschlag: rundum), Reichweite innen/außen, Trefferzone gegen die
gezeichnete Geometrie (50 zufällige Ziele, unabhängige Stichprobe), Besonderheit, Henker-Nähe (×1,35), Krit, Klassen-Gegenstand, Gaben, Lebensraub, Hinrichtung, Messung — 54/54 bestehen.

### 12.2 Duo-Segen (09.10.2026, umgesetzt) — `DUOS` in `js/synergy.js`

≥ 2 Waffen aus Klasse A und ≥ 2 aus Klasse B (`p.clsN`, Lieblingsklasse zählt mit; „Nahkampf“ zählt für zwei Duos wie eine Klasse): nach der nächsten
Boss-Station erscheint mit 50 % der passende Segen als 4. Karte neben den Reliquien (nicht am Blutschrein). Wählen statt einer Reliquie.
Auslöser-Bremse: Duo-Schaden läuft mit eigener Quelle (`duo_…`, im F3-Overlay sichtbar) und Tiefe `G._duoD`; Treffer-Effekte feuern nie aus Duo- oder Reliquien-Schaden,
Schwefel-Explosionen aus Tiefe 1 nur mit 20 %, aus Tiefe 2 nie (gemessen: 40 brennend-vergiftete Gegner im Haufen → 2–3 Explosionen, kein Endlos-Kreislauf).

| Klassen | Duo | Effekt |
|---|---|---|
| Feuer + Seuche | Schwefel | brennende und vergiftete Gegner explodieren beim Tod (85 px, 30 % ihres Lebens) |
| Konstrukt + Seuche | Seuchenträger | Geschütze, Totems, Minen, Ratten, Begleiter vergiften bei jedem Treffer |
| Frost + Blitz | Supraleiter | Blitz-Treffer auf Verlangsamte: +50 % Schaden, Frostwelle 70 px |
| Feuer + Blitz | Höllengewitter | alle 1,2 s Blitz von oben in bis zu 3 eigene brennende Gegner |
| Heilig + Eisen | Hammer der Hexen | jeder 8. Eisen-Treffer nagelt 0,6 s fest; Festgehaltene +40 % Schaden |
| Pulver + Eisen | Schrapnell | Pulver-Kills zerplatzen in 5 Splitter (je 40 % des letzten Treffers) |
| Frost + Feuer | Thermoschock | Treffer auf brennend + verlangsamt: Dampfstoß 75 px (80 %), betäubt 0,4 s, 2,5 s Abklingzeit je Gegner |
| Heilig + Blitz | Strafgericht | jeder 7. Heilig/Blitz-Treffer ruft einen goldenen Blitz (120 %), gegen Elite/Bosse fast doppelt so oft |
| Nahkampf + Feuer | Glühende Schneide | Nahkampf entzündet immer; Brennende +30 % Nahkampfschaden; Schwünge glühen |
| Nahkampf + Eisen | Wurfklingen | jeder 3. Schwung wirft eine kreisende Klinge (70 %, durchbohrt 3) |

### 12.3 Set-Verwandlungen (09.10.2026, umgesetzt) — `SETS` in `js/synergy.js`

Drei Teile aus Gegenständen, Tausch-/Modifikator-Gaben und Reliquien. Shop-, Gaben- und Reliquienkarten zeigen „Teil von Set X (n/3)“,
das Werte-Panel den Fortschritt; bei der Verwandlung erscheinen Toast, Partikel und ein Merkmal an der Figur.

| Set | Teile | Verwandlung | Merkmal |
|---|---|---|---|
| Der Büßer | Bußgürtel (Gabe), Fastenbrot, Märtyrerblut (Reliquie) | unter 30 % LP: +50 % Schaden, +20 % Tempo | Dornenkrone, rote Aura wenn aktiv |
| Der Henker | Schwarze Kapuze, Rostige Kette, Totenschädel (Gaben) | Hinrichtungs-Schwelle +10 % (bleibt auch nach Richtspruch erhalten), Hinrichtung heilt 2 LP | Henkerskapuze |
| Der Pestdoktor | Giftphiole, Aschenurne (Reliquie), Almosenbeutel (Gabe) | vergiftete Gegner: doppelt Gold + Giftwolke beim Tod (Wolken-Tote erzeugen keine neue) | Schnabelmaske |
| Der Pilger | Pilgerstab (Gabe), Pilgersandalen, Weihwasserflasche | +10 % Tempo, in Bewegung +1,5 LP/s, Ausweichen lädt 40 % schneller | Heiligenschein |
| Der Scheiterhaufen | Lampenöl, Altarkerze, Pechfass (Gabe) | Brennende +25 % Schaden, Brand springt beim Tod auf 2 Nachbarn (höchstens 2 Generationen) | Flammenkrone |

### 12.4 Lebensregeneration (09.10.2026, umgesetzt)

Gegenstand **Weihwasserflasche** (ungewöhnlich, +0,4 LP/s) und Gabe **Gnadenquell** (+0,3 + 0,1 × Seltenheit LP/s). Heilt über `healPlayer` (Heilungsfaktor der Figur
wirkt, Flagellant also 70 %), pausiert 2 s nach jedem erlittenen Treffer; das Werte-Panel zeigt LP/s. Gemessen: 0,4 LP/s, nach Treffer 2 s nichts, dann weiter.

---

## 13. Reihenfolge

| Schritt | Inhalt | Aufwand | Fertig, wenn |
|---|---|---|---|
| 1 ✓ | Bugs aus `IST-ZUSTAND.md` (1, 2, 5, 6, 8) – erledigt | S × 5 | Endlos-Tod zählt 1 Lauf, Cheat-Lauf zählt 0, DB nicht abrufbar |
| 2 ✓ | Debug-Overlay (3.2) – erledigt: F3 im Spiel, Export als JSON. Explosion und Kettenblitz zählen zur auslösenden Waffe, Brand ebenfalls | M | Jede Schadensquelle erscheint, Kills = Tötungen im HUD (geprüft) |
| 3 ✓ | Besitzer + Effektliste (3.3) – erledigt; Brand-/Pfützen-Kills zählen jetzt auch als Waffen-Kills | M | Verteilung im Overlay wie vor dem Umbau; Koop-Lebensraub geht an den richtigen Spieler |
| 4 ✓ | Entscheidungen E1–E4 – erledigt: Seelenschmiede Schaden/Leben max. St. 5 (+25 %, Überschuss wird erstattet), Fluch wird beim Laufstart angeboten | S × 2 | – |
| 5 ✓ | Waffenklassen (4) – erledigt. Shop-Neigung greift auch auf niedrigere Seltenheiten zurück; gemessen: Pulver 51→61 %, Seuche 14→24 %, Feuer nur 3→7 %, weil es keine gewöhnliche Feuerwaffe gibt (Brandpfeil in Schritt 7 schließt die Lücke) | M | Shop zeigt Klassen, Boni im Werte-Panel sichtbar |
| 6 ✓ | Geschoss-Modifikatoren (5) – erledigt als Gaben im Upgrade-Pool (je 1× pro Lauf); gelten nicht für den Laserstrahl (kein Geschoss) | S × 5 | Jeder einzeln per Admin-Panel testbar |
| 7 ✓ | Gegner-Gift + 6 Waffen (6) – erledigt. Shop-Neigung Feuer jetzt 11→27 % (vorher 3→7 %) | M | Jede Klasse im Shop bis Stufe 4 erreichbar |
| 8 ✓ | Tausch-Gaben (7) – erledigt: 8 Karten, in 25 % der Aufstiege ersetzt eine davon eine normale Karte, je 1× pro Lauf | M | – |
| 9 ✓ | Boss-Reliquien + 3 Rezepte (8) – erledigt: Auswahl nach jeder Boss-Station (vor dem Shop), Ketten-Bremse für Auslöser, Admin-Panel kann Reliquien geben | M | – |
| 10 ✓ | Fluch-Wahl, Pakte (9), Schreine (10), Charakter-Profile (11) – erledigt; nebenbei behoben: Wellenende-Heilung bekam im Koop nur Spieler 1 | S / M / M | – |

| 11 ✓ | Waffen-Eigenheiten + Balancing (09.10.) – Hexenfeuer (Hexenmal), Nagelkanzel (festnageln), Schienennagel (durch Deckung, wächst je Durchschlag), Jüngstes Gericht (Hinrichtung unter 25 %), Sturmrufer (Blitz von oben); Läuterungsstrahl trifft nur noch Durchschlag+1 Gegner; Litanei/Predigtkreis als echter Ring; Fächer ohne Mittelgeschoss behoben (Seraph, Kreuzsalve, Sturm der Engel). Messung mit `tools/balance-bench.js` (Spieler kitet), Funktion mit `tools/weapon-audit.js` | M | 47/47 Waffen bestehen die Funktionsprüfung |
| 12 ✓ | Charakter-Profile im Brotato-Stil (11.1) | M | – |

Nach den Schritten 5, 6, 7 und 9 jeweils 20 Läufe mit dem Overlay, dann nachjustieren.
Das Admin-Panel braucht ab Schritt 5 eine Auswahl für Gaben und Reliquien, sonst ist das Testen mühsam.
