package dev.nicktriano.model_selector_demo.apikey;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.server.ResponseStatusException;

import dev.nicktriano.model_selector_demo.auth.CurrentUserId;

class ApiKeyControllerTest {

  private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
  private static final Instant NOW = Instant.parse("2026-01-01T00:00:00Z");

  private ApiKeyService apiKeyService;
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    apiKeyService = mock(ApiKeyService.class);
    mockMvc = MockMvcBuilders
        .standaloneSetup(new ApiKeyController(apiKeyService))
        .setCustomArgumentResolvers(currentUserIdResolver())
        .build();
  }

  // --- GET /api-keys ---

  @Test
  void list_returnsApiKeysWrapper() throws Exception {
    when(apiKeyService.listKeys(USER_ID)).thenReturn(List.of(
        new ApiKeyResponse("OPEN_AI", "sk-a...mnop", NOW, NOW),
        new ApiKeyResponse("ANTHROPIC", "sk-a...wxyz", NOW, NOW)
    ));

    mockMvc.perform(get("/api-keys"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.apiKeys").isArray())
        .andExpect(jsonPath("$.apiKeys.length()").value(2))
        .andExpect(jsonPath("$.apiKeys[0].provider").value("OPEN_AI"))
        .andExpect(jsonPath("$.apiKeys[1].provider").value("ANTHROPIC"));
  }

  @Test
  void list_noKeys_returnsEmptyArray() throws Exception {
    when(apiKeyService.listKeys(USER_ID)).thenReturn(List.of());

    mockMvc.perform(get("/api-keys"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.apiKeys").isArray())
        .andExpect(jsonPath("$.apiKeys.length()").value(0));
  }

  // --- PUT /api-keys/{provider} ---

  @Test
  void upsert_validRequest_returns200WithResponse() throws Exception {
    when(apiKeyService.upsert(eq(USER_ID), eq("OPEN_AI"), eq("sk-abcdefghijklmnop")))
        .thenReturn(new ApiKeyResponse("OPEN_AI", "sk-a...mnop", NOW, NOW));

    mockMvc.perform(putJson("/api-keys/OPEN_AI", "{\"key\":\"sk-abcdefghijklmnop\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.provider").value("OPEN_AI"))
        .andExpect(jsonPath("$.keyMask").value("sk-a...mnop"));
  }

  @Test
  void upsert_blankKey_returns400() throws Exception {
    mockMvc.perform(putJson("/api-keys/OPEN_AI", "{\"key\":\"\"}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void upsert_keyExceeds500Chars_returns400() throws Exception {
    String tooLong = "\"" + "a".repeat(501) + "\"";
    mockMvc.perform(putJson("/api-keys/OPEN_AI", "{\"key\":" + tooLong + "}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void upsert_unknownProvider_returns400() throws Exception {
    when(apiKeyService.upsert(any(), eq("invalid"), any()))
        .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown provider: invalid"));

    mockMvc.perform(putJson("/api-keys/invalid", "{\"key\":\"sk-abcdefghijklmnop\"}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void upsert_delegatesProviderAndKeyToService() throws Exception {
    when(apiKeyService.upsert(any(), any(), any()))
        .thenReturn(new ApiKeyResponse("ANTHROPIC", "sk-a...wxyz", NOW, NOW));

    mockMvc.perform(putJson("/api-keys/ANTHROPIC", "{\"key\":\"sk-ant-testkey1234\"}"));

    verify(apiKeyService).upsert(USER_ID, "ANTHROPIC", "sk-ant-testkey1234");
  }

  // --- DELETE /api-keys/{provider} ---

  @Test
  void delete_returns204() throws Exception {
    mockMvc.perform(delete("/api-keys/OPEN_AI"))
        .andExpect(status().isNoContent());

    verify(apiKeyService).delete(USER_ID, "OPEN_AI");
  }

  @Test
  void delete_unknownProvider_returns400() throws Exception {
    doThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown provider: invalid"))
        .when(apiKeyService).delete(any(), eq("invalid"));

    mockMvc.perform(delete("/api-keys/invalid"))
        .andExpect(status().isBadRequest());
  }

  // --- helpers ---

  private MockHttpServletRequestBuilder putJson(String url, String body) {
    return put(url).contentType(MediaType.APPLICATION_JSON).content(body);
  }

  private HandlerMethodArgumentResolver currentUserIdResolver() {
    return new HandlerMethodArgumentResolver() {
      @Override
      public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentUserId.class)
            && UUID.class.equals(parameter.getParameterType());
      }

      @Override
      public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
          NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
        return USER_ID;
      }
    };
  }
}
