package dev.nicktriano.model_selector_demo.auth;

import java.util.Optional;

public interface UserRepository {

  Optional<User> findById(String id);

  User upsertByGoogleSub(GoogleProfile profile);

  record GoogleProfile(
      String googleSub,
      String email,
      String displayName,
      String pictureUrl
  ) {}
}
