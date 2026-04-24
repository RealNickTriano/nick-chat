package dev.nicktriano.model_selector_demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class ModelSelectorDemoApplication {

	public static void main(String[] args) {
		SpringApplication.run(ModelSelectorDemoApplication.class, args);
	}

}
