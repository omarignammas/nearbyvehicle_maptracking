package org.proj.threenearby_livemap.initializer;

import org.proj.threenearby_livemap.service.ThreeWheelService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Random;

@Component
public class RedisDataInitializer implements CommandLineRunner {

    @Autowired
    private ThreeWheelService service;

    @Override
    public void run(String... args) {
        System.out.println("\n🚀 Initializing Redis with test vehicle data...\n");

        double baseLat = 33.5731;
        double baseLon = -7.5898;
        Random random = new Random();

        for (int i = 1; i <= 10; i++) {
            String vehicleId = "vehicle" + i;
            double lat = baseLat + (random.nextDouble() - 0.5) * 0.2;
            double lon = baseLon + (random.nextDouble() - 0.5) * 0.2;

            service.updatePosition(vehicleId, lon, lat);
        }

        System.out.println("\n🎉 Initialization complete! " +
                service.getAllVehicles().size() + " vehicles ready.\n");

        System.out.println("📍 Testing nearby search (15km radius from Casablanca center):");
        var nearby = service.findNearbyWithCoords(baseLon, baseLat, 15);
        System.out.println("Found " + nearby.size() + " vehicles nearby:\n");
        nearby.forEach(v ->
                System.out.println("  - " + v.get("id") + ": " +
                        String.format("%.2f km away", v.get("distance")))
        );
        System.out.println("\n✅ Backend ready at http://localhost:8080\n");
    }
}
