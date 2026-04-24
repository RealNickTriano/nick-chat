package dev.nicktriano.model_selector_demo.apikey;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ApiKeyRepository extends JpaRepository<ApiKeyEntity, UUID> {

  Optional<ApiKeyEntity> findByUserIdAndProvider(UUID userId, String provider);

  List<ApiKeyEntity> findByUserId(UUID userId);

  void deleteByUserIdAndProvider(UUID userId, String provider);
}
