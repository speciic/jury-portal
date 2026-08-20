import { NextResponse } from 'next/server';
import { realtimeEmitter, RealtimePayload } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial heartbeat
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`)
      );

      const listener = (payload: RealtimePayload) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          // Controller might be closed
          realtimeEmitter.off('event', listener);
        }
      };

      realtimeEmitter.on('event', listener);

      // Keepalive ping every 15 seconds
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(pingInterval);
          realtimeEmitter.off('event', listener);
        }
      }, 15000);

      // Handle stream abort/cancel
      return () => {
        clearInterval(pingInterval);
        realtimeEmitter.off('event', listener);
      };
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
