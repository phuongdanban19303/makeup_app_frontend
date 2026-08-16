import { Client } from '@stomp/stompjs';

class WebSocketService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.currentToken = null;
    this.listeners = new Map(); // destination -> Set of callback functions
    this.stompSubscriptions = new Map(); // destination -> Stomp Subscription
  }

  /**
   * Connect to STOMP WebSocket server at /ws-location
   */
  connect({ onConnect, onError, token } = {}) {
    if (this.client && this.connected && this.currentToken === token) {
      console.log('[WebSocketService] Already connected.');
      if (onConnect) onConnect();
      return;
    }

    if (this.client) {
      this.disconnect();
    }

    this.currentToken = token;
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws-location';

    this.client = new Client({
      brokerURL: wsUrl,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      debug: (str) => {
        console.log('[STOMP Debug]', str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: (frame) => {
        console.log('[WebSocketService] Connected to STOMP /ws-location:', frame);
        this.connected = true;

        // Auto-subscribe all registered listeners upon STOMP connection
        this._resubscribeAll();

        if (onConnect) onConnect(frame);
      },

      onStompError: (frame) => {
        console.error('[WebSocketService] STOMP error:', frame.headers['message'], frame.body);
        this.connected = false;
        if (onError) onError(frame);
      },

      onWebSocketClose: () => {
        console.warn('[WebSocketService] WebSocket connection closed.');
        this.connected = false;
      },
    });

    this.client.activate();
  }

  /**
   * Disconnect from STOMP broker
   */
  disconnect() {
    if (this.client) {
      this.stompSubscriptions.forEach((sub) => sub.unsubscribe());
      this.stompSubscriptions.clear();
      this.client.deactivate();
      this.client = null;
      this.connected = false;
      console.log('[WebSocketService] Disconnected.');
    }
  }

  /**
   * Check connection status
   */
  isConnected() {
    return Boolean(this.connected && this.client && this.client.active);
  }

  /**
   * Publish GPS Location Telemetry to /app/location/stream
   */
  sendLocation(locationPayload) {
    if (!this.isConnected()) {
      return false;
    }

    try {
      this.client.publish({
        destination: '/app/location/stream',
        body: JSON.stringify(locationPayload),
      });
      return true;
    } catch (err) {
      console.error('[WebSocketService] Failed to publish location:', err);
      return false;
    }
  }

  /**
   * Subscribe to a topic (e.g. /topic/worker/7 or /topic/mua/7/alerts)
   * Guaranteed to subscribe immediately if connected, or queue for when STOMP connects.
   */
  subscribe(destination, callback) {
    if (!this.listeners.has(destination)) {
      this.listeners.set(destination, new Set());
    }
    this.listeners.get(destination).add(callback);

    // If STOMP is already connected, subscribe immediately
    if (this.isConnected() && !this.stompSubscriptions.has(destination)) {
      this._subscribeDestination(destination);
    }

    return {
      unsubscribe: () => {
        const callbacks = this.listeners.get(destination);
        if (callbacks) {
          callbacks.delete(callback);
          if (callbacks.size === 0) {
            this.listeners.delete(destination);
            const sub = this.stompSubscriptions.get(destination);
            if (sub) {
              sub.unsubscribe();
              this.stompSubscriptions.delete(destination);
            }
          }
        }
      }
    };
  }

  _resubscribeAll() {
    this.stompSubscriptions.clear();

    this.listeners.forEach((_, destination) => {
      this._subscribeDestination(destination);
    });
  }


  _subscribeDestination(destination) {
    if (!this.client || !this.connected) return;

    try {
      const sub = this.client.subscribe(destination, (message) => {
        console.log(`[WebSocketService] ⚡ STOMP MESSAGE RECEIVED on ${destination}:`, message);
        let payload;
        try {
          payload = JSON.parse(message.body);
        } catch (err) {
          payload = message.body;
        }

        const callbacks = this.listeners.get(destination);
        if (callbacks) {
          callbacks.forEach((cb) => cb(payload));
        }
      });


      this.stompSubscriptions.set(destination, sub);
      console.log(`[WebSocketService] ✅ Successfully subscribed STOMP topic: ${destination}`);
    } catch (e) {
      console.error(`[WebSocketService] Failed to subscribe topic ${destination}:`, e);
    }
  }
}

export const websocketService = new WebSocketService();
