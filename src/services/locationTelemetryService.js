import { websocketService } from '../api/websocketService';
import { locationApi } from '../api/locationApi';

class LocationTelemetryService {
  constructor() {
    this.intervalId = null;
    this.watchId = null;
    this.isTracking = false;
    this.currentPosition = { latitude: null, longitude: null };
  }

  /**
   * Start periodic GPS telemetry stream
   * @param {Object} params
   * @param {Number|String} params.workerId
   * @param {String} params.status - 'ONLINE', 'MUA_MOVING', etc.
   * @param {Number} params.intervalMs - Default 3000ms (3s)
   * @param {Function} params.onLocationUpdate - Callback when position is updated
   */
  startTracking({ workerId, status = 'ONLINE', intervalMs = 3000, onLocationUpdate } = {}) {
    if (this.isTracking) {
      console.log('[LocationTelemetry] Already tracking.');
      return;
    }

    this.isTracking = true;
    console.log(`[LocationTelemetry] Started tracking for workerId=${workerId}, status=${status}, interval=${intervalMs}ms`);

    // Use HTML5 Geolocation API if available
    if ('geolocation' in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          this.currentPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          if (onLocationUpdate) {
            onLocationUpdate(this.currentPosition);
          }
        },
        (err) => {
          console.warn('[LocationTelemetry] Geolocation watch error:', err.message);
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
      );
    }

    // Periodically transmit location telemetry
    const transmit = async () => {
      if (!this.isTracking) return;
      if (this.currentPosition.latitude == null || this.currentPosition.longitude == null) {
        console.log('[LocationTelemetry] Waiting for real device GPS coordinates...');
        return;
      }

      const payload = {
        workerId: workerId ?? null,

        latitude: this.currentPosition.latitude,
        longitude: this.currentPosition.longitude,
        status: status,
        timestamp: Date.now(),
      };


      // 1. Try sending via WebSocket STOMP (/app/location/stream)
      const wsSent = websocketService.sendLocation(payload);

      if (wsSent) {
        console.log('[LocationTelemetry] Sent GPS via STOMP WebSocket:', payload);
      } else {
        // 2. Fallback to HTTP REST API (/api/v1/location/stream)
        try {
          await locationApi.streamLocation(payload);
          console.log('[LocationTelemetry] Fallback sent GPS via REST API:', payload);
        } catch (err) {
          console.warn('[LocationTelemetry] REST API fallback failed:', err.message);
        }
      }
    };

    // Immediate first ping
    transmit();

    // Loop pings
    this.intervalId = setInterval(transmit, intervalMs);
  }

  /**
   * Stop tracking and telemetry streaming
   */
  stopTracking() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.watchId !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
    console.log('[LocationTelemetry] Stopped tracking.');
  }
}

export const locationTelemetryService = new LocationTelemetryService();
