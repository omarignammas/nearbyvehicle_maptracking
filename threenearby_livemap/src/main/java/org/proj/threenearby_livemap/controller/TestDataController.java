package org.proj.threenearby_livemap.controller;

import org.proj.threenearby_livemap.service.ThreeWheelService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Random;

@RestController
@RequestMapping("/api/test")
public class TestDataController {

    @Autowired
    private ThreeWheelService service;

    @PostMapping("/init")
    public ResponseEntity<String> initializeTestData() {
        double baseLat = 33.5731; // Casablanca
        double baseLon = -7.5898;
        Random random = new Random();

        for (int i = 1; i <= 10; i++) {
            String vehicleId = "vehicle" + i;
            double lat = baseLat + (random.nextDouble() - 0.5) * 0.2;
            double lon = baseLon + (random.nextDouble() - 0.5) * 0.2;
            service.updatePosition(vehicleId, lon, lat);
        }

        return ResponseEntity.ok("✅ Initialized 10 test vehicles");
    }

    @PostMapping("/simulate")
    public ResponseEntity<String> simulateMovement() {
        var vehicles = service.getAllVehicles();
        Random random = new Random();

        vehicles.forEach(vehicleId -> {
            var vehicle = service.getVehicleById(vehicleId);
            if (vehicle != null) {
                double currentLat = Double.parseDouble(vehicle.get("lat").toString());
                double currentLon = Double.parseDouble(vehicle.get("lon").toString());

                double newLat = currentLat + (random.nextDouble() - 0.5) * 0.001;
                double newLon = currentLon + (random.nextDouble() - 0.5) * 0.001;

                service.updatePosition(vehicleId, newLon, newLat);
            }
        });

        return ResponseEntity.ok("🚗 Moved " + vehicles.size() + " vehicles");
    }

    @PostMapping("/clear")
    public ResponseEntity<String> clearAllData() {
        var vehicles = service.getAllVehicles();
        vehicles.forEach(service::removeVehicle);
        service.clearCache();
        return ResponseEntity.ok("🗑️ Cleared all data");
    }
}
