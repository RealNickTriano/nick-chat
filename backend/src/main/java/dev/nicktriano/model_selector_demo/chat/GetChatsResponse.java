package dev.nicktriano.model_selector_demo.chat;

import java.util.List;

public record GetChatsResponse(List<ChatSummary> chats) {}
