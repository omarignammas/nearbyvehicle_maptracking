import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Navigation, Loader2, Search } from 'lucide-react';
import { API_BASE,GOOGLE_MAPS_API_KEY } from '../config/config';



const ThreeWheelerTracker = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyVehicles, setNearbyVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [radiusKm, setRadiusKm] = useState(15);
  
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef({});
  const userMarkerRef = useRef(null);
  const directionsRendererRef = useRef(null);

  // Initialize Google Maps
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
    script.async = true;
    script.onload = initMap;
    document.body.appendChild(script);
    
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const initMap = () => {
    if (!mapRef.current || !window.google) return;

    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      zoom: 13,
      center: { lat: 33.5731, lng: -7.5898 }, // Casablanca default
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
    });

    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      map: googleMapRef.current,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#4F46E5',
        strokeWeight: 4
      }
    });

    getUserLocation();
  };

  const getUserLocation = () => {
    setLoading(true);
    setError('');
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          
          if (googleMapRef.current) {
            googleMapRef.current.setCenter(location);
            updateUserMarker(location);
          }
          
          fetchNearbyVehicles(location.lng, location.lat);
          setLoading(false);
        },
        (err) => {
          setError('Unable to get your location. Please enable location services.');
          setLoading(false);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
    }
  };

  const updateUserMarker = (location) => {
    if (!googleMapRef.current || !window.google) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(location);
    } else {
      userMarkerRef.current = new window.google.maps.Marker({
        position: location,
        map: googleMapRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#3B82F6',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3
        },
        title: 'Your Location'
      });
    }
  };

  const fetchNearbyVehicles = async (lon, lat) => {
    try {
      const response = await fetch(
        `${API_BASE}/nearby?lon=${lon}&lat=${lat}&radiusKm=${radiusKm}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch nearby vehicles');
      
      const data = await response.json();
      setNearbyVehicles(data);
      updateVehicleMarkers(data);
    } catch (err) {
      setError('Failed to fetch nearby vehicles: ' + err.message);
    }
  };

  const updateVehicleMarkers = (vehicles) => {
    if (!googleMapRef.current || !window.google) return;

    // Remove old markers
    Object.values(markersRef.current).forEach(marker => marker.setMap(null));
    markersRef.current = {};

    // Add new markers
    vehicles.forEach(vehicle => {
      const position = { lat: vehicle.lat, lng: vehicle.lon };
      
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        position,
        map: googleMapRef.current,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="#10B981" stroke="white" stroke-width="3"/>
              <text x="20" y="26" font-size="20" text-anchor="middle" fill="white">🛺</text>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(40, 40)
        },
        title: vehicle.id
      });

      marker.addListener('click', () => {
        selectVehicle(vehicle);
      });

      markersRef.current[vehicle.id] = marker;
    });
  };

  const selectVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    
    // Show only selected vehicle
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      if (id === vehicle.id) {
        marker.setMap(googleMapRef.current);
        marker.setAnimation(window.google.maps.Animation.BOUNCE);
        setTimeout(() => marker.setAnimation(null), 2000);
      } else {
        marker.setMap(null);
      }
    });

    // Draw route
    if (userLocation && window.google) {
      const directionsService = new window.google.maps.DirectionsService();
      
      directionsService.route({
        origin: userLocation,
        destination: { lat: vehicle.lat, lng: vehicle.lon },
        travelMode: window.google.maps.TravelMode.DRIVING
      }, (result, status) => {
        if (status === 'OK') {
          directionsRendererRef.current.setDirections(result);
        }
      });
    }
  };

  const deselectVehicle = () => {
    setSelectedVehicle(null);
    
    // Show all vehicles again
    Object.values(markersRef.current).forEach(marker => {
      marker.setMap(googleMapRef.current);
      marker.setAnimation(null);
    });

    // Clear route
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({ routes: [] });
    }
  };

  const searchLocation = async () => {
    if (!searchQuery.trim() || !window.google) return;
    
    setLoading(true);
    setError('');

    const geocoder = new window.google.maps.Geocoder();
    
    geocoder.geocode({ address: searchQuery }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        const newLocation = { lat: location.lat(), lng: location.lng() };
        
        setUserLocation(newLocation);
        googleMapRef.current.setCenter(newLocation);
        updateUserMarker(newLocation);
        fetchNearbyVehicles(newLocation.lng, newLocation.lat);
      } else {
        setError('Location not found. Please try another search.');
      }
      setLoading(false);
    });
  };

  // Fetch specific vehicle real-time (bypasses cache)
  const fetchVehicleById = async (vehicleId) => {
    try {
      const response = await fetch(`${API_BASE}/${vehicleId}`);
      if (!response.ok) throw new Error('Failed to fetch vehicle');
      return await response.json();
    } catch (err) {
      console.error('Failed to fetch vehicle:', err);
      return null;
    }
  };

  // Live updates for vehicles
  useEffect(() => {
    if (!userLocation) return;

    const interval = setInterval(() => {
      if (!selectedVehicle) {
        // Refresh all nearby vehicles (uses cache)
        fetchNearbyVehicles(userLocation.lng, userLocation.lat);
      } else {
        // Update only selected vehicle in real-time (bypasses cache)
        fetchVehicleById(selectedVehicle.id).then((updated) => {
          if (updated) {
            setSelectedVehicle(updated);
            
            // Update marker position
            const marker = markersRef.current[updated.id];
            if (marker) {
              marker.setPosition({ lat: updated.lat, lng: updated.lon });
            }
            
            // Update route
            if (userLocation && window.google) {
              const directionsService = new window.google.maps.DirectionsService();
              directionsService.route({
                origin: userLocation,
                destination: { lat: updated.lat, lng: updated.lon },
                travelMode: window.google.maps.TravelMode.DRIVING
              }, (result, status) => {
                if (status === 'OK') {
                  directionsRendererRef.current.setDirections(result);
                }
              });
            }
          }
        });
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [userLocation, selectedVehicle]);

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 z-10">
        <h1 className="text-2xl font-bold text-gray-800 mb-3">🛺 Wash Car Tracker</h1>
        
        {/* Search Bar */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
              placeholder="Search for a location..."
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Search className="absolute right-3 top-2.5 text-gray-400" size={20} />
          </div>
          <button
            onClick={searchLocation}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            Search
          </button>
          <button
            onClick={getUserLocation}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
          >
            <Navigation size={20} />
          </button>
        </div>

        {/* Radius Control */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Search Radius:</label>
          <input
            type="range"
            min="1"
            max="50"
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm font-medium text-gray-700 w-16">{radiusKm} km</span>
          <button
            onClick={() => userLocation && fetchNearbyVehicles(userLocation.lng, userLocation.lat)}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            Update
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-2 p-2 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Map and Sidebar */}
      <div className="flex-1 flex relative">
        {/* Map */}
        <div ref={mapRef} className="flex-1" />

        {/* Vehicle List Sidebar */}
        <div className="w-80 bg-white shadow-lg overflow-y-auto">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-800">
             Nearby wash Vehicle ({nearbyVehicles.length})
            </h2>
            {loading && (
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                <Loader2 className="animate-spin" size={16} />
                <span>Searching...</span>
              </div>
            )}
          </div>

          {selectedVehicle && (
            <div className="p-4 bg-blue-50 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-blue-900">Selected wash Vehicle</h3>
                  <p className="text-sm text-blue-700 mt-1">ID: {selectedVehicle.id}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Distance: {selectedVehicle.distance?.toFixed(2)} km
                  </p>
                </div>
                <button
                  onClick={deselectVehicle}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Show All
                </button>
              </div>
            </div>
          )}

          <div className="divide-y">
            {nearbyVehicles.length === 0 && !loading && (
              <div className="p-8 text-center text-gray-500">
                <MapPin className="mx-auto mb-2 text-gray-400" size={40} />
                <p>No vehicles found nearby</p>
                <p className="text-sm mt-1">Try increasing the search radius</p>
              </div>
            )}

            {nearbyVehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                onClick={() => selectedVehicle?.id === vehicle.id ? deselectVehicle() : selectVehicle(vehicle)}
                className={`p-4 cursor-pointer transition-colors ${
                  selectedVehicle?.id === vehicle.id
                    ? 'bg-blue-100 border-l-4 border-blue-600'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">🛺 {vehicle.id}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {vehicle.distance?.toFixed(2)} km away
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Lat: {vehicle.lat?.toFixed(6)}, Lon: {vehicle.lon?.toFixed(6)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-green-600">Live</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl flex items-center gap-3">
            <Loader2 className="animate-spin text-blue-600" size={24} />
            <span className="text-gray-700">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreeWheelerTracker;