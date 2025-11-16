package org.proj.threenearby_livemap.controller;

import org.proj.threenearby_livemap.service.ThreeWheelService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/threewheel")
public class ThreeWheelController {

    @Autowired
    private ThreeWheelService service;

    @PostMapping("/update")
    public ResponseEntity<String> updatePosition(
            @RequestParam String id,
            @RequestParam double lon,
            @RequestParam double lat) {
        service.updatePosition(id, lon, lat);
        return ResponseEntity.ok("Position updated for " + id);
    }

    @GetMapping("/nearby")
    public ResponseEntity<List<Map<String, Object>>> getNearby(
            @RequestParam double lon,
            @RequestParam double lat,
            @RequestParam(defaultValue = "15") double radiusKm) {
        List<Map<String, Object>> nearby = service.findNearbyWithCoords(lon, lat, radiusKm);
        return ResponseEntity.ok(nearby);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getVehicle(@PathVariable String id) {
        Map<String, Object> vehicle = service.getVehicleById(id);
        if (vehicle == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(vehicle);
    }

    @PostMapping("/cache/clear")
    public ResponseEntity<String> clearCache() {
        service.clearCache();
        return ResponseEntity.ok("Cache cleared");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> removeVehicle(@PathVariable String id) {
        service.removeVehicle(id);
        return ResponseEntity.ok("Vehicle removed: " + id);
    }

    @GetMapping("/all")
    public ResponseEntity<List<String>> getAllVehicles() {
        return ResponseEntity.ok(service.getAllVehicles());
    }
}
