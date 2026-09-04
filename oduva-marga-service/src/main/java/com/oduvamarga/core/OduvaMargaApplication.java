package com.oduvamarga.core;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController
public class OduvaMargaApplication {

	@GetMapping("/")
	public String home() {
		return "hello";
	}

	static void main(String[] args) {
		SpringApplication.run(OduvaMargaApplication.class, args);
	}

}
