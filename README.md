# Golgotha

Grimdark-Roguelite im Browser (Canvas, ohne Abhängigkeiten) mit kleinem Python-Server für Konten und Spielstände.

## Starten

```
python3 server.py          # http://localhost:8731
```

| Variable | Bedeutung | Standard |
|---|---|---|
| `PORT` | Port | `8731` |
| `GOLGOTHA_SITE_PASS` | Seitenpasswort („Pforte“), leer = keine Pforte | `Alex` |
| `GOLGOTHA_TRUST_PROXY` | `1`, wenn ein Reverse-Proxy davor steht (echte Besucher-IP aus `X-Forwarded-For` für die Sperre bei Fehlversuchen) | aus |

Die Datenbank `golgotha.db` entsteht neben `server.py` und gehört nicht ins Repo.
Der Server spricht kein HTTPS: öffentlich nur hinter einem Proxy mit TLS (nginx, Caddy) betreiben, sonst gehen Passwörter im Klartext übers Netz.

Ohne Server (Datei öffnen oder statisch hosten) läuft das Spiel auch; Konten und Fortschritt liegen dann nur im Browser.

## Aufbau

- `index.html`, `style.css`, `gate.js` (Pforte, lädt danach den Spielcode)
- `sprites.js` – alle Figuren, Gegner, Bosse, Geschosse
- `js/` – Spielcode in Ladereihenfolge: core, data, io, player, enemies, combat, flow, render, main
- `tools/` – `weapon-audit.js` (Funktionsprüfung aller Waffen), `balance-bench.js` (Schaden pro Sekunde je Waffe); beide brauchen Playwright
- `IST-ZUSTAND.md`, `IDEEN-WAFFEN-ITEMS.md` – Befunde und Plan
