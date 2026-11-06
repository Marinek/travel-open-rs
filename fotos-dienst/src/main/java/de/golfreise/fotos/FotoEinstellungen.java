package de.golfreise.fotos;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Konfiguration aus Umgebungsvariablen (FOTOS_BUCKET, FOTOS_GRUPPEN, FOTOS_ORIGIN).
 *
 * @param bucket  Cloud-Storage-Bucket für Originale und Vorschaubilder
 * @param gruppen Gruppen mit ihrem Passwort, z. B. {@code travel-open:oliver26,schwarz-gegen-rot:jasmin26}.
 *                Das Passwort bestimmt die Gruppe; jede Gruppe sieht nur ihre eigenen Fotos.
 * @param origin  erlaubte Herkunft(en) der Fotoseite, kommagetrennt
 */
@ConfigurationProperties("fotos")
public record FotoEinstellungen(String bucket, String gruppen, String origin) {

    private static final Pattern GRUPPE = Pattern.compile("[a-z0-9-]{1,40}");

    public List<String> origins() {
        return teile(origin);
    }

    /** Normalisiertes Passwort → Gruppe. Wirft beim Start, wenn die Angabe kaputt ist. */
    public Map<String, String> passwortZuGruppe() {
        Map<String, String> m = new LinkedHashMap<>();
        for (String eintrag : teile(gruppen)) {
            int i = eintrag.indexOf(':');
            String g = i > 0 ? eintrag.substring(0, i).trim() : "";
            String p = i > 0 ? normalisiere(eintrag.substring(i + 1)) : "";
            if (!GRUPPE.matcher(g).matches() || p.length() < 4) {
                throw new IllegalStateException(
                        "FOTOS_GRUPPEN: erwartet gruppe:passwort,… (Passwort mindestens 4 Zeichen), nicht '" + eintrag + "'");
            }
            if (m.containsKey(p)) {
                throw new IllegalStateException("FOTOS_GRUPPEN: jede Gruppe braucht ein eigenes Passwort");
            }
            m.put(p, g);
        }
        return Map.copyOf(m);
    }

    /** Groß-/Kleinschreibung und Leerzeichen am Rand zählen nicht (Handy-Tastaturen). */
    public static String normalisiere(String passwort) {
        return passwort == null ? "" : passwort.strip().toLowerCase(Locale.ROOT);
    }

    private static List<String> teile(String s) {
        if (s == null || s.isBlank()) return List.of();
        return Arrays.stream(s.split(",")).map(String::trim).filter(t -> !t.isEmpty()).toList();
    }
}
