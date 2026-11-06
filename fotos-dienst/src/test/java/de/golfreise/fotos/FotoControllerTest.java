package de.golfreise.fotos;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = FotoController.class, properties = {
        "fotos.gruppen=travel-open:Oliver26,schwarz-gegen-rot:jasmin26",
        "fotos.origin=https://beispiel.github.io",
        "fotos.bucket=test"
})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD) // Fehlversuche je Test zurücksetzen
class FotoControllerTest {

    @TestConfiguration
    static class FesteUhr {
        /** 12.11.2026, 23:30 Uhr UTC = schon 13.11. in Tunesien (UTC+1). */
        @Bean
        @Primary
        Clock festeUhr() {
            return Clock.fixed(Instant.parse("2026-11-12T23:30:00Z"), ZoneId.of("Africa/Tunis"));
        }
    }

    @Autowired MockMvc mvc;
    @MockitoBean FotoSpeicher speicher;

    @Test
    void ohneOderMitFalschemPasswortGibtEs401() throws Exception {
        mvc.perform(get("/api/galerie")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/galerie").header("X-Fotos-Passwort", "falsch")).andExpect(status().isUnauthorized());
    }

    @Test
    void passwortBestimmtDieGruppe() throws Exception {
        mvc.perform(get("/api/anmelden").header("X-Fotos-Passwort", "oliver26"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gruppe").value("travel-open"));
        // Groß-/Kleinschreibung und Leerzeichen zählen nicht
        mvc.perform(get("/api/anmelden").header("X-Fotos-Passwort", "%20JASMIN26%20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gruppe").value("schwarz-gegen-rot"));
    }

    @Test
    void nachZehnFehlversuchenGesperrt() throws Exception {
        for (int i = 0; i < PasswortFilter.MAX_FEHLER; i++) {
            mvc.perform(get("/api/anmelden").header("X-Fotos-Passwort", "rate" + i)
                    .header("X-Forwarded-For", "203.0.113.7")).andExpect(status().isUnauthorized());
        }
        // jetzt auch mit richtigem Passwort gesperrt …
        mvc.perform(get("/api/anmelden").header("X-Fotos-Passwort", "oliver26")
                .header("X-Forwarded-For", "203.0.113.7")).andExpect(status().isTooManyRequests());
        // … aber nur diese Adresse
        mvc.perform(get("/api/anmelden").header("X-Fotos-Passwort", "oliver26")
                .header("X-Forwarded-For", "198.51.100.1")).andExpect(status().isOk());
    }

    @Test
    void gefaelschteVorangestellteAdresseHilftNicht() throws Exception {
        for (int i = 0; i < PasswortFilter.MAX_FEHLER; i++) {
            mvc.perform(get("/api/anmelden").header("X-Fotos-Passwort", "x" + i)
                    .header("X-Forwarded-For", "10.0.0." + i + ", 203.0.113.7")).andExpect(status().isUnauthorized());
        }
        mvc.perform(get("/api/anmelden").header("X-Fotos-Passwort", "oliver26")
                .header("X-Forwarded-For", "10.9.9.9, 203.0.113.7")).andExpect(status().isTooManyRequests());
    }

    @Test
    void preflightGehtOhnePasswort() throws Exception {
        mvc.perform(options("/api/galerie")
                        .header("Origin", "https://beispiel.github.io")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "X-Fotos-Passwort"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://beispiel.github.io"));
    }

    @Test
    void fremdeHerkunftBekommtKeinCors() throws Exception {
        mvc.perform(options("/api/galerie")
                        .header("Origin", "https://boese.example")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
    }

    @Test
    void galerieNurDerEigenenGruppe() throws Exception {
        when(speicher.galerie(eq("schwarz-gegen-rot"), isNull())).thenReturn(List.of(
                new FotoSpeicher.Tag("2026-11-15", List.of(new FotoSpeicher.Foto(
                        "id-1", "Jürgen", "Birdie an der 7!", "2026-11-15T10:00Z", "2026-11-15T10:58:00", "https://v", "https://o")))));

        mvc.perform(get("/api/galerie").header("X-Fotos-Passwort", "jasmin26"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gruppe").value("schwarz-gegen-rot"))
                .andExpect(jsonPath("$.tage[0].fotos[0].name").value("Jürgen"))
                .andExpect(jsonPath("$.tage[0].fotos[0].geschichte").value("Birdie an der 7!"));
        verify(speicher, never()).galerie(eq("travel-open"), any());
    }

    @Test
    void galerieMitUngueltigemTag() throws Exception {
        mvc.perform(get("/api/galerie?tag=morgen").header("X-Fotos-Passwort", "oliver26"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void uploadMitGeschichteUndTunesischemDatum() throws Exception {
        when(speicher.uploadZiel(eq("travel-open"), eq("2026-11-13"), any(), eq("image/jpeg"), eq("jpg"),
                eq("Erika"), eq("Zeile 1\nZeile 2"), eq("")))
                .thenReturn(new FotoSpeicher.UploadZiel("id-1", "2026-11-13",
                        new FotoSpeicher.Ziel("https://put-orig", Map.of("Content-Type", "image/jpeg")),
                        new FotoSpeicher.Ziel("https://put-vorschau", Map.of("Content-Type", "image/jpeg"))));

        mvc.perform(post("/api/upload-adressen")
                        .header("X-Fotos-Passwort", "oliver26")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"  Erika \",\"geschichte\":\" Zeile 1\\r\\nZeile 2\\u0007 \","
                                + "\"dateien\":[{\"typ\":\"image/jpeg\"}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dateien[0].tag").value("2026-11-13"))
                .andExpect(jsonPath("$.dateien[0].orig.url").value("https://put-orig"));
    }

    @Test
    void fotoGehoertZumAufnahmetag() throws Exception {
        // „Heute“ ist der 13.11.; drei Fotos: vom Bingo-Tag, ohne Aufnahmezeit, mit Datum in der Zukunft
        mvc.perform(post("/api/upload-adressen")
                        .header("X-Fotos-Passwort", "oliver26")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dateien\":[{\"typ\":\"image/jpeg\",\"aufgenommen\":\"2026-11-12T11:40:07\"},"
                                + "{\"typ\":\"image/jpeg\"},"
                                + "{\"typ\":\"image/jpeg\",\"aufgenommen\":\"2026-11-20T09:00:00\"}]}"))
                .andExpect(status().isOk());
        verify(speicher).uploadZiel(eq("travel-open"), eq("2026-11-12"), any(), any(), any(), any(), any(), eq("2026-11-12T11:40:07"));
        verify(speicher, org.mockito.Mockito.times(2))
                .uploadZiel(eq("travel-open"), eq("2026-11-13"), any(), any(), any(), any(), any(), eq(""));
    }

    @Test
    void aufnahmezeitWirdGeprueft() {
        java.time.LocalDate heute = java.time.LocalDate.of(2026, 11, 13);
        assertEquals(java.time.LocalDateTime.of(2026, 11, 12, 11, 40, 7),
                FotoController.aufnahme("2026-11-12T11:40:07", heute));
        assertEquals(java.time.LocalDateTime.of(2026, 11, 13, 8, 5),
                FotoController.aufnahme("2026-11-13T08:05", heute));
        org.junit.jupiter.api.Assertions.assertNull(FotoController.aufnahme("2026-11-14T00:00:00", heute), "Zukunft");
        org.junit.jupiter.api.Assertions.assertNull(FotoController.aufnahme("2026-08-01T12:00:00", heute), "zu alt");
        org.junit.jupiter.api.Assertions.assertNull(FotoController.aufnahme("12.11.2026", heute), "Unsinn");
        org.junit.jupiter.api.Assertions.assertNull(FotoController.aufnahme(null, heute));
    }

    @Test
    void uploadNurFuerFotos() throws Exception {
        mvc.perform(post("/api/upload-adressen")
                        .header("X-Fotos-Passwort", "oliver26")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dateien\":[{\"typ\":\"application/pdf\"}]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void loeschenGibtEsNicht() throws Exception {
        mvc.perform(delete("/api/fotos/2026-11-12/0b6f2b8e-3f43-4c39-9a51-3d3c2a1b9e10")
                        .header("X-Fotos-Passwort", "oliver26"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void geschichteWirdGekuerzt() {
        assertEquals(FotoController.MAX_GESCHICHTE,
                FotoController.bereinige("x".repeat(900), FotoController.MAX_GESCHICHTE, true).length());
        assertEquals("a\n\nb", FotoController.bereinige("a\n\n\n\n\nb", 500, true));
        assertEquals("ab", FotoController.bereinige("a\nb", 40, false));
    }

    @Test
    void kaputteGruppenangabeFaelltBeimStartAuf() {
        assertThrows(IllegalStateException.class,
                () -> new FotoEinstellungen("b", "Travel Open:abcd", "").passwortZuGruppe());
        assertThrows(IllegalStateException.class,
                () -> new FotoEinstellungen("b", "a:abc", "").passwortZuGruppe());
        assertThrows(IllegalStateException.class,
                () -> new FotoEinstellungen("b", "a:Gleich1,b:gleich1", "").passwortZuGruppe());
        assertEquals(Map.of("oliver26", "travel-open", "jasmin26", "schwarz-gegen-rot"),
                new FotoEinstellungen("b", " travel-open:Oliver26 , schwarz-gegen-rot:jasmin26 ", "").passwortZuGruppe());
    }
}
