package dev.nicktriano.model_selector_demo.chat;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
public class ChatController {

  private static final long TIMEOUT_MS = 5L * 60L * 1000L;

  private final ChatService chatService;

  public ChatController(ChatService chatService) {
    this.chatService = chatService;
  }

  @PostMapping("/chat")
  public SseEmitter chat(@RequestBody ChatStreamRequest body) {
    ChatService.ResolvedRequest resolved = chatService.validate(body);
    SseEmitter emitter = new SseEmitter(TIMEOUT_MS);
    chatService.stream(resolved, emitter);
    return emitter;
  }

  @ExceptionHandler(ChatValidationException.class)
  public ResponseEntity<Map<String, String>> handleValidation(ChatValidationException ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .contentType(MediaType.APPLICATION_JSON)
            .body(Map.of("error", ex.getMessage()));
  }
}
