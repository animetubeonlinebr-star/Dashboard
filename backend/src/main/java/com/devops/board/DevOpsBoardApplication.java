package com.devops.board;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Ponto de entrada do backend do Global DevOps Status Board. */
@SpringBootApplication
@EnableScheduling
public class DevOpsBoardApplication {

    public static void main(String[] args) {
        SpringApplication.run(DevOpsBoardApplication.class, args);
    }
}
