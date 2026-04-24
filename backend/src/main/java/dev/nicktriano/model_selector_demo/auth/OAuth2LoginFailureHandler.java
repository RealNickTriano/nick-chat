package dev.nicktriano.model_selector_demo.auth;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class OAuth2LoginFailureHandler extends SimpleUrlAuthenticationFailureHandler {

  private final String postLoginRedirect;

  public OAuth2LoginFailureHandler(
      @Value("${app.auth.post-login-redirect}") String postLoginRedirect
  ) {
    this.postLoginRedirect = postLoginRedirect;
  }

  @Override
  public void onAuthenticationFailure(
      HttpServletRequest request,
      HttpServletResponse response,
      AuthenticationException exception
  ) throws IOException, ServletException {
    System.err.println("Auth failure");
    String code = classify(exception);
    String target = postLoginRedirect + "/?auth_error=" + URLEncoder.encode(code, StandardCharsets.UTF_8);
    getRedirectStrategy().sendRedirect(request, response, target);
  }

  private String classify(AuthenticationException exception) {
    String message = exception.getMessage() == null ? "" : exception.getMessage().toLowerCase();
    if (message.contains("state")) {
      return "state_mismatch";
    }
    if (message.contains("access_denied") || message.contains("cancel")) {
      return "provider_error";
    }
    return "server_error";
  }
}
