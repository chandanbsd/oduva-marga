package com.oduvamarga.core;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@SpringBootApplication
@RestController
public class OduvaMargaApplication {

	@GetMapping("/")
	public Mono<String> home() {
		return Mono.just("hello");
	}

	static void main(String[] args) {
		SpringApplication.run(OduvaMargaApplication.class, args);
	}

}
