package dev.nicktriano.model_selector_demo.auth;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import jakarta.transaction.Transactional;

interface UserRepository extends JpaRepository<UserEntity, UUID> {

  Optional<UserEntity> findByGoogleSub(String googleSub);

  @Modifying
  @Transactional
  @Query(value = "INSERT INTO users (id, name, email) " +
                   "VALUES (:id, :name, :email) " +
                   "ON CONFLICT (id) " +
                   "DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email", 
           nativeQuery = true)
  Optional<UserEntity> upsertUser(
    String googleSub,
    String email,
    String displayName,
    String pictureUrl
  );
}
