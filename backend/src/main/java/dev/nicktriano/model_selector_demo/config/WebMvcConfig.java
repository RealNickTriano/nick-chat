package dev.nicktriano.model_selector_demo.config;

import java.util.List;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import dev.nicktriano.model_selector_demo.auth.CurrentUserIdArgumentResolver;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

  private final CurrentUserIdArgumentResolver currentUserIdResolver;

  public WebMvcConfig(CurrentUserIdArgumentResolver currentUserIdResolver) {
    this.currentUserIdResolver = currentUserIdResolver;
  }

  @Override
  public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
    resolvers.add(currentUserIdResolver);
  }
}
