package de.golfreise.fotos;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.channels.Channels;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.zip.Deflater;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.springframework.stereotype.Service;

import com.google.cloud.storage.Blob;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.HttpMethod;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.Storage.BlobListOption;
import com.google.cloud.storage.Storage.SignUrlOption;
import com.google.cloud.storage.StorageOptions;

/**
 * Zugriff auf den Bucket. Layout, getrennt nach Gruppe (z. B. travel-open, schwarz-gegen-rot):
 * <pre>
 *   &lt;gruppe&gt;/orig/JJJJ-MM-TT/&lt;uuid&gt;.&lt;endung&gt;   Original vom Handy (Foto oder Video)
 *   &lt;gruppe&gt;/vorschau/JJJJ-MM-TT/&lt;uuid&gt;.jpg       im Browser verkleinert (ca. 1600 px), bei Videos ein Standbild
 * </pre>
 * Name der Person und die optionale Geschichte stehen URL-kodiert in den Metadaten {@code name} und {@code geschichte},
 * die Aufnahmezeit aus den Bilddaten (Ortszeit) in {@code aufgenommen}. Der Tag im Pfad ist der Aufnahmetag.
 * Es gibt keine Datenbank: die Galerie entsteht aus dem Bucket-Listing.
 */
@Service
public class FotoSpeicher {

    static final String META_NAME = "x-goog-meta-name";
    static final String META_GESCHICHTE = "x-goog-meta-geschichte";
    static final String META_AUFGENOMMEN = "x-goog-meta-aufgenommen";
    private static final DateTimeFormatter ORTSZEIT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss").withZone(ZoneId.of("Africa/Tunis"));
    /** Videos sind groß und das Hotel-WLAN langsam: die Adresse muss gelten, bis der Upload startet. */
    private static final DateTimeFormatter UHRZEIT = DateTimeFormatter.ofPattern("HH-mm");
    private static final Duration UPLOAD_GUELTIG = Duration.ofHours(2);
    private static final Duration ANSEHEN_GUELTIG = Duration.ofHours(12);
    /** Signierte Ansehen-Adressen werden wiederverwendet, solange sie noch so lange gelten. */
    private static final Duration ANSEHEN_REST = Duration.ofHours(6);

    public record Ziel(String url, Map<String, String> headers) {}
    public record UploadZiel(String id, String tag, Ziel orig, Ziel vorschau) {}
    /**
     * @param zeit        Zeitpunkt des Hochladens (ISO mit Zeitzone)
     * @param aufgenommen Aufnahmezeit in Ortszeit, leer wenn unbekannt
     * @param video       true bei Videos: {@code orig} ist dann das Video, {@code vorschau} ein Standbild
     *                    (oder ebenfalls das Video, wenn der Browser kein Standbild erzeugen konnte)
     * @param groesse     Größe des Originals in Bytes (für die Download-Seite)
     */
    public record Foto(String id, String name, String geschichte, String zeit, String aufgenommen,
                       String vorschau, String orig, boolean video, long groesse) {}
    public record Tag(String tag, List<Foto> fotos) {}
    /** Ein Original im ZIP: Objekt im Bucket, Pfad im ZIP (Ordner pro Tag), Aufnahmezeit (Ortszeit, kann fehlen). */
    public record ZipEintrag(String objekt, String pfad, LocalDateTime zeit) {}

    private record Signiert(String url, Instant gueltigBis) {}

    private final Storage storage;
    private final String bucket;
    /**
     * Auf Cloud Run kostet jede Signatur einen Aufruf der IAM-API (signBlob).
     * Deshalb werden Ansehen-Adressen zwischengespeichert.
     */
    private final Map<String, Signiert> cache = new ConcurrentHashMap<>();

    public FotoSpeicher(FotoEinstellungen einstellungen) {
        this.storage = StorageOptions.getDefaultInstance().getService();
        this.bucket = einstellungen.bucket();
    }

    public UploadZiel uploadZiel(String gruppe, String tag, String id, String typ, String endung,
                                 String name, String geschichte, String aufgenommen) {
        Map<String, String> meta = new LinkedHashMap<>();
        meta.put(META_NAME, kodiere(name));
        if (!geschichte.isEmpty()) meta.put(META_GESCHICHTE, kodiere(geschichte));
        if (!aufgenommen.isEmpty()) meta.put(META_AUFGENOMMEN, aufgenommen);
        Ziel orig = putZiel(gruppe + "/orig/" + tag + "/" + id + "." + endung, typ, meta);
        Ziel vorschau = putZiel(gruppe + "/vorschau/" + tag + "/" + id + ".jpg", "image/jpeg", meta);
        return new UploadZiel(id, tag, orig, vorschau);
    }

    private static String kodiere(String text) {
        return URLEncoder.encode(text, StandardCharsets.UTF_8).replace("+", "%20");
    }

    private Ziel putZiel(String objekt, String typ, Map<String, String> meta) {
        Map<String, String> headers = new LinkedHashMap<>();
        headers.put("Content-Type", typ);
        headers.putAll(meta);
        String url = storage.signUrl(
                BlobInfo.newBuilder(bucket, objekt).build(),
                UPLOAD_GUELTIG.toMinutes(), TimeUnit.MINUTES,
                SignUrlOption.httpMethod(HttpMethod.PUT),
                SignUrlOption.withExtHeaders(headers),
                SignUrlOption.withV4Signature()).toString();
        return new Ziel(url, headers);
    }

    /** Alle Fotos (oder die eines Tages), Tage absteigend, Fotos eines Tages nach Uhrzeit. */
    public List<Tag> galerie(String gruppe, String tag) {
        String unter = tag == null ? "" : tag + "/";
        Map<String, Blob> vorschauen = new HashMap<>();
        for (Blob b : storage.list(bucket, BlobListOption.prefix(gruppe + "/vorschau/" + unter)).iterateAll()) {
            vorschauen.put(schluessel(b.getName()), b);
        }
        List<Blob> originale = new ArrayList<>();
        for (Blob b : storage.list(bucket, BlobListOption.prefix(gruppe + "/orig/" + unter)).iterateAll()) {
            originale.add(b);
        }

        // Fehlende Signaturen parallel holen
        List<String> objekte = new ArrayList<>();
        for (Blob o : originale) {
            objekte.add(o.getName());
            Blob v = vorschauen.get(schluessel(o.getName()));
            if (v != null) objekte.add(v.getName());
        }
        Map<String, String> urls = ansehenUrls(objekte);

        Map<String, List<Foto>> nachTag = new TreeMap<>(Comparator.reverseOrder());
        Map<String, String> reihenfolge = new HashMap<>();
        for (Blob o : originale) {
            String[] teile = o.getName().split("/");
            if (teile.length != 4) continue;
            String t = teile[2];
            String id = teile[3].replaceFirst("\\.[^.]*$", "");
            Blob v = vorschauen.get(schluessel(o.getName()));
            String origUrl = urls.get(o.getName());
            String vorschauUrl = v != null ? urls.get(v.getName()) : origUrl;
            String zeit = o.getCreateTimeOffsetDateTime() != null ? o.getCreateTimeOffsetDateTime().toString() : "";
            String aufgenommen = meta(o, "aufgenommen");
            String sortierung = !aufgenommen.isEmpty() ? aufgenommen
                    : o.getCreateTimeOffsetDateTime() != null ? ORTSZEIT.format(o.getCreateTimeOffsetDateTime()) : "";
            nachTag.computeIfAbsent(t, k -> new ArrayList<>())
                    .add(new Foto(id, meta(o, "name"), meta(o, "geschichte"), zeit, aufgenommen, vorschauUrl, origUrl,
                            o.getContentType() != null && o.getContentType().startsWith("video/"),
                            o.getSize() != null ? o.getSize() : 0));
            reihenfolge.put(id, sortierung);
        }
        List<Tag> tage = new ArrayList<>();
        nachTag.forEach((t, fotos) -> {
            fotos.sort(Comparator.comparing(f -> reihenfolge.getOrDefault(f.id(), "")));
            tage.add(new Tag(t, fotos));
        });
        return tage;
    }

    /**
     * Inhalt des ZIP-Downloads: alle Originale der Gruppe (oder eines Tages), nach Tag und Uhrzeit sortiert.
     * Dateinamen wie {@code 2026-11-16/2026-11-16_10-15_Jürgen_ab12cd34.jpg}.
     */
    public List<ZipEintrag> zipInhalt(String gruppe, String tag) {
        String unter = tag == null ? "" : tag + "/";
        List<ZipEintrag> liste = new ArrayList<>();
        for (Blob o : storage.list(bucket, BlobListOption.prefix(gruppe + "/orig/" + unter)).iterateAll()) {
            String[] teile = o.getName().split("/");
            if (teile.length != 4) continue;
            String t = teile[2], datei = teile[3];
            int punkt = datei.lastIndexOf('.');
            String id = punkt > 0 ? datei.substring(0, punkt) : datei;
            String endung = punkt > 0 ? datei.substring(punkt + 1) : "jpg";
            String text = meta(o, "aufgenommen");
            if (text.isEmpty() && o.getCreateTimeOffsetDateTime() != null) text = ORTSZEIT.format(o.getCreateTimeOffsetDateTime());
            LocalDateTime zeit = null;
            try {
                if (!text.isEmpty()) zeit = LocalDateTime.parse(text);
            } catch (DateTimeParseException e) {
                // ohne Uhrzeit im Namen
            }
            StringBuilder name = new StringBuilder(t);
            if (zeit != null && zeit.toLocalDate().toString().equals(t)) name.append('_').append(UHRZEIT.format(zeit));
            String wer = dateiname(meta(o, "name"));
            if (!wer.isEmpty()) name.append('_').append(wer);
            name.append('_').append(id, 0, Math.min(8, id.length())).append('.').append(endung);
            liste.add(new ZipEintrag(o.getName(), t + "/" + name, zeit));
        }
        liste.sort(Comparator.comparing(ZipEintrag::pfad));
        return liste;
    }

    /** Schreibt das ZIP direkt aus dem Bucket in den Ausgabestrom (auch bei mehreren GB kein Zwischenspeicher). */
    public void zipSchreiben(List<ZipEintrag> eintraege, OutputStream out) throws IOException {
        ZipOutputStream zip = new ZipOutputStream(out, StandardCharsets.UTF_8);
        zip.setLevel(Deflater.NO_COMPRESSION);   // JPEG, HEIC und Videos sind schon komprimiert
        for (ZipEintrag e : eintraege) {
            ZipEntry z = new ZipEntry(e.pfad());
            if (e.zeit() != null) z.setTimeLocal(e.zeit());
            zip.putNextEntry(z);
            try (InputStream in = Channels.newInputStream(storage.reader(BlobId.of(bucket, e.objekt())))) {
                in.transferTo(zip);
            }
            zip.closeEntry();
        }
        zip.finish();
        zip.flush();
    }

    /** Name der Person für einen Dateinamen: nur Buchstaben, Ziffern und -, höchstens 30 Zeichen. */
    static String dateiname(String name) {
        String s = name.replaceAll("[^\\p{L}\\p{N}-]+", "_").replaceAll("^_+|_+$", "");
        return s.length() > 30 ? s.substring(0, 30) : s;
    }

    private Map<String, String> ansehenUrls(List<String> objekte) {
        Instant grenze = Instant.now().plus(ANSEHEN_REST);
        List<String> fehlend = objekte.stream()
                .filter(o -> {
                    Signiert s = cache.get(o);
                    return s == null || s.gueltigBis().isBefore(grenze);
                })
                .toList();
        if (!fehlend.isEmpty()) {
            try (ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor()) {
                for (String o : fehlend) {
                    pool.submit(() -> cache.put(o, signiereAnsehen(o)));
                }
            }
        }
        Map<String, String> urls = new HashMap<>();
        for (String o : objekte) {
            Signiert s = cache.get(o);
            if (s != null) urls.put(o, s.url());
        }
        return urls;
    }

    private Signiert signiereAnsehen(String objekt) {
        Instant bis = Instant.now().plus(ANSEHEN_GUELTIG);
        String url = storage.signUrl(
                BlobInfo.newBuilder(bucket, objekt).build(),
                ANSEHEN_GUELTIG.toMinutes(), TimeUnit.MINUTES,
                SignUrlOption.withV4Signature()).toString();
        return new Signiert(url, bis);
    }

    /** "g/orig/2026-11-12/abc.heic" und "g/vorschau/2026-11-12/abc.jpg" werden zu "2026-11-12/abc". */
    private static String schluessel(String objekt) {
        int zweiter = objekt.indexOf('/', objekt.indexOf('/') + 1);
        return objekt.substring(zweiter + 1).replaceFirst("\\.[^./]*$", "");
    }

    private static String meta(Blob b, String schluessel) {
        Map<String, String> meta = b.getMetadata();
        String roh = meta == null ? null : meta.get(schluessel);
        if (roh == null) return "";
        try {
            return URLDecoder.decode(roh, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            return roh;
        }
    }
}
