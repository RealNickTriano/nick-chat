package dev.nicktriano.model_selector_demo.auth;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface UserRepository extends JpaRepository<UserEntity, UUID> {

  Optional<UserEntity> findByGoogleSub(String googleSub);

}
