package dev.nicktriano.model_selector_demo.chat;

import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import dev.nicktriano.model_selector_demo.auth.CurrentUserId;
import jakarta.validation.Valid;

@RestController
public class ChatController {

  private static final long TIMEOUT_MS = 5L * 60L * 1000L;

  private final ChatService chatService;
  private final MessageRepository messageRepository;

  public ChatController(ChatService chatService, MessageRepository messageRepository) {
    this.chatService = chatService;
    this.messageRepository = messageRepository;
  }

  @PostMapping(value = "/chats", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter chat(@CurrentUserId UUID userId, @Valid @RequestBody ApplicationChatRequest body) {
    ChatEntity chatEntity = chatService.newChat(userId);

    ChatService.ResolvedRequest resolved = chatService.validate(body);
    messageRepository.save(new MessageEntity(chatEntity.getId(), "user", body.content(), resolved.provider().name(), resolved.model()));
    SseEmitter emitter = new SseEmitter(TIMEOUT_MS);
    chatService.stream(resolved, chatEntity.getId(), emitter);
    return emitter;
  }

  @ExceptionHandler(ChatValidationException.class)
  public ResponseEntity<Map<String, String>> handleValidation(ChatValidationException ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .contentType(MediaType.APPLICATION_JSON)
            .body(Map.of("error", ex.getMessage()));
  }
}
