package dev.nicktriano.model_selector_demo.chat;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MessageRepository extends JpaRepository<MessageEntity, UUID> {

  List<MessageEntity> findByChatIdOrderByCreatedAtAsc(UUID chatId);

  List<MessageEntity> findByChatIdOrderByCreatedAtDesc(UUID chatId, Pageable pageable);
}
