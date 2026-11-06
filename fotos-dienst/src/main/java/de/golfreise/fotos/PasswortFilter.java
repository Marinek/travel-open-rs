package de.golfreise.fotos;

import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Lässt nur Anfragen mit einem gültigen Gruppenpasswort durch. Das Passwort bestimmt die Gruppe;
 * sie wird als Request-Attribut {@value #GRUPPE} weitergegeben.
 * <p>
 * Weil das Passwort kurz ist, wird eine Adresse nach {@value #MAX_FEHLER} Fehlversuchen
 * für {@link #SPERRE} gesperrt (429), auch für richtige Versuche.
 */
public class PasswortFilter extends OncePerRequestFilter {

    /** Passwort, URL-kodiert (damit Umlaute sicher im Header ankommen). */
    public static final String KOPF_PASSWORT = "X-Fotos-Passwort";
    public static final String GRUPPE = "gruppe";
    static final int MAX_FEHLER = 10;
    static final Duration SPERRE = Duration.ofMinutes(15);

    private record Fehler(int anzahl, Instant seit) {}

    private final Map<String, String> passwoerter;
    private final Clock uhr;
    private final Map<String, Fehler> fehler = new ConcurrentHashMap<>();

    public PasswortFilter(FotoEinstellungen einstellungen, Clock uhr) {
        this.passwoerter = einstellungen.passwortZuGruppe();
        this.uhr = uhr;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        if ("OPTIONS".equals(req.getMethod())) {
            chain.doFilter(req, res);
            return;
        }
        String adresse = adresse(req);
        Instant jetzt = uhr.instant();
        Fehler f = fehler.get(adresse);
        if (f != null && f.seit().plus(SPERRE).isBefore(jetzt)) {
            fehler.remove(adresse);
            f = null;
        }
        if (f != null && f.anzahl() >= MAX_FEHLER) {
            res.sendError(429);
            return;
        }

        String gruppe = gruppe(req.getHeader(KOPF_PASSWORT));
        if (gruppe == null) {
            if (fehler.size() > 10_000) fehler.clear();
            fehler.merge(adresse, new Fehler(1, jetzt), (alt, neu) -> new Fehler(alt.anzahl() + 1, alt.seit()));
            res.sendError(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        req.setAttribute(GRUPPE, gruppe);
        chain.doFilter(req, res);
    }

    private String gruppe(String kopf) {
        if (kopf == null) return null;
        String gegeben;
        try {
            gegeben = FotoEinstellungen.normalisiere(URLDecoder.decode(kopf, StandardCharsets.UTF_8));
        } catch (IllegalArgumentException e) {
            return null;
        }
        byte[] g = gegeben.getBytes(StandardCharsets.UTF_8);
        String treffer = null;
        for (Map.Entry<String, String> e : passwoerter.entrySet()) {
            if (MessageDigest.isEqual(g, e.getKey().getBytes(StandardCharsets.UTF_8))) treffer = e.getValue();
        }
        return treffer;
    }

    /** Auf Cloud Run hängt Google die echte Client-Adresse hinten an X-Forwarded-For an. */
    static String adresse(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff == null || xff.isBlank()) return req.getRemoteAddr();
        String[] teile = xff.split(",");
        return teile[teile.length - 1].trim();
    }
}
