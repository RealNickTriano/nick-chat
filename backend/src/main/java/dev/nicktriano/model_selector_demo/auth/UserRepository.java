package dev.nicktriano.model_selector_demo.auth;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import jakarta.transaction.Transactional;

interface UserRepository extends JpaRepository<UserEntity, UUID> {

  Optional<UserEntity> findByGoogleSub(String googleSub);

}
