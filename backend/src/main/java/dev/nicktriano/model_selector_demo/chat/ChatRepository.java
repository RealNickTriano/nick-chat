package dev.nicktriano.model_selector_demo.chat;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChatRepository extends JpaRepository<ChatEntity, UUID> {

  List<ChatEntity> findByUserIdOrderByUpdatedAtDesc(UUID userId, Pageable pageable);

  List<ChatEntity> findByUserIdAndUpdatedAtBeforeOrderByUpdatedAtDesc(UUID userId, Instant before, Pageable pageable);
}
