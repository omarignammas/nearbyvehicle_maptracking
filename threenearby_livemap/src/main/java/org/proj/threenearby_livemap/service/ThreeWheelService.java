package org.proj.threenearby_livemap.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.geo.*;
import org.springframework.data.redis.connection.RedisGeoCommands;
import org.springframework.data.redis.core.GeoOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ThreeWheelService {

    private static final String GEO_KEY = "threewheels:locations";
    private static final String CACHE_NAME = "nearbyVehicles";

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @CacheEvict(value = CACHE_NAME, allEntries = true)
    public void updatePosition(String vehicleId, double longitude, double latitude) {
        GeoOperations<String, Object> geoOps = redisTemplate.opsForGeo();

        geoOps.add(GEO_KEY, new Point(longitude, latitude), vehicleId);

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("id", vehicleId);
        metadata.put("lon", longitude);
        metadata.put("lat", latitude);
        metadata.put("lastUpdate", System.currentTimeMillis());

        redisTemplate.opsForHash().putAll("vehicle:" + vehicleId, metadata);

        System.out.println("✅ Position updated for vehicle: " + vehicleId + " at [" + longitude + ", " + latitude + "]");
    }

    @Cacheable(
            value = CACHE_NAME,
            key = "#longitude + ':' + #latitude + ':' + #radiusKm",
            unless = "#result == null || #result.isEmpty()"
    )
    public List<Map<String, Object>> findNearbyWithCoords(double longitude, double latitude, double radiusKm) {
        System.out.println("🔍 Cache MISS - Fetching from Redis GEO...");

        GeoOperations<String, Object> geoOps = redisTemplate.opsForGeo();

        Circle circle = new Circle(
                new Point(longitude, latitude),
                new Distance(radiusKm, Metrics.KILOMETERS)
        );

        GeoResults<RedisGeoCommands.GeoLocation<Object>> results = geoOps.radius(
                GEO_KEY,
                circle,
                RedisGeoCommands.GeoRadiusCommandArgs
                        .newGeoRadiusArgs()
                        .includeDistance()
                        .includeCoordinates()
                        .sortAscending()
        );

        if (results == null) {
            return Collections.emptyList();
        }

        return results.getContent().stream()
                .map(result -> {
                    Map<String, Object> vehicle = new HashMap<>();
                    String vehicleId = result.getContent().getName().toString();
                    Point point = result.getContent().getPoint();
                    Distance distance = result.getDistance();

                    vehicle.put("id", vehicleId);
                    vehicle.put("lon", point.getX());
                    vehicle.put("lat", point.getY());
                    vehicle.put("distance", distance.getValue());

                    Map<Object, Object> metadata = redisTemplate.opsForHash()
                            .entries("vehicle:" + vehicleId);
                    if (metadata.containsKey("lastUpdate")) {
                        vehicle.put("lastUpdate", metadata.get("lastUpdate"));
                    }

                    return vehicle;
                })
                .collect(Collectors.toList());
    }

    public Map<String, Object> getVehicleById(String vehicleId) {
        Map<Object, Object> metadata = redisTemplate.opsForHash()
                .entries("vehicle:" + vehicleId);

        if (metadata.isEmpty()) {
            return null;
        }

        Map<String, Object> vehicle = new HashMap<>();
        vehicle.put("id", vehicleId);
        vehicle.put("lon", metadata.get("lon"));
        vehicle.put("lat", metadata.get("lat"));
        vehicle.put("lastUpdate", metadata.get("lastUpdate"));

        return vehicle;
    }

    @CacheEvict(value = CACHE_NAME, allEntries = true)
    public void clearCache() {
        System.out.println("🗑️ Cache cleared manually");
    }

    @CacheEvict(value = CACHE_NAME, allEntries = true)
    public void removeVehicle(String vehicleId) {
        redisTemplate.opsForGeo().remove(GEO_KEY, vehicleId);
        redisTemplate.delete("vehicle:" + vehicleId);
        System.out.println("🗑️ Vehicle removed: " + vehicleId);
    }

    public List<String> getAllVehicles() {
        Set<Object> members = redisTemplate.opsForZSet().range(GEO_KEY, 0, -1);
        if (members == null) {
            return Collections.emptyList();
        }
        return members.stream()
                .map(Object::toString)
                .collect(Collectors.toList());
    }
}