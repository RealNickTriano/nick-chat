package dev.nicktriano.model_selector_demo.chat;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Repository;

@Repository
public class InMemoryChatRepository implements ChatRepository {

  private final ConcurrentHashMap<String, Chat> byId = new ConcurrentHashMap<>();

  @Override
  public Chat create(String userId, String title) {
    Instant now = Instant.now();
    String id = UUID.randomUUID().toString();
    Chat chat = new Chat(id, userId, title, now, now);
    byId.put(id, chat);
    return chat;
  }
}
