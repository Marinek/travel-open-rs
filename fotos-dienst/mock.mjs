// Lokaler Server für die Reiseseite und die Fotoseite (fotos.html) auf http://localhost:8000
//
//   node mock.mjs <projektordner>                  Seite + nachgebauter Fotodienst (ohne Google Cloud,
//                                                  Fotos liegen nur im Arbeitsspeicher)
//   node mock.mjs <projektordner> --dienst <url>   nur die Seite, Fotos über den angegebenen Dienst
//
// In beiden Fällen wird in daten.js die Dienst-Adresse beim Ausliefern ersetzt,
// die Datei selbst bleibt unverändert.
// Passwörter im Mock: test (Travel Open), test2 (Schwarz gegen Rot).
// Download-Links im Mock: fotos.html#download=download-test-travel-open bzw. …-schwarz-gegen-rot

import http from "node:http";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { crc32 } from "node:zlib";
import { extname, join, normalize } from "node:path";

const ROOT = process.argv[2];
if (!ROOT) { console.error("Aufruf: node mock.mjs <projektordner> [--dienst <url>]"); process.exit(1); }
const i = process.argv.indexOf("--dienst");
const DIENST = i > 0 ? process.argv[i + 1] : null;
const PORT = 8000, B = `http://localhost:${PORT}`;
const GRUPPEN = { test: "travel-open", test2: "schwarz-gegen-rot" };
const DOWNLOADS = { "download-test-travel-open": "travel-open", "download-test-schwarz-gegen-rot": "schwarz-gegen-rot" };
const TYPEN = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".ics": "text/calendar; charset=utf-8", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" };

const objekte = new Map(); // Objektname -> { typ, name, daten, zeit }
const heute = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis" }).format(new Date());
const cors = { "Access-Control-Allow-Origin": "*" };
const json = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json", ...cors }); res.end(obj ? JSON.stringify(obj) : ""); };

function galerie(g, nur) {
  const tage = {};
  for (const [n, o] of objekte) {
    if (!n.startsWith(`${g}/orig/`)) continue;
    const [, , tag, datei] = n.split("/");
    if (nur && nur !== tag) continue;
    const id = datei.replace(/\.[^.]*$/, ""), v = `${g}/vorschau/${tag}/${id}.jpg`;
    (tage[tag] ||= []).push({ id, name: decodeURIComponent(o.name), geschichte: decodeURIComponent(o.geschichte), zeit: o.zeit, aufgenommen: o.aufgenommen,
      vorschau: `${B}/obj/${objekte.has(v) ? v : n}`, orig: `${B}/obj/${n}`, video: (o.typ || "").startsWith("video/"), groesse: o.daten.length });
  }
  const reihe = f => f.aufgenommen || f.zeit;
  return { gruppe: g, tage: Object.keys(tage).sort().reverse().map(tag => ({ tag, fotos: tage[tag].sort((x, y) => reihe(x) < reihe(y) ? -1 : 1) })) };
}

// Minimales ZIP ohne Kompression (wie der echte Dienst: ein Ordner pro Tag)
function zip(dateien) {
  const teile = [], verzeichnis = [];
  let pos = 0;
  for (const { pfad, daten } of dateien) {
    const name = Buffer.from(pfad), crc = crc32(daten);
    const kopf = Buffer.alloc(30);
    kopf.writeUInt32LE(0x04034b50, 0); kopf.writeUInt16LE(20, 4); kopf.writeUInt16LE(0x0800, 6);
    kopf.writeUInt32LE(crc, 14); kopf.writeUInt32LE(daten.length, 18); kopf.writeUInt32LE(daten.length, 22); kopf.writeUInt16LE(name.length, 26);
    const z = Buffer.alloc(46);
    z.writeUInt32LE(0x02014b50, 0); z.writeUInt16LE(20, 4); z.writeUInt16LE(20, 6); z.writeUInt16LE(0x0800, 8);
    z.writeUInt32LE(crc, 16); z.writeUInt32LE(daten.length, 20); z.writeUInt32LE(daten.length, 24); z.writeUInt16LE(name.length, 28); z.writeUInt32LE(pos, 42);
    teile.push(kopf, name, daten); verzeichnis.push(z, name);
    pos += 30 + name.length + daten.length;
  }
  const v = Buffer.concat(verzeichnis), ende = Buffer.alloc(22);
  ende.writeUInt32LE(0x06054b50, 0); ende.writeUInt16LE(dateien.length, 8); ende.writeUInt16LE(dateien.length, 10);
  ende.writeUInt32LE(v.length, 12); ende.writeUInt32LE(pos, 16);
  return Buffer.concat([...teile, v, ende]);
}

function download(req, res, u) {
  const [, , token, was] = u.pathname.split("/");
  const g = DOWNLOADS[token];
  if (!g || req.method !== "GET") return json(res, 404);
  const nur = u.searchParams.get("tag");
  if (was === "galerie") return json(res, 200, galerie(g, null));
  if (was === "fotos.zip") {
    const dateien = [...objekte].filter(([n]) => n.startsWith(`${g}/orig/${nur ? nur + "/" : ""}`)).map(([n, o]) => {
      const [, , tag, datei] = n.split("/"), wer = decodeURIComponent(o.name).replace(/[^\p{L}\p{N}-]+/gu, "_").replace(/^_+|_+$/g, "");
      return { pfad: `${tag}/${tag}${o.aufgenommen ? "_" + o.aufgenommen.slice(11, 16).replace(":", "-") : ""}${wer ? "_" + wer : ""}_${datei.slice(0, 8)}${datei.slice(datei.lastIndexOf("."))}`, daten: o.daten };
    }).sort((a, b) => a.pfad < b.pfad ? -1 : 1);
    res.writeHead(200, { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="tunesien-2026-${g}${nur ? "-" + nur : ""}.zip"` });
    return res.end(zip(dateien));
  }
  return json(res, 404);
}

function api(req, res, u, body) {
  let pw = "";
  try { pw = decodeURIComponent(req.headers["x-fotos-passwort"] || "").trim().toLowerCase(); } catch {}
  const g = GRUPPEN[pw];
  if (!g) return json(res, 401);
  if (req.method === "GET" && u.pathname === "/api/anmelden") return json(res, 200, { gruppe: g });
  if (req.method === "POST" && u.pathname === "/api/upload-adressen") {
    const a = JSON.parse(body), h = heute();
    // wie der echte Dienst: Tag der Aufnahme, wenn glaubwürdig (nicht Zukunft, höchstens 60 Tage alt)
    const gueltig = d => { const t = (d.aufgenommen || "").slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(d.aufgenommen || "") && t <= h && (new Date(h) - new Date(t)) / 864e5 <= 60; };
    const meta = { "x-goog-meta-name": encodeURIComponent(a.name || "") };
    if (a.geschichte) meta["x-goog-meta-geschichte"] = encodeURIComponent(a.geschichte.slice(0, 500));
    return json(res, 200, { gruppe: g, dateien: a.dateien.map(d => {
      const id = randomUUID(), ok = gueltig(d);
      const tag = ok ? d.aufgenommen.slice(0, 10) : h, auf = ok ? d.aufgenommen.slice(0, 19) : "";
      const m = auf ? { ...meta, "x-goog-meta-aufgenommen": auf } : meta;
      return {
        id,
        tag,
        orig: { url: `${B}/put/${g}/orig/${tag}/${id}.${(d.typ || "").startsWith("video/") ? "mp4" : "jpg"}`, headers: { "Content-Type": d.typ, ...m } },
        vorschau: { url: `${B}/put/${g}/vorschau/${tag}/${id}.jpg`, headers: { "Content-Type": "image/jpeg", ...m } }
      };
    }) });
  }
  if (req.method === "GET" && u.pathname === "/api/galerie") return json(res, 200, galerie(g, u.searchParams.get("tag")));
  return json(res, 404);
}

http.createServer((req, res) => {
  const u = new URL(req.url, B);
  const teile = [];
  req.on("data", c => teile.push(c));
  req.on("end", () => {
    const body = Buffer.concat(teile);
    if (!DIENST) {
      if (req.method === "OPTIONS") {
        res.writeHead(204, { ...cors, "Access-Control-Allow-Methods": "*", "Access-Control-Allow-Headers": "*" });
        return res.end();
      }
      if (u.pathname.startsWith("/api/")) return api(req, res, u, body);
      if (u.pathname.startsWith("/download/")) return download(req, res, u);
      if (req.method === "PUT" && u.pathname.startsWith("/put/")) {
        const n = u.pathname.slice(5);
        objekte.set(n, { typ: req.headers["content-type"], name: req.headers["x-goog-meta-name"] || "",
          geschichte: req.headers["x-goog-meta-geschichte"] || "", aufgenommen: req.headers["x-goog-meta-aufgenommen"] || "", daten: body, zeit: new Date().toISOString() });
        console.log("Foto gespeichert:", n, `(${Math.round(body.length / 1024)} KB)`);
        res.writeHead(200, cors);
        return res.end();
      }
      if (u.pathname.startsWith("/obj/")) {
        const o = objekte.get(u.pathname.slice(5));
        if (!o) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { "Content-Type": o.typ });
        return res.end(o.daten);
      }
    }
    // Statische Dateien der Reiseseite
    const pfad = normalize(decodeURIComponent(u.pathname === "/" ? "/index.html" : u.pathname));
    if (pfad.includes("..")) { res.writeHead(403); return res.end(); }
    try {
      let d = readFileSync(join(ROOT, pfad));
      if (pfad === "/daten.js") d = d.toString().replace(/dienst:\s*"[^"]*"/, `dienst: "${DIENST || B}"`);
      res.writeHead(200, { "Content-Type": TYPEN[extname(pfad)] || "application/octet-stream" });
      res.end(d);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
}).listen(PORT, () => {
  console.log(DIENST ? `Seite auf ${B}, Fotodienst: ${DIENST}` : `Seite und nachgebauter Fotodienst auf ${B} (Fotos nur im Speicher)`);
});
