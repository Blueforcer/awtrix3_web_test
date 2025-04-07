# AWTRIX3 Web Interface Test Server

Einfache Testserver-Scripts zum lokalen Ausführen der modernisierten AWTRIX3 Web-Oberfläche.

## 🚀 Schnellstart

### Windows
```batch
# Doppelklick auf:
start_server.bat

# Oder in der Kommandozeile:
start_server.bat
```

### Linux/macOS
```bash
# Script ausführbar machen (einmalig):
chmod +x start_server.sh

# Server starten:
./start_server.sh
```

### Python direkt
```bash
# Alle Plattformen:
python start_server.py
```

## 📋 Voraussetzungen

- **Python 3.6+** muss installiert sein
- Das Script muss im AWTRIX3 Web-Interface Verzeichnis ausgeführt werden (dort wo `index.html` liegt)

## ⚙️ Optionen

```bash
python start_server.py [OPTIONS]

Optionen:
  -p, --port PORT      Port für den Server (Standard: 8000)
  --host HOST          Host zum Binden (Standard: localhost)
  --no-browser         Browser nicht automatisch öffnen
  --verbose            Ausführliche Protokollierung
  -h, --help           Hilfe anzeigen
```

### Beispiele

```bash
# Standard (Port 8000, Browser öffnet automatisch)
python start_server.py

# Anderer Port
python start_server.py -p 3000

# Ohne Browser-Öffnung
python start_server.py --no-browser

# Verbose Logging auf Port 8080
python start_server.py -p 8080 --verbose

# Von außen erreichbar machen
python start_server.py --host 0.0.0.0 -p 8000
```

## 🌐 Server-Features

- ✅ **CORS-Header** für API-Tests aktiviert
- ✅ **Proper MIME-Types** für ES6-Module
- ✅ **No-Cache Headers** für Entwicklung
- ✅ **Farbige Logs** für bessere Übersicht
- ✅ **Automatische Port-Erkennung** falls Port belegt
- ✅ **Browser auto-open** (optional deaktivierbar)

## 📡 Verfügbare Endpoints

Nach dem Start ist das Interface erreichbar unter:

- **Hauptseite**: `http://localhost:8000/`
- **Dashboard**: `http://localhost:8000/index.html`
- **CSS**: `http://localhost:8000/css/modern-style.css`
- **JavaScript**: `http://localhost:8000/js/script.js`

## 🛑 Server stoppen

- **Ctrl+C** in der Konsole drücken
- Der Server stoppt graceful und zeigt eine Bestätigungsmeldung

## 🔧 Troubleshooting

### "Python not found"
- **Windows**: Python von [python.org](https://python.org) installieren, "Add to PATH" anhaken
- **Ubuntu/Debian**: `sudo apt install python3`
- **macOS**: `brew install python3`

### "Port already in use"
- Der Server findet automatisch einen freien Port
- Oder manuell anderen Port mit `-p` angeben

### "index.html not found"
- Script im richtigen Verzeichnis ausführen (wo `index.html` liegt)
- Pfad mit `cd` wechseln oder Script dorthin kopieren

### Browser öffnet nicht automatisch
- `--no-browser` verwenden und manuell öffnen
- URL aus der Konsole kopieren

## 💡 Entwicklungs-Tipps

- **Live-Reload**: Seite im Browser aktualisieren nach Code-Änderungen
- **DevTools**: F12 für Browser-Entwicklertools
- **CORS**: Alle Origins erlaubt für lokale API-Tests
- **Cache**: Deaktiviert für sofortige Änderungen

## 🎯 Nur für Entwicklung!

⚠️ **Wichtig**: Diese Server-Scripts sind nur für lokale Tests gedacht, nicht für Produktionsumgebungen!