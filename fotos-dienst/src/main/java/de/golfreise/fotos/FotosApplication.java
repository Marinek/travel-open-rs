package de.golfreise.fotos;

import java.time.Clock;
import java.time.ZoneId;
import java.util.List;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.core.Ordered;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@SpringBootApplication
@EnableConfigurationProperties(FotoEinstellungen.class)
public class FotosApplication {

    public static void main(String[] args) {
        SpringApplication.run(FotosApplication.class, args);
    }

    /** Uhr in Tunesien: bestimmt, zu welchem Reisetag ein Foto gehört. */
    @Bean
    Clock uhr() {
        return Clock.system(ZoneId.of("Africa/Tunis"));
    }

    /**
     * CORS vor dem Passwort-Filter, damit der Browser auch eine 401 lesen kann
     * und Preflight-Anfragen ohne Passwort durchgehen.
     */
    @Bean
    FilterRegistrationBean<CorsFilter> corsFilter(FotoEinstellungen e) {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(e.origins());
        c.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
        c.setAllowedHeaders(List.of("Content-Type", PasswortFilter.KOPF_PASSWORT));
        c.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource quelle = new UrlBasedCorsConfigurationSource();
        quelle.registerCorsConfiguration("/api/**", c);
        FilterRegistrationBean<CorsFilter> reg = new FilterRegistrationBean<>(new CorsFilter(quelle));
        reg.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return reg;
    }

    @Bean
    FilterRegistrationBean<PasswortFilter> passwortFilter(FotoEinstellungen e, Clock uhr) {
        FilterRegistrationBean<PasswortFilter> reg = new FilterRegistrationBean<>(new PasswortFilter(e, uhr));
        reg.addUrlPatterns("/api/*");
        reg.setOrder(Ordered.HIGHEST_PRECEDENCE + 10);
        return reg;
    }
}
