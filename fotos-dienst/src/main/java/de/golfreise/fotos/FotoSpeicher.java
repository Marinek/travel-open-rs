package de.golfreise.fotos;

import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
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

import org.springframework.stereotype.Service;

import com.google.cloud.storage.Blob;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.HttpMethod;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.Storage.BlobListOption;
import com.google.cloud.storage.Storage.SignUrlOption;
import com.google.cloud.storage.StorageOptions;

/**
 * Zugriff auf den Bucket. Layout, getrennt nach Gruppe (z. B. travel-open, schwarz-gegen-rot):
 * <pre>
 *   &lt;gruppe&gt;/orig/JJJJ-MM-TT/&lt;uuid&gt;.&lt;endung&gt;   Original vom Handy
 *   &lt;gruppe&gt;/vorschau/JJJJ-MM-TT/&lt;uuid&gt;.jpg       im Browser verkleinert (ca. 1600 px)
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
    private static final Duration UPLOAD_GUELTIG = Duration.ofMinutes(15);
    private static final Duration ANSEHEN_GUELTIG = Duration.ofHours(12);
    /** Signierte Ansehen-Adressen werden wiederverwendet, solange sie noch so lange gelten. */
    private static final Duration ANSEHEN_REST = Duration.ofHours(6);

    public record Ziel(String url, Map<String, String> headers) {}
    public record UploadZiel(String id, String tag, Ziel orig, Ziel vorschau) {}
    /**
     * @param zeit        Zeitpunkt des Hochladens (ISO mit Zeitzone)
     * @param aufgenommen Aufnahmezeit in Ortszeit, leer wenn unbekannt
     */
    public record Foto(String id, String name, String geschichte, String zeit, String aufgenommen,
                       String vorschau, String orig) {}
    public record Tag(String tag, List<Foto> fotos) {}

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
                    .add(new Foto(id, meta(o, "name"), meta(o, "geschichte"), zeit, aufgenommen, vorschauUrl, origUrl));
            reihenfolge.put(id, sortierung);
        }
        List<Tag> tage = new ArrayList<>();
        nachTag.forEach((t, fotos) -> {
            fotos.sort(Comparator.comparing(f -> reihenfolge.getOrDefault(f.id(), "")));
            tage.add(new Tag(t, fotos));
        });
        return tage;
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
