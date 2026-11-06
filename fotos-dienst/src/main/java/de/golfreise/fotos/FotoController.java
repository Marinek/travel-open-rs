package de.golfreise.fotos;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Hochladen und Ansehen. Löschen gibt es bewusst nicht (das macht der Organisator direkt im Bucket). */
@RestController
@RequestMapping("/api")
public class FotoController {

    static final int MAX_DATEIEN = 30;
    static final int MAX_NAME = 40;
    static final int MAX_GESCHICHTE = 500;
    private static final Pattern TAG = Pattern.compile("\\d{4}-\\d{2}-\\d{2}");
    private static final Map<String, String> ENDUNG = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/heic", "heic",
            "image/heif", "heif",
            "image/webp", "webp",
            "image/gif", "gif");

    private final FotoSpeicher speicher;
    private final Clock uhr;

    public FotoController(FotoSpeicher speicher, Clock uhr) {
        this.speicher = speicher;
        this.uhr = uhr;
    }

    public record Datei(String typ) {}
    public record UploadAnfrage(String name, String geschichte, List<Datei> dateien) {}
    public record UploadAntwort(String gruppe, String tag, List<FotoSpeicher.UploadZiel> dateien) {}
    public record Galerie(String gruppe, List<FotoSpeicher.Tag> tage) {}
    public record Anmeldung(String gruppe) {}

    /** Prüft das Passwort (das macht der Filter) und sagt, zu welcher Gruppe es gehört. */
    @GetMapping("/anmelden")
    public Anmeldung anmelden(@RequestAttribute(PasswortFilter.GRUPPE) String gruppe) {
        return new Anmeldung(gruppe);
    }

    @PostMapping("/upload-adressen")
    public UploadAntwort uploadAdressen(@RequestAttribute(PasswortFilter.GRUPPE) String gruppe,
                                        @RequestBody UploadAnfrage anfrage) {
        if (anfrage == null || anfrage.dateien() == null || anfrage.dateien().isEmpty()
                || anfrage.dateien().size() > MAX_DATEIEN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "1 bis " + MAX_DATEIEN + " Dateien");
        }
        String name = bereinige(anfrage.name(), MAX_NAME, false);
        String geschichte = bereinige(anfrage.geschichte(), MAX_GESCHICHTE, true);
        String tag = LocalDate.now(uhr).toString();
        List<FotoSpeicher.UploadZiel> ziele = new ArrayList<>();
        for (Datei d : anfrage.dateien()) {
            String typ = d == null || d.typ() == null ? "" : d.typ().toLowerCase();
            String endung = ENDUNG.get(typ);
            if (endung == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nur Fotos erlaubt");
            }
            ziele.add(speicher.uploadZiel(gruppe, tag, UUID.randomUUID().toString(), typ, endung, name, geschichte));
        }
        return new UploadAntwort(gruppe, tag, ziele);
    }

    @GetMapping("/galerie")
    public Galerie galerie(@RequestAttribute(PasswortFilter.GRUPPE) String gruppe,
                           @RequestParam(required = false) String tag) {
        if (tag != null && !TAG.matcher(tag).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tag als JJJJ-MM-TT");
        }
        return new Galerie(gruppe, speicher.galerie(gruppe, tag));
    }

    /** Steuerzeichen raus (bei der Geschichte bleiben Zeilenumbrüche), Länge begrenzen. */
    static String bereinige(String text, int max, boolean zeilen) {
        if (text == null) return "";
        String t = text.replace("\r\n", "\n")
                .replaceAll(zeilen ? "[\\p{Cntrl}&&[^\\n]]" : "\\p{Cntrl}", "")
                .replaceAll("\\n{3,}", "\n\n")
                .strip();
        return t.length() > max ? t.substring(0, max).strip() : t;
    }
}
