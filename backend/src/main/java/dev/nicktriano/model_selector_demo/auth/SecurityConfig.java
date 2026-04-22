package dev.nicktriano.model_selector_demo.auth;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

  private final OAuth2LoginSuccessHandler successHandler;
  private final OAuth2LoginFailureHandler failureHandler;
  private final String frontendOrigin;

  public SecurityConfig(
      OAuth2LoginSuccessHandler successHandler,
      OAuth2LoginFailureHandler failureHandler,
      @Value("${app.auth.frontend-origin}") String frontendOrigin
  ) {
    this.successHandler = successHandler;
    this.failureHandler = failureHandler;
    this.frontendOrigin = frontendOrigin;
  }

  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    CsrfTokenRequestAttributeHandler csrfHandler = new CsrfTokenRequestAttributeHandler();

    http
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        .csrf(csrf -> csrf
            .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
            .csrfTokenRequestHandler(csrfHandler)
            .ignoringRequestMatchers("/chat/**", "/chats/**")
        )
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/auth/**", "/catalog/**", "/error").permitAll()
            .requestMatchers("/chat/**", "/chats/**").authenticated()
            .anyRequest().permitAll()
        )
        .oauth2Login(oauth -> oauth
            .authorizationEndpoint(endpoint -> endpoint.baseUri("/auth/login"))
            .redirectionEndpoint(endpoint -> endpoint.baseUri("/auth/callback/*"))
            .successHandler(successHandler)
            .failureHandler(failureHandler)
        )
        .logout(logout -> logout.disable());

    return http.build();
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of(frontendOrigin));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }
}
