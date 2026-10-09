#!/usr/bin/env python3
"""GOLGOTHA server — serves the static game AND a tiny JSON API backed by SQLite.

ponytail: stdlib only (http.server + sqlite3 + hashlib + secrets), single file, zero deps.
One JSON `data` column per account holds stats/unlocks/achievements/meta so adding fields in
later phases needs no schema migration. Run:  python server.py   (listens on $PORT or 8731).
The DB file golgotha.db lives next to this script and survives code edits + restarts.
"""
import http.server, socketserver, json, sqlite3, hashlib, hmac, os, re, secrets, threading, time
from http.cookies import SimpleCookie

ROOT = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(ROOT, "golgotha.db")
PORT = int(os.environ.get("PORT", "8731"))

# Sitzungen liegen in SQLite und überleben einen Neustart des Servers; sie laufen nach 30 Tagen ab.
SESSION_TTL = 30 * 86400
MAX_BODY = 256 * 1024

# Seitenpasswort („Pforte“): standardmäßig AUS. Mit GOLGOTHA_SITE_PASS=... eingeschaltet prüft der Server das Passwort
# und liefert ohne gültiges Pforten-Cookie weder den Spielcode noch die API aus.
SITE_PASS = os.environ.get("GOLGOTHA_SITE_PASS", "")
GATE_COOKIE = "golgotha_gate"
# Hinter einem Reverse-Proxy (nginx, Caddy …) GOLGOTHA_TRUST_PROXY=1 setzen, sonst teilen sich alle Besucher eine IP.
TRUST_PROXY = os.environ.get("GOLGOTHA_TRUST_PROXY") == "1"

# Fehlversuche (Login, Pforte) je IP: höchstens FAIL_MAX in FAIL_WINDOW Sekunden
FAIL_MAX, FAIL_WINDOW = 10, 600
REG_MAX = 30   # neue Konten je IP im selben Zeitfenster
_fails, _fails_lock = {}, threading.Lock()


def too_many(key, limit=None):
    now = time.time()
    with _fails_lock:
        recent = [t for t in _fails.get(key, []) if t > now - FAIL_WINDOW]
        if recent:
            _fails[key] = recent
        else:
            _fails.pop(key, None)
        return len(recent) >= (limit or FAIL_MAX)


def note_fail(key):
    with _fails_lock:
        _fails.setdefault(key, []).append(time.time())


NAME_RE = re.compile(r"^[\w .\-]{2,16}$")   # Buchstaben (auch Umlaute), Ziffern, Leerzeichen, _ . -


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
    c.execute("CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY, v TEXT NOT NULL)")
    if not c.execute("SELECT 1 FROM kv WHERE k='secret'").fetchone():
        c.execute("INSERT INTO kv(k,v) VALUES('secret',?)", (secrets.token_hex(32),))
    c.commit()
    c.close()


def gate_token():
    """Wert des Pforten-Cookies; ändert sich mit dem Seitenpasswort, alte Cookies werden dann ungültig."""
    c = db()
    secret = c.execute("SELECT v FROM kv WHERE k='secret'").fetchone()["v"]
    c.close()
    return hmac.new(bytes.fromhex(secret), SITE_PASS.encode("utf-8"), hashlib.sha256).hexdigest()


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
    # OPEN ohne Pforte (Seite, Stil, Pforten-Skript), GATED erst mit gültigem Pforten-Cookie (der eigentliche Spielcode).
    OPEN = {"/": "/index.html", "/index.html": "/index.html", "/style.css": "/style.css", "/gate.js": "/gate.js"}
    GATED = {"/sprites.js": "/sprites.js",
             **{"/js/%s.js" % n: "/js/%s.js" % n for n in
                ("core", "data", "io", "player", "enemies", "combat", "flow", "render",
                 "music", "settings", "gamepad", "runsave", "summary", "map", "regions", "codex", "synergy", "melee", "main")}}

    def _ip(self):
        if TRUST_PROXY and self.headers.get("X-Forwarded-For"):
            return self.headers["X-Forwarded-For"].split(",")[0].strip()
        return self.client_address[0]

    def _gate_ok(self):
        if not SITE_PASS:
            return True
        ck = SimpleCookie()
        try:
            ck.load(self.headers.get("Cookie", ""))
        except Exception:
            return False
        m = ck.get(GATE_COOKIE)
        return bool(m) and secrets.compare_digest(m.value, gate_token())

    def _serve(self, head):
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        target = self.OPEN.get(path)
        if not target and path in self.GATED:
            if not self._gate_ok():
                self.send_error(403)
                return
            target = self.GATED[path]
        if not target:
            self.send_error(404)
            return
        self.path = target
        super().do_HEAD() if head else super().do_GET()

    def do_GET(self):
        self._serve(False)

    def do_HEAD(self):
        self._serve(True)

    def end_headers(self):
        # ponytail: kein Caching — Code-Änderungen sind nach Reload sofort sichtbar
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy",
                         "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                         "font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'")
        super().end_headers()

    def _json(self, obj, code=200, cookie=None):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(body)

    def gate(self, req):
        """Ohne Passwort: fragt nur, ob die Pforte schon offen ist. Mit Passwort: prüft es und setzt das Cookie."""
        if self._gate_ok():
            return self._json({"ok": True})
        if "pass" not in req:
            return self._json({"ok": False})
        key = "gate:" + self._ip()
        if too_many(key):
            return self._json({"error": "Zu viele Versuche. Warte ein paar Minuten."}, 429)
        if not secrets.compare_digest(str(req.get("pass") or "").encode("utf-8"), SITE_PASS.encode("utf-8")):
            note_fail(key)
            return self._json({"error": "Falsche Losung"})
        secure = "; Secure" if self.headers.get("X-Forwarded-Proto") == "https" else ""
        return self._json({"ok": True}, cookie="%s=%s; Path=/; Max-Age=%d; HttpOnly; SameSite=Strict%s"
                          % (GATE_COOKIE, gate_token(), SESSION_TTL, secure))

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
        if route == "gate":
            return self.gate(req)
        if not self._gate_ok():
            self._json({"error": "Pforte verschlossen"}, 403)
            return
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
        if not NAME_RE.match(user):
            return {"error": "Name: nur Buchstaben, Ziffern, Leerzeichen, _ . -"}
        if not pw:
            return {"error": "Losungswort fehlt"}
        if too_many("reg:" + self._ip(), REG_MAX):
            return {"error": "Zu viele neue Pilger von hier. Warte ein paar Minuten."}
        note_fail("reg:" + self._ip())   # zählt Registrierungen: höchstens REG_MAX je IP und Zeitfenster
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
        pw = str(req.get("pass") or "")[:128]
        key = "login:" + self._ip()
        if too_many(key):
            return {"error": "Zu viele Fehlversuche. Warte ein paar Minuten."}
        c = db()
        row = c.execute("SELECT * FROM accounts WHERE name=?", (user,)).fetchone()
        # gleiche Antwort und gleiche Rechenzeit, ob der Name existiert oder nicht — verrät keine Kontonamen
        ok = secrets.compare_digest(hash_pw(pw, row["salt"] if row else "00" * 16), row["pass"] if row else "")
        if not row or not ok:
            c.close()
            note_fail(key)
            return {"error": "Name oder Losungswort falsch"}
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
