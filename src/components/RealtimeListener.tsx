'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface RealtimeContextType {
  isConnected: boolean;
  lastEvent: { type: string; timestamp: string; data?: Record<string, unknown> } | null;
}

const RealtimeContext = createContext<RealtimeContextType>({
  isConnected: true,
  lastEvent: null,
});

export const useRealtime = () => useContext(RealtimeContext);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [lastEvent, setLastEvent] = useState<RealtimeContextType['lastEvent']>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectSSE = () => {
      eventSource = new EventSource('/api/realtime');

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type !== 'CONNECTED') {
            setLastEvent(payload);
          }
        } catch {
          // ignore heartbeats
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource?.close();

        // Attempt reconnection after 3 seconds
        setTimeout(() => {
          connectSSE();
        }, 3000);
      };
    };

    connectSSE();

    return () => {
      eventSource?.close();
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ isConnected, lastEvent }}>
      {!isConnected && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white py-1.5 px-4 text-center text-xs font-semibold tracking-wide shadow-md animate-pulse flex items-center justify-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>Live connection lost. Reconnecting...</span>
        </div>
      )}
      {children}
    </RealtimeContext.Provider>
  );
}
