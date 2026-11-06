# Golfreise Tunesien 2026

Ablaufprogramm für **Travel Open** (07.–14.11.) und **Schwarz gegen Rot** (14.–21.11.) als statische Seite für GitHub Pages, mit iCal-Download.

## Online stellen

1. Neues Repository auf GitHub anlegen, z. B. `tunesien-2026`.
2. Alle Dateien aus diesem Ordner hochladen (`index.html`, `fotos.html`, `daten.js`, die beiden `.ics`-Dateien, `kalender.mjs`, den Ordner `fotos-dienst/`).
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

Es entstehen zwei Kalender, einer pro Reisegruppe: `travel-open-2026.ics` und `schwarz-gegen-rot-2026.ics`. Auf der Seite gibt es den Download jeweils nur für die gerade gezeigte Woche, auf der Fotoseite für die angemeldete Gruppe. Einen gemeinsamen Kalender für beide Wochen und ein Kalender-Abo gibt es nicht.

Dann alles committen und pushen. Wer die Termine schon importiert hat, muss die Datei nach Änderungen neu laden.

## Fotos sammeln

Die Fotos haben eine eigene Seite, unabhängig vom Programm: **`fotos.html`** (z. B. `https://<dein-name>.github.io/tunesien-2026/fotos.html`). Ein QR-Code auf Kärtchen führt dorthin. Hochladen geht ohne Login und ohne App, nur mit einem kleinen Passwort.

- **Zwei getrennte Reisegruppen:** Travel Open und Schwarz gegen Rot haben je ein eigenes Passwort, und das Passwort bestimmt die Gruppe. Jede Gruppe sieht nur ihre eigenen Fotos. Ein Gerät ist immer in genau einer Gruppe angemeldet. Für die andere Gruppe unten auf der Seite „Abmelden“ tippen und das andere Passwort eingeben.
- **Passwort:** Es wird einmal eingegeben und auf dem Handy gemerkt. Der Server prüft es bei jeder Anfrage. Groß- und Kleinschreibung zählt nicht. Nach 10 falschen Versuchen ist die Adresse 15 Minuten gesperrt.
- **Kleine Geschichte:** Zu den Fotos, die man gerade hochlädt, kann man optional einen kurzen Text schreiben (bis 500 Zeichen). Er erscheint in der Großansicht und in der Diashow.
- **Galerie und Diashow:** Die Galerie ist nach Reisetagen sortiert. **Diashow heute** zeigt die Fotos des Tages im Vollbild, etwa bei der Siegerehrung am Fernseher. Neue Bilder kommen jede Minute dazu. Direkt geht es über `…/fotos.html#diashow`.
- **Löschen kann niemand über die Seite**, siehe „Ein Foto löschen“ unten.

Die Bilder gehen direkt vom Handy in einen Cloud-Storage-Bucket in Frankfurt. Der kleine Spring-Boot-Dienst in [`fotos-dienst/`](fotos-dienst/) prüft das Passwort, stellt signierte Upload-Adressen aus und liefert die Galerie.

### Einmalig einrichten

Voraussetzung ist die [gcloud CLI](https://cloud.google.com/sdk/docs/install).

```
gcloud auth login
gcloud projects create tunesien-2026-fotos          # Projekt-ID muss weltweit eindeutig sein
gcloud billing accounts list                        # Konto-ID heraussuchen
gcloud billing projects link tunesien-2026-fotos --billing-account=XXXXXX-XXXXXX-XXXXXX

cd fotos-dienst
cp .env.example .env        # dann .env ausfüllen
./setup.sh
```

Alle Einstellungen stehen in **`fotos-dienst/.env`**: `PROJEKT`, `SEITE`, die beiden Passwörter und optional `REGION` und `BUCKET`. Die Datei ist von Git ausgeschlossen, ins Repo gehört nur die Vorlage `.env.example`. Passwörter: mindestens 4 Zeichen, ohne Leerzeichen, Komma und @, und verschieden. Lässt du sie leer, fragt das Skript danach und trägt sie in `.env` ein.

Das Skript aktiviert die APIs und aktiviert es die APIs und legt den Bucket an (Frankfurt, privat, löscht alles nach 90 Tagen). Es richtet den Service-Account ein und deployt den Dienst auf Cloud Run. Der Dienst skaliert auf null, die Kosten liegen bei wenigen Euro. Am Ende gibt das Skript die **Dienst-URL** aus. Sie gehört in `daten.js` unter `fotos: { dienst: "…" }`, dann committen und pushen.

Ein erneuter Aufruf von `setup.sh` nutzt dieselbe `.env` und deployt den Dienst neu.

### Kärtchen drucken

`fotos-dienst/qr-karte.html` im Browser öffnen und den Link zur Fotoseite einfügen. Dann die Gruppe wählen und das Passwort aufdrucken oder das Feld leer lassen. Gedruckt wird auf A4 mit vier A6-Kärtchen, danach dasselbe für die andere Gruppe. Die Kärtchen tragen den Gruppennamen und die Farben ihrer Woche: blau für Travel Open, schwarz-rot für Schwarz gegen Rot. Der QR-Code entsteht nur im Browser.

### Passwort wechseln

In `fotos-dienst/.env` den Wert ändern (`PASSWORT_TRAVEL_OPEN` oder `PASSWORT_SCHWARZ_GEGEN_ROT`) und `setup.sh` noch einmal ausführen. Wer das alte Passwort gespeichert hat, wird auf der Fotoseite nach dem neuen gefragt. Die andere Gruppe merkt davon nichts.

### Ein Foto löschen

Das geht nur direkt im Bucket. In der [Cloud Console](https://console.cloud.google.com/storage/browser) unter `<gruppe>/orig/<tag>/` das Foto suchen und unter `<gruppe>/vorschau/<tag>/` die Vorschau mit derselben ID, dann beide löschen. Die ID steht auch im Link „Original“ in der Großansicht. Per Kommandozeile:

```
gcloud storage rm "gs://tunesien-2026-fotos-fotos/travel-open/*/2026-11-12/<id>.*"
```

### Nach der Reise

```
gcloud storage cp -r gs://tunesien-2026-fotos-fotos/travel-open/orig ./fotos-travel-open
gcloud storage cp -r gs://tunesien-2026-fotos-fotos/schwarz-gegen-rot/orig ./fotos-schwarz-gegen-rot
```

lädt die Originale je Gruppe herunter, sortiert in Ordnern pro Tag. Name und Geschichte stehen in den Metadaten jedes Fotos (`gcloud storage objects describe …`). Nach 90 Tagen löscht der Bucket die Fotos selbst. Wer früher aufräumen will, löscht den Cloud-Run-Dienst und den Bucket oder gleich das ganze Projekt (`gcloud projects delete …`).

### Lokal starten

```
./fotos-dienst/start-lokal.sh
```

Startet Programm und Fotoseite auf `http://localhost:8000` mit einem nachgebauten Fotodienst und öffnet `fotos.html`. Google Cloud braucht es dafür nicht. Passwörter: `test` (Travel Open) und `test2` (Schwarz gegen Rot). Die Fotos liegen nur im Speicher und sind nach dem Beenden (Ctrl+C) weg. Voraussetzung ist Node.js.

Mit dem **echten Bucket** (Java 21 nötig, `setup.sh` muss gelaufen sein):

```
# einmalig: dein Konto darf im Namen des Dienstes signieren
gcloud iam service-accounts add-iam-policy-binding fotos-dienst@<projekt>.iam.gserviceaccount.com \
  --member=user:<deine-mail> --role=roles/iam.serviceAccountTokenCreator
gcloud auth application-default login --impersonate-service-account=fotos-dienst@<projekt>.iam.gserviceaccount.com

./fotos-dienst/start-lokal.sh echt      # Projekt/Bucket aus fotos-dienst/.env
```

Das baut den Spring-Boot-Dienst und startet ihn auf `:8080`, die Seite läuft auf `:8000`, mit denselben lokalen Passwörtern. In beiden Fällen wird `daten.js` nicht verändert. Die lokale Dienst-Adresse wird nur beim Ausliefern eingesetzt.

Tests des Dienstes: `cd fotos-dienst && ./gradlew test`.

## Lokal ansehen

```
python3 -m http.server 8000
```

und `http://localhost:8000` öffnen. Zum Testen eines bestimmten Reisetags in der Browser-Konsole vor dem Laden `window.HEUTE = "2026-11-12"` setzen oder die Zeile in `index.html` anpassen.
