import { NextResponse } from 'next/server';
import { 
  pollForTaskCompletions, 
  startPolling, 
  stopPolling, 
  isPollingActive,
  clearProcessedCache 
} from '@/lib/task-completion-poller';

// Force dynamic - this endpoint has side effects
export const dynamic = 'force-dynamic';

/**
 * GET /api/tasks/poll
 * 
 * Check polling status
 */
export async function GET() {
  return NextResponse.json({
    active: isPollingActive(),
    message: isPollingActive() 
      ? 'Task completion polling is active' 
      : 'Task completion polling is inactive',
  });
}

/**
 * POST /api/tasks/poll
 * 
 * Manually trigger a poll for task completions, or start/stop automatic polling.
 * 
 * Body options:
 * - { "action": "poll" } - Run a single poll now
 * - { "action": "start", "interval": 10000 } - Start automatic polling (default 10s)
 * - { "action": "stop" } - Stop automatic polling
 * - { "action": "reset" } - Clear processed message cache
 */
export async function POST(request: Request) {
  try {
    let action = 'poll';
    let interval = 10000;

    try {
      const body = await request.json();
      action = body.action || 'poll';
      interval = body.interval || 10000;
    } catch {
      // No body or invalid JSON - default to single poll
    }

    switch (action) {
      case 'start':
        startPolling(interval);
        return NextResponse.json({
          success: true,
          message: `Automatic polling started (every ${interval}ms)`,
          active: true,
        });

      case 'stop':
        stopPolling();
        return NextResponse.json({
          success: true,
          message: 'Automatic polling stopped',
          active: false,
        });

      case 'reset':
        clearProcessedCache();
        return NextResponse.json({
          success: true,
          message: 'Processed message cache cleared',
        });

      case 'poll':
      default:
        const result = await pollForTaskCompletions();
        return NextResponse.json({
          success: true,
          ...result,
        });
    }
  } catch (error) {
    console.error('Poll endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to poll for task completions' },
      { status: 500 }
    );
  }
}
