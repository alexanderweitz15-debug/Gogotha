# GOLGOTHA – Ist-Zustand (Stand 08.10.2026)

Grundlage: vollständiges Lesen des Codes (Commit `8422146`) und ein automatisierter Spieltest im Headless-Browser
(Server lokal gestartet, Account angelegt, ca. 60 s gespielt bis Station 5, Endlos-Modus und Tod per Skript erzwungen).
Im Test traten keine JavaScript-Fehler auf.

> **Hinweis (09.10.2026):** `game.js` ist in neun Dateien unter `js/` aufgeteilt (core, data, io, player, enemies, combat, flow, render, main; Reihenfolge in `index.html`).
> Zeilenangaben wie `game.js:1436` in diesem Dokument beziehen sich auf den Stand davor.

## Status der Korrekturen (08.10.2026)

| Punkt | Status |
|---|---|
| 1. Datenbank downloadbar | **Behoben.** Der Server liefert nur noch `/`, `index.html`, `game.js`, `style.css` aus, alles andere gibt 404 (getestet). |
| 2. `golgotha.db` im Repo | **Aus dem Repo entfernt** und in `.gitignore`. In der Git-Historie bleibt sie; das Passwort des Accounts gilt weiter als kompromittiert. |
| 5. Doppelte Wertung im Endlos-Modus | **Behoben.** Nach Station 50 wird nur noch der Zuwachs gewertet, der Lauf zählt einmal (getestet). |
| 6. Cheats zählen | **Behoben.** Läufe mit aktivem Cheat beim Start oder mit Admin-Eingriff während des Laufs werden nicht gewertet, Boss-Freischaltungen auch nicht (getestet). Bereits gespeicherte Werte bleiben, wie sie sind. |
| 8. Leere Charakterbilder | **Behoben**, auch nach „Erneut bereuen“ (getestet). |
| 10. Übersetzung halb fertig | **Teilweise behoben.** Shop, Endbildschirme, Toasts, Seltenheiten und Charakterwerte sind übersetzt. Upgrade-/Fähigkeitstexte, Lore und Eigennamen bleiben deutsch, so steht es als Absicht im Code (`game.js:23`). Das Admin-Panel bleibt deutsch. |
| Mobil nicht spielbar | **Behoben, nur emuliert getestet.** Touch-Stick links, Ausweich-Knopf rechts, Pause-Knopf, Hinweis „quer halten“ im Hochformat, verdichtetes HUD bei niedriger Höhe. Auf einem echten Gerät nicht getestet. |
| 9. Koop: Effekte beim falschen Spieler | **Behoben.** Lebensraub, Hinrichtung und Goldbonus gehören dem Spieler, dessen Geschoss/Fähigkeit getroffen hat; Begleiter folgen ihrem Besitzer; Bosse und Bogenschützen zielen auf den nächsten Spieler (getestet). Gold bleibt eine gemeinsame Kasse. |
| Neu gefunden: Explosion blockierte Kettenblitz und Pfützen | **Behoben.** Mit explosiven Schüssen (Upgrade „Höllenfeuer“, Fähigkeit „Inferno“, Hand Gottes) lösten Kettenblitz und Seuchenpfützen nie aus, weil die Explosion das Geschoss vorher beendete. Die Explosion kommt jetzt zuletzt (getestet). |
| 7. Speicherfehler unbemerkt | **Behoben.** Sitzungen liegen in SQLite (überleben Neustarts, 30 Tage gültig), Abmelden macht das Token ungültig. Scheitert das Speichern, erscheint eine Meldung, der Stand bleibt lokal und wird beim nächsten Login hochgeladen, wenn er mindestens so viele Läufe hat wie der Server-Stand (getestet). Anfragen > 256 KB und Namen > 16 Zeichen werden abgelehnt. |
| 12. Keine Bosse im Endlos-Modus | **Geändert:** Ab Station 55 kehren die Bosse alle 5 Stationen reihum zurück, je 50 Stationen mit +50% Leben, danach wieder Reliquienwahl. Falls das Endlos-Modus ohne Bosse Absicht war: eine Zeile in `buildLevel` (`lvl%5===0`) zurück auf `lvl%5===0 && lvl<=50`. |
| Neu: Bosse 6–10 ohne eigenes Design | **Behoben.** Eigene Figuren und Muster für Choral der Asche, Mutter der Seuche, Eiserner Heiliger, Schlund von Golgotha, Letzter Gekreuzigter; neue Mechanik: angekündigte Gefahrenzonen (Warnkreise/-balken, Ausweichschritt hilft). |
| 11. `victory()` toter Code | **Entfernt** (09.10.), samt Overlay. Der Abschluss nach Station 50 läuft über den Endlos-Bildschirm. |
| 3. Spielstände ungeprüft | **Teilweise behoben** (09.10.). Der Server lehnt ab, was kein echter Lauf erzeugen kann: schrumpfende Zähler (auch: alter Tab überschreibt neueren Stand), falsche Typen, Seelenschmiede-Stufen über 20 und Seelen, die schneller wachsen als Tötungen/Bosse/Läufe hergeben (Seelen in gekauften Stufen zählen mit, Käufe und Erstattungen gehen also durch). Getestet: Seelen = 1 000 000, geschenkte Stufen und sinkende Läufe werden abgelehnt, echte Läufe, Käufe und Offline-Nachträge gehen durch. **Grenze:** Das Spiel läuft im Browser; wer Tötungen und Läufe passend mitfälscht, kommt durch. Ganz dicht wird das nur, wenn der Server die Läufe selbst berechnet. |
| 4. Passwörter im Client | **Seitenpasswort behoben** (09.10.): Der Server prüft es (`/api/gate`) und setzt ein HttpOnly-Cookie; ohne Cookie liefert er weder Spielcode noch API aus (getestet: `js/*.js` → 403, API → „Pforte verschlossen“). Passwort per `GOLGOTHA_SITE_PASS`. **Seit 09.10. standardmäßig aus** (auf Wunsch): ohne die Variable kommt jeder direkt zur Anmeldung; mit gesetzter Variable greift die Pforte wie beschrieben. Ohne `server.py` (statisch gehostet oder als Datei) gibt es keine Pforte, der Code liegt dort ohnehin offen. **Admin-Passwort `321` bleibt im Client** – absichtlich: Die Admin-Schalter sind reine Client-Cheats, die man auch über die Konsole setzen kann; Läufe mit Admin zählen nicht (#6). Eine Server-Prüfung würde daran nichts ändern. |
| Server-Härtung | (09.10.) Höchstens 10 Fehlversuche je IP in 10 Minuten bei Login und Pforte, höchstens 30 neue Konten je IP; Login verrät nicht mehr, ob ein Name existiert; Namen nur aus Buchstaben, Ziffern, Leerzeichen, `_ . -`; Sicherheits-Header (CSP, nosniff, kein Einbetten in fremde Seiten). |
| 2. (Nachtrag 09.10.) | **Historie bereinigt:** `golgotha.db` mit `git filter-repo` aus allen Commits entfernt, `main` und der Arbeitsbranch per Force-Push ersetzt (alle Commit-Kennungen haben sich dabei geändert). **Bleibt:** Das Repo ist öffentlich; GitHub hält die alte Fassung über `refs/pull/1/head` (PR #1) weiter erreichbar, bis der GitHub-Support sie löscht, und jeder frühere Klon enthält sie. Das Passwort des Kontos gilt deshalb weiter als bekannt und muss geändert werden. |
| Offen | `server.py` spricht kein HTTPS – öffentlich nur hinter einem Proxy mit TLS betreiben (dann `GOLGOTHA_TRUST_PROXY=1`). |

## 1. Was das Spiel ist

Ein Roguelite-Arena-Shooter im Stil von „Vampire Survivors / Brotato“ mit Grimdark-Setting:
- Bewegung mit WASD/Pfeiltasten, Ausweichschritt mit der Leertaste; die Waffen zielen und feuern automatisch.
- 50 „Stationen“ (Wellen) in 5 Regionen, alle 5 Stationen ein Boss, danach optional Endlos-Modus.
- Nach jeder Welle: Waffenshop (Gold), Stufen-Upgrades (XP), auf Stufe 10/20/30/40/50 Fähigkeiten.
- Lokaler Koop für 2 Spieler an einer Tastatur.

## 2. Umfang (Inhalte)

| Bereich | Umfang |
|---|---|
| Charaktere | 4 Start-Charaktere + 12 freischaltbare (über Stufe, Waffen-Kills oder Boss-Kills) |
| Waffen | 28 im Shop (inkl. Geschütz, Totem, Minen, Begleiter, Laser), 5 Verschmelzungen, 5 Boss-Waffen |
| Upgrades | 16 Charakter-Upgrades, 16 Fähigkeiten + 3 Fähigkeits-Verschmelzungen |
| Seltenheiten | 8 Stufen (Gewöhnlich bis Godlike), beeinflusst durch Glück |
| Gegner | 9 Typen + Elite-Variante; 5 Boss-Muster (10 Boss-Namen, Muster ab Boss 6 wiederholt) |
| Schwierigkeit | 6 Grade + „Eigene“ (Regler, zählt nicht), 4 stapelbare Modifikatoren, 7 Flüche |
| Meta | Seelenschmiede (6 permanente Upgrades à 20 Stufen), 8 Erfolge, Profilstatistik |
| Sonstiges | DE/EN-Umschaltung, Minimap, Admin-/Cheat-Panel, Synth-Soundeffekte (WebAudio) |

## 3. Technik

| Datei | Zeilen | Inhalt |
|---|---|---|
| `game.js` | 2002 (~150 KB) | Das gesamte Spiel in einer Datei: Daten, Logik, Rendering, UI |
| `index.html` | 351 | Alle Menüs und Overlays als statisches HTML |
| `style.css` | 247 | Styling |
| `server.py` | 157 | Python-Standardbibliothek: liefert die Dateien aus und stellt `/api/register`, `/api/login` und `/api/save` bereit (SQLite) |
| `golgotha.db` | – | SQLite-Datenbank, **mit eingecheckt** (enthält 1 echten Account) |
| `README.md` | 1 | Nur die Überschrift |

- Rendering mit Canvas 2D, keine Bibliotheken, kein Build-Schritt. Die Spielfiguren sind prozedural gezeichnet, es gibt keine Grafikdateien.
- Spielstände: Läuft das Spiel über HTTP, ist der Server maßgeblich; wird `index.html` direkt geöffnet, wird nur `localStorage` genutzt.
- Keine Tests, kein Linting, keine CI, keine Dokumentation.
- Code-Stil: stark verdichtet (mehrere Anweisungen pro Zeile, Ein-Buchstaben-Variablen) und viel globaler Zustand. Im Koop-Modus wird die globale Variable `player` umgeschaltet (das ist laut Kommentar Absicht). Das ist die Ursache von Bug 5.2.

## 4. Was funktioniert

- Der Spielablauf ist stabil: Login → Menü → Charakterwahl → Schwierigkeit → Wellen → Shop/Upgrade → nächste Station. Im Test gab es keine Abstürze und keine Konsolenfehler.
- Das Shop-, Upgrade- und Fähigkeitensystem greift ineinander. Das Waffenlimit (5) und die Veredelung bis Stufe 10 funktionieren.
- Registrierung und Login gegen den Server funktionieren, die Statistik wird gespeichert.
- Optik: Der Stil ist stimmig und düster, die Menüs wirken hochwertig. Das Spielfeld ist allerdings sehr dunkel, und Gegner sind schlecht zu erkennen.

## 5. Probleme – nach Schwere sortiert

### Kritisch (Sicherheit/Datenschutz)

1. **Die Datenbank ist öffentlich downloadbar.** `server.py:62` liefert das komplette Projektverzeichnis aus.
   Getestet: `GET /golgotha.db` → 200, ebenso `/server.py`. Damit kann jeder alle Accountnamen, Salts und Passwort-Hashes herunterladen.
2. **`golgotha.db` liegt im Git-Repo** und enthält einen echten Account samt Passwort-Hash. Die Datei gehört in `.gitignore`. Weil sie schon in der Git-Historie steht, sollte das Passwort dieses Accounts als kompromittiert gelten.
3. **Der Server übernimmt beliebige Spielstände ungeprüft** (`server.py:135` `save`): Wer eingeloggt ist, kann per Konsole jeden Wert schreiben (Seelen, Statistik, Freischaltungen).
4. **Die Passwörter stehen im Client-Code:** Seitenpasswort `Alex` (`game.js:1791`), Admin-Passwort `321` (`game.js:1967`).
   Das Seitenpasswort lässt sich mit `sessionStorage.setItem('golgotha_site','1')` umgehen. Als Schutz taugt beides nicht, höchstens als Hürde gegen zufällige Besucher.

### Hoch (Bugs mit Auswirkung auf Spielstand)

5. **Doppelte Wertung im Endlos-Modus** (verifiziert): Station 50 schließt den Lauf ab (`game.js:1376`). Stirbt man danach im Endlos-Modus, wird derselbe Lauf noch einmal gespeichert (`game.js:1431`).
   Testergebnis: 100 Kills → Statistik 200 Kills, `runs` 2 statt 1. Gold, Spielzeit und Seelen werden ebenfalls doppelt gezählt.
6. **Cheats zählen für den Fortschritt** (verifiziert): `finishRun` (`game.js:443`) prüft den Admin-Modus nicht. Gott-Modus, Start-Station 50 und „Boss spawnen“ bringen echte Siege, Erfolge, Seelen und Charakter-Freischaltungen.
   Der vorhandene Account zeigt genau das: `bestLevel` 9, aber Boss-Freischaltungen für die Bosse der Stationen 10 und 15.
7. **Speicherfehler bleiben unbemerkt:** Sessions liegen nur im Arbeitsspeicher des Servers (`server.py:17`). Nach einem Neustart des Servers schlägt jedes Speichern mit „Nicht angemeldet“ fehl. Der Client ignoriert diese Antwort (`game.js:485`), der Spieler merkt nichts, und der Fortschritt landet nur im lokalen Cache.

### Mittel (Spiel-Bugs)

8. **Die Charakter-Vorschaubilder sind leer** (verifiziert): `#btnStart` setzt `G.state` nicht auf `'charselect'` (`game.js:1814`), deshalb werden die Figuren nicht gezeichnet (`game.js:1777`). Erst nach „Zurück“ aus dem Schwierigkeitsmenü erscheinen sie.
9. **Koop: Effekte landen beim falschen Spieler.** Tötet Spieler 2 einen Gegner, bekommt Spieler 1 den Lebensraub (`game.js:892`) und Spieler 1s Hinrichtungs-Schwelle gilt (`game.js:880`). Bosse zielen nur auf Spieler 1 (`game.js:916`). Gold teilen sich beide Spieler. (Aus dem Code abgeleitet, nicht im Spiel getestet.)
10. **Die Übersetzung ist halb fertig:** Shopkarten, Upgrade-Texte, Game-Over-, Sieg- und Endlos-Bildschirm sowie das Admin-Panel sind fest auf Deutsch, auch im EN-Modus.
11. `victory()` (`game.js:1436`) wird nirgends aufgerufen und ist damit toter Code.
12. Im Endlos-Modus gibt es keine Bosse mehr (`game.js:1169`, `lvl<=50`). Ob das gewollt ist, ist unklar.

### Niedrig / Design

- **Mobil nicht spielbar:** Es gibt keine Touch- oder Gamepad-Steuerung, nur Tastatur.
- „Aufgeben“ zählt als Tod und gibt trotzdem Seelen.
- Die 12 Zusatz-Charaktere haben keinen eigenen Fähigkeiten-Pool (Fallback auf den Büßer, `game.js:1347`) ~~und kein eigenes Aussehen~~ – **behoben (08.10.):** eigene Figuren in `sprites.js`, ebenso neue Figuren für alle 9 Gegnertypen.
- Server: keine Größenbegrenzung für Anfragen, kein Rate-Limit beim Login, Tokens laufen nie ab, Abmelden macht das Token serverseitig nicht ungültig.
- Die Kollisionsprüfung vergleicht jedes Geschoss mit jedem Gegner. Bei bis zu 90 Gegnern plus Beschwörungen ist das in späten Stationen ein mögliches Performance-Problem. **Nicht gemessen.**

## 6. Gesamturteil

Spielerisch ist das Spiel überraschend weit: viel Inhalt, ein funktionierender Kernablauf, ein stimmiger Stil. Technisch ist es ein Prototyp.
Bevor jemand anderes als du selbst darauf spielt, müssen die Punkte 1–2 behoben sein (Datenbank öffentlich und im Repo).
Die Punkte 5–8 sind kleine, klar abgegrenzte Korrekturen.
Für die Weiterentwicklung ist das größte Risiko die 150 KB große Einzeldatei mit globalem Zustand und ohne Tests: Jede neue Funktion wird schwerer einzubauen, ohne etwas anderes kaputt zu machen.

### Empfohlene Reihenfolge
1. `server.py` nur noch `index.html`, `game.js` und `style.css` ausliefern lassen; `golgotha.db` aus dem Repo entfernen und in `.gitignore` aufnehmen.
2. Die doppelte Wertung im Endlos-Modus beheben; Läufe mit aktivem Admin-Modus nicht speichern (wie schon beim Custom-Grad, `G.noSave`).
3. Das fehlende `G.state='charselect'` ergänzen.
4. Speicherfehler im Client anzeigen und ggf. neu einloggen lassen; Sessions in SQLite ablegen.
5. Erst danach neue Inhalte, idealerweise nachdem `game.js` in Module aufgeteilt ist.
