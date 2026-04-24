package dev.nicktriano.model_selector_demo.auth;

import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;

@Service
public class CustomOidcUserService extends OidcUserService {

  private final UserService userService;

  public CustomOidcUserService(UserService userService) {
    this.userService = userService;
  }

  @Override
  public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
    OidcUser oidcUser = super.loadUser(userRequest);

    UserEntity user = userService.saveUserOnLogin(
      oidcUser.getAttribute("sub"),
      oidcUser.getAttribute("email"),
      oidcUser.getAttribute("name"),
      oidcUser.getAttribute("picture")
    );

    return new UserPrincipal(oidcUser, user.getId());
  }
}
