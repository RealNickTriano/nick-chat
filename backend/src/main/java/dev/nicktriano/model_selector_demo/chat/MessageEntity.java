package dev.nicktriano.model_selector_demo.chat;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "messages")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
public class MessageEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false)
  private UUID chatId;

  @Column(nullable = false)
  private String role;

  @Column(nullable = false, columnDefinition = "text")
  private String content;

  private String provider;

  private String model;

  private Integer inputTokens;
  private Integer outputTokens;
  private Integer totalTokens;
  private String finishReason;
  private String responseId;
  private Integer latencyMs;
  private Integer ttftMs;
  private String resolvedModel;

  @CreatedDate
  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  public MessageEntity(UUID chatId, String role, String content, String provider, String model) {
    this.chatId = chatId;
    this.role = role;
    this.content = content;
    this.provider = provider;
    this.model = model;
  }

  public MessageEntity(UUID chatId, String role, String content, String provider, String model,
                       Integer inputTokens, Integer outputTokens, Integer totalTokens,
                       String finishReason, String responseId,
                       Integer latencyMs, Integer ttftMs, String resolvedModel) {
    this.chatId = chatId;
    this.role = role;
    this.content = content;
    this.provider = provider;
    this.model = model;
    this.inputTokens = inputTokens;
    this.outputTokens = outputTokens;
    this.totalTokens = totalTokens;
    this.finishReason = finishReason;
    this.responseId = responseId;
    this.latencyMs = latencyMs;
    this.ttftMs = ttftMs;
    this.resolvedModel = resolvedModel;
  }
}
