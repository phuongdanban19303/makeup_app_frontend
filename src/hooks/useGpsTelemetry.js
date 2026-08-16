import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { websocketService } from '../api/websocketService';
import { locationTelemetryService } from '../services/locationTelemetryService';
import { setCoordinates } from '../store/locationSlice';

export const useGpsTelemetry = () => {
  const dispatch = useDispatch();
  const { currentWorkerStatus } = useSelector((state) => state.worker);
  const { user, accessToken } = useSelector((state) => state.auth);

  const [isWsConnected, setIsWsConnected] = useState(false);
  const [isTelemetryActive, setIsTelemetryActive] = useState(false);

  useEffect(() => {
    const workerId = user?.id || user?.workerId || user?.userId || null;
    const isOnline = currentWorkerStatus === 'ONLINE' && workerId !== null;

    if (isOnline) {

      // 1. Connect WebSocket STOMP
      websocketService.connect({
        token: accessToken,
        onConnect: () => {
          setIsWsConnected(true);
        },
        onError: () => {
          setIsWsConnected(false);
        },
      });

      // 2. Start GPS Telemetry tracking
      locationTelemetryService.startTracking({
        workerId: workerId,
        status: 'ONLINE',
        intervalMs: 3000,
        onLocationUpdate: (pos) => {
          dispatch(setCoordinates(pos));
        },
      });
      setIsTelemetryActive(true);
    } else {
      // Worker is OFFLINE: Stop telemetry & disconnect WS
      locationTelemetryService.stopTracking();
      websocketService.disconnect();
      setIsWsConnected(false);
      setIsTelemetryActive(false);
    }

    return () => {
      // Cleanup on unmount
      locationTelemetryService.stopTracking();
      websocketService.disconnect();
    };
  }, [currentWorkerStatus, user?.id, accessToken, dispatch]);

  return {
    isWsConnected,
    isTelemetryActive,
    currentWorkerStatus,
  };
};
