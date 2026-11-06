// Erzeugt die iCal-Dateien aus daten.js.
// Aufruf im Projektordner:  node kalender.mjs
//
// Ergebnis:
//   travel-open-2026.ics        nur Woche 1
//   schwarz-gegen-rot-2026.ics  nur Woche 2

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const REISE = require("./daten.js");

const OFFSET_STUNDEN = 1; // Tunesien: ganzjährig UTC+1, keine Sommerzeit
const DOMAIN = "golfreise-tunesien-2026";
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

const esc = (s) =>
  String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// Zeilen nach RFC 5545 bei 75 Byte umbrechen (Umlaute zählen doppelt)
function fold(line) {
  const enc = new TextEncoder();
  const out = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74;
    if (bytes + b > limit) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}

const ymd = (d) => d.replace(/-/g, "");

function utc(datum, hhmm) {
  const [y, m, d] = datum.split("-").map(Number);
  const [h, min] = hhmm.split(":").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, h - OFFSET_STUNDEN, min));
  return t.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
}

function plusTag(datum) {
  const [y, m, d] = datum.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

function plusStunden(hhmm, h) {
  const [a, b] = hhmm.split(":").map(Number);
  const v = Math.min(a + h, 23);
  return `${String(v).padStart(2, "0")}:${a + h > 23 ? "59" : String(b).padStart(2, "0")}`;
}

function tagesText(tag) {
  const z = [];
  if (tag.motto) z.push(tag.motto);
  if (tag.zusatz) z.push(tag.zusatz);
  for (const it of tag.items) z.push(`${it.t ? (it.ab ? "ab " : "") + it.t + "  " : ""}${it.x}`);
  if (tag.abschlag) {
    z.push("");
    z.push("Abschlagzeiten:");
    tag.abschlag.zeiten.forEach((t, i) => z.push(`${tag.abschlag.label} ${i + 1}: ${t}`));
  }
  if (tag.sonderpreise) {
    z.push("");
    z.push(`Sonderpreise, gesponsert von ${tag.sonderpreise.von}:`);
    tag.sonderpreise.preise.forEach((p) => z.push(`- ${p}`));
  }
  if (tag.liste) {
    z.push("");
    tag.liste.forEach((p) => z.push(`- ${p}`));
  }
  if (tag.wichtig) {
    z.push("");
    z.push(tag.wichtig);
  }
  z.push("");
  z.push(REISE.hinweis);
  return z.join("\n");
}

function termineFuer(woche) {
  const ev = [];
  const pre = woche.name;
  for (const tag of woche.tage) {
    const uid = (k) => `${tag.datum}-${k}-${woche.id}@${DOMAIN}`;
    const text = tagesText(tag);

    if (tag.geburtstag) {
      ev.push({ uid: uid("geburtstag"), ganztags: tag.datum, titel: `🎂 Geburtstag ${tag.geburtstag}`, text: `Happy Birthday, ${tag.geburtstag}!` });
    }

    if (tag.art === "golf") {
      const go = tag.items.find((i) => i.go);
      const back = tag.items.find((i) => i.back);
      const tee = tag.items.find((i) => i.tee);
      ev.push({
        uid: uid("golf"),
        start: utc(tag.datum, go.t),
        ende: utc(tag.datum, back.t),
        titel: `⛳ ${pre}: ${tag.titel} – ${tag.platz}`,
        ort: tag.platz,
        text: `Bus ${go.t}, erster Abschlag ${tee.t}, Abholung ${back.t}\n\n${text}`
      });
    } else {
      const titel = {
        anreise: `${pre}: Anreise`,
        abreise: `${pre}: Abreise`,
        frei: `${pre}: Freier Tag`,
        ausflug: `${pre}: ${tag.titel}`
      }[tag.art];
      ev.push({ uid: uid(tag.art), ganztags: tag.datum, titel, text });
    }

    const eve = tag.items.find((i) => i.eve);
    if (eve) {
      const titel = tag.finale
        ? "Siegerehrung & Gala-Abend"
        : eve.x.includes("Siegerehrung")
          ? "Siegerehrung & Abendessen"
          : "Abendessen";
      ev.push({
        uid: uid("abend"),
        start: utc(tag.datum, eve.t),
        ende: utc(tag.datum, eve.bis || plusStunden(eve.t, 3)),
        titel: `${pre}: ${titel}`,
        ort: "Hotel, Treffpunkt an der Bar",
        text: tag.items.slice(tag.items.indexOf(eve)).map((i) => `${i.t ? i.t + "  " : ""}${i.x}`).join("\n")
      });
    }

    const flug = tag.items.find((i) => i.flug);
    if (flug) {
      ev.push({
        uid: uid("flug"),
        start: utc(tag.datum, flug.t),
        ende: utc(tag.datum, plusStunden(flug.t, 1)),
        titel: `✈ Abholung zum Flug nach Köln (ca. ${flug.t})`,
        ort: "Hotel",
        text: `${REISE.rueckflug}\n\n${REISE.hinweis}`
      });
    }
  }
  return ev;
}

function ics(name, termine) {
  const L = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Golfreise Tunesien 2026//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(name)}`,
    "X-WR-TIMEZONE:Africa/Tunis",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H"
  ];
  for (const e of termine) {
    L.push("BEGIN:VEVENT");
    L.push(`UID:${e.uid}`);
    L.push(`DTSTAMP:${stamp}`);
    if (e.ganztags) {
      L.push(`DTSTART;VALUE=DATE:${ymd(e.ganztags)}`);
      L.push(`DTEND;VALUE=DATE:${ymd(plusTag(e.ganztags))}`);
      L.push("TRANSP:TRANSPARENT");
    } else {
      L.push(`DTSTART:${e.start}`);
      L.push(`DTEND:${e.ende}`);
    }
    L.push(`SUMMARY:${esc(e.titel)}`);
    if (e.ort) L.push(`LOCATION:${esc(e.ort)}`);
    if (e.text) L.push(`DESCRIPTION:${esc(e.text)}`);
    L.push("END:VEVENT");
  }
  L.push("END:VCALENDAR");
  return L.map(fold).join("\r\n") + "\r\n";
}

const [w1, w2] = REISE.wochen;
const t1 = termineFuer(w1);
const t2 = termineFuer(w2);

const dateien = [
  ["travel-open-2026.ics", `Tunesien 2026 – ${w1.name}`, t1],
  ["schwarz-gegen-rot-2026.ics", `Tunesien 2026 – ${w2.name}`, t2]
];

for (const [datei, name, termine] of dateien) {
  writeFileSync(new URL(datei, import.meta.url), ics(name, termine));
  console.log(`${datei}: ${termine.length} Termine`);
}
