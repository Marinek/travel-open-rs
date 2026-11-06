#!/usr/bin/env bash
# Richtet den Fotodienst in einem bestehenden GCP-Projekt ein und deployt ihn auf Cloud Run.
# Mehrfach ausführbar: Vorhandenes bleibt, der Dienst wird neu deployt.
#
# Vorher (einmalig, siehe README):
#   gcloud auth login
#   gcloud projects create <projekt-id>
#   gcloud billing projects link <projekt-id> --billing-account=<konto-id>
#
# Einstellungen stehen in fotos-dienst/.env (von Git ausgeschlossen):
#   cp .env.example .env     # einmalig, dann ausfüllen
#   ./setup.sh
#
# Fehlen die Passwörter in .env, fragt das Skript danach und trägt sie dort ein.

set -euo pipefail
cd "$(dirname "$0")"

if ! command -v gcloud >/dev/null; then
  echo "gcloud fehlt. Installieren mit:  brew install --cask gcloud-cli"
  echo "Danach ein neues Terminal öffnen und  gcloud auth login  ausführen (siehe README)."
  exit 1
fi
if ! gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | grep -q .; then
  echo "Nicht bei Google Cloud angemeldet. Bitte zuerst:  gcloud auth login"
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "fotos-dienst/.env fehlt. Bitte anlegen:  cp .env.example .env  und ausfüllen."
  exit 1
fi
chmod 600 .env
set -a; source .env; set +a

: "${PROJEKT:?Bitte PROJEKT in fotos-dienst/.env setzen}"
: "${SEITE:?Bitte SEITE in fotos-dienst/.env setzen (z. B. https://<name>.github.io/tunesien-2026/)}"
REGION="${REGION:-europe-west3}"            # Frankfurt
BUCKET="${BUCKET:-${PROJEKT}-fotos}"
DIENST="fotos-dienst"
SA="${DIENST}@${PROJEKT}.iam.gserviceaccount.com"
ORIGIN="$(echo "$SEITE" | sed -E 's#^(https?://[^/]+).*#\1#')"
ORIGINS="${ORIGIN},http://localhost:8000"

# Ein Passwort pro Reisegruppe (= Woche). Fehlt eins, wird gefragt und in .env eingetragen.
klein() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }
in_env_setzen() {    # $1 = Name, $2 = Wert: vorhandene Zeile ersetzen, sonst anhängen
  local tmp; tmp="$(mktemp)"
  grep -v "^${1}=" .env > "$tmp" || true
  printf '%s=%s\n' "$1" "$2" >> "$tmp"
  cat "$tmp" > .env; rm -f "$tmp"
}
frage_passwort() {   # $1 = Variablenname, $2 = Gruppe
  local wert="${!1:-}" gefragt=""
  while true; do
    if [[ -z "$wert" ]]; then read -r -p "Passwort für ${2}: " wert; gefragt=1; fi
    if [[ ${#wert} -lt 4 ]]; then echo "  ${1}: mindestens 4 Zeichen."; wert=""; continue; fi
    if [[ "$wert" =~ [[:space:],@] ]]; then echo "  ${1}: bitte ohne Leerzeichen, Komma und @."; wert=""; continue; fi
    break
  done
  printf -v "$1" '%s' "$wert"
  if [[ -n "$gefragt" ]]; then in_env_setzen "$1" "$wert"; fi
}
frage_passwort PASSWORT_TRAVEL_OPEN "Travel Open (Woche 1)"
frage_passwort PASSWORT_SCHWARZ_GEGEN_ROT "Schwarz gegen Rot (Woche 2)"
if [[ "$(klein "$PASSWORT_TRAVEL_OPEN")" == "$(klein "$PASSWORT_SCHWARZ_GEGEN_ROT")" ]]; then
  echo "Die beiden Gruppen brauchen verschiedene Passwörter (Groß-/Kleinschreibung zählt nicht)."; exit 1
fi
GRUPPEN="travel-open:${PASSWORT_TRAVEL_OPEN},schwarz-gegen-rot:${PASSWORT_SCHWARZ_GEGEN_ROT}"

gcloud config set project "$PROJEKT" >/dev/null

echo "→ APIs aktivieren"
gcloud services enable run.googleapis.com storage.googleapis.com iamcredentials.googleapis.com \
  cloudbuild.googleapis.com artifactregistry.googleapis.com compute.googleapis.com

echo "→ Bucket gs://${BUCKET} in ${REGION}"
if ! gcloud storage buckets describe "gs://${BUCKET}" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://${BUCKET}" --location="$REGION" \
    --uniform-bucket-level-access --public-access-prevention
fi
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cat > "$TMP/cors.json" <<EOF
[{
  "origin": ["${ORIGIN}", "http://localhost:8000"],
  "method": ["PUT", "GET"],
  "responseHeader": ["Content-Type", "x-goog-meta-name", "x-goog-meta-geschichte"],
  "maxAgeSeconds": 3600
}]
EOF
cat > "$TMP/lifecycle.json" <<EOF
{"rule": [{"action": {"type": "Delete"}, "condition": {"age": 90}}]}
EOF
gcloud storage buckets update "gs://${BUCKET}" --cors-file="$TMP/cors.json" --lifecycle-file="$TMP/lifecycle.json"

# Neu angelegte Service-Accounts sind ein paar Sekunden lang noch nicht überall bekannt
# ("does not exist"). Deshalb Berechtigungen bei Bedarf bis zu 2 Minuten lang wiederholen.
mit_wiederholung() {
  local ausgabe versuch
  for versuch in 1 2 3 4 5 6 7 8 9 10 11 12; do
    if ausgabe="$("$@" 2>&1 >/dev/null)"; then return 0; fi
    if [[ "$ausgabe" != *"does not exist"* && "$ausgabe" != *"not found"* ]]; then echo "$ausgabe" >&2; return 1; fi
    echo "  … Service-Account noch nicht bereit, neuer Versuch in 10 s"
    sleep 10
  done
  echo "$ausgabe" >&2; return 1
}

echo "→ Service-Account ${SA}"
if ! gcloud iam service-accounts describe "$SA" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$DIENST" --display-name="Fotodienst Tunesien 2026"
fi
mit_wiederholung gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member="serviceAccount:${SA}" --role=roles/storage.objectAdmin
# Zum Signieren der Upload-Adressen (IAM signBlob) auf sich selbst
mit_wiederholung gcloud iam service-accounts add-iam-policy-binding "$SA" \
  --member="serviceAccount:${SA}" --role=roles/iam.serviceAccountTokenCreator

# Cloud Build baut mit dem Compute-Standardkonto, das braucht die Builder-Rolle
NUMMER="$(gcloud projects describe "$PROJEKT" --format='value(projectNumber)')"
mit_wiederholung gcloud projects add-iam-policy-binding "$PROJEKT" \
  --member="serviceAccount:${NUMMER}-compute@developer.gserviceaccount.com" \
  --role=roles/run.builder --condition=None

echo "→ Deploy auf Cloud Run (dauert ein paar Minuten)"
gcloud run deploy "$DIENST" --source . --region "$REGION" \
  --service-account "$SA" --allow-unauthenticated \
  --cpu-boost --min-instances 0 --max-instances 3 --memory 512Mi \
  --set-build-env-vars GOOGLE_RUNTIME_VERSION=21 \
  --set-env-vars "^@^FOTOS_BUCKET=${BUCKET}@FOTOS_GRUPPEN=${GRUPPEN}@FOTOS_ORIGIN=${ORIGINS}"

URL="$(gcloud run services describe "$DIENST" --region "$REGION" --format='value(status.url)')"
SEITE="${SEITE%/}/"

cat <<EOF

Fertig.

1. In daten.js eintragen:   fotos: { dienst: "${URL}" }   – dann committen und pushen.

2. Link zur Fotoseite (für beide Gruppen derselbe, kommt auf die QR-Kärtchen):
   ${SEITE}fotos.html

3. Passwörter:
   Travel Open:        ${PASSWORT_TRAVEL_OPEN}
   Schwarz gegen Rot:  ${PASSWORT_SCHWARZ_GEGEN_ROT}

4. Diashow für Fernseher oder Beamer:
   ${SEITE}fotos.html#diashow

5. Kärtchen drucken: qr-karte.html im Browser öffnen.

Alle Einstellungen und Passwörter stehen in fotos-dienst/.env (von Git ausgeschlossen).
EOF
