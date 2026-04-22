package dev.nicktriano.model_selector_demo.chat;

public interface ChatRepository {

  Chat create(String userId, String title);
}
