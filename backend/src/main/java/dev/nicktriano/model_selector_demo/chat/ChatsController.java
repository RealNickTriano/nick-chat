package dev.nicktriano.model_selector_demo.chat;

import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.nicktriano.model_selector_demo.auth.CurrentUserId;

@RestController
@RequestMapping("/chats")
public class ChatsController {

  private final ChatRepository chats;

  public ChatsController(ChatRepository chats) {
    this.chats = chats;
  }

  @PostMapping
  public ResponseEntity<ChatResponse> create(
      @CurrentUserId String userId,
      @RequestBody(required = false) CreateChatRequest body
  ) {
    String title = body == null ? null : body.title();
    Chat chat = chats.create(userId, title);
    return ResponseEntity.status(HttpStatus.CREATED).body(ChatResponse.from(chat));
  }

  public record CreateChatRequest(String title) {}

  public record ChatResponse(
      String chatId,
      String title,
      Instant createdAt,
      Instant updatedAt
  ) {
    static ChatResponse from(Chat chat) {
      return new ChatResponse(chat.id(), chat.title(), chat.createdAt(), chat.updatedAt());
    }
  }
}
