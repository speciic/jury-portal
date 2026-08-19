import { EventEmitter } from 'events';

// Global Event Emitter for SSE broadcast
const globalForEvents = globalThis as unknown as {
  realtimeEmitter: EventEmitter | undefined;
};

export const realtimeEmitter = globalForEvents.realtimeEmitter ?? new EventEmitter();
realtimeEmitter.setMaxListeners(200); // Allow high concurrency

if (process.env.NODE_ENV !== 'production') globalForEvents.realtimeEmitter = realtimeEmitter;

export interface RealtimePayload {
  type:
    | 'EVALUATION_SUBMITTED'
    | 'EVALUATION_UNLOCKED'
    | 'TEAM_UPDATED'
    | 'TEAM_ADDED'
    | 'JURY_UPDATED'
    | 'VENUE_UPDATED'
    | 'CRITERIA_UPDATED';
  data?: Record<string, unknown>;
  timestamp: string;
}

export function broadcastRealtimeEvent(
  type: RealtimePayload['type'],
  data: Record<string, unknown> = {}
) {
  const payload: RealtimePayload = {
    type,
    data,
    timestamp: new Date().toISOString(),
  };
  realtimeEmitter.emit('event', payload);
}
