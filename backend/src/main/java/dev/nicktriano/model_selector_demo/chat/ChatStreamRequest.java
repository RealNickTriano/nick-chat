package dev.nicktriano.model_selector_demo.chat;

import java.util.List;

public record ChatStreamRequest(String provider, String model, List<Message> messages) {
  public record Message(String role, String content) {}
}
