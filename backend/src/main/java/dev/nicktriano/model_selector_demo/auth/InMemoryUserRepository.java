package dev.nicktriano.model_selector_demo.auth;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Repository;

@Repository
public class InMemoryUserRepository implements UserRepository {

  private final ConcurrentHashMap<String, User> byId = new ConcurrentHashMap<>();
  private final ConcurrentHashMap<String, String> idByGoogleSub = new ConcurrentHashMap<>();

  @Override
  public Optional<User> findById(String id) {
    return Optional.ofNullable(byId.get(id));
  }

  @Override
  public User upsertByGoogleSub(GoogleProfile profile) {
    Instant now = Instant.now();
    String existingId = idByGoogleSub.get(profile.googleSub());
    if (existingId != null) {
      User existing = byId.get(existingId);
      if (existing != null) {
        User updated = new User(
            existing.id(),
            existing.googleSub(),
            profile.email(),
            profile.displayName(),
            profile.pictureUrl(),
            existing.createdAt(),
            now
        );
        byId.put(existing.id(), updated);
        return updated;
      }
    }
    String newId = UUID.randomUUID().toString();
    User created = new User(
        newId,
        profile.googleSub(),
        profile.email(),
        profile.displayName(),
        profile.pictureUrl(),
        now,
        now
    );
    byId.put(newId, created);
    idByGoogleSub.put(profile.googleSub(), newId);
    return created;
  }
}
