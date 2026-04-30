package dev.nicktriano.model_selector_demo.chat;

public class ChatNotFoundException extends RuntimeException {
  public ChatNotFoundException() {
    super("Chat not found");
  }
}
