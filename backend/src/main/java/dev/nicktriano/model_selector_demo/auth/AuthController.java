package dev.nicktriano.model_selector_demo.auth;

import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/auth")
public class AuthController {

  private final UserRepository userRepository;

  public AuthController(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @GetMapping("/me")
  public ResponseEntity<UserEntity> me(@AuthenticationPrincipal UserPrincipal principal) {
    Optional<UserEntity> user = userRepository.findById(principal.getUserId());
    if (user.isEmpty()) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    return ResponseEntity.ok(user.get());
  }

  @PostMapping("/logout")
  public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
    HttpSession session = request.getSession(false);
    if (session != null) {
      session.invalidate();
    }

    SecurityContext context = SecurityContextHolder.getContext();
    SecurityContextHolder.clearContext();
    context.setAuthentication(null);
    
    Cookie cleared = new Cookie("JSESSIONID", "");
    cleared.setPath("/");
    cleared.setHttpOnly(true);
    cleared.setMaxAge(0);
    response.addCookie(cleared);

    return ResponseEntity.noContent().build();
  }
}
