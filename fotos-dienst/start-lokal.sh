#!/usr/bin/env bash
# Startet Reiseseite und Fotoseite lokal: http://localhost:8000/fotos.html
#
#   ./start-lokal.sh         ohne Google Cloud: nachgebauter Fotodienst, Fotos nur im Speicher
#   ./start-lokal.sh echt    mit echtem Bucket: Spring-Boot-Dienst auf :8080 + Seite auf :8000
#                            (Projekt bzw. Bucket aus fotos-dienst/.env, siehe README)
#
# Beenden mit Ctrl+C. daten.js wird nicht verändert.

set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(cd .. && pwd)"
MODUS="${1:-mock}"
# Passwörter lokal: test (Travel Open), test2 (Schwarz gegen Rot)
SEITE="http://localhost:8000/fotos.html"

belegt() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }
oeffne() { [[ -n "${KEIN_BROWSER:-}" ]] || (sleep 1.5; command -v open >/dev/null && open "$SEITE") & }

command -v node >/dev/null || { echo "Node.js fehlt (https://nodejs.org)."; exit 1; }
if belegt 8000; then echo "Port 8000 ist schon belegt – läuft noch ein anderer Server?"; exit 1; fi

case "$MODUS" in
  mock)
    echo "Öffne $SEITE – Passwörter: test (Travel Open), test2 (Schwarz gegen Rot)"
    oeffne
    exec node mock.mjs "$ROOT"
    ;;

  echt)
    if [[ -f .env ]]; then set -a; source .env; set +a; fi
    BUCKET="${FOTOS_BUCKET:-${BUCKET:-${PROJEKT:+${PROJEKT}-fotos}}}"
    if [[ -z "$BUCKET" ]]; then
      echo "Kein Bucket bekannt. Bitte PROJEKT in fotos-dienst/.env setzen (Vorlage: .env.example)."
      exit 1
    fi
    if belegt 8080; then echo "Port 8080 ist schon belegt."; exit 1; fi

    echo "→ Dienst bauen"
    ./gradlew -q bootJar
    JAR="$(ls build/libs/*.jar | head -1)"

    echo "→ Dienst starten (Bucket $BUCKET)"
    FOTOS_BUCKET="$BUCKET" FOTOS_GRUPPEN=travel-open:test,schwarz-gegen-rot:test2 \
      FOTOS_ORIGIN=http://localhost:8000 PORT=8080 java -jar "$JAR" &
    DIENST_PID=$!
    SEITE_PID=""
    aufraeumen() { kill $DIENST_PID $SEITE_PID 2>/dev/null || true; }
    trap aufraeumen EXIT
    trap 'exit 130' INT TERM

    for _ in $(seq 1 60); do
      code="$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/api/galerie || true)"
      [[ "$code" != "000" ]] && break
      kill -0 "$DIENST_PID" 2>/dev/null || { echo "Dienst ist abgestürzt (Ausgabe oben)."; exit 1; }
      sleep 1
    done

    echo "Öffne $SEITE – Passwörter: test (Travel Open), test2 (Schwarz gegen Rot)"
    oeffne
    node mock.mjs "$ROOT" --dienst http://localhost:8080 &
    SEITE_PID=$!
    wait $SEITE_PID
    ;;

  *)
    echo "Aufruf: ./start-lokal.sh [echt]"
    exit 1
    ;;
esac
