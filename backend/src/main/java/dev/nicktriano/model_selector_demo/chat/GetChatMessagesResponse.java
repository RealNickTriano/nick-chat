package dev.nicktriano.model_selector_demo.chat;

import java.util.List;

public record GetChatMessagesResponse(List<ChatService.MessageSummary> messages) {}
