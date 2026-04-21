package dev.nicktriano.model_selector_demo.auth;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

  private final UserRepository userRepository;
  private final String postLoginRedirect;

  public OAuth2LoginSuccessHandler(
      UserRepository userRepository,
      @Value("${app.auth.post-login-redirect}") String postLoginRedirect
  ) {
    this.userRepository = userRepository;
    this.postLoginRedirect = postLoginRedirect;
  }

  @Override
  public void onAuthenticationSuccess(
      HttpServletRequest request,
      HttpServletResponse response,
      Authentication authentication
  ) throws IOException, ServletException {
    OAuth2User principal = (OAuth2User) authentication.getPrincipal();

    String googleSub = principal.getAttribute("sub");
    Boolean emailVerified = principal.getAttribute("email_verified");
    String email = principal.getAttribute("email");

    if (googleSub == null || googleSub.isBlank()) {
      redirectWithError(request, response, "server_error");
      return;
    }
    if (!Boolean.TRUE.equals(emailVerified)) {
      redirectWithError(request, response, "email_unverified");
      return;
    }

    User user = userRepository.upsertByGoogleSub(new UserRepository.GoogleProfile(
        googleSub,
        email,
        principal.getAttribute("name"),
        principal.getAttribute("picture")
    ));

    request.getSession(true).setAttribute(SessionUser.ATTRIBUTE, user.id());

    getRedirectStrategy().sendRedirect(request, response, postLoginRedirect);
  }

  private void redirectWithError(
      HttpServletRequest request,
      HttpServletResponse response,
      String code
  ) throws IOException {
    String target = postLoginRedirect + "/?auth_error=" + URLEncoder.encode(code, StandardCharsets.UTF_8);
    getRedirectStrategy().sendRedirect(request, response, target);
  }
}
