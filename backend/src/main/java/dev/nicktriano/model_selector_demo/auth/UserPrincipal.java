package dev.nicktriano.model_selector_demo.auth;

import java.io.Serializable;
import java.util.Collection;
import java.util.Map;
import java.util.UUID;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.OidcUserInfo;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

public class UserPrincipal implements OidcUser, Serializable {
  private static final long serialVersionUID = 1L;

  private final OidcUser oidcUser;
  private final UUID userId;

  public UserPrincipal(OidcUser oidcUser, UUID userId) {
    this.oidcUser = oidcUser;
    this.userId = userId;
  }

  public UUID getUserId() {
    return userId;
  }

  @Override
  public Map<String, Object> getClaims() {
    return oidcUser.getClaims();
  }

  @Override
  public OidcUserInfo getUserInfo() {
    return oidcUser.getUserInfo();
  }

  @Override
  public OidcIdToken getIdToken() {
    return oidcUser.getIdToken();
  }

  @Override
  public Map<String, Object> getAttributes() {
    return oidcUser.getAttributes();
  }

  @Override
  public Collection<? extends GrantedAuthority> getAuthorities() {
    return oidcUser.getAuthorities();
  }

  @Override
  public String getName() {
    return oidcUser.getName();
  }
}
