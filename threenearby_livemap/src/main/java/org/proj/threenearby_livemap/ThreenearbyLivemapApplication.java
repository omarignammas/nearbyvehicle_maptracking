package org.proj.threenearby_livemap;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class ThreenearbyLivemapApplication {

    public static void main(String[] args) {
        SpringApplication.run(ThreenearbyLivemapApplication.class, args);
    }

}
