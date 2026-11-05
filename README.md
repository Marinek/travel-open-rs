# Golfreise Tunesien 2026

Ablaufprogramm für **Travel Open** (07.–14.11.) und **Schwarz gegen Rot** (14.–21.11.) als statische Seite für GitHub Pages, mit iCal-Download.

## Online stellen

1. Neues Repository auf GitHub anlegen, z. B. `tunesien-2026`.
2. Alle Dateien aus diesem Ordner hochladen (`index.html`, `daten.js`, die drei `.ics`-Dateien, `kalender.mjs`).
3. Im Repository: **Settings → Pages → Source: Deploy from a branch**, Branch `main`, Ordner `/ (root)`, speichern.
4. Nach ein bis zwei Minuten ist die Seite unter `https://<dein-name>.github.io/tunesien-2026/` erreichbar.

Hinweis: Ein öffentliches Repository und eine öffentliche Seite sind für jeden mit dem Link sichtbar.

## Etwas ändern

Alle Termine stehen in **`daten.js`**, sonst muss nichts angefasst werden.

- Uhrzeit oder Text ändern: den Eintrag im passenden Tag anpassen.
- Spielstand Schwarz gegen Rot: `stand: { schwarz: 3, rot: 2 }` eintragen.
- Travel-Open-Sieger: `sieger: "Name"` eintragen.

Danach die Kalenderdateien neu erzeugen (Node.js ab Version 18):

```
node kalender.mjs
```

Dann alles committen und pushen. Wer den Kalender **abonniert** hat (Link „Kalender abonnieren“ auf der Seite), bekommt Änderungen automatisch. Wer die Datei nur einmal importiert hat, muss sie neu laden.

## Lokal ansehen

```
python3 -m http.server 8000
```

und `http://localhost:8000` öffnen. Zum Testen eines bestimmten Reisetags in der Browser-Konsole vor dem Laden `window.HEUTE = "2026-11-12"` setzen oder die Zeile in `index.html` anpassen.
