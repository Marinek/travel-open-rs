package de.golfreise.fotos;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Alle Fotos einer Gruppe herunterladen, über einen geheimen Link statt Passwort:
 * {@code fotos.html#download=<token>}. Der Token steht hier im Pfad (nicht unter /api, also ohne Passwort-Filter).
 * Ein falscher Token gibt 404, wie eine Adresse, die es nicht gibt.
 */
@RestController
@RequestMapping("/download/{token}")
public class DownloadController {

    private final Map<String, String> tokens;
    private final FotoSpeicher speicher;

    public DownloadController(FotoEinstellungen einstellungen, FotoSpeicher speicher) {
        this.tokens = einstellungen.downloadZuGruppe();
        this.speicher = speicher;
    }

    /** Dieselbe Galerie wie mit Passwort: am Handy lädt die Seite daraus die Originale und sichert sie in die Fotos-App. */
    @GetMapping("/galerie")
    public FotoController.Galerie galerie(@PathVariable String token) {
        String gruppe = gruppe(token);
        return new FotoController.Galerie(gruppe, speicher.galerie(gruppe, null));
    }

    /**
     * Alle Originale (oder die eines Tages) als ZIP, ein Ordner pro Tag. Wird direkt aus dem Bucket
     * durchgereicht, ohne Zwischenspeicher; Fotos sind schon komprimiert, deshalb ohne Kompression.
     */
    @GetMapping("/fotos.zip")
    public void zip(@PathVariable String token, @RequestParam(required = false) String tag,
                    HttpServletResponse res) throws IOException {
        String gruppe = gruppe(token);
        if (tag != null && !FotoController.TAG.matcher(tag).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tag als JJJJ-MM-TT");
        }
        List<FotoSpeicher.ZipEintrag> inhalt = speicher.zipInhalt(gruppe, tag);
        String datei = "tunesien-2026-" + gruppe + (tag != null ? "-" + tag : "") + ".zip";
        res.setContentType("application/zip");
        res.setHeader(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(datei).build().toString());
        res.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        speicher.zipSchreiben(inhalt, res.getOutputStream());
    }

    private String gruppe(String token) {
        byte[] t = token.getBytes(StandardCharsets.UTF_8);
        String treffer = null;
        for (Map.Entry<String, String> e : tokens.entrySet()) {
            if (MessageDigest.isEqual(t, e.getKey().getBytes(StandardCharsets.UTF_8))) treffer = e.getValue();
        }
        if (treffer == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return treffer;
    }
}
