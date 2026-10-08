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

# ponytail: in-memory sessions. Fine for one process; move to a `sessions` table if you scale out.
TOKENS = {}


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


def profile_of(row):
    return {"name": row["display"], **json.loads(row["data"])}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    # Nur diese Dateien sind öffentlich — golgotha.db und server.py bleiben unerreichbar.
    PUBLIC = {"/": "/index.html", "/index.html": "/index.html", "/game.js": "/game.js", "/style.css": "/style.css"}

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
            req = json.loads(self.rfile.read(n) or b"{}")
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
        else:
            self._json({"error": "Unbekannt"}, 404)

    def register(self, req):
        user = (req.get("user") or "").strip()
        pw = req.get("pass") or ""
        if len(user) < 2:
            return {"error": "Name zu kurz (min. 2)"}
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
        c.close()
        tok = secrets.token_hex(16)
        TOKENS[tok] = user
        return {"ok": True, "token": tok, "profile": profile_of(row)}

    def login(self, req):
        user = (req.get("user") or "").strip()
        pw = req.get("pass") or ""
        c = db()
        row = c.execute("SELECT * FROM accounts WHERE name=?", (user,)).fetchone()
        c.close()
        if not row:
            return {"error": "Unbekannter Pilger"}
        if hash_pw(pw, row["salt"]) != row["pass"]:
            return {"error": "Falsches Losungswort"}
        tok = secrets.token_hex(16)
        TOKENS[tok] = row["name"]
        return {"ok": True, "token": tok, "profile": profile_of(row)}

    def save(self, req):
        name = TOKENS.get(req.get("token"))
        if not name:
            return {"error": "Nicht angemeldet"}
        data = req.get("data")
        if not isinstance(data, dict):
            return {"error": "Keine Daten"}
        c = db()
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
