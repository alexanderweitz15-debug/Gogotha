#!/usr/bin/env python3
"""GOLGOTHA server — serves the static game AND a tiny JSON API backed by SQLite.

ponytail: stdlib only (http.server + sqlite3 + hashlib + secrets), single file, zero deps.
One JSON `data` column per account holds stats/unlocks/achievements/meta so adding fields in
later phases needs no schema migration. Run:  python server.py   (listens on $PORT or 8731).
The DB file golgotha.db lives next to this script and survives code edits + restarts.
"""
import http.server, socketserver, json, sqlite3, hashlib, os, secrets, time

ROOT = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(ROOT, "golgotha.db")
PORT = int(os.environ.get("PORT", "8731"))

# Sitzungen liegen in SQLite und überleben einen Neustart des Servers; sie laufen nach 30 Tagen ab.
SESSION_TTL = 30 * 86400
MAX_BODY = 256 * 1024


def db():
    c = sqlite3.connect(DB_PATH, timeout=5)
    c.row_factory = sqlite3.Row
    return c


def init_db():
    c = db()
    c.execute(
        """CREATE TABLE IF NOT EXISTS accounts(
            name    TEXT PRIMARY KEY COLLATE NOCASE,
            display TEXT NOT NULL,
            salt    TEXT NOT NULL,
            pass    TEXT NOT NULL,
            data    TEXT NOT NULL DEFAULT '{}',
            created INTEGER,
            updated INTEGER)"""
    )
    c.execute("CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, name TEXT NOT NULL, created INTEGER)")
    c.commit()
    c.close()


def hash_pw(pw, salt):
    return hashlib.pbkdf2_hmac("sha256", pw.encode("utf-8"), bytes.fromhex(salt), 100_000).hex()


def blank_data():
    return {
        "stats": {"runs": 0, "kills": 0, "gold": 0, "bestLevel": 0, "bestCharLevel": 0,
                  "deaths": 0, "wins": 0, "bossKills": 0, "playTime": 0},
        "unlocks": {},        # freigeschaltete Charaktere/Waffen (Phase 5)
        "achievements": {},   # Erfolge (Phase 4)
        "meta": {"currency": 0, "levels": {}},  # globale Progression (Phase 3)
    }


def new_session(c, name):
    tok = secrets.token_hex(16)
    now = int(time.time())
    c.execute("DELETE FROM sessions WHERE created<?", (now - SESSION_TTL,))
    c.execute("INSERT INTO sessions(token,name,created) VALUES(?,?,?)", (tok, name, now))
    c.commit()
    return tok


def session_user(tok):
    if not isinstance(tok, str) or not tok:
        return None
    c = db()
    row = c.execute("SELECT name FROM sessions WHERE token=? AND created>=?",
                    (tok, int(time.time()) - SESSION_TTL)).fetchone()
    c.close()
    return row["name"] if row else None


# ---------- Plausibilitätsprüfung beim Speichern (IST #3) ----------
# Das Spiel läuft im Browser, also kann der Server einen Spielstand nie beweisen. Er lehnt aber ab, was
# kein echter Lauf erzeugen kann: Zähler, die schrumpfen (alter Tab überschreibt neueren Stand), und Seelen,
# die schneller wachsen als Tötungen/Bosse/Läufe hergeben. Die Grenzen sind absichtlich großzügig.
COUNTERS = ("runs", "kills", "gold", "deaths", "wins", "bossKills", "playTime", "bestLevel", "bestCharLevel")
META_MAX_LEVEL = 20


def _num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and v == v and abs(v) != float("inf")


def soul_value(meta):
    """Seelen inklusive der in Seelenschmiede-Stufen gebundenen (Kosten wie metaCost im Client: 10 + 8*Stufe)."""
    meta = meta if isinstance(meta, dict) else {}
    cur = meta.get("currency", 0)
    v = cur if _num(cur) else 0
    for lv in (meta.get("levels") or {}).values():
        if _num(lv):
            v += sum(10 + 8 * k for k in range(int(lv)))
    return v


def implausible(old, new):
    st, ost = new.get("stats"), (old.get("stats") or {})
    if not isinstance(st, dict):
        return "stats"
    for k in COUNTERS:
        v, o = st.get(k, 0), ost.get(k, 0)
        if not _num(v) or v < 0:
            return k
        if _num(o) and v < o:
            return k + " sinkt"
    meta = new.get("meta") or {}
    if not isinstance(meta, dict) or not isinstance(meta.get("levels", {}), dict):
        return "meta"
    for lv in meta.get("levels", {}).values():
        if not _num(lv) or lv < 0 or lv > META_MAX_LEVEL or lv != int(lv):
            return "Stufe"
    cur = meta.get("currency", 0)
    if not _num(cur) or cur < 0:
        return "Seelen"
    d = lambda k: max(0, st.get(k, 0) - (ost.get(k, 0) if _num(ost.get(k, 0)) else 0))
    runs = d("runs") + 1
    if d("kills") > 50000 * runs or d("bossKills") > 100 * runs:
        return "Zuwachs"
    # Seelen je Lauf im Client: Tötungen/20 + 2 je Station + 15 je Boss + 50 für den Sieg, dazu 25 je Erfolg;
    # 1000 je Lauf deckt auch lange Endlos-Läufe und mehrere Erfolge auf einmal
    if soul_value(meta) - soul_value(old.get("meta")) > d("kills") / 20 + 15 * d("bossKills") + 1000 * runs + 5:
        return "Seelen"
    return None


def profile_of(row):
    return {"name": row["display"], **json.loads(row["data"])}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    # Nur diese Dateien sind öffentlich — golgotha.db und server.py bleiben unerreichbar.
    PUBLIC = {"/": "/index.html", "/index.html": "/index.html", "/game.js": "/game.js", "/sprites.js": "/sprites.js",
              "/style.css": "/style.css"}

    def _public_path(self):
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        return self.PUBLIC.get(path)

    def do_GET(self):
        target = self._public_path()
        if not target:
            self.send_error(404)
            return
        self.path = target
        super().do_GET()

    def do_HEAD(self):
        target = self._public_path()
        if not target:
            self.send_error(404)
            return
        self.path = target
        super().do_HEAD()

    def end_headers(self):
        # ponytail: kein Caching — Code-Änderungen sind nach Reload sofort sichtbar
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def _json(self, obj, code=200):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if not self.path.startswith("/api/"):
            self.send_error(404)
            return
        try:
            n = int(self.headers.get("Content-Length", 0))
            if n > MAX_BODY:
                self._json({"error": "Anfrage zu groß"}, 413)
                return
            req = json.loads(self.rfile.read(n) or b"{}")
            if not isinstance(req, dict):
                raise ValueError
        except Exception:
            self._json({"error": "Ungültige Anfrage"}, 400)
            return
        route = self.path[5:]
        if route == "register":
            self._json(self.register(req))
        elif route == "login":
            self._json(self.login(req))
        elif route == "save":
            self._json(self.save(req))
        elif route == "logout":
            self._json(self.logout(req))
        else:
            self._json({"error": "Unbekannt"}, 404)

    def register(self, req):
        user = str(req.get("user") or "").strip()
        pw = str(req.get("pass") or "")
        if len(user) < 2:
            return {"error": "Name zu kurz (min. 2)"}
        if len(user) > 16 or len(pw) > 128:
            return {"error": "Name oder Losungswort zu lang"}
        if not pw:
            return {"error": "Losungswort fehlt"}
        c = db()
        if c.execute("SELECT 1 FROM accounts WHERE name=?", (user,)).fetchone():
            c.close()
            return {"error": "Pilger existiert bereits"}
        salt = secrets.token_hex(16)
        now = int(time.time())
        c.execute(
            "INSERT INTO accounts(name,display,salt,pass,data,created,updated) VALUES(?,?,?,?,?,?,?)",
            (user, user, salt, hash_pw(pw, salt), json.dumps(blank_data()), now, now),
        )
        c.commit()
        row = c.execute("SELECT * FROM accounts WHERE name=?", (user,)).fetchone()
        tok = new_session(c, row["name"])
        c.close()
        return {"ok": True, "token": tok, "profile": profile_of(row)}

    def login(self, req):
        user = str(req.get("user") or "").strip()
        pw = str(req.get("pass") or "")
        c = db()
        row = c.execute("SELECT * FROM accounts WHERE name=?", (user,)).fetchone()
        if not row or not secrets.compare_digest(hash_pw(pw, row["salt"]), row["pass"]):
            c.close()
            return {"error": "Unbekannter Pilger" if not row else "Falsches Losungswort"}
        tok = new_session(c, row["name"])
        c.close()
        return {"ok": True, "token": tok, "profile": profile_of(row)}

    def logout(self, req):
        c = db()
        c.execute("DELETE FROM sessions WHERE token=?", (str(req.get("token") or ""),))
        c.commit()
        c.close()
        return {"ok": True}

    def save(self, req):
        name = session_user(req.get("token"))
        if not name:
            return {"error": "Nicht angemeldet"}
        data = req.get("data")
        if not isinstance(data, dict):
            return {"error": "Keine Daten"}
        c = db()
        row = c.execute("SELECT data FROM accounts WHERE name=?", (name,)).fetchone()
        why = implausible(json.loads(row["data"]) if row else blank_data(), data)
        if why:
            c.close()
            return {"error": "Spielstand unplausibel (" + why + ")"}
        c.execute("UPDATE accounts SET data=?, updated=? WHERE name=?",
                  (json.dumps(data), int(time.time()), name))
        c.commit()
        c.close()
        return {"ok": True}

    def log_message(self, *a):
        pass  # quiet


if __name__ == "__main__":
    init_db()
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("", PORT), Handler) as httpd:
        print("GOLGOTHA server on http://localhost:%d" % PORT)
        httpd.serve_forever()
